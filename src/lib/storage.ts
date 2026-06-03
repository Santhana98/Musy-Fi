import fs from 'fs';
import path from 'path';
import * as mm from 'music-metadata';
import { getGoogleDriveClient, getOrCreateMusiFiFolder } from './gdrive';
import { Readable } from 'stream';

const LOCAL_STORAGE_DIR = process.env.VERCEL
  ? path.join('/tmp', 'local_storage')
  : path.join(process.cwd(), 'local_storage');

// Ensure local storage directory exists
if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
  fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
}

export interface AudioMetadata {
  title: string;
  artist: string;
  duration: number;
  thumbnail: string | null;
}

/**
 * Parses ID3 metadata from an audio file buffer.
 */
export async function parseAudioMetadata(buffer: Buffer, mimeType: string): Promise<AudioMetadata> {
  try {
    const metadata = await mm.parseBuffer(buffer, { mimeType });
    const title = metadata.common.title || 'Unknown Title';
    const artist = metadata.common.artist || 'Unknown Artist';
    const duration = metadata.format.duration || 0;

    let thumbnail: string | null = null;
    if (metadata.common.picture && metadata.common.picture.length > 0) {
      const picture = metadata.common.picture[0];
      const base64 = Buffer.from(picture.data).toString('base64');
      thumbnail = `data:${picture.format};base64,${base64}`;
    }

    return { title, artist, duration, thumbnail };
  } catch (error) {
    console.error('Error parsing audio metadata:', error);
    return {
      title: 'Unknown Title',
      artist: 'Unknown Artist',
      duration: 0,
      thumbnail: null,
    };
  }
}

/**
 * Saves a file to Google Drive (if credentials exist and connected) or locally.
 */
export async function saveAudioFile(
  userId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ sourceUrl: string; storageType: 'mp3' | 'google'; metadata: AudioMetadata }> {
  // Try parsing metadata first
  const metadata = await parseAudioMetadata(buffer, mimeType);
  if (metadata.title === 'Unknown Title') {
    // Fallback to filename without extension
    metadata.title = path.parse(fileName).name;
  }

  // Attempt Google Drive upload
  try {
    const drive = await getGoogleDriveClient(userId);
    if (drive) {
      const folderId = await getOrCreateMusiFiFolder(drive);
      
      // Convert buffer to stream
      const bufferStream = new Readable();
      bufferStream.push(buffer);
      bufferStream.push(null);

      const response = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
        },
        media: {
          mimeType,
          body: bufferStream,
        },
        fields: 'id',
      });

      if (response.data.id) {
        return {
          sourceUrl: response.data.id,
          storageType: 'google',
          metadata,
        };
      }
    }
  } catch (error) {
    console.warn('Google Drive upload failed, falling back to local storage:', error);
  }

  // Local Storage Fallback
  const safeFileName = `${Date.now()}-${userId}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = path.join(LOCAL_STORAGE_DIR, safeFileName);
  
  await fs.promises.writeFile(filePath, buffer);

  return {
    sourceUrl: safeFileName,
    storageType: 'mp3',
    metadata,
  };
}

/**
 * Retrieves a file stream for playback.
 */
export async function getAudioStream(
  userId: string,
  sourceUrl: string,
  storageType: string
): Promise<{ stream: NodeJS.ReadableStream | Readable; size: number; mimeType: string }> {
  if (storageType === 'google') {
    const drive = await getGoogleDriveClient(userId);
    if (!drive) {
      throw new Error('Google Drive client not authenticated');
    }

    // Get metadata to find size and mimeType
    const fileMeta = await drive.files.get({
      fileId: sourceUrl,
      fields: 'size, mimeType',
    });

    const size = parseInt(fileMeta.data.size || '0', 10);
    const mimeType = fileMeta.data.mimeType || 'audio/mpeg';

    // Get file media stream
    const response = await drive.files.get(
      { fileId: sourceUrl, alt: 'media' },
      { responseType: 'stream' }
    );

    return {
      stream: response.data as any,
      size,
      mimeType,
    };
  } else {
    // Local storage streaming
    const filePath = path.join(LOCAL_STORAGE_DIR, sourceUrl);
    if (!fs.existsSync(filePath)) {
      throw new Error('Audio file not found in local storage');
    }

    const stat = await fs.promises.stat(filePath);
    const stream = fs.createReadStream(filePath);
    
    return {
      stream,
      size: stat.size,
      mimeType: 'audio/mpeg', // standard MP3 default
    };
  }
}

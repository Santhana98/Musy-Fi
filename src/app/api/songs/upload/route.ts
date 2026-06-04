import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { saveAudioFile, parseAudioMetadata } from '@/lib/storage';
import { getGoogleDriveClient, getOrCreateMusiFiFolder } from '@/lib/gdrive';
import path from 'path';

export const maxDuration = 60;

// GET: Returns the user's Musi-Fi Google Drive folder ID
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const drive = await getGoogleDriveClient(userId);
    if (!drive) {
      return NextResponse.json({ error: 'Google Drive not connected' }, { status: 400 });
    }

    const folderId = await getOrCreateMusiFiFolder(drive);
    return NextResponse.json({ folderId });
  } catch (error: any) {
    console.error('Error getting folder ID:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: Handles either standard multipart uploads or direct Google upload confirmations
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const accessToken = (session.user as any).accessToken;
    const contentType = request.headers.get('content-type') || '';

    // Case 1: Direct Google Drive upload confirmation
    if (contentType.includes('application/json')) {
      const { fileId } = await request.json();
      if (!fileId) {
        return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
      }

      const drive = await getGoogleDriveClient(userId);
      if (!drive) {
        return NextResponse.json({ error: 'Google Drive not connected' }, { status: 400 });
      }

      // Fetch file details from Google Drive
      const fileMeta = await drive.files.get({
        fileId: fileId,
        fields: 'name, mimeType, size',
      });

      // Get file media stream to parse metadata
      const response = await drive.files.get(
        { fileId: fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      const stream = response.data as any;
      const chunks: Buffer[] = [];
      let totalBytes = 0;

      // Read a partial buffer (up to 512KB) to extract ID3 metadata tags
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
        totalBytes += chunk.length;
        if (totalBytes >= 512 * 1024) {
          break;
        }
      }

      // Destroy the stream to avoid full download overhead
      if (typeof stream.destroy === 'function') {
        stream.destroy();
      }

      const buffer = Buffer.concat(chunks);
      const mimeType = fileMeta.data.mimeType || 'audio/mpeg';
      const metadata = await parseAudioMetadata(buffer, mimeType);

      if (metadata.title === 'Unknown Title') {
        metadata.title = path.parse(fileMeta.data.name || 'Untitled').name;
      }

      // Create database entry
      const song = await prisma.song.create({
        data: {
          title: metadata.title,
          artist: metadata.artist,
          type: 'google',
          sourceUrl: fileId,
          duration: metadata.duration,
          thumbnail: metadata.thumbnail,
          userId: userId,
        },
      });

      return NextResponse.json({ success: true, song });
    }

    // Case 2: Standard multipart form file upload (credentials/local fallback)
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('audio/')) {
      return NextResponse.json({ error: 'Uploaded file must be an audio track' }, { status: 400 });
    }

    // Hard limit check for serverless function execution
    if (file.size > 4.5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Vercel limits standard file uploads to 4.5MB. Please sign in with Google to upload larger files.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save locally or to Google Drive if credentials exist
    const uploadResult = await saveAudioFile(userId, file.name, buffer, file.type, accessToken);

    // Create DB entry for the Song
    const song = await prisma.song.create({
      data: {
        title: uploadResult.metadata.title,
        artist: uploadResult.metadata.artist,
        type: uploadResult.storageType,
        sourceUrl: uploadResult.sourceUrl,
        duration: uploadResult.metadata.duration,
        thumbnail: uploadResult.metadata.thumbnail,
        userId: userId,
      },
    });

    return NextResponse.json({ success: true, song });
  } catch (error: any) {
    console.error('Error in upload route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

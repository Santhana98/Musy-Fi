import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { saveAudioFile } from '@/lib/storage';
import { resolveYoutubeMetadata, resolveYoutubeAudioStream } from '@/lib/youtubeResolver';

export const maxDuration = 60;

const MAX_BACKGROUND_IMPORT_SECONDS = 30 * 60;

// Helper to extract YouTube Video ID
function getYoutubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

// Helper to extract Vimeo Video ID
function getVimeoId(url: string): string | null {
  const regExp = /(?:vimeo\.com\/)([0-9]+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const accessToken = (session.user as any).accessToken;
    const body = await request.json();
    const { url, title, artist } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let videoId = '';
    let type = '';
    let thumbnail = '';
    let resolvedTitle = title || 'External Track';
    let resolvedArtist = artist || 'Unknown Source';
    let resolvedDuration = 0;

    const ytId = getYoutubeId(url);
    const vimeoId = getVimeoId(url);

    if (ytId) {
      videoId = ytId;
      type = 'youtube';
      thumbnail = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
      
      // Try to fetch real YouTube metadata via public APIs
      try {
        const metadata = await resolveYoutubeMetadata(url);
        resolvedTitle = title || metadata.title || `YouTube Track (${ytId})`;
        resolvedArtist = artist || metadata.artist || 'YouTube';
        resolvedDuration = metadata.duration || 0;
      } catch (err) {
        console.warn('Could not fetch YouTube info via yt-dlp, falling back to defaults:', err);
        if (!title) resolvedTitle = `YouTube Track (${ytId})`;
        if (!artist) resolvedArtist = 'YouTube';
      }
    } else if (vimeoId) {
      videoId = vimeoId;
      type = 'vimeo';
      thumbnail = `https://vumbnail.com/${vimeoId}.jpg`;
      if (!title) {
        resolvedTitle = `Vimeo Track (${vimeoId})`;
      }
      if (!artist) {
        resolvedArtist = 'Vimeo';
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid URL. Only YouTube and Vimeo links are supported.' },
        { status: 400 }
      );
    }

    // Import YouTube links as real audio files first. This makes mobile background
    // and lock-screen playback behave like uploaded songs when the import succeeds.
    let finalType = type;
    let finalSourceUrl = videoId;
    let backgroundReady = false;

    if (type === 'youtube') {
      if (resolvedDuration > MAX_BACKGROUND_IMPORT_SECONDS) {
        return NextResponse.json(
          { error: `Track duration (${resolvedDuration}s) exceeds the maximum allowed import length of ${MAX_BACKGROUND_IMPORT_SECONDS / 60} minutes.` },
          { status: 400 }
        );
      }

      try {
        console.log('Conversion Started');
        const stream = await resolveYoutubeAudioStream(url);
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);
        
        if (buffer.length === 0) {
          throw new Error('Downloaded audio buffer is empty');
        }
        console.log('Conversion Completed');

        console.log('Drive Upload Started');
        // Determine a clean file name
        const cleanTitle = resolvedTitle.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uploadResult = await saveAudioFile(
          userId,
          `${cleanTitle}.m4a`,
          buffer,
          'audio/mp4',
          accessToken
        );

        if (uploadResult.storageType !== 'google') {
          throw new Error('Upload to Google Drive failed (fell back to local storage). Please ensure your Google Drive is connected and active.');
        }

        finalType = uploadResult.storageType;
        finalSourceUrl = uploadResult.sourceUrl;
        if (uploadResult.metadata && uploadResult.metadata.duration) {
          resolvedDuration = uploadResult.metadata.duration;
        }
        backgroundReady = true;
        console.log('Drive Upload Completed');
      } catch (importErr: any) {
        console.error('Import failed:', importErr.message || importErr);
        return NextResponse.json(
          { error: importErr.message || 'Failed to import and convert YouTube audio track to Google Drive' },
          { status: 500 }
        );
      }
    }

    // Save to DB
    const song = await prisma.song.create({
      data: {
        title: resolvedTitle,
        artist: resolvedArtist,
        type: finalType,
        sourceUrl: finalSourceUrl,
        thumbnail,
        duration: resolvedDuration,
        userId,
      },
    });
    console.log('Library Entry Created');

    return NextResponse.json({ success: true, song, backgroundReady });
  } catch (error: any) {
    console.error('Error in link route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

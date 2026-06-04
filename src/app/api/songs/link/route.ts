import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { saveAudioFile } from '@/lib/storage';
import { getYtDlpMetadata, getYtDlpAudioStream } from '@/lib/ytdlp';

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
      
      // Try to fetch real YouTube metadata via yt-dlp
      try {
        const metadata = await getYtDlpMetadata(url);
        resolvedTitle = title || metadata.title || `YouTube Track (${ytId})`;
        resolvedArtist = artist || metadata.uploader || metadata.channel || 'YouTube';
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

    // Convert YouTube link to direct audio file on first link (where permitted and under 10 minutes)
    let finalType = type;
    let finalSourceUrl = videoId;

    if (type === 'youtube' && resolvedDuration > 0 && resolvedDuration <= 600) {
      try {
        console.log(`Downloading YouTube audio stream to save on platform for videoId: ${videoId}`);
        const stream = await getYtDlpAudioStream(url);
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);
        
        if (buffer.length > 0) {
          console.log(`Saving YouTube audio file to storage (${buffer.length} bytes)...`);
          // Determine a clean file name
          const cleanTitle = resolvedTitle.replace(/[^a-zA-Z0-9.-]/g, '_');
          const uploadResult = await saveAudioFile(
            userId,
            `${cleanTitle}.m4a`,
            buffer,
            'audio/mp4'
          );
          finalType = uploadResult.storageType;
          finalSourceUrl = uploadResult.sourceUrl;
          console.log(`YouTube audio successfully converted to standard file: type=${finalType}, sourceUrl=${finalSourceUrl}`);
        }
      } catch (downloadErr) {
        console.warn('Could not convert YouTube video to direct file, falling back to linking original video URL:', downloadErr);
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

    return NextResponse.json({ success: true, song });
  } catch (error: any) {
    console.error('Error in link route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

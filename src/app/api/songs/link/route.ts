import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ytdl from '@distube/ytdl-core';

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
      
      // Try to fetch real YouTube metadata
      try {
        const info = await ytdl.getBasicInfo(url);
        resolvedTitle = title || info.videoDetails.title || `YouTube Track (${ytId})`;
        resolvedArtist = artist || info.videoDetails.author.name || 'YouTube';
        resolvedDuration = parseInt(info.videoDetails.lengthSeconds || '0', 10);
      } catch (err) {
        console.warn('Could not fetch YouTube info via ytdl, falling back to defaults:', err);
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

    // Save to DB
    const song = await prisma.song.create({
      data: {
        title: resolvedTitle,
        artist: resolvedArtist,
        type,
        sourceUrl: videoId,
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

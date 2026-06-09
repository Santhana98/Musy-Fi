import { NextRequest, NextResponse } from 'next/server';
import { Innertube } from 'youtubei.js';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'videoId required' }, { status: 400 });
  }

  try {
    const yt = await Innertube.create({
      retrieve_player: true,
      generate_session_locally: true,
    });

    const info = await yt.getInfo(videoId);
    const format = info.chooseFormat({ type: 'audio', quality: 'best' });

    if (!format?.url) {
      return NextResponse.json({ error: 'No audio URL found' }, { status: 404 });
    }

    return NextResponse.json({
      directUrl: format.url,
      title: info.basic_info.title || 'Unknown',
      artist: info.basic_info.author || 'Unknown',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      duration: info.basic_info.duration || 0,
    });
  } catch (err: any) {
    console.error('[stream] Error:', err.message);
    return NextResponse.json({ error: 'Failed to resolve stream' }, { status: 500 });
  }
}


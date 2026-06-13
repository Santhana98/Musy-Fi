import { NextRequest, NextResponse } from 'next/server';
import { Innertube } from 'youtubei.js';

export const runtime = 'nodejs';
export const maxDuration = 30;

async function resolveWithRetry(videoId: string, attempts = 3): Promise<any> {
  for (let i = 0; i < attempts; i++) {
    try {
      const yt = await Innertube.create({
        retrieve_player: true,
        generate_session_locally: true,
      });
      const info = await yt.getInfo(videoId);
      const format = info.chooseFormat({ type: 'audio', quality: 'best' });
      if (format?.url) {
        return {
          directUrl: format.url,
          title: info.basic_info.title || 'Unknown',
          artist: info.basic_info.author || 'Unknown',
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          duration: info.basic_info.duration || 0,
        };
      }
    } catch (e: any) {
      console.warn(`[stream] Attempt ${i + 1} failed:`, e.message);
      if (i < attempts - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error('All attempts failed');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) return NextResponse.json({ error: 'videoId required' }, { status: 400 });

  try {
    const result = await resolveWithRetry(videoId);
    const directUrl = result.directUrl;

    // Fetch the raw audio stream from YouTube using the server's IP
    const mediaResponse = await fetch(directUrl, {
      headers: {
        'User-Agent': req.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });

    if (!mediaResponse.ok) {
      throw new Error(`YouTube stream request failed: ${mediaResponse.status}`);
    }

    // Pipe/proxy the response stream directly to the browser
    return new NextResponse(mediaResponse.body, {
      headers: {
        'Content-Type': mediaResponse.headers.get('content-type') || 'audio/mpeg',
        'Content-Length': mediaResponse.headers.get('content-length') || '',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      }
    });
  } catch (err: any) {
    console.error('[stream] Proxy failed:', err.message);
    return NextResponse.json({ error: 'Failed to resolve stream' }, { status: 500 });
  }
}


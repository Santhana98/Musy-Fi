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
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[stream] All retries failed:', err.message);
    return NextResponse.json({ error: 'Failed to resolve stream' }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import YTDlpWrap from 'yt-dlp-wrap';
import { getOrCreateYtDlpBinary } from '@/lib/ytdlp';

export const runtime = 'nodejs';
export const maxDuration = 30;

// FIX: Module-level cache — survives across requests on the same instance.
// The binary path is resolved once using the shared helper (bundled binary in /bin,
// copied to /tmp on first use). No more GitHub downloads on every cold start.
let ytDlpWrap: YTDlpWrap | null = null;

async function getOrInitYtDlp(): Promise<YTDlpWrap> {
  if (ytDlpWrap) return ytDlpWrap;
  const binaryPath = await getOrCreateYtDlpBinary();
  ytDlpWrap = new YTDlpWrap(binaryPath);
  return ytDlpWrap;
}

async function getStreamUrl(videoId: string): Promise<string> {
  const wrap = await getOrInitYtDlp();
  const info = await wrap.getVideoInfo(`https://www.youtube.com/watch?v=${videoId}`);
  const format =
    info.formats.reverse().find((f: any) => f.acodec !== 'none' && f.vcodec === 'none') ||
    info.formats.reverse().find((f: any) => f.acodec !== 'none');

  if (!format || !format.url) {
    throw new Error('No audio format found');
  }
  return format.url;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) return NextResponse.json({ error: 'videoId required' }, { status: 400 });

  try {
    const directUrl = await getStreamUrl(videoId);

    const headers: Record<string, string> = {
      'User-Agent':
        req.headers.get('user-agent') ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };

    const rangeHeader = req.headers.get('range');
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    const mediaResponse = await fetch(directUrl, { headers });

    if (!mediaResponse.ok) {
      // FIX: Reset the wrap instance on failure so a stale binary path doesn't block recovery
      ytDlpWrap = null;
      throw new Error(`YouTube stream request failed: ${mediaResponse.status}`);
    }

    const responseHeaders: Record<string, string> = {
      'Content-Type': mediaResponse.headers.get('content-type') || 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    };

    const contentLength = mediaResponse.headers.get('content-length');
    if (contentLength) responseHeaders['Content-Length'] = contentLength;

    const contentRange = mediaResponse.headers.get('content-range');
    if (contentRange) responseHeaders['Content-Range'] = contentRange;

    return new NextResponse(mediaResponse.body, {
      status: mediaResponse.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error('[stream] Proxy failed:', err.message);
    return NextResponse.json({ error: 'Failed to resolve stream', detail: err.message }, { status: 500 });
  }
}

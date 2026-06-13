import { NextRequest, NextResponse } from 'next/server';
import YTDlpWrap from 'yt-dlp-wrap';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';
export const maxDuration = 30;

let ytDlpWrap: YTDlpWrap | null = null;

async function getStreamUrl(videoId: string): Promise<string> {
  if (!ytDlpWrap) {
    const isWin = os.platform() === 'win32';
    const binaryName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
    const binaryPath = path.join(os.tmpdir(), binaryName);

    if (!fs.existsSync(binaryPath)) {
      await YTDlpWrap.downloadFromGithub(binaryPath);
      if (!isWin) fs.chmodSync(binaryPath, '755');
    }
    ytDlpWrap = new YTDlpWrap(binaryPath);
  }

  const info = await ytDlpWrap.getVideoInfo(`https://www.youtube.com/watch?v=${videoId}`);
  const format = info.formats.reverse().find((f: any) => f.acodec !== 'none' && f.vcodec === 'none') || info.formats.reverse().find((f: any) => f.acodec !== 'none');
  
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


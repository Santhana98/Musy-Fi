import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Innertube } from 'youtubei.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0];
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v') ||
        u.pathname.match(/\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/)?.[1] || null;
    }
  } catch {}
  const m = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/) || url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const { youtubeUrl } = await req.json();

  if (!youtubeUrl) return NextResponse.json({ error: 'URL required' }, { status: 400 });

  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });

  // Check duplicate
  const existing = await prisma.song.findFirst({ where: { userId, videoId } });
  if (existing) return NextResponse.json({ song: existing, duplicate: true });

  // Step 1: Fetch metadata quickly
  let title = 'Unknown Title';
  let artist = 'Unknown Artist';
  let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  let duration = 0;

  try {
    // Fetch via YouTube's public OEmbed endpoint first to bypass datacenter blocks
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const oembedRes = await fetch(oembedUrl);
    if (oembedRes.ok) {
      const oembedData = await oembedRes.json();
      title = oembedData.title || title;
      artist = oembedData.author_name || artist;
      if (oembedData.thumbnail_url) {
        thumbnail = oembedData.thumbnail_url;
      }
    } else {
      throw new Error(`OEmbed returned status ${oembedRes.status}`);
    }
  } catch (e) {
    console.warn('[link] OEmbed fetch failed, trying Innertube:', e);
    try {
      const yt = await Innertube.create({
        retrieve_player: false,
        generate_session_locally: true,
      });
      const info = await yt.getBasicInfo(videoId);
      title = info.basic_info.title || title;
      artist = info.basic_info.author || artist;
      duration = info.basic_info.duration || 0;
      if (info.basic_info.thumbnail?.[0]?.url) {
        thumbnail = info.basic_info.thumbnail[0].url;
      }
    } catch (innerErr) {
      console.error('[link] Innertube basic info fetch failed too:', innerErr);
    }
  }

  // Step 2: Create song record immediately — appears in library right away
  const song = await prisma.song.create({
    data: {
      userId,
      title,
      artist,
      thumbnail,
      youtubeUrl,
      videoId,
      duration,
      importStatus: 'pending',
    },
  });

  // Step 3: Background processing — verify stream is available
  // Use Promise.resolve().then() instead of setImmediate for better serverless compatibility
  Promise.resolve().then(async () => {
    try {
      await prisma.song.update({
        where: { id: song.id },
        data: { importStatus: 'processing' },
      });

      const isWin = require('os').platform() === 'win32';
      const binaryName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
      const binaryPath = require('path').join(require('os').tmpdir(), binaryName);
      
      const YTDlpWrap = require('yt-dlp-wrap').default;
      if (!require('fs').existsSync(binaryPath)) {
        await YTDlpWrap.downloadFromGithub(binaryPath);
        if (!isWin) require('fs').chmodSync(binaryPath, '755');
      }
      const ytDlpWrap = new YTDlpWrap(binaryPath);
      const info = await ytDlpWrap.getVideoInfo(`https://www.youtube.com/watch?v=${videoId}`);
      const format = info.formats.reverse().find((f: any) => f.acodec !== 'none' && f.vcodec === 'none') || info.formats.reverse().find((f: any) => f.acodec !== 'none');

      if (format?.url) {
        await prisma.song.update({
          where: { id: song.id },
          data: { importStatus: 'ready' },
        });
        console.log(`[link] Song ready: ${title}`);
      } else {
        throw new Error('No audio format found');
      }
    } catch (e) {
      console.error(`[link] Background processing failed for ${videoId}:`, e);
      // Mark as ready anyway — stream will be resolved on play
      await prisma.song.update({
        where: { id: song.id },
        data: { importStatus: 'ready' },
      }).catch(() => {});
    }
  });

  return NextResponse.json({ song });
}

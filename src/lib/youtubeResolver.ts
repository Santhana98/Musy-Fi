import { Readable } from 'stream';
import { getYtDlpDirectUrl, getYtDlpAudioStream, getYtDlpMetadata } from './ytdlp';
import { Innertube, Platform } from 'youtubei.js';

// Global logs capture for remote debugging on Render
const serverLogs = (globalThis as any).__serverLogs || [];
(globalThis as any).__serverLogs = serverLogs;

function captureLog(type: string, ...args: any[]) {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  const timestamp = new Date().toISOString();
  serverLogs.push(`[${timestamp}] [${type}] ${message}`);
  if (serverLogs.length > 200) serverLogs.shift();
}

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
console.log = (...args: any[]) => { captureLog('LOG', ...args); originalLog(...args); };
console.error = (...args: any[]) => { captureLog('ERROR', ...args); originalError(...args); };
console.warn = (...args: any[]) => { captureLog('WARN', ...args); originalWarn(...args); };

// Setup signature deciphering platform shim for Node 24+ compatibility
Platform.shim.eval = async (data: any) => {
  return new Function(data.output || data)();
};

let ytInstance: Innertube | null = null;
async function getInnertube(): Promise<Innertube> {
  if (!ytInstance) {
    ytInstance = await Innertube.create({ fetch: globalThis.fetch });
  }
  return ytInstance;
}

// ─── Your self-hosted Import API ─────────────────────────────────────────────
// Set IMPORT_API_URL in your Render environment variables.
// Example: https://musy-fi-import-api.onrender.com
const IMPORT_API_URL = process.env.IMPORT_API_URL?.replace(/\/$/, '');

function getYoutubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export interface YoutubeMetadata {
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
}

/**
 * Resolves YouTube video metadata.
 * Order: Your Import API → YouTube oEmbed → Noembed → youtubei.js → yt-dlp
 */
export async function resolveYoutubeMetadata(url: string): Promise<YoutubeMetadata> {
  const videoId = getYoutubeId(url);
  if (!videoId) throw new Error('Invalid YouTube URL');

  const defaultResult = {
    title: `YouTube Track (${videoId})`,
    artist: 'YouTube',
    duration: 0,
    thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
  };

  let title = '';
  let artist = '';
  let duration = 0;
  let thumbnail = '';

  // 1. Try your self-hosted Import API (fastest — already has yt-dlp inside)
  if (IMPORT_API_URL) {
    try {
      console.log(`[youtubeResolver] Fetching metadata from Import API: ${IMPORT_API_URL}/api/info?url=${videoId}`);
      const res = await fetch(`${IMPORT_API_URL}/api/info?url=${videoId}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.title)    title    = data.title;
        if (data.artist)   artist   = data.artist || data.channel;
        if (data.duration) duration = data.duration;
        if (data.thumbnail) thumbnail = data.thumbnail;
        console.log(`[youtubeResolver] Import API metadata success for ${videoId}`);
      }
    } catch (err: any) {
      console.warn(`[youtubeResolver] Import API metadata failed:`, err.message);
    }
  }

  // 2. YouTube oEmbed (fast, reliable for title/artist/thumbnail)
  if (!title) {
    try {
      console.log(`[youtubeResolver] Fetching metadata from YouTube oEmbed for ${videoId}...`);
      const res = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.title)        title     = data.title;
        if (data.author_name)  artist    = data.author_name;
        if (data.thumbnail_url) thumbnail = data.thumbnail_url;
      }
    } catch (err: any) {
      console.warn(`[youtubeResolver] YouTube oEmbed failed:`, err.message);
    }
  }

  // 3. Noembed fallback
  if (!title) {
    try {
      console.log(`[youtubeResolver] Fetching metadata from Noembed for ${videoId}...`);
      const res = await fetch(
        `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.title)        title     = data.title;
        if (data.author_name)  artist    = data.author_name;
        if (data.thumbnail_url) thumbnail = data.thumbnail_url;
      }
    } catch (err: any) {
      console.warn(`[youtubeResolver] Noembed metadata resolution failed:`, err.message);
    }
  }

  // 4. youtubei.js
  if (!title || !duration) {
    try {
      console.log(`[youtubeResolver] Fetching metadata via youtubei.js: ${videoId}`);
      const yt = await getInnertube();
      const info = await yt.getBasicInfo(videoId);
      if (info?.basic_info) {
        if (!title)     title     = info.basic_info.title || '';
        if (!artist)    artist    = info.basic_info.author || '';
        if (!duration)  duration  = info.basic_info.duration || 0;
        if (!thumbnail && info.basic_info.thumbnail?.length) {
          thumbnail = info.basic_info.thumbnail[0].url;
        }
      }
    } catch (err: any) {
      console.warn(`[youtubeResolver] youtubei.js metadata resolution failed:`, err.message);
    }
  }

  // 5. yt-dlp (local binary — last resort for metadata)
  if (!title || !duration) {
    try {
      console.log(`[youtubeResolver] Fetching metadata via yt-dlp: ${url}`);
      const data = await getYtDlpMetadata(url);
      if (data) {
        if (!title)     title     = data.title || '';
        if (!artist)    artist    = data.uploader || '';
        if (!duration)  duration  = data.duration || 0;
        if (!thumbnail) thumbnail = data.thumbnail || '';
      }
    } catch (err: any) {
      console.warn(`[youtubeResolver] yt-dlp metadata resolution failed:`, err.message);
    }
  }

  return {
    title:     title     || defaultResult.title,
    artist:    artist    || defaultResult.artist,
    duration:  duration  || defaultResult.duration,
    thumbnail: thumbnail || defaultResult.thumbnail,
  };
}

/**
 * Returns an audio Readable stream for a given YouTube URL.
 * Order: Your Import API stream → youtubei.js → yt-dlp local binary
 */
export async function resolveYoutubeAudioStream(url: string): Promise<Readable> {
  const videoId = getYoutubeId(url);
  if (!videoId) throw new Error('Invalid YouTube URL');

  // 1. Your self-hosted Import API — pipes audio directly
  if (IMPORT_API_URL) {
    try {
      console.log(`[youtubeResolver] Requesting audio stream from Import API: ${IMPORT_API_URL}/api/stream?url=${videoId}`);
      const res = await fetch(`${IMPORT_API_URL}/api/stream?url=${videoId}&format=mp3&quality=192`, {
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok && res.body) {
        console.log(`[youtubeResolver] Import API stream success for ${videoId}`);
        return Readable.fromWeb(res.body as any);
      }
    } catch (err: any) {
      console.warn(`[youtubeResolver] Import API stream failed:`, err.message);
    }
  }

  // 2. youtubei.js (Innertube) — native direct streaming
  try {
    console.log(`[youtubeResolver] Requesting audio stream via youtubei.js: ${videoId}`);
    const yt = await getInnertube();
    const stream = await yt.download(videoId, {
      type: 'audio',
      quality: 'best',
      client: 'YTMUSIC',
    });
    if (stream) return Readable.fromWeb(stream as any);
  } catch (err: any) {
    console.warn(`[youtubeResolver] youtubei.js streaming failed:`, err.message);
  }

  // 3. yt-dlp local binary
  try {
    console.log(`[youtubeResolver] Requesting audio stream via yt-dlp: ${url}`);
    const stream = await getYtDlpAudioStream(url);
    if (stream) return stream;
  } catch (err: any) {
    console.warn(`[youtubeResolver] yt-dlp streaming failed:`, err.message);
  }

  throw new Error('Failed to resolve YouTube audio stream from all available sources');
}

/**
 * Resolves a direct audio streaming URL.
 * Order: Your Import API stream URL → youtubei.js → yt-dlp local binary
 */
export async function resolveYoutubeDirectUrl(url: string): Promise<string> {
  const videoId = getYoutubeId(url);
  if (!videoId) throw new Error('Invalid YouTube URL');

  // 1. Your self-hosted Import API — return the stream endpoint as the "direct URL"
  //    The stream route in Musy-Fi will proxy this transparently.
  if (IMPORT_API_URL) {
    try {
      // Verify the API is reachable before returning the URL
      const healthRes = await fetch(`${IMPORT_API_URL}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (healthRes.ok) {
        const streamUrl = `${IMPORT_API_URL}/api/stream?url=${videoId}&format=mp3&quality=192`;
        console.log(`[youtubeResolver] Import API health OK — using stream URL: ${streamUrl}`);
        return streamUrl;
      }
    } catch (err: any) {
      console.warn(`[youtubeResolver] Import API health check failed:`, err.message);
    }
  }

  // 2. youtubei.js (Innertube) — resolves and deciphers direct URL
  try {
    console.log(`[youtubeResolver] Resolving direct URL via youtubei.js: ${videoId}`);
    const yt = await getInnertube();
    const info = await yt.getInfo(videoId);
    const format = info.chooseFormat({ type: 'audio', quality: 'best' });
    if (format) {
      const directUrl = await format.decipher(yt.session.player);
      if (directUrl) {
        console.log(`[youtubeResolver] youtubei.js direct URL resolved successfully`);
        return directUrl;
      }
    }
  } catch (err: any) {
    console.warn(`[youtubeResolver] youtubei.js direct URL resolution failed:`, err.message);
  }

  // 3. yt-dlp local binary
  try {
    console.log(`[youtubeResolver] Resolving direct URL via yt-dlp: ${url}`);
    const directUrl = await getYtDlpDirectUrl(url);
    if (directUrl) return directUrl;
  } catch (err: any) {
    console.warn(`[youtubeResolver] yt-dlp direct URL resolution failed:`, err.message);
  }

  throw new Error('Failed to resolve direct streaming URL from all available sources');
}

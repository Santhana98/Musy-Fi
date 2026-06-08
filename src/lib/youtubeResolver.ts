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
  if (serverLogs.length > 200) {
    serverLogs.shift();
  }
}

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args: any[]) => {
  captureLog('LOG', ...args);
  originalLog(...args);
};
console.error = (...args: any[]) => {
  captureLog('ERROR', ...args);
  originalError(...args);
};
console.warn = (...args: any[]) => {
  captureLog('WARN', ...args);
  originalWarn(...args);
};

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

const COBALT_INSTANCES = [
  'https://subito-c.meowing.de',
  'https://cobalt.omega.wolfy.love',
  'https://grapefruit.clxxped.lol',
  'https://nuko-c.meowing.de',
  'https://apicobalt.mgytr.top',
  'https://lime.clxxped.lol',
  'https://fox.kittycat.boo',
  'https://api.cobalt.tools'
];

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.colbyland.xyz',
  'https://pipedapi.ox.al',
  'https://api.piped.projectsegfau.lt',
  'https://pipedapi.privacydev.net'
];

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
 * Resolves YouTube video metadata using YouTube oEmbed, Piped, or Cobalt public instances.
 */
export async function resolveYoutubeMetadata(url: string): Promise<YoutubeMetadata> {
  const videoId = getYoutubeId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

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

  // 1. Try YouTube oEmbed (fastest and most reliable for title/artist/thumbnail)
  try {
    console.log(`[youtubeResolver] Fetching metadata from YouTube oEmbed for ${videoId}...`);
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (data.title) title = data.title;
      if (data.author_name) artist = data.author_name;
      if (data.thumbnail_url) thumbnail = data.thumbnail_url;
    }
  } catch (err: any) {
    console.warn(`[youtubeResolver] YouTube oEmbed failed:`, err.message);
  }

  // 1b. Try Noembed (extremely reliable fallback for cloud servers)
  if (!title) {
    try {
      console.log(`[youtubeResolver] Fetching metadata from Noembed for ${videoId}...`);
      const noembedUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`;
      const res = await fetch(noembedUrl, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        if (data.title) title = data.title;
        if (data.author_name) artist = data.author_name;
        if (data.thumbnail_url) thumbnail = data.thumbnail_url;
      }
    } catch (err: any) {
      console.warn(`[youtubeResolver] Noembed metadata resolution failed:`, err.message);
    }
  }

  // 2. Try ytdl-core to get duration and fallback title
  try {
    console.log(`[youtubeResolver] Fetching metadata via ytdl-core: ${videoId}`);
    const ytdl = require('@distube/ytdl-core');
    const info = await ytdl.getBasicInfo(url);
    if (info?.videoDetails) {
      if (!title) title = info.videoDetails.title;
      if (!artist) artist = info.videoDetails.author?.name;
      if (!duration) duration = parseInt(info.videoDetails.lengthSeconds || '0', 10);
      if (!thumbnail && info.videoDetails.thumbnails?.length) {
        thumbnail = info.videoDetails.thumbnails[0].url;
      }
    }
  } catch (err: any) {
    console.warn(`[youtubeResolver] ytdl-core metadata resolution failed:`, err.message);
  }

  // 3. Try youtubei.js
  if (!title || !duration) {
    try {
      console.log(`[youtubeResolver] Fetching metadata via youtubei.js: ${videoId}`);
      const yt = await getInnertube();
      const info = await yt.getBasicInfo(videoId);
      if (info && info.basic_info) {
        if (!title) title = info.basic_info.title || '';
        if (!artist) artist = info.basic_info.author || '';
        if (!duration) duration = info.basic_info.duration || 0;
        if (!thumbnail && info.basic_info.thumbnail && info.basic_info.thumbnail.length > 0) {
          thumbnail = info.basic_info.thumbnail[0].url;
        }
      }
    } catch (err: any) {
      console.warn(`[youtubeResolver] youtubei.js metadata resolution failed:`, err.message);
    }
  }

  // 4. Try yt-dlp
  if (!title || !duration) {
    try {
      console.log(`[youtubeResolver] Fetching metadata via yt-dlp: ${url}`);
      const data = await getYtDlpMetadata(url);
      if (data) {
        if (!title) title = data.title || '';
        if (!artist) artist = data.uploader || '';
        if (!duration) duration = data.duration || 0;
        if (!thumbnail) thumbnail = data.thumbnail || '';
      }
    } catch (err: any) {
      console.warn(`[youtubeResolver] yt-dlp metadata resolution failed:`, err.message);
    }
  }

  // 5. Try Piped
  if (!title || !duration) {
    for (const instance of PIPED_INSTANCES) {
      try {
        console.log(`[youtubeResolver] Fetching metadata from Piped: ${instance}/streams/${videoId}`);
        const res = await fetch(`${instance}/streams/${videoId}`, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const data = await res.json();
          if (!title) title = data.title || '';
          if (!artist) artist = data.uploader || '';
          if (!duration) duration = data.duration || 0;
          if (!thumbnail) thumbnail = data.thumbnailUrl || '';
          break;
        }
      } catch (err: any) {
        console.warn(`[youtubeResolver] Piped metadata fetch failed for ${instance}:`, err.message);
      }
    }
  }

  return {
    title: title || defaultResult.title,
    artist: artist || defaultResult.artist,
    duration: duration || defaultResult.duration,
    thumbnail: thumbnail || defaultResult.thumbnail,
  };
}

/**
 * Returns an audio Readable stream for a given YouTube URL.
 */
export async function resolveYoutubeAudioStream(url: string): Promise<Readable> {
  const videoId = getYoutubeId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  // 1. Try youtubei.js (Innertube) first (native, direct streaming)
  try {
    console.log(`[youtubeResolver] Requesting audio stream via youtubei.js: ${videoId}`);
    const yt = await getInnertube();
    const stream = await yt.download(videoId, {
      type: 'audio',
      quality: 'best',
      client: 'YTMUSIC'
    });
    if (stream) {
      return Readable.fromWeb(stream as any);
    }
  } catch (err: any) {
    console.warn(`[youtubeResolver] youtubei.js streaming failed:`, err.message);
  }

  // Try yt-dlp fallback (extremely reliable, native stream)
  try {
    console.log(`[youtubeResolver] Requesting audio stream via yt-dlp: ${url}`);
    const stream = await getYtDlpAudioStream(url);
    if (stream) {
      return stream;
    }
  } catch (err: any) {
    console.warn(`[youtubeResolver] yt-dlp streaming failed:`, err.message);
  }

  // 2. Try Cobalt first (often converts to MP3/M4A directly and serves fast)
  for (const instance of COBALT_INSTANCES) {
    try {
      console.log(`[youtubeResolver] Requesting audio stream from Cobalt: ${instance}`);
      const res = await fetch(instance, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          downloadMode: 'audio',
          audioFormat: 'best',
        }),
        signal: AbortSignal.timeout(9500) // Maximize time within serverless limit
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`HTTP Error ${res.status}: ${errorText || 'No response body'}`);
      }

      const data = await res.json();
      if (data.status === 'error') {
        throw new Error(`Cobalt returned error: ${data.text || JSON.stringify(data)}`);
      }

      if (data.url) {
        console.log(`[youtubeResolver] Cobalt resolved stream URL: ${data.url}`);
        const downloadRes = await fetch(data.url, {
          signal: AbortSignal.timeout(9500)
        });
        if (!downloadRes.ok) {
          throw new Error(`Download HTTP Error ${downloadRes.status}`);
        }
        if (!downloadRes.body) {
          throw new Error('Response body is empty');
        }
        return Readable.fromWeb(downloadRes.body as any);
      } else {
        throw new Error(`Invalid response format: ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      console.warn(`[youtubeResolver] Cobalt streaming failed for ${instance}:`, err.message);
    }
  }

  // 2. Try Piped API fallback
  for (const instance of PIPED_INSTANCES) {
    try {
      console.log(`[youtubeResolver] Requesting audio stream from Piped: ${instance}`);
      const res = await fetch(`${instance}/streams/${videoId}`, {
        signal: AbortSignal.timeout(7000)
      });
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }
      const data = await res.json();
      const audioStreams = data.audioStreams || [];
      if (audioStreams.length === 0) {
        throw new Error('No audio streams found in Piped response');
      }
      // Prefer M4A or high-quality audio
      const bestAudio = audioStreams.find((s: any) => s.format === 'M4A' || s.mimeType.includes('mp4')) || audioStreams[0];
      console.log(`[youtubeResolver] Piped resolved audio stream URL: ${bestAudio.url}`);
      const downloadRes = await fetch(bestAudio.url, {
        signal: AbortSignal.timeout(9500)
      });
      if (!downloadRes.ok) {
        throw new Error(`Download HTTP Error ${downloadRes.status}`);
      }
      if (!downloadRes.body) {
        throw new Error('Response body is empty');
      }
      return Readable.fromWeb(downloadRes.body as any);
    } catch (err: any) {
      console.warn(`[youtubeResolver] Piped streaming failed for ${instance}:`, err.message);
    }
  }

  throw new Error('Failed to resolve YouTube audio stream from all public services');
}

/**
 * Resolves a direct audio streaming URL.
 */
export async function resolveYoutubeDirectUrl(url: string): Promise<string> {
  const videoId = getYoutubeId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  // 1. Try youtubei.js (Innertube) first (resolves and deciphers direct URL)
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

  // Try yt-dlp fallback (extremely reliable, cached)
  try {
    console.log(`[youtubeResolver] Resolving direct URL via yt-dlp: ${url}`);
    const directUrl = await getYtDlpDirectUrl(url);
    if (directUrl) {
      return directUrl;
    }
  } catch (err: any) {
    console.warn(`[youtubeResolver] yt-dlp direct URL resolution failed:`, err.message);
  }

  // Try Cobalt first
  for (const instance of COBALT_INSTANCES) {
    try {
      console.log(`[youtubeResolver] Resolving direct URL via Cobalt: ${instance}`);
      const res = await fetch(instance, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          downloadMode: 'audio',
          audioFormat: 'best',
        }),
        signal: AbortSignal.timeout(9500)
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`HTTP Error ${res.status}: ${errorText || 'No response body'}`);
      }

      const data = await res.json();
      if (data.status === 'error') {
        throw new Error(`Cobalt error: ${data.text || JSON.stringify(data)}`);
      }
      if (data.url) {
        return data.url;
      } else {
        throw new Error(`Invalid response: ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      console.warn(`[youtubeResolver] Cobalt direct URL resolution failed for ${instance}:`, err.message);
    }
  }

  // Try Piped fallback
  for (const instance of PIPED_INSTANCES) {
    try {
      console.log(`[youtubeResolver] Resolving direct URL via Piped: ${instance}`);
      const res = await fetch(`${instance}/streams/${videoId}`, {
        signal: AbortSignal.timeout(7000)
      });
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }
      const data = await res.json();
      const audioStreams = data.audioStreams || [];
      if (audioStreams.length > 0) {
        const bestAudio = audioStreams.find((s: any) => s.format === 'M4A' || s.mimeType.includes('mp4')) || audioStreams[0];
        return bestAudio.url;
      } else {
        throw new Error('No audio streams found');
      }
    } catch (err: any) {
      console.warn(`[youtubeResolver] Piped direct URL resolution failed for ${instance}:`, err.message);
    }
  }

  throw new Error('Failed to resolve direct streaming URL from all public services');
}

import { Readable } from 'stream';

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

  // 1. Try YouTube oEmbed (fast, official, no auth key, returns title, artist, thumbnail)
  try {
    console.log(`[youtubeResolver] Fetching metadata from YouTube oEmbed for ${videoId}...`);
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`[youtubeResolver] oEmbed resolution succeeded: "${data.title}" by "${data.author_name}"`);
      return {
        title: data.title || `YouTube Track (${videoId})`,
        artist: data.author_name || 'YouTube',
        duration: 0, // oEmbed doesn't return duration
        thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      };
    } else {
      console.warn(`[youtubeResolver] oEmbed returned non-ok status: ${res.status}`);
    }
  } catch (err: any) {
    console.warn(`[youtubeResolver] YouTube oEmbed failed:`, err.message);
  }

  // 2. Try Piped (very rich metadata, including duration)
  for (const instance of PIPED_INSTANCES) {
    try {
      console.log(`[youtubeResolver] Fetching metadata from Piped: ${instance}/streams/${videoId}`);
      const res = await fetch(`${instance}/streams/${videoId}`, {
        signal: AbortSignal.timeout(4000)
      });
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }
      const data = await res.json();
      return {
        title: data.title || `YouTube Track (${videoId})`,
        artist: data.uploader || 'YouTube',
        duration: data.duration || 0,
        thumbnail: data.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      };
    } catch (err: any) {
      console.warn(`[youtubeResolver] Piped metadata fetch failed for ${instance}:`, err.message);
    }
  }

  // 3. Try Cobalt fallback
  for (const instance of COBALT_INSTANCES) {
    try {
      console.log(`[youtubeResolver] Fetching metadata from Cobalt: ${instance}`);
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
        signal: AbortSignal.timeout(4000)
      });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }

      const data = await res.json();
      if (data.status !== 'error' && data.url) {
        // Cobalt doesn't always return rich metadata, but we can make a sensible default
        return {
          title: `YouTube Track (${videoId})`,
          artist: 'YouTube',
          duration: 0,
          thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        };
      }
    } catch (err: any) {
      console.warn(`[youtubeResolver] Cobalt metadata fetch failed for ${instance}:`, err.message);
    }
  }

  // Final fallback using standard structure if everything fails
  return {
    title: `YouTube Track (${videoId})`,
    artist: 'YouTube',
    duration: 0,
    thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
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

  // 1. Try Cobalt first (often converts to MP3/M4A directly and serves fast)
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
        signal: AbortSignal.timeout(5000)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status !== 'error' && data.url) {
          console.log(`[youtubeResolver] Cobalt resolved stream URL: ${data.url}`);
          const downloadRes = await fetch(data.url);
          if (downloadRes.ok && downloadRes.body) {
            return Readable.fromWeb(downloadRes.body as any);
          }
        }
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
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const data = await res.json();
        const audioStreams = data.audioStreams || [];
        if (audioStreams.length > 0) {
          // Prefer M4A or high-quality audio
          const bestAudio = audioStreams.find((s: any) => s.format === 'M4A' || s.mimeType.includes('mp4')) || audioStreams[0];
          console.log(`[youtubeResolver] Piped resolved audio stream URL: ${bestAudio.url}`);
          const downloadRes = await fetch(bestAudio.url);
          if (downloadRes.ok && downloadRes.body) {
            return Readable.fromWeb(downloadRes.body as any);
          }
        }
      }
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
        signal: AbortSignal.timeout(5000)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status !== 'error' && data.url) {
          return data.url;
        }
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
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const data = await res.json();
        const audioStreams = data.audioStreams || [];
        if (audioStreams.length > 0) {
          const bestAudio = audioStreams.find((s: any) => s.format === 'M4A' || s.mimeType.includes('mp4')) || audioStreams[0];
          return bestAudio.url;
        }
      }
    } catch (err: any) {
      console.warn(`[youtubeResolver] Piped direct URL resolution failed for ${instance}:`, err.message);
    }
  }

  throw new Error('Failed to resolve direct streaming URL from all public services');
}

import YTDlpWrap from 'yt-dlp-wrap';
import path from 'path';
import fs from 'fs';

let ytDlpBinaryPath: string | null = null;

/**
 * Ensures that the yt-dlp binary is available on the local filesystem.
 * Packages the binary in the deployment to avoid runtime downloads and GitHub rate limit errors.
 */
export async function getOrCreateYtDlpBinary(): Promise<string> {
  if (ytDlpBinaryPath && fs.existsSync(ytDlpBinaryPath)) {
    return ytDlpBinaryPath;
  }

  const name = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  const bundledPath = path.join(process.cwd(), 'bin', name);

  // For non-Windows environments (like Linux/Vercel), we copy the binary to /tmp
  // and explicitly set execute permissions (chmod 755) because workspace directories
  // can be read-only or strip executable bits during Vercel deployment packaging.
  if (process.platform !== 'win32') {
    const tmpPath = path.join('/tmp', name);
    if (!fs.existsSync(tmpPath)) {
      console.log(`Setting up serverless executable: copying ${bundledPath} to ${tmpPath}`);
      if (fs.existsSync(bundledPath)) {
        fs.copyFileSync(bundledPath, tmpPath);
        fs.chmodSync(tmpPath, '755');
        console.log('Serverless executable setup complete.');
      } else {
        console.warn(`Bundled binary not found at ${bundledPath}. Falling back to GitHub download...`);
        const YTDlpWrapClass = require('yt-dlp-wrap').default;
        await YTDlpWrapClass.downloadFromGithub(tmpPath);
        fs.chmodSync(tmpPath, '755');
      }
    }
    ytDlpBinaryPath = tmpPath;
    return tmpPath;
  }

  // Windows Local Development
  if (fs.existsSync(bundledPath)) {
    ytDlpBinaryPath = bundledPath;
    return bundledPath;
  }

  const localBinDir = path.join(process.cwd(), 'bin');
  if (!fs.existsSync(localBinDir)) {
    fs.mkdirSync(localBinDir, { recursive: true });
  }
  const fallbackPath = path.join(localBinDir, name);
  if (!fs.existsSync(fallbackPath)) {
    console.log(`Downloading fallback binary to ${fallbackPath}...`);
    const YTDlpWrapClass = require('yt-dlp-wrap').default;
    await YTDlpWrapClass.downloadFromGithub(fallbackPath);
  }
  
  ytDlpBinaryPath = fallbackPath;
  return fallbackPath;
}

/**
 * Fetches video metadata using yt-dlp.
 */
export async function getYtDlpMetadata(videoUrl: string): Promise<any> {
  const binaryPath = await getOrCreateYtDlpBinary();
  const ytDlp = new YTDlpWrap(binaryPath);
  return await ytDlp.getVideoInfo(videoUrl);
}

/**
 * Extracts the direct audio streaming URL.
 */
const directUrlCache = new Map<string, { url: string; expiresAt: number }>();

export async function getYtDlpDirectUrl(videoUrl: string): Promise<string> {
  const now = Date.now();
  const cached = directUrlCache.get(videoUrl);
  if (cached && cached.expiresAt > now) {
    console.log(`[Cache Hit] Using cached direct URL for ${videoUrl}`);
    return cached.url;
  }

  console.log(`[Cache Miss] Resolving direct URL for ${videoUrl} using yt-dlp`);
  const binaryPath = await getOrCreateYtDlpBinary();
  const ytDlp = new YTDlpWrap(binaryPath);
  const stdout = await ytDlp.execPromise([videoUrl, '-g', '-f', '18/140/ba[ext=m4a]/ba']);
  const url = stdout.trim();

  let expiresAt = now + 3 * 60 * 60 * 1000; // 3 hours fallback
  try {
    const urlObj = new URL(url);
    const expireParam = urlObj.searchParams.get('expire');
    if (expireParam) {
      expiresAt = (parseInt(expireParam, 10) * 1000) - (5 * 60 * 1000); // 5 min safety buffer
    }
  } catch (err) {
    console.warn('Could not parse expiration parameter from YouTube URL:', err);
  }

  directUrlCache.set(videoUrl, { url, expiresAt });
  return url;
}

/**
 * Returns a readable stream of the raw audio data from YouTube.
 */
export async function getYtDlpAudioStream(videoUrl: string): Promise<any> {
  const binaryPath = await getOrCreateYtDlpBinary();
  const ytDlp = new YTDlpWrap(binaryPath);
  // Command: -f 18/140/ba[ext=m4a]/ba -o - (download best progressive audio/video to stdout stream)
  return ytDlp.execStream([videoUrl, '-f', '18/140/ba[ext=m4a]/ba', '-o', '-']);
}

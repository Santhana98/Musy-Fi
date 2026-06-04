import YTDlpWrap from 'yt-dlp-wrap';
import path from 'path';
import fs from 'fs';

let ytDlpBinaryPath: string | null = null;

/**
 * Ensures that the yt-dlp binary is available on the local filesystem.
 * Downloads the binary from GitHub if it's missing (e.g. on Vercel startup).
 */
export async function getOrCreateYtDlpBinary(): Promise<string> {
  if (ytDlpBinaryPath && fs.existsSync(ytDlpBinaryPath)) {
    return ytDlpBinaryPath;
  }

  const isVercel = !!process.env.VERCEL;
  const dir = isVercel ? '/tmp' : path.join(process.cwd(), 'bin');
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const name = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  const binPath = path.join(dir, name);

  if (!fs.existsSync(binPath)) {
    console.log(`Downloading yt-dlp binary to ${binPath}...`);
    // yt-dlp-wrap has static method to download from GitHub
    // We use require to avoid any ESM/CJS default export mismatch issues
    const YTDlpWrapClass = require('yt-dlp-wrap').default;
    await YTDlpWrapClass.downloadFromGithub(binPath);
    console.log('yt-dlp download complete.');
    
    if (process.platform !== 'win32') {
      fs.chmodSync(binPath, '755');
    }
  }

  ytDlpBinaryPath = binPath;
  return binPath;
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
export async function getYtDlpDirectUrl(videoUrl: string): Promise<string> {
  const binaryPath = await getOrCreateYtDlpBinary();
  const ytDlp = new YTDlpWrap(binaryPath);
  const stdout = await ytDlp.execPromise([videoUrl, '-g', '-f', 'ba']);
  return stdout.trim();
}

/**
 * Returns a readable stream of the raw audio data from YouTube.
 */
export async function getYtDlpAudioStream(videoUrl: string): Promise<any> {
  const binaryPath = await getOrCreateYtDlpBinary();
  const ytDlp = new YTDlpWrap(binaryPath);
  // Command: -f ba -o - (download best audio to stdout stream)
  return ytDlp.execStream([videoUrl, '-f', 'ba', '-o', '-']);
}

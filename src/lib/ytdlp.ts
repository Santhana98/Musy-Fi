import YTDlpWrap from 'yt-dlp-wrap';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import os from 'os';
import crypto from 'crypto';
import { Readable } from 'stream';

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
 * Resolves by downloading the audio to a temporary file via native child_process spawn
 * and returning a Readable file stream that cleans up the temporary file on close.
 */
export async function getYtDlpAudioStream(videoUrl: string): Promise<Readable> {
  const binaryPath = await getOrCreateYtDlpBinary();
  
  // Use Vercel's /tmp dir if in serverless environment, otherwise OS default tmpdir
  const tempDir = process.env.VERCEL ? '/tmp' : os.tmpdir();
  const tempFileName = `ytdlp-${crypto.randomBytes(8).toString('hex')}.m4a`;
  const tempFilePath = path.join(tempDir, tempFileName);

  console.log(`[ytdlp] Downloading ${videoUrl} to temp file ${tempFilePath}`);

  return new Promise((resolve, reject) => {
    // Spawn yt-dlp to download directly to the temp file
    const args = [videoUrl, '-f', '18/140/ba[ext=m4a]/ba', '-o', tempFilePath];
    const proc = spawn(binaryPath, args);

    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`[ytdlp] Download complete. Creating readable stream for ${tempFilePath}`);
        const stream = fs.createReadStream(tempFilePath);
        
        // Auto-cleanup temp file when stream is closed/finished
        stream.on('close', () => {
          fs.unlink(tempFilePath, (err) => {
            if (err) {
              console.error(`[ytdlp] Failed to delete temp file ${tempFilePath}:`, err);
            } else {
              console.log(`[ytdlp] Deleted temp file ${tempFilePath}`);
            }
          });
        });

        resolve(stream);
      } else {
        // Cleanup if temp file was partially created
        if (fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch (e) {}
        }
        reject(new Error(`yt-dlp process exited with code ${code}. Stderr: ${stderr}`));
      }
    });
  });
}

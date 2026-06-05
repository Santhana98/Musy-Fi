import { Innertube, Platform } from 'youtubei.js';
import { fetch, Headers, Request, Response } from 'undici';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

globalThis.fetch = fetch;
globalThis.Headers = Headers;
globalThis.Request = Request;
globalThis.Response = Response;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

Platform.load({
  eval: (code) => {
    return new Function(code)();
  }
});

const videoId = 'tKZmHEyYlbA';
const outputPath = path.join(__dirname, 'youtubei_test.m4a');

async function testYoutubei() {
  console.log(`Initializing Innertube...`);
  try {
    const yt = await Innertube.create();
    
    console.log(`Fetching info for video ${videoId}...`);
    const info = await yt.getBasicInfo(videoId);
    console.log(`Video title: ${info.basic_info.title}`);
    console.log(`Uploader: ${info.basic_info.author}`);
    console.log(`Duration: ${info.basic_info.duration}s`);

    console.log('Downloading audio stream...');
    // We get the audio-only stream
    const stream = await yt.download(videoId, {
      type: 'audio',
      quality: 'best',
      client: 'YTMUSIC'
    });

    const fileStream = fs.createWriteStream(outputPath);
    
    // Pipe the stream
    stream.pipe(fileStream);

    await new Promise((resolve, reject) => {
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
    });

    const stats = fs.statSync(outputPath);
    console.log(`✅ Success! Audio file downloaded via youtubei.js. Size: ${stats.size} bytes`);
    
    // Clean up
    fs.unlinkSync(outputPath);
  } catch (err) {
    console.error('❌ youtubei.js download failed:', err);
  }
}

testYoutubei();

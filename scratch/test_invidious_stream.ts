import fs from 'fs';
import path from 'path';

const videoId = 'tKZmHEyYlbA';
const INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://yt.chocolatemoo53.com',
  'https://invidious.f5.si',
  'https://inv.thepixora.com'
];

async function testInvidiousStream() {
  for (const instance of INSTANCES) {
    console.log(`\n--- Trying Invidious instance: ${instance} ---`);
    try {
      const apiUrl = `${instance}/api/v1/videos/${videoId}`;
      const res = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        throw new Error(`API Fetch HTTP Error ${res.status}`);
      }
      
      const data = await res.json();
      console.log(`✅ Fetched metadata: "${data.title}" by "${data.author}"`);

      const audioFormats = (data.adaptiveFormats || []).filter((f: any) => f.mimeType && f.mimeType.startsWith('audio/'));
      if (audioFormats.length === 0) {
        throw new Error('No audio formats found');
      }

      const bestAudio = audioFormats.find((f: any) => f.container === 'm4a' || f.mimeType.includes('mp4')) || audioFormats[0];
      let downloadUrl = bestAudio.url;
      
      if (downloadUrl.startsWith('/')) {
        downloadUrl = `${instance}${downloadUrl}`;
      } else if (downloadUrl.includes('googlevideo.com')) {
        const urlObj = new URL(downloadUrl);
        downloadUrl = `${instance}${urlObj.pathname}${urlObj.search}&local=true`;
      } else if (!downloadUrl.includes('local=true')) {
        downloadUrl += (downloadUrl.includes('?') ? '&' : '?') + 'local=true';
      }

      console.log(`Downloading stream from: ${downloadUrl.substring(0, 100)}...`);
      const downloadRes = await fetch(downloadUrl, { signal: AbortSignal.timeout(6000) });
      if (!downloadRes.ok) {
        throw new Error(`Download HTTP Error ${downloadRes.status}`);
      }

      const reader = downloadRes.body!.getReader();
      const { value } = await reader.read();
      console.log(`✅ Success! Received first chunk of size ${value?.length} bytes.`);
      return; // Success!
    } catch (err: any) {
      console.warn(`❌ Failed for ${instance}:`, err.message);
    }
  }
  console.error('\n❌ All Invidious instances failed.');
}

testInvidiousStream();

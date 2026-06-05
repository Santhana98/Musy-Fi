import { Innertube, Platform } from 'youtubei.js';

// Providing a custom JavaScript interpreter before Innertube.create()
Platform.shim.eval = async (data, env) => {
  const code = `${data.output}\nreturn { ...env }`;
  return new Function('env', code)(env);
};

const videoId = 'tKZmHEyYlbA';

async function test() {
  console.log('Initializing Innertube...');
  try {
    const yt = await Innertube.create();
    console.log('Fetching info...');
    const info = await yt.getBasicInfo(videoId);
    console.log(`Video title: ${info.basic_info.title}`);
    console.log('Downloading...');
    
    // We get the audio-only stream
    const stream = await yt.download(videoId, {
      type: 'audio',
      quality: 'best',
      client: 'YTMUSIC'
    });
    
    console.log('Stream resolved! Reading first chunk...');
    
    const reader = stream.getReader();
    const { value } = await reader.read();
    
    console.log(`✅ Success! Audio file download succeeded via Innertube. First chunk size: ${value?.length} bytes`);
  } catch (err: any) {
    console.error('❌ Innertube download failed:', err.message || err);
  }
}

test();

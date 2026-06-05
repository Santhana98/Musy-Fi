import { resolveYoutubeMetadata, resolveYoutubeAudioStream, resolveYoutubeDirectUrl } from '../src/lib/youtubeResolver';
import fs from 'fs';
import path from 'path';

const testUrl = 'https://www.youtube.com/watch?v=tKZmHEyYlbA';

async function runTest() {
  console.log('=== TESTING YOUTUBE RESOLVER ===');
  console.log(`Test URL: ${testUrl}\n`);

  // 1. Test Metadata Resolution
  try {
    console.log('Step 1: Testing Metadata Resolution...');
    const metadata = await resolveYoutubeMetadata(testUrl);
    console.log('✅ Metadata Resolution Succeeded!');
    console.log(JSON.stringify(metadata, null, 2));
  } catch (err: any) {
    console.error('❌ Metadata Resolution Failed:', err.message);
  }

  console.log('\n----------------------------------------\n');

  // 2. Test Direct Stream URL Resolution
  try {
    console.log('Step 2: Testing Direct Stream URL Resolution...');
    const directUrl = await resolveYoutubeDirectUrl(testUrl);
    console.log('✅ Direct URL Resolution Succeeded!');
    console.log(`Direct URL (first 150 chars): ${directUrl.substring(0, 150)}...`);
  } catch (err: any) {
    console.error('❌ Direct URL Resolution Failed:', err.message);
  }

  console.log('\n----------------------------------------\n');

  // 3. Test Audio Stream Downloading
  try {
    console.log('Step 3: Testing Audio Stream Downloading...');
    const stream = await resolveYoutubeAudioStream(testUrl);
    console.log('✅ Stream Request Succeeded! Reading first chunk...');
    
    let chunkCount = 0;
    let totalBytes = 0;

    for await (const chunk of stream) {
      chunkCount++;
      totalBytes += chunk.length;
      if (chunkCount === 1) {
        console.log(`✅ Received first chunk of size ${chunk.length} bytes.`);
      }
      if (totalBytes >= 50 * 1024) {
        console.log(`✅ Successfully streamed over 50KB (${totalBytes} bytes). Stopping stream.`);
        break;
      }
    }
    
    console.log('✅ Stream test finished successfully.');
  } catch (err: any) {
    console.error('❌ Audio Stream Downloading Failed:', err.message);
  }
}

runTest();

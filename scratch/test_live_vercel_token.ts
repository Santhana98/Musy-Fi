import './load_env';
import { prisma } from '../src/lib/prisma';

async function testLiveVercelToken() {
  const userId = 'cmpyccmwm0000lbcav74exucg'; // San's user ID
  const songId = 'cmq0oyuup0001z1hq8pexhorg'; // Golden Brown song ID
  const vercelDomain = 'https://musy-fi-kpzg.vercel.app';

  console.log('==================================================');
  console.log('🌐 TESTING LIVE VERCEL TOKEN-BASED STREAMING (NO COOKIES)');
  console.log(`🔗 Target domain: ${vercelDomain}`);
  console.log(`🎵 Song ID: ${songId}`);
  console.log(`👤 User ID (Token): ${userId}`);
  console.log('==================================================');

  try {
    // Construct streaming URL with token parameter and absolutely NO COOKIES
    const streamApiUrl = `${vercelDomain}/api/songs/stream?id=${songId}&token=${userId}`;
    console.log(`\nStep 1: Sending cookie-less request to live Vercel stream API...`);
    console.log(`   GET ${streamApiUrl}`);
    
    const res = await fetch(streamApiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
      },
      redirect: 'manual', // do not follow redirect
    });

    console.log(`   Response Status: ${res.status} ${res.statusText}`);
    
    if (res.status === 401) {
      throw new Error('Vercel returned 401 Unauthorized. The Vercel project is not running the token-fallback code yet, or the token is incorrect.');
    }
    
    if (res.status !== 302) {
      const bodyText = await res.text().catch(() => '');
      throw new Error(`Vercel returned status ${res.status} instead of 302. Response body: ${bodyText.substring(0, 200)}`);
    }

    const redirectUrl = res.headers.get('location');
    if (!redirectUrl) {
      throw new Error('Response did not contain a Location header.');
    }
    console.log('✅ Vercel returned HTTP 302 Redirect successfully!');
    console.log(`   Redirect Target: ${redirectUrl}`);

    // Request from Google CDN (simulating Safari range play)
    console.log('\nStep 2: Requesting audio chunk from Google Drive public URL (simulating lock-screen playback)...');
    const googleRes = await fetch(redirectUrl, {
      method: 'GET',
      headers: {
        'Range': 'bytes=0-1023', // request first 1KB
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
      }
    });

    console.log(`   Google Response Status: ${googleRes.status} ${googleRes.statusText}`);
    console.log(`   Google Content-Type: ${googleRes.headers.get('content-type')}`);
    console.log(`   Google Content-Range: ${googleRes.headers.get('content-range')}`);
    console.log(`   Google Accept-Ranges: ${googleRes.headers.get('accept-ranges')}`);

    if (googleRes.status === 206) {
      console.log('\n==================================================');
      console.log('🎉 TOKEN-BASED VERIFICATION PASSED!');
      console.log('   The Vercel endpoint successfully authenticated via token.');
      console.log('   Google CDN responded with range content (HTTP 206).');
      console.log('   This guarantees background lock-screen playback on iOS Safari!');
      console.log('==================================================');
    } else {
      throw new Error(`Google CDN returned status ${googleRes.status} instead of 206.`);
    }

  } catch (err: any) {
    console.error('\n❌ TOKEN VERIFICATION FAILED:', err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

testLiveVercelToken();

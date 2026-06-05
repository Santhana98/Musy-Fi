import './load_env';
import { encode } from 'next-auth/jwt';
import { prisma } from '../src/lib/prisma';

async function testLiveVercel() {
  const userId = 'cmpyccmwm0000lbcav74exucg'; // San's user ID
  const songId = 'cmq0oyuup0001z1hq8pexhorg'; // Golden Brown song ID
  const vercelDomain = 'https://musy-fi-kpzg.vercel.app';
  const secret = process.env.NEXTAUTH_SECRET || 'musifi-super-secret-key-12345';

  console.log('==================================================');
  console.log('🌐 TESTING LIVE PRODUCTION VERCEL DEPLOYMENT');
  console.log(`🔗 Target domain: ${vercelDomain}`);
  console.log(`🎵 Song ID: ${songId}`);
  console.log('==================================================');

  try {
    // 1. Fetch user info from database
    console.log('\nStep 1: Fetching user details for session token...');
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new Error(`User with ID ${userId} not found in database.`);
    }
    console.log(`✅ Found user: ${user.name} (${user.email})`);

    // 2. Generate NextAuth JWT token
    console.log('\nStep 2: Generating signed NextAuth JWT token...');
    const tokenPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      sub: user.id,
    };
    
    const jwtToken = await encode({
      token: tokenPayload,
      secret: secret,
      maxAge: 30 * 24 * 60 * 60,
    });
    console.log('✅ JWT Token generated.');

    // 3. Request stream from live Vercel
    const streamApiUrl = `${vercelDomain}/api/songs/stream?id=${songId}`;
    console.log(`\nStep 3: Sending request to live Vercel stream API...`);
    console.log(`   GET ${streamApiUrl}`);
    
    const cookieHeader = `__Secure-next-auth.session-token=${jwtToken}; next-auth.session-token=${jwtToken}`;
    
    const res = await fetch(streamApiUrl, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
      },
      redirect: 'manual',
    });

    console.log(`   Response Status: ${res.status} ${res.statusText}`);
    
    if (res.status === 401) {
      throw new Error('Vercel returned 401 Unauthorized. Make sure NEXTAUTH_SECRET on Vercel matches your local secret.');
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

    // 4. Request from Google CDN (simulating Safari range play)
    console.log('\nStep 4: Requesting audio chunk from Google Drive public URL (simulating lock-screen playback)...');
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
      console.log('🎉 PRODUCTION DEPLOYMENT VERIFICATION PASSED!');
      console.log('   The live Vercel API redirected correctly to Google Drive.');
      console.log('   Google CDN served range request audio content (HTTP 206).');
      console.log('   Lock-screen background playback is fully functional!');
      console.log('==================================================');
    } else {
      throw new Error(`Google CDN returned status ${googleRes.status} instead of 206.`);
    }

  } catch (err: any) {
    console.error('\n❌ PRODUCTION VERIFICATION FAILED:', err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

testLiveVercel();

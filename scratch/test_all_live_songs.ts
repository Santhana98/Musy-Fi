import './load_env';
import { encode } from 'next-auth/jwt';
import { prisma } from '../src/lib/prisma';

async function testAllSongs() {
  const userId = 'cmpyccmwm0000lbcav74exucg'; // San's user ID
  const vercelDomain = 'https://musy-fi-kpzg.vercel.app';
  const secret = process.env.NEXTAUTH_SECRET || 'musifi-super-secret-key-12345';

  console.log('==================================================');
  console.log('🔍 DIAGNOSTIC TEST: ALL SONGS STREAMING STATUS');
  console.log(`🔗 Live domain: ${vercelDomain}`);
  console.log('==================================================');

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new Error(`User with ID ${userId} not found.`);
    }

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
    const cookieHeader = `__Secure-next-auth.session-token=${jwtToken}; next-auth.session-token=${jwtToken}`;

    const songs = await prisma.song.findMany({
      where: { userId }
    });

    console.log(`Found ${songs.length} songs in user library. Testing each...`);

    for (const song of songs) {
      console.log(`\n🎵 Song: "${song.title}" (ID: ${song.id}, Type: ${song.type})`);
      const streamApiUrl = `${vercelDomain}/api/songs/stream?id=${song.id}`;
      
      try {
        const res = await fetch(streamApiUrl, {
          method: 'GET',
          headers: {
            'Cookie': cookieHeader,
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
            'Range': 'bytes=0-1023' // Request first 1KB
          },
          redirect: 'manual', // do not follow redirect
        });

        console.log(`   Vercel status: ${res.status} ${res.statusText}`);
        
        if (res.status === 302) {
          const redirectUrl = res.headers.get('location');
          console.log(`   👉 Redirect Location: ${redirectUrl}`);
          
          // Test fetching the redirected URL
          if (redirectUrl) {
            const redirectRes = await fetch(redirectUrl, {
              method: 'GET',
              headers: { 'Range': 'bytes=0-1023' }
            });
            console.log(`   👉 Google CDN Status: ${redirectRes.status} ${redirectRes.statusText}`);
            if (redirectRes.status === 206) {
              console.log('   ✅ Playback status: WORKING (Direct CDN Stream)');
            } else {
              console.log('   ❌ Playback status: FAILED (Google rejected stream)');
            }
          }
        } else if (res.status === 200 || res.status === 206) {
          console.log('   ✅ Playback status: WORKING (Buffered Stream)');
        } else {
          console.log('   ❌ Playback status: FAILED');
        }
      } catch (err: any) {
        console.error(`   ❌ Request failed: ${err.message}`);
      }
    }

  } catch (err: any) {
    console.error('❌ Diagnostic test failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAllSongs();

import './load_env';
import { encode } from 'next-auth/jwt';
import { prisma } from '../src/lib/prisma';

async function testLiveVercelAlternative() {
  const userId = 'cmpyccmwm0000lbcav74exucg'; // San's user ID
  const songId = 'cmq0oyuup0001z1hq8pexhorg'; // Golden Brown song ID
  const vercelDomain = 'https://musy-fi.vercel.app'; // Alternative domain
  const secret = process.env.NEXTAUTH_SECRET || 'musifi-super-secret-key-12345';

  console.log('==================================================');
  console.log('🌐 TESTING LIVE PRODUCTION VERCEL DEPLOYMENT (ALTERNATIVE)');
  console.log(`🔗 Target domain: ${vercelDomain}`);
  console.log(`🎵 Song ID: ${songId}`);
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

    const streamApiUrl = `${vercelDomain}/api/songs/stream?id=${songId}`;
    console.log(`Sending request to: ${streamApiUrl}`);
    
    const cookieHeader = `__Secure-next-auth.session-token=${jwtToken}; next-auth.session-token=${jwtToken}`;
    
    const res = await fetch(streamApiUrl, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
      },
      redirect: 'manual',
    });

    console.log(`Response Status: ${res.status} ${res.statusText}`);
    const redirectUrl = res.headers.get('location');
    console.log(`Redirect Target: ${redirectUrl}`);

  } catch (err: any) {
    console.error('❌ Failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testLiveVercelAlternative();

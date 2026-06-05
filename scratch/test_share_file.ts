import './load_env';
import { prisma } from '../src/lib/prisma';
import { getGoogleDriveClient } from '../src/lib/gdrive';

async function testShareFile() {
  const userId = 'cmpyccmwm0000lbcav74exucg'; // San's user ID
  const fileId = '1APXIH-9PzJ1jVs10aXE61ILUhcAvZofu'; // The Golden Brown song

  console.log('==================================================');
  console.log('🔗 SHARING GOOGLE DRIVE FILE FOR PUBLIC STREAM');
  console.log(`   File ID: ${fileId}`);
  console.log('==================================================');

  try {
    const drive = await getGoogleDriveClient(userId);
    if (!drive) {
      throw new Error('Google Drive client not authenticated');
    }

    // 1. Create permission: anyone with link can read
    console.log('\nStep 1: Setting file permission to "anyone with the link" (reader)...');
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
    console.log('✅ Permission successfully added.');

    // 2. Fetch the webContentLink
    console.log('\nStep 2: Retrieving file links...');
    const fileInfo = await drive.files.get({
      fileId: fileId,
      fields: 'webContentLink, webViewLink',
    });
    console.log(`   webContentLink: ${fileInfo.data.webContentLink}`);
    console.log(`   webViewLink: ${fileInfo.data.webViewLink}`);

    // 3. Test direct download stream using webContentLink (no authentication headers)
    const publicUrl = fileInfo.data.webContentLink;
    if (!publicUrl) {
      throw new Error('webContentLink is not available');
    }
    
    console.log('\nStep 3: Fetching stream from public webContentLink (without auth headers)...');
    const response = await fetch(publicUrl, {
      method: 'GET',
      headers: {
        'Range': 'bytes=0-1023', // request first 1KB
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
      }
    });

    console.log(`   Response Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    console.log(`   Content-Range: ${response.headers.get('content-range')}`);
    console.log(`   Accept-Ranges: ${response.headers.get('accept-ranges')}`);

    if (response.status === 206) {
      console.log('\n==================================================');
      console.log('🎉 SUCCESS! Public direct streaming works perfectly!');
      console.log('   We can redirect to the webContentLink, and it will play');
      console.log('   smoothly in the background without Vercel timeouts!');
      console.log('==================================================');
    } else {
      console.warn(`⚠️ Warning: Google returned status ${response.status} instead of 206.`);
      const text = await response.text().catch(() => '');
      console.log(`   Response text snippet: ${text.substring(0, 300)}`);
    }

  } catch (err: any) {
    console.error('\n❌ TEST FAILED:', err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

testShareFile();

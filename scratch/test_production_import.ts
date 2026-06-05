import fs from 'fs';
import path from 'path';

// Load environment variables
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
    if (match) {
      let key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    }
  });
}

import { saveAudioFile } from '../src/lib/storage';
import { resolveYoutubeAudioStream, resolveYoutubeMetadata } from '../src/lib/youtubeResolver';
import { prisma } from '../src/lib/prisma';

async function testProductionImport() {
  const videoUrl = 'https://www.youtube.com/watch?v=tKZmHEyYlbA';
  
  // Find a user in the DB to simulate with (e.g. the first user, or a specific userId)
  const user = await prisma.user.findFirst({
    include: {
      accounts: {
        where: { provider: 'google' }
      }
    }
  });

  if (!user) {
    console.error('❌ No user found in database. Create a user first.');
    return;
  }

  console.log(`Simulating import for User: ${user.name} (${user.email})`);
  
  const googleAccount = user.accounts[0];
  if (!googleAccount) {
    console.warn(`⚠️ User does not have a Google account connected. Will fall back to local storage.`);
  } else {
    console.log(`✅ Google account connected! Token expires at: ${googleAccount.expires_at}`);
  }

  try {
    // 1. Fetch metadata
    console.log('\n--- Step 1: Resolving YouTube Metadata ---');
    const metadata = await resolveYoutubeMetadata(videoUrl);
    console.log('✅ Resolved Metadata:', metadata);

    // 2. Resolve stream
    console.log('\n--- Step 2: Downloading Audio Stream ---');
    const stream = await resolveYoutubeAudioStream(videoUrl);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    console.log(`✅ Download completed: ${buffer.length} bytes.`);

    // 3. Upload to Google Drive / Local Storage
    console.log('\n--- Step 3: Saving Audio File (Google Drive Upload) ---');
    const uploadResult = await saveAudioFile(
      user.id,
      `${metadata.title.replace(/[^a-zA-Z0-9.-]/g, '_')}.m4a`,
      buffer,
      'audio/mp4',
      googleAccount?.access_token || undefined
    );

    console.log('✅ Save result:', uploadResult);

    // 4. Create database entry
    console.log('\n--- Step 4: Creating Database Song Entry ---');
    const song = await prisma.song.create({
      data: {
        title: metadata.title,
        artist: metadata.artist,
        type: uploadResult.storageType,
        sourceUrl: uploadResult.sourceUrl,
        duration: metadata.duration || 240, // fallback duration
        thumbnail: metadata.thumbnail,
        userId: user.id,
      },
    });
    console.log('✅ Database Song entry created successfully! ID:', song.id);

    console.log('\n=== E2E IMPORT TEST SUCCESSFUL ===');
  } catch (err: any) {
    console.error('\n❌ E2E IMPORT TEST FAILED:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testProductionImport();

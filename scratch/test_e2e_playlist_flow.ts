import './load_env';
import { prisma } from '../src/lib/prisma';
import { saveAudioFile, getAudioStream } from '../src/lib/storage';
import { getYtDlpAudioStream } from '../src/lib/ytdlp';
import { resolveYoutubeMetadata } from '../src/lib/youtubeResolver';

async function runE2ETest() {
  const userId = 'cmpyccmwm0000lbcav74exucg'; // San's user ID
  const videoUrl = 'https://www.youtube.com/watch?v=tKZmHEyYlbA';

  console.log('==================================================');
  console.log('🚀 STARTING E2E CONVERSION & PLAYLIST FLOW TEST');
  console.log('==================================================');

  try {
    // 1. Verify User exists
    console.log(`\nStep 1: Verifying user in database (ID: ${userId})...`);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { accounts: true }
    });
    if (!user) {
      throw new Error(`User with ID ${userId} not found in DB.`);
    }
    console.log(`✅ User verified: "${user.name}" (${user.email})`);
    console.log(`   Connected accounts: ${user.accounts.map(a => a.provider).join(', ')}`);

    // 2. Fetch/Create a Playlist
    console.log(`\nStep 2: Checking for playlists...`);
    let playlist = await prisma.playlist.findFirst({
      where: { userId }
    });

    if (!playlist) {
      console.log('ℹ️ No playlist found. Creating "My E2E Playlist"...');
      playlist = await prisma.playlist.create({
        data: {
          name: 'My E2E Playlist',
          description: 'Automatically created during Antigravity E2E flow test',
          userId
        }
      });
      console.log(`✅ Playlist created successfully! ID: ${playlist.id}`);
    } else {
      console.log(`✅ Found existing playlist: "${playlist.name}" (ID: ${playlist.id})`);
    }

    // 3. Resolve YouTube Metadata
    console.log(`\nStep 3: Resolving YouTube video metadata for ${videoUrl}...`);
    const metadata = await resolveYoutubeMetadata(videoUrl);
    console.log('✅ Metadata resolved successfully:');
    console.log(`   Title: ${metadata.title}`);
    console.log(`   Artist: ${metadata.artist}`);
    console.log(`   Thumbnail: ${metadata.thumbnail}`);

    // 4. Download audio using yt-dlp
    console.log(`\nStep 4: Downloading YouTube audio stream locally...`);
    const stream = await getYtDlpAudioStream(videoUrl);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    console.log(`✅ Download finished. Buffer size: ${buffer.length} bytes.`);
    if (buffer.length === 0) {
      throw new Error('Downloaded buffer is empty.');
    }

    // 5. Upload to Google Drive via saveAudioFile
    console.log(`\nStep 5: Uploading audio buffer to Google Drive...`);
    const fileName = `${metadata.title.replace(/[^a-zA-Z0-9.-]/g, '_') || 'track'}.m4a`;
    const uploadResult = await saveAudioFile(
      userId,
      fileName,
      buffer,
      'audio/mp4'
    );
    console.log('✅ Upload finished!');
    console.log('   Storage Type:', uploadResult.storageType);
    console.log('   Google Drive File ID (sourceUrl):', uploadResult.sourceUrl);

    if (uploadResult.storageType !== 'google') {
      console.warn('⚠️ Google Drive upload fell back to local storage! Check credentials.');
    }

    // 6. Save Song to Neon DB
    console.log(`\nStep 6: Saving Song record to the database...`);
    const song = await prisma.song.create({
      data: {
        title: metadata.title,
        artist: metadata.artist,
        type: uploadResult.storageType,
        sourceUrl: uploadResult.sourceUrl,
        thumbnail: metadata.thumbnail,
        duration: uploadResult.metadata.duration || 0,
        userId
      }
    });
    console.log(`✅ Song record saved: "${song.title}" (ID: ${song.id})`);

    // 7. Add Song to Playlist
    console.log(`\nStep 7: Adding the song to playlist "${playlist.name}"...`);
    
    // Find current max position
    const maxPos = await prisma.playlistSong.aggregate({
      where: { playlistId: playlist.id },
      _max: { position: true },
    });
    const nextPosition = (maxPos._max.position !== null ? maxPos._max.position : -1) + 1;

    const playlistSong = await prisma.playlistSong.create({
      data: {
        playlistId: playlist.id,
        songId: song.id,
        position: nextPosition
      }
    });
    console.log(`✅ Associated song with playlist (Position: ${playlistSong.position})`);

    // 8. Simulate Playback / Streaming
    console.log(`\nStep 8: Simulating streaming retrieval...`);
    const playbackInfo = await getAudioStream(userId, song.sourceUrl, song.type);
    console.log(`✅ Stream successfully retrieved!`);
    console.log(`   MimeType: ${playbackInfo.mimeType}`);
    console.log(`   File Size: ${playbackInfo.size} bytes`);

    // Read the first chunk to verify readability
    console.log('   Testing stream readability (reading first chunk)...');
    const readStream = playbackInfo.stream;
    
    await new Promise<void>((resolve, reject) => {
      let chunkCount = 0;
      let bytesRead = 0;
      
      readStream.on('data', (chunk) => {
        chunkCount++;
        bytesRead += chunk.length;
        if (chunkCount === 1) {
          console.log(`   [Stream Data] Successfully read first chunk of ${chunk.length} bytes.`);
        }
        // Destroy stream after reading a small amount to avoid downloading the entire file again
        if (bytesRead > 50 * 1024) {
          (readStream as any).destroy();
          resolve();
        }
      });

      readStream.on('end', () => {
        resolve();
      });

      readStream.on('error', (err) => {
        reject(err);
      });
    });

    console.log('==================================================');
    console.log('🎉 E2E CONVERSION & PLAYLIST FLOW TEST PASSED!');
    console.log('==================================================');

  } catch (err: any) {
    console.error('\n❌ E2E TEST FAILED:', err.message || err);
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

runE2ETest();

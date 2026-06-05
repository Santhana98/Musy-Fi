import './load_env';
import { prisma } from '../src/lib/prisma';
import { saveAudioFile } from '../src/lib/storage';
import { getYtDlpAudioStream } from '../src/lib/ytdlp';
import { resolveYoutubeMetadata } from '../src/lib/youtubeResolver';

async function importSong() {
  const userId = 'cmpyccmwm0000lbcav74exucg'; // San's user ID
  const videoUrl = 'https://youtu.be/6spvBOXZd5M'; // User requested URL

  console.log('==================================================');
  console.log('🎵 IMPORTING SPECIFIC SONG');
  console.log(`📹 URL: ${videoUrl}`);
  console.log('==================================================');

  try {
    // 1. Verify User exists
    console.log(`\nStep 1: Verifying user...`);
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      throw new Error(`User with ID ${userId} not found.`);
    }
    console.log(`✅ User verified: "${user.name}"`);

    // 2. Fetch Playlist
    console.log(`\nStep 2: Finding playlist...`);
    let playlist = await prisma.playlist.findFirst({
      where: { userId }
    });

    if (!playlist) {
      console.log('ℹ️ No playlist found. Creating "My Playlist"...');
      playlist = await prisma.playlist.create({
        data: {
          name: 'My Playlist',
          description: 'My favorite songs',
          userId
        }
      });
      console.log(`✅ Playlist created! ID: ${playlist.id}`);
    } else {
      console.log(`✅ Using playlist: "${playlist.name}" (ID: ${playlist.id})`);
    }

    // 3. Resolve Metadata
    console.log(`\nStep 3: Resolving metadata...`);
    const metadata = await resolveYoutubeMetadata(videoUrl);
    console.log('✅ Metadata resolved:');
    console.log(`   Title: ${metadata.title}`);
    console.log(`   Artist: ${metadata.artist}`);
    console.log(`   Thumbnail: ${metadata.thumbnail}`);

    // 4. Download Audio
    console.log(`\nStep 4: Downloading YouTube audio...`);
    const stream = await getYtDlpAudioStream(videoUrl);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    console.log(`✅ Download complete. Size: ${buffer.length} bytes.`);

    // 5. Upload to Google Drive
    console.log(`\nStep 5: Uploading to Google Drive...`);
    const fileName = `${metadata.title.replace(/[^a-zA-Z0-9.-]/g, '_') || 'track'}.m4a`;
    const uploadResult = await saveAudioFile(
      userId,
      fileName,
      buffer,
      'audio/mp4'
    );
    console.log('✅ Upload finished!');
    console.log('   Storage Type:', uploadResult.storageType);
    console.log('   Google Drive File ID:', uploadResult.sourceUrl);

    if (uploadResult.storageType !== 'google') {
      throw new Error('Upload fell back to local storage! We need Google Drive storage for this song.');
    }

    // 6. Save Song to Neon DB
    console.log(`\nStep 6: Saving Song record...`);
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
    console.log(`✅ Song record saved! ID: ${song.id}`);

    // 7. Add Song to Playlist
    console.log(`\nStep 7: Adding to playlist...`);
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
    console.log(`✅ Successfully added "${song.title}" to "${playlist.name}" at Position ${playlistSong.position}!`);
    console.log('==================================================');
    console.log('🎉 SONG IMPORT SUCCESSFUL!');
    console.log('==================================================');

  } catch (err: any) {
    console.error('\n❌ IMPORT FAILED:', err.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importSong();

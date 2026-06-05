import './load_env';
import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';
import { getGoogleDriveClient } from '../src/lib/gdrive';
import { saveAudioFile } from '../src/lib/storage';
import { getYtDlpAudioStream } from '../src/lib/ytdlp';

async function recoverAllSongs() {
  const userId = 'cmpyccmwm0000lbcav74exucg'; // San's user ID
  const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'local_storage');

  console.log('==================================================');
  console.log('🛠️ DATABASE LIBRARY RECOVERY & MIGRATION SCRIPT');
  console.log('==================================================');

  try {
    const drive = await getGoogleDriveClient(userId);
    if (!drive) {
      throw new Error('Google Drive client not authenticated. Check OAuth tokens.');
    }

    const songs = await prisma.song.findMany({
      where: { userId }
    });

    console.log(`Found ${songs.length} total songs in user library. Scanning for broken tracks...`);

    for (const song of songs) {
      console.log(`\n--------------------------------------------------`);
      console.log(`🎵 Song: "${song.title}" (ID: ${song.id}, Type: ${song.type})`);

      // Case 1: Google Drive song - Ensure public permission is set
      if (song.type === 'google') {
        console.log(`👉 Google Drive track. Ensuring public read permission is set...`);
        try {
          await drive.permissions.create({
            fileId: song.sourceUrl,
            requestBody: {
              role: 'reader',
              type: 'anyone',
            },
          });
          console.log(`✅ Google Drive permissions verified/set.`);
        } catch (err: any) {
          console.log(`ℹ️ Permissions check info: ${err.message}`);
        }
      }

      // Case 2: Local MP3 song - Upload to Google Drive and update DB
      else if (song.type === 'mp3') {
        console.log(`👉 Local MP3 track. Searching for local file...`);
        const filePath = path.join(LOCAL_STORAGE_DIR, song.sourceUrl);
        if (fs.existsSync(filePath)) {
          console.log(`✅ Local file found at ${filePath}. Uploading to Google Drive...`);
          try {
            const buffer = fs.readFileSync(filePath);
            const uploadResult = await saveAudioFile(
              userId,
              `${song.title.replace(/[^a-zA-Z0-9.-]/g, '_')}.m4a`,
              buffer,
              'audio/mp4'
            );

            console.log(`✅ Uploaded to Google Drive. File ID: ${uploadResult.sourceUrl}`);

            // Update database record to type: google
            await prisma.song.update({
              where: { id: song.id },
              data: {
                type: 'google',
                sourceUrl: uploadResult.sourceUrl
              }
            });
            console.log(`✅ Neon DB record updated to "google" type.`);
          } catch (uploadErr: any) {
            console.error(`❌ Failed to upload local file: ${uploadErr.message}`);
          }
        } else {
          console.warn(`❌ Local file not found on disk at ${filePath}. Skipping.`);
        }
      }

      // Case 3: YouTube song - Download using local yt-dlp, upload to Google Drive, update DB
      else if (song.type === 'youtube') {
        console.log(`👉 YouTube track. Resolving URL...`);
        const videoUrl = `https://www.youtube.com/watch?v=${song.sourceUrl}`;
        console.log(`📹 URL: ${videoUrl}`);

        try {
          console.log(`   Downloading audio stream locally via yt-dlp...`);
          const stream = await getYtDlpAudioStream(videoUrl);
          const chunks: Buffer[] = [];
          for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk));
          }
          const buffer = Buffer.concat(chunks);
          console.log(`   Download finished. Size: ${buffer.length} bytes.`);

          if (buffer.length === 0) {
            throw new Error('Downloaded buffer is empty.');
          }

          console.log(`   Uploading audio buffer to Google Drive...`);
          const uploadResult = await saveAudioFile(
            userId,
            `${song.title.replace(/[^a-zA-Z0-9.-]/g, '_') || 'track'}.m4a`,
            buffer,
            'audio/mp4'
          );

          console.log(`   Uploaded to Google Drive. File ID: ${uploadResult.sourceUrl}`);

          // Update database record to type: google
          await prisma.song.update({
            where: { id: song.id },
            data: {
              type: 'google',
              sourceUrl: uploadResult.sourceUrl
            }
          });
          console.log(`✅ Neon DB record successfully migrated to "google" type.`);

        } catch (ytErr: any) {
          console.error(`❌ Failed to download/migrate YouTube video: ${ytErr.message}`);
        }
      }
    }

    console.log('\n==================================================');
    console.log('🎉 SYSTEM RECOVERY & LIBRARY MIGRATION COMPLETED!');
    console.log('==================================================');

  } catch (err: any) {
    console.error('\n❌ RECOVERY SCRIPT FAILED:', err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

recoverAllSongs();

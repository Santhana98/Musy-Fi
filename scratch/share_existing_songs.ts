import './load_env';
import { prisma } from '../src/lib/prisma';
import { getGoogleDriveClient } from '../src/lib/gdrive';

async function shareExistingSongs() {
  const userId = 'cmpyccmwm0000lbcav74exucg'; // San's user ID

  console.log('==================================================');
  console.log('🔄 MIGRATING EXISTING GOOGLE DRIVE SONGS');
  console.log('==================================================');

  try {
    const googleSongs = await prisma.song.findMany({
      where: {
        userId,
        type: 'google'
      }
    });

    console.log(`Found ${googleSongs.length} Google Drive songs in database.`);

    const drive = await getGoogleDriveClient(userId);
    if (!drive) {
      throw new Error('Google Drive client not authenticated');
    }

    for (const song of googleSongs) {
      console.log(`\nProcessing song: "${song.title}"`);
      console.log(`   File ID: ${song.sourceUrl}`);
      try {
        await drive.permissions.create({
          fileId: song.sourceUrl,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
        console.log(`✅ File shared successfully.`);
      } catch (err: any) {
        console.warn(`⚠️ Failed to set permission (it might already be shared): ${err.message}`);
      }
    }

    console.log('\n==================================================');
    console.log('🎉 ALL EXISTING SONGS MIGRATED SUCCESSFULLY!');
    console.log('==================================================');

  } catch (err: any) {
    console.error('\n❌ MIGRATION FAILED:', err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

shareExistingSongs();

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
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

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const userId = 'cmpyccmwm0000lbcav74exucg'; // San's userId
    console.log(`Checking playlists for user ${userId}...`);
    const playlists = await prisma.playlist.findMany({
      where: { userId },
      include: {
        songs: {
          include: {
            song: true
          }
        }
      }
    });

    console.log(`Found ${playlists.length} playlists:`);
    for (const p of playlists) {
      console.log(`\nPlaylist: ${p.name} (ID: ${p.id})`);
      console.log(`Description: ${p.description}`);
      console.log(`Songs count: ${p.songs.length}`);
      for (const ps of p.songs) {
        console.log(`  - Song ID: ${ps.song.id}, Title: ${ps.song.title}, Type: ${ps.song.type}, SourceUrl: ${ps.song.sourceUrl}`);
      }
    }
  } catch (err) {
    console.error("Error listing playlists:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

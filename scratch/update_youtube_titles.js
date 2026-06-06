const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
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

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runMigration() {
  try {
    console.log('Fetching songs from database...');
    const songs = await prisma.song.findMany();
    
    // Filter for songs with titles matching "YouTube Track (ID)"
    const ytSongs = songs.filter(song => {
      return song.title.startsWith('YouTube Track (') && song.title.endsWith(')');
    });
    
    console.log(`Found ${ytSongs.length} songs requiring update.`);
    if (ytSongs.length === 0) {
      console.log('No songs to update. Exiting.');
      return;
    }
    
    let updatedCount = 0;
    let failedCount = 0;
    
    for (const song of ytSongs) {
      // Extract video ID inside parentheses
      const match = song.title.match(/^YouTube Track \(([^)]+)\)$/);
      if (!match) {
        console.warn(`Could not parse video ID from title: "${song.title}". Skipping.`);
        failedCount++;
        continue;
      }
      
      const videoId = match[1];
      const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const noembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(ytUrl)}`;
      
      console.log(`\nProcessing Song ID: ${song.id}`);
      console.log(`Old Title: "${song.title}"`);
      console.log(`Extracting Video ID: ${videoId}`);
      
      try {
        const res = await fetch(noembedUrl);
        if (!res.ok) {
          throw new Error(`Failed to fetch from Noembed (status ${res.status})`);
        }
        
        const data = await res.json();
        if (data.error) {
          throw new Error(`Noembed error: ${data.error}`);
        }
        
        const newTitle = data.title || song.title;
        let newArtist = data.author_name || song.artist;
        
        // Clean up "- Topic" suffix often present in YouTube artists
        if (newArtist.endsWith(' - Topic')) {
          newArtist = newArtist.replace(' - Topic', '');
        }
        
        console.log(`Resolved Title: "${newTitle}"`);
        console.log(`Resolved Artist: "${newArtist}"`);
        
        await prisma.song.update({
          where: { id: song.id },
          data: {
            title: newTitle,
            artist: newArtist
          }
        });
        
        console.log('Database updated successfully.');
        updatedCount++;
      } catch (err) {
        console.error(`Failed to update song "${song.title}":`, err.message);
        failedCount++;
      }
      
      // Sleep a bit to avoid hitting rate limits
      await delay(1000);
    }
    
    console.log(`\n=== Migration Complete ===`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Failed/Skipped: ${failedCount}`);
    
  } catch (err) {
    console.error('Error during migration run:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();

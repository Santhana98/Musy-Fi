const fs = require('fs');
const path = require('path');

// Load environment variables
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
const { Innertube, Platform } = require('youtubei.js');

Platform.shim.eval = async (data) => {
  return new Function(data.output || data)();
};

async function getInnertube() {
  return await Innertube.create();
}

async function main() {
  console.log("=== FIXING YOUTUBE SONG TITLES ===");
  
  try {
    const yt = await getInnertube();
    
    // Find all songs that have the "YouTube Track (" generic title
    const songs = await prisma.song.findMany({
      where: {
        title: {
          startsWith: "YouTube Track ("
        }
      }
    });

    console.log(`Found ${songs.length} songs with generic titles. Processing...`);

    for (const song of songs) {
      console.log(`\nProcessing Song ID: ${song.id}, Title: "${song.title}"`);
      
      let videoId = null;
      
      // 1. Try to extract video ID from type/sourceUrl first
      if (song.type === 'youtube') {
        videoId = song.sourceUrl;
      } 
      
      // 2. If not youtube type, extract video ID from thumbnail URL
      if (!videoId && song.thumbnail) {
        const match = song.thumbnail.match(/(?:vi|vi_webp)\/([a-zA-Z0-9_-]{11})/);
        if (match) {
          videoId = match[1];
        }
      }

      if (!videoId) {
        console.warn(`⚠️ Could not determine video ID for song: "${song.title}"`);
        continue;
      }

      console.log(`Detected YouTube Video ID: ${videoId}`);

      try {
        console.log(`Fetching metadata for ${videoId} using youtubei.js...`);
        const info = await yt.getBasicInfo(videoId);
        
        if (info && info.basic_info) {
          const realTitle = info.basic_info.title;
          const realArtist = info.basic_info.author || 'YouTube';
          const realDuration = info.basic_info.duration || song.duration;
          
          if (realTitle) {
            console.log(`✅ Found Real Title: "${realTitle}" by "${realArtist}" (${realDuration}s)`);
            
            // Update database record
            await prisma.song.update({
              where: { id: song.id },
              data: {
                title: realTitle,
                artist: realArtist,
                duration: realDuration
              }
            });
            console.log(`🎉 Neon DB updated successfully!`);
          } else {
            console.warn(`⚠️ Metadata title is empty for ${videoId}`);
          }
        }
      } catch (ytErr) {
        console.error(`❌ Failed to fetch metadata for ${videoId}:`, ytErr.message || ytErr);
      }
    }

    console.log("\n=== COMPLETED FIXING YOUTUBE SONG TITLES ===");
  } catch (err) {
    console.error("Fatal error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

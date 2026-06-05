const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'MusicPlayer.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// 1. Add useSession import
const importTarget = "import { usePlayer, Song } from '@/context/PlayerContext';";
const importReplacement = "import { usePlayer, Song } from '@/context/PlayerContext';\nimport { useSession } from 'next-auth/react';";

if (content.includes(importTarget)) {
  content = content.replace(importTarget, importReplacement);
  console.log("✅ Import added.");
} else {
  console.error("❌ Target import not found.");
}

// 2. Initialize useSession hook inside MusicPlayer
const hookTarget = "export default function MusicPlayer() {\n  const {\n    currentTrack,";
const hookReplacement = "export default function MusicPlayer() {\n  const { data: session } = useSession();\n  const {\n    currentTrack,";

if (content.includes(hookTarget)) {
  content = content.replace(hookTarget, hookReplacement);
  console.log("✅ Session hook added.");
} else {
  console.error("❌ Target hook site not found.");
}

// 3. Update streamUrl calculation
const streamUrlTarget = "  const streamUrl = `/api/songs/stream?id=${currentTrack.id}`;";
const streamUrlReplacement = `  let streamUrl = '';
  if (currentTrack) {
    const token = (session as any)?.user?.accessToken;
    if (currentTrack.type === 'google' && token) {
      streamUrl = \`https://www.googleapis.com/drive/v3/files/\${currentTrack.sourceUrl}?alt=media&access_token=\${token}\`;
    } else {
      streamUrl = \`/api/songs/stream?id=\${currentTrack.id}\`;
    }
  }`;

if (content.includes(streamUrlTarget)) {
  content = content.replace(streamUrlTarget, streamUrlReplacement);
  console.log("✅ streamUrl calculation updated.");
} else {
  console.error("❌ streamUrl target not found.");
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("🎉 MusicPlayer.tsx patched successfully!");

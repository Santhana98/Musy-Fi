const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'MusicPlayer.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// 1. Remove useSession import
const importTarget = "import { usePlayer, Song } from '@/context/PlayerContext';\nimport { useSession } from 'next-auth/react';";
const importReplacement = "import { usePlayer, Song } from '@/context/PlayerContext';";

if (content.includes(importTarget)) {
  content = content.replace(importTarget, importReplacement);
  console.log("✅ Import removed.");
}

// 2. Remove session hook
const hookTarget = "export default function MusicPlayer() {\n  const { data: session } = useSession();\n  const {";
const hookReplacement = "export default function MusicPlayer() {\n  const {";

if (content.includes(hookTarget)) {
  content = content.replace(hookTarget, hookReplacement);
  console.log("✅ Session hook removed.");
}

// 3. Restore streamUrl
const streamUrlTarget = `  let streamUrl = '';
  if (currentTrack) {
    const token = (session as any)?.user?.accessToken;
    if (currentTrack.type === 'google' && token) {
      streamUrl = \`https://www.googleapis.com/drive/v3/files/\${currentTrack.sourceUrl}?alt=media&access_token=\${token}\`;
    } else {
      streamUrl = \`/api/songs/stream?id=\${currentTrack.id}\`;
    }
  }`;
const streamUrlReplacement = "  const streamUrl = `/api/songs/stream?id=${currentTrack.id}`;";

if (content.includes(streamUrlTarget)) {
  content = content.replace(streamUrlTarget, streamUrlReplacement);
  console.log("✅ streamUrl restored.");
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("🎉 MusicPlayer.tsx restored successfully!");

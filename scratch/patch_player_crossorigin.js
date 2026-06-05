const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'MusicPlayer.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

const audioTarget = `      {!isVideoTrack && currentTrack && (
        <audio
          ref={audioRef}
          src={streamUrl}
          onTimeUpdate={handleAudioTimeUpdate}`;

const audioReplacement = `      {!isVideoTrack && currentTrack && (
        <audio
          ref={audioRef}
          src={streamUrl}
          crossOrigin="anonymous"
          onTimeUpdate={handleAudioTimeUpdate}`;

if (content.includes(audioTarget)) {
  content = content.replace(audioTarget, audioReplacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("✅ MusicPlayer.tsx updated successfully with crossOrigin=\"anonymous\"!");
} else {
  console.error("❌ Audio target block not found in MusicPlayer.tsx.");
}

const fs = require('fs');
const path = require('path');

// 1. Patch src/components/MusicPlayer.tsx
const playerPath = path.join(__dirname, '..', 'src', 'components', 'MusicPlayer.tsx');
let playerContent = fs.readFileSync(playerPath, 'utf8');

// Normalize line endings to LF
playerContent = playerContent.replace(/\r\n/g, '\n');

// Add useSession import
const importTarget = "import { usePlayer, Song } from '@/context/PlayerContext';";
const importReplacement = "import { usePlayer, Song } from '@/context/PlayerContext';\nimport { useSession } from 'next-auth/react';";

if (playerContent.includes(importTarget)) {
  playerContent = playerContent.replace(importTarget, importReplacement);
  console.log("✅ MusicPlayer: Import added.");
} else {
  console.error("❌ MusicPlayer: Import target not found.");
}

// Add hook initialization
const hookTarget = "export default function MusicPlayer() {\n  const {\n    currentTrack,";
const hookReplacement = "export default function MusicPlayer() {\n  const { data: session } = useSession();\n  const {\n    currentTrack,";

if (playerContent.includes(hookTarget)) {
  playerContent = playerContent.replace(hookTarget, hookReplacement);
  console.log("✅ MusicPlayer: Hook added.");
} else {
  console.error("❌ MusicPlayer: Hook target not found.");
}

// Update streamUrl to append token query parameter
const streamUrlTarget = "  const streamUrl = `/api/songs/stream?id=${currentTrack.id}`;";
const streamUrlReplacement = "  const token = (session?.user as any)?.id || '';\n  const streamUrl = `/api/songs/stream?id=${currentTrack.id}${token ? `&token=${token}` : ''}`;";

if (playerContent.includes(streamUrlTarget)) {
  playerContent = playerContent.replace(streamUrlTarget, streamUrlReplacement);
  console.log("✅ MusicPlayer: streamUrl updated.");
} else {
  console.error("❌ MusicPlayer: streamUrl target not found.");
}

fs.writeFileSync(playerPath, playerContent, 'utf8');


// 2. Patch src/app/api/songs/stream/route.ts
const routePath = path.join(__dirname, '..', 'src', 'app', 'api', 'songs', 'stream', 'route.ts');
let routeContent = fs.readFileSync(routePath, 'utf8');

// Normalize line endings to LF
routeContent = routeContent.replace(/\r\n/g, '\n');

const routeTarget = `export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = (session.user as any).id;`;

const routeReplacement = `export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const session = await getServerSession(authOptions);
    
    let userId = '';
    if (session && session.user && (session.user as any).id) {
      userId = (session.user as any).id;
    } else {
      // Fallback for iOS Safari / mobile range requests that strip cookies
      const queryToken = searchParams.get('token');
      if (queryToken) {
        userId = queryToken;
      }
    }

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Keep session check compatibility
    const songId = searchParams.get('id');`;

// Wait, let's verify if 'const songId = searchParams.get('id');' matches the original.
// Let's check route.ts lines 20-24 in original route.ts:
// "const userId = (session.user as any).id;
//  const { searchParams } = new URL(request.url);
//  const songId = searchParams.get('id');"
// Since our replacement replaces the session check and defines userId and songId:
const routeTarget2 = `    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const songId = searchParams.get('id');`;

const routeReplacement2 = `    const { searchParams } = new URL(request.url);
    const session = await getServerSession(authOptions);
    
    let userId = '';
    if (session && session.user && (session.user as any).id) {
      userId = (session.user as any).id;
    } else {
      // Fallback for iOS Safari / mobile range requests that strip cookies
      const queryToken = searchParams.get('token');
      if (queryToken) {
        userId = queryToken;
      }
    }

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const songId = searchParams.get('id');`;

if (routeContent.includes(routeTarget2)) {
  routeContent = routeContent.replace(routeTarget2, routeReplacement2);
  fs.writeFileSync(routePath, routeContent, 'utf8');
  console.log("✅ stream route.ts updated with token fallback auth!");
} else {
  console.error("❌ stream route.ts target not found.");
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    // Fetch songs, including whether they are liked by the current user
    const songs = await prisma.song.findMany({
      where: { userId },
      include: {
        likedBy: {
          where: { userId }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format songs to include isLiked flag
    const formattedSongs = songs.map(song => ({
      ...song,
      isLiked: song.likedBy.length > 0,
      likedBy: undefined // remove relation array from payload
    }));

    return NextResponse.json({ songs: formattedSongs });
  } catch (error: any) {
    console.error('Error fetching songs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

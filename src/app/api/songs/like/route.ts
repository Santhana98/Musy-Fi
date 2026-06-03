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

    // Fetch liked songs
    const likedSongs = await prisma.likedSong.findMany({
      where: { userId },
      include: {
        song: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const songs = likedSongs.map((ls) => ({
      ...ls.song,
      isLiked: true,
    }));

    return NextResponse.json({ songs });
  } catch (error: any) {
    console.error('Error fetching liked songs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { songId } = body;

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    // Toggle liked song
    const existingLike = await prisma.likedSong.findUnique({
      where: {
        userId_songId: { userId, songId },
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.likedSong.delete({
        where: {
          userId_songId: { userId, songId },
        },
      });
      return NextResponse.json({ success: true, isLiked: false });
    } else {
      // Like
      await prisma.likedSong.create({
        data: {
          userId,
          songId,
        },
      });
      return NextResponse.json({ success: true, isLiked: true });
    }
  } catch (error: any) {
    console.error('Error toggling like status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

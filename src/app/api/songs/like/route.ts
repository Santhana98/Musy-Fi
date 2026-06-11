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

    const songs = await prisma.song.findMany({
      where: { userId, liked: true },
      orderBy: { addedAt: 'desc' },
    });

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
    const { songId, id } = body;
    const targetId = songId || id;

    if (!targetId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    const song = await prisma.song.findFirst({ where: { id: targetId, userId } });
    if (!song) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updated = await prisma.song.update({
      where: { id: targetId },
      data: { liked: !song.liked },
    });

    return NextResponse.json({ success: true, isLiked: updated.liked, liked: updated.liked });
  } catch (error: any) {
    console.error('Error toggling like status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

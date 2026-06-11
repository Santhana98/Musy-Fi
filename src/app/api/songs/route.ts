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
      where: { userId },
      orderBy: { addedAt: 'desc' },
    });

    return NextResponse.json({ songs });
  } catch (error: any) {
    console.error('Error fetching songs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

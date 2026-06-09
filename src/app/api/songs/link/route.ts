import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const { title, artist, thumbnail, youtubeUrl, videoId, duration } = await req.json();

  if (!videoId || !youtubeUrl) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const existing = await prisma.song.findFirst({ where: { userId, videoId } });
  if (existing) return NextResponse.json({ song: existing, duplicate: true });

  const song = await prisma.song.create({
    data: { userId, title, artist, thumbnail, youtubeUrl, videoId, duration },
  });

  return NextResponse.json({ song });
}

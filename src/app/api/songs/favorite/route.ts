import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const { id } = await req.json();

  const song = await prisma.song.findFirst({ where: { id, userId } });
  if (!song) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.song.update({
    where: { id },
    data: { liked: !song.liked },
  });

  return NextResponse.json({ liked: updated.liked });
}

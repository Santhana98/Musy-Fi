import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const song = await prisma.song.findFirst({
    where: { id, userId: (session.user as any).id },
    select: { id: true, importStatus: true },
  });

  if (!song) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ importStatus: song.importStatus });
}

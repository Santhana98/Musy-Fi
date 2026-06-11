import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const song = await prisma.song.findUnique({ where: { id } });

    if (!song) return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    if (song.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await prisma.song.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Song deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting song:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

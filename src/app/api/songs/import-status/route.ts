import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/songs/import-status?id=<songId>
 * Polls the importStatus of a background YouTube → Drive conversion.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id as string;
    const songId = request.nextUrl.searchParams.get('id');
    if (!songId) return NextResponse.json({ error: 'id param required' }, { status: 400 });

    const song = await prisma.song.findUnique({
      where: { id: songId },
      select: { id: true, importStatus: true, importError: true, type: true, sourceUrl: true, duration: true, userId: true },
    });

    if (!song)              return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    if (song.userId !== userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    return NextResponse.json({
      id: song.id, importStatus: song.importStatus, importError: song.importError,
      type: song.type, sourceUrl: song.sourceUrl, duration: song.duration,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

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

    // Fetch song
    const song = await prisma.song.findUnique({
      where: { id },
    });

    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    // Check ownership
    if (song.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If local file, delete it from disk
    if (song.type === 'mp3') {
      const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'local_storage');
      const filePath = path.join(LOCAL_STORAGE_DIR, song.sourceUrl);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath).catch(err => {
          console.warn('Failed to delete physical file:', err);
        });
      }
    }

    // Delete from DB (cascades will clean up playlist_songs and liked_songs relations)
    await prisma.song.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Song deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting song:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

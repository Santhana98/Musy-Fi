import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playlistId } = await params;
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

    // Verify playlist ownership
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    if (playlist.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify song ownership / existence
    const song = await prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    // Check if song already in playlist
    const existingEntry = await prisma.playlistSong.findUnique({
      where: {
        playlistId_songId: { playlistId, songId },
      },
    });

    if (existingEntry) {
      return NextResponse.json({ success: true, message: 'Song already in playlist' });
    }

    // Find current max position
    const maxPos = await prisma.playlistSong.aggregate({
      where: { playlistId },
      _max: {
        position: true,
      },
    });

    const nextPosition = (maxPos._max.position !== null ? maxPos._max.position : -1) + 1;

    // Create entry
    const playlistSong = await prisma.playlistSong.create({
      data: {
        playlistId,
        songId,
        position: nextPosition,
      },
    });

    return NextResponse.json({ success: true, playlistSong });
  } catch (error: any) {
    console.error('Error adding song to playlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playlistId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const songId = searchParams.get('songId');

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    // Verify playlist ownership
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    if (playlist.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete relation
    await prisma.playlistSong.delete({
      where: {
        playlistId_songId: { playlistId, songId },
      },
    });

    // Reorder positions of remaining songs
    const remainingSongs = await prisma.playlistSong.findMany({
      where: { playlistId },
      orderBy: { position: 'asc' },
    });

    // Update positions sequentially
    for (let i = 0; i < remainingSongs.length; i++) {
      await prisma.playlistSong.update({
        where: {
          playlistId_songId: {
            playlistId: remainingSongs[i].playlistId,
            songId: remainingSongs[i].songId,
          },
        },
        data: {
          position: i,
        },
      });
    }

    return NextResponse.json({ success: true, message: 'Song removed from playlist' });
  } catch (error: any) {
    console.error('Error removing song from playlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playlistId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { songIds } = body; // Array of song IDs in the desired order

    if (!Array.isArray(songIds)) {
      return NextResponse.json({ error: 'songIds array is required' }, { status: 400 });
    }

    // Verify playlist ownership
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    if (playlist.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // First, delete relations for songs that are no longer in the playlist
    await prisma.playlistSong.deleteMany({
      where: {
        playlistId,
        songId: {
          notIn: songIds,
        },
      },
    });

    // Update positions
    await prisma.$transaction(
      songIds.map((songId, index) =>
        prisma.playlistSong.update({
          where: {
            playlistId_songId: { playlistId, songId },
          },
          data: {
            position: index,
          },
        })
      )
    );

    return NextResponse.json({ success: true, message: 'Playlist reordered successfully' });
  } catch (error: any) {
    console.error('Error reordering playlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

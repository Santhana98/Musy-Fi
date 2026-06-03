import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { saveAudioFile } from '@/lib/storage';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file type (must be audio)
    if (!file.type.startsWith('audio/')) {
      return NextResponse.json({ error: 'Uploaded file must be an audio track' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to Google Drive or Local Storage depending on connection status
    const uploadResult = await saveAudioFile(userId, file.name, buffer, file.type);

    // Create DB entry for the Song
    const song = await prisma.song.create({
      data: {
        title: uploadResult.metadata.title,
        artist: uploadResult.metadata.artist,
        type: uploadResult.storageType, // "google" or "mp3"
        sourceUrl: uploadResult.sourceUrl,
        duration: uploadResult.metadata.duration,
        thumbnail: uploadResult.metadata.thumbnail,
        userId: userId,
      },
    });

    return NextResponse.json({ success: true, song });
  } catch (error: any) {
    console.error('Error in upload route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

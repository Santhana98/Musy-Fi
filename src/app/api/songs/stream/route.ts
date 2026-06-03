import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAudioStream } from '@/lib/storage';
import { getGoogleDriveClient } from '@/lib/gdrive';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import ytdl from '@distube/ytdl-core';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const songId = searchParams.get('id');

    if (!songId) {
      return new NextResponse('Song ID is required', { status: 400 });
    }

    // Find song metadata in DB
    const song = await prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      return new NextResponse('Song not found', { status: 404 });
    }

    // Security: verify user owns this song
    if (song.userId !== userId) {
      return new NextResponse('Unauthorized to access this song', { status: 403 });
    }

    if (song.type === 'youtube' || song.type === 'vimeo') {
      return new NextResponse('Cannot stream video links directly', { status: 400 });
    }

    const range = request.headers.get('range');

    if (song.type === 'google') {
      const drive = await getGoogleDriveClient(userId);
      if (!drive) {
        return new NextResponse('Google Drive disconnected', { status: 400 });
      }

      // Fetch file info
      const fileMeta = await drive.files.get({
        fileId: song.sourceUrl,
        fields: 'size, mimeType',
      });

      const size = parseInt(fileMeta.data.size || '0', 10);
      const mimeType = fileMeta.data.mimeType || 'audio/mpeg';

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : size - 1;
        const chunksize = end - start + 1;

        const response = await drive.files.get(
          { fileId: song.sourceUrl, alt: 'media' },
          {
            responseType: 'stream',
            headers: { Range: `bytes=${start}-${end}` },
          }
        );

        const webStream = new ReadableStream({
          start(controller) {
            response.data.on('data', (chunk) => controller.enqueue(chunk));
            response.data.on('end', () => controller.close());
            response.data.on('error', (err) => controller.error(err));
          },
          cancel() {
            response.data.destroy();
          }
        });

        return new Response(webStream, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize.toString(),
            'Content-Type': mimeType,
          },
        });
      } else {
        const response = await drive.files.get(
          { fileId: song.sourceUrl, alt: 'media' },
          { responseType: 'stream' }
        );

        const webStream = new ReadableStream({
          start(controller) {
            response.data.on('data', (chunk) => controller.enqueue(chunk));
            response.data.on('end', () => controller.close());
            response.data.on('error', (err) => controller.error(err));
          },
          cancel() {
            response.data.destroy();
          }
        });

        return new Response(webStream, {
          status: 200,
          headers: {
            'Content-Length': size.toString(),
            'Content-Type': mimeType,
            'Accept-Ranges': 'bytes',
          },
        });
      }
    } else {
      // Local file stream
      const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'local_storage');
      const filePath = path.join(LOCAL_STORAGE_DIR, song.sourceUrl);

      if (!fs.existsSync(filePath)) {
        return new NextResponse('Audio file not found on disk', { status: 404 });
      }

      const stat = await fs.promises.stat(filePath);
      const size = stat.size;
      const mimeType = 'audio/mpeg';

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : size - 1;
        const chunksize = end - start + 1;

        const fileStream = fs.createReadStream(filePath, { start, end });
        
        const webStream = new ReadableStream({
          start(controller) {
            fileStream.on('data', (chunk) => controller.enqueue(chunk));
            fileStream.on('end', () => controller.close());
            fileStream.on('error', (err) => controller.error(err));
          },
          cancel() {
            fileStream.destroy();
          }
        });

        return new Response(webStream, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize.toString(),
            'Content-Type': mimeType,
          },
        });
      } else {
        const fileStream = fs.createReadStream(filePath);
        
        const webStream = new ReadableStream({
          start(controller) {
            fileStream.on('data', (chunk) => controller.enqueue(chunk));
            fileStream.on('end', () => controller.close());
            fileStream.on('error', (err) => controller.error(err));
          },
          cancel() {
            fileStream.destroy();
          }
        });

        return new Response(webStream, {
          status: 200,
          headers: {
            'Content-Length': size.toString(),
            'Content-Type': mimeType,
            'Accept-Ranges': 'bytes',
          },
        });
      }
    }
  } catch (error: any) {
    console.error('Error streaming file:', error);
    return new NextResponse(error.message || 'Error streaming audio file', { status: 500 });
  }
}

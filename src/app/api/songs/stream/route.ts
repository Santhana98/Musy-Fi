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
import { resolveYoutubeDirectUrl } from '@/lib/youtubeResolver';

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

    if (song.type === 'vimeo') {
      return new NextResponse('Cannot stream Vimeo links directly', { status: 400 });
    }

    const range = request.headers.get('range');

    if (song.type === 'youtube') {
      try {
        const videoUrl = `https://www.youtube.com/watch?v=${song.sourceUrl}`;
        const directUrl = await resolveYoutubeDirectUrl(videoUrl);

        const headers: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        };
        if (range) {
          headers['Range'] = range;
        }

        const response = await fetch(directUrl, { headers });

        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', 'audio/mp4');
        responseHeaders.set('Accept-Ranges', 'bytes');
        responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');

        const contentRange = response.headers.get('content-range');
        if (contentRange) {
          responseHeaders.set('Content-Range', contentRange);
        }

        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          responseHeaders.set('Content-Length', contentLength);
        }
        
        return new Response(response.body, {
          status: response.status,
          headers: responseHeaders,
        });
      } catch (err: any) {
        console.error('Failed to stream YouTube video:', err);
        return new NextResponse(`Failed to stream YouTube: ${err.message}`, { status: 500 });
      }
    }

    if (song.type === 'google') {
      const drive = await getGoogleDriveClient(userId);
      if (!drive) {
        return new NextResponse('Google Drive disconnected', { status: 400 });
      }

      // Fetch file info (this automatically triggers token refresh if expired)
      await drive.files.get({
        fileId: song.sourceUrl,
        fields: 'id',
      });

      // Get the fresh access token from the database
      const account = await prisma.account.findFirst({
        where: {
          userId,
          provider: 'google',
        },
      });

      const token = account?.access_token;
      if (!token) {
        return new NextResponse('Google Access Token not found', { status: 500 });
      }

      // Construct direct Google Drive streaming URL
      const directUrl = `https://www.googleapis.com/drive/v3/files/${song.sourceUrl}?alt=media&access_token=${token}`;

      // Redirect the client browser directly to Google Drive CDN
      return NextResponse.redirect(directUrl, { status: 302 });
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

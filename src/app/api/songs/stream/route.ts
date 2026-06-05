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

function getHeader(headers: any, name: string): string {
  if (!headers) return '';
  if (typeof headers.get === 'function') {
    return headers.get(name) || '';
  }
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || '';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const session = await getServerSession(authOptions);
    
    let userId = '';
    if (session && session.user && (session.user as any).id) {
      userId = (session.user as any).id;
    } else {
      // Fallback for iOS Safari / mobile range requests that strip cookies
      const queryToken = searchParams.get('token');
      if (queryToken) {
        userId = queryToken;
      }
    }

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

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

        // Instead of redirecting to the googlevideo.com CDN (which blocks the client due to IP-locking),
        // we proxy the request, passing through the Range header if requested.
        const requestHeaders: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        };
        if (range) {
          requestHeaders['Range'] = range;
        }

        const proxiedResponse = await fetch(directUrl, {
          headers: requestHeaders,
        });

        if (!proxiedResponse.ok) {
          throw new Error(`Upstream returned status ${proxiedResponse.status} ${proxiedResponse.statusText}`);
        }

        if (!proxiedResponse.body) {
          throw new Error('Response body is empty');
        }

        // Wrap the response body in a ReadableStream to stream it back to the client
        const webStream = new ReadableStream({
          start(controller) {
            const reader = proxiedResponse.body?.getReader();
            if (!reader) {
              controller.close();
              return;
            }
            const activeReader = reader;
            function push() {
              activeReader.read().then(({ done, value }) => {
                if (done) {
                  controller.close();
                  return;
                }
                controller.enqueue(value);
                push();
              }).catch(err => {
                controller.error(err);
              });
            }
            push();
          }
        });

        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', proxiedResponse.headers.get('content-type') || 'audio/mpeg');
        responseHeaders.set('Accept-Ranges', 'bytes');
        responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');

        const contentRange = proxiedResponse.headers.get('content-range');
        if (contentRange) {
          responseHeaders.set('Content-Range', contentRange);
        }

        const contentLength = proxiedResponse.headers.get('content-length');
        if (contentLength) {
          responseHeaders.set('Content-Length', contentLength);
        }

        return new Response(webStream, {
          status: proxiedResponse.status,
          headers: responseHeaders,
        });
      } catch (err: any) {
        console.error('Failed to proxy YouTube stream:', err);
        return new NextResponse(`Failed to stream YouTube: ${err.message}`, { status: 500 });
      }
    }

    if (song.type === 'google') {
      try {
        const drive = await getGoogleDriveClient(userId);
        if (!drive) {
          return new NextResponse('Google Drive client not authenticated', { status: 401 });
        }

        const requestHeaders: Record<string, string> = {};
        if (range) {
          requestHeaders['Range'] = range;
        }

        const driveResponse = await drive.files.get(
          { fileId: song.sourceUrl, alt: 'media' },
          { 
            responseType: 'stream',
            headers: requestHeaders,
          }
        );

        const nodeStream = driveResponse.data as any;
        const webStream = new ReadableStream({
          start(controller) {
            nodeStream.on('data', (chunk: any) => controller.enqueue(chunk));
            nodeStream.on('end', () => controller.close());
            nodeStream.on('error', (err: any) => controller.error(err));
          },
          cancel() {
            if (typeof nodeStream.destroy === 'function') {
              nodeStream.destroy();
            }
          }
        });

        const responseHeaders = new Headers();
        
        // Pass content type from Google, default to audio/mpeg
        const contentType = getHeader(driveResponse.headers, 'content-type') || 'audio/mpeg';
        responseHeaders.set('Content-Type', contentType);
        responseHeaders.set('Accept-Ranges', 'bytes');
        responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');

        const contentRange = getHeader(driveResponse.headers, 'content-range');
        if (contentRange) {
          responseHeaders.set('Content-Range', contentRange);
        }

        const contentLength = getHeader(driveResponse.headers, 'content-length');
        if (contentLength) {
          responseHeaders.set('Content-Length', contentLength);
        }
        
        return new Response(webStream, {
          status: driveResponse.status,
          headers: responseHeaders,
        });
      } catch (err: any) {
        console.error('Failed to proxy Google Drive stream:', err);
        return new NextResponse(`Failed to stream Google Drive: ${err.message}`, { status: 500 });
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

      // Dynamically resolve mimeType from the file extension
      const ext = path.extname(song.sourceUrl).toLowerCase();
      let mimeType = 'audio/mpeg';
      if (ext === '.wav') {
        mimeType = 'audio/wav';
      } else if (ext === '.m4a') {
        mimeType = 'audio/mp4';
      } else if (ext === '.aac') {
        mimeType = 'audio/aac';
      }

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

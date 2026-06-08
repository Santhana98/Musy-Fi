import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Readable } from 'stream';
import { resolveYoutubeMetadata } from '@/lib/youtubeResolver';
import { getGoogleDriveClient, getOrCreateMusyFiFolder } from '@/lib/gdrive';
import * as mm from 'music-metadata';

export const maxDuration = 60;

const MAX_IMPORT_SECONDS = 30 * 60; // 30 min

function getYoutubeId(url: string): string | null {
  const m = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
  return m && m[2].length === 11 ? m[2] : null;
}

function getVimeoId(url: string): string | null {
  const m = url.match(/(?:vimeo\.com\/)([0-9]+)/);
  return m ? m[1] : null;
}

// ─── Stream audio from Import API directly into Google Drive ──────────────────
// No RAM buffer — data flows straight through.
async function streamImportApiToDrive(
  videoId: string,
  title: string,
  userId: string,
  accessToken: string,
  songId: string
) {
  const importApiUrl = process.env.IMPORT_API_URL?.replace(/\/$/, '');
  if (!importApiUrl) throw new Error('IMPORT_API_URL not configured');

  // Fetch the audio stream from our Import API
  const streamRes = await fetch(
    `${importApiUrl}/api/stream?url=${videoId}&format=m4a&quality=192`,
    { signal: AbortSignal.timeout(120_000) }
  );
  if (!streamRes.ok || !streamRes.body) {
    throw new Error(`Import API stream failed: ${streamRes.status}`);
  }

  // Pipe directly to Google Drive — no Buffer in RAM
  const drive = await getGoogleDriveClient(userId, accessToken);
  if (!drive) throw new Error('Google Drive not authenticated');

  const folderId = await getOrCreateMusyFiFolder(drive);
  const cleanTitle = title.replace(/[^a-zA-Z0-9.-]/g, '_');

  // Convert Web ReadableStream → Node Readable for googleapis
  const nodeStream = Readable.fromWeb(streamRes.body as any);

  const uploadRes = await drive.files.create({
    requestBody: { name: `${cleanTitle}.m4a`, parents: [folderId] },
    media: { mimeType: 'audio/mp4', body: nodeStream },
    fields: 'id',
  });

  if (!uploadRes.data.id) throw new Error('Drive upload returned no file ID');

  // Make public for streaming
  try {
    await drive.permissions.create({
      fileId: uploadRes.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
    });
  } catch (e) {
    console.warn('[link] Failed to set Drive permissions:', e);
  }

  // Try to get duration from metadata
  let duration = 0;
  try {
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${uploadRes.data.id}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10_000) }
    );
    if (metaRes.ok) {
      const buf = Buffer.from(await metaRes.arrayBuffer());
      const meta = await mm.parseBuffer(buf, { mimeType: 'audio/mp4' });
      duration = meta.format.duration || 0;
    }
  } catch (e) { /* non-fatal */ }

  return { driveFileId: uploadRes.data.id, duration };
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId      = (session.user as any).id as string;
    const accessToken = (session.user as any).accessToken as string;
    const { url, title, artist } = await request.json();

    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const ytId    = getYoutubeId(url);
    const vimeoId = getVimeoId(url);

    // ── Resolve type ──────────────────────────────────────────────────────────
    let videoId         = '';
    let type            = '';
    let thumbnail       = '';
    let resolvedTitle   = title   || 'External Track';
    let resolvedArtist  = artist  || 'Unknown Source';
    let resolvedDuration = 0;

    if (ytId) {
      videoId   = ytId;
      type      = 'youtube';
      thumbnail = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;

      try {
        const meta = await resolveYoutubeMetadata(url);
        resolvedTitle    = title  || meta.title    || `YouTube Track (${ytId})`;
        resolvedArtist   = artist || meta.artist   || 'YouTube';
        resolvedDuration = meta.duration || 0;
        if (meta.thumbnail) thumbnail = meta.thumbnail;
      } catch (e) {
        console.warn('[link] Metadata fetch failed:', e);
        if (!title)  resolvedTitle  = `YouTube Track (${ytId})`;
        if (!artist) resolvedArtist = 'YouTube';
      }

      if (resolvedDuration > MAX_IMPORT_SECONDS) {
        return NextResponse.json(
          { error: `Track is too long (${Math.round(resolvedDuration / 60)} min). Max is ${MAX_IMPORT_SECONDS / 60} min.` },
          { status: 400 }
        );
      }
    } else if (vimeoId) {
      videoId   = vimeoId;
      type      = 'vimeo';
      thumbnail = `https://vumbnail.com/${vimeoId}.jpg`;
      resolvedTitle  = title  || `Vimeo Track (${vimeoId})`;
      resolvedArtist = artist || 'Vimeo';
    } else {
      return NextResponse.json(
        { error: 'Invalid URL. Only YouTube and Vimeo links are supported.' },
        { status: 400 }
      );
    }

    // ── Save to DB immediately (importStatus = "pending" for YouTube) ─────────
    const song = await prisma.song.create({
      data: {
        title:        resolvedTitle,
        artist:       resolvedArtist,
        type,
        sourceUrl:    videoId,
        thumbnail,
        duration:     resolvedDuration,
        userId,
        importStatus: type === 'youtube' ? 'pending' : 'ready',
      },
    });

    console.log(`[link] Song created instantly: ${song.id} (${resolvedTitle})`);

    // ── Background conversion for YouTube (fire & forget) ────────────────────
    if (type === 'youtube') {
      (async () => {
        try {
          console.log(`[link] Background import started for ${song.id}`);

          const { driveFileId, duration } = await streamImportApiToDrive(
            videoId,
            resolvedTitle,
            userId,
            accessToken,
            song.id
          );

          await prisma.song.update({
            where: { id: song.id },
            data: {
              type:         'google',
              sourceUrl:    driveFileId,
              duration:     duration || resolvedDuration,
              importStatus: 'ready',
              importedAt:   new Date(),
              importError:  null,
            },
          });

          console.log(`[link] Background import complete for ${song.id} → Drive: ${driveFileId}`);
        } catch (err: any) {
          console.error(`[link] Background import failed for ${song.id}:`, err.message);

          // Mark as failed — song stays as "youtube" type (still plays live)
          try {
            await prisma.song.update({
              where: { id: song.id },
              data: {
                importStatus: 'failed',
                importError:  err.message?.slice(0, 500) || 'Unknown error',
              },
            });
          } catch (dbErr) {
            console.error('[link] Failed to update importStatus to failed:', dbErr);
          }
        }
      })().catch(console.error);
    }

    return NextResponse.json({ success: true, song, backgroundReady: false });
  } catch (error: any) {
    console.error('[link] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

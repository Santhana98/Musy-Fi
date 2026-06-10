import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Secret key to prevent unauthorized access
// Set MIGRATE_SECRET in your Render environment variables
const MIGRATE_SECRET = process.env.MIGRATE_SECRET || '';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  
  if (!MIGRATE_SECRET || secret !== MIGRATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Run V2 migration safely
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "ImportStatus" AS ENUM ('pending', 'processing', 'ready', 'failed');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    const alterations = [
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "videoId" TEXT`,
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "youtubeUrl" TEXT`,
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "liked" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "playCount" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "lastPlayedAt" TIMESTAMP(3)`,
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "driveFileId" TEXT`,
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "importStatus" "ImportStatus" NOT NULL DEFAULT 'ready'`,
      `UPDATE "Song" SET "videoId" = "sourceUrl" WHERE "videoId" IS NULL AND "sourceUrl" IS NOT NULL`,
      `UPDATE "Song" SET "youtubeUrl" = CASE WHEN "sourceUrl" ~ '^[a-zA-Z0-9_-]{11}$' THEN 'https://www.youtube.com/watch?v=' || "sourceUrl" ELSE "sourceUrl" END WHERE "youtubeUrl" IS NULL AND "sourceUrl" IS NOT NULL`,
      `UPDATE "Song" SET "videoId" = id WHERE "videoId" IS NULL`,
      `UPDATE "Song" SET "youtubeUrl" = id WHERE "youtubeUrl" IS NULL`,
      `ALTER TABLE "Song" DROP COLUMN IF EXISTS "sourceUrl"`,
      `ALTER TABLE "Song" DROP COLUMN IF EXISTS "type"`,
      `ALTER TABLE "Song" DROP COLUMN IF EXISTS "importError"`,
      `ALTER TABLE "Song" DROP COLUMN IF EXISTS "importedAt"`,
      `DROP TABLE IF EXISTS "PlaylistSong" CASCADE`,
      `DROP TABLE IF EXISTS "Playlist" CASCADE`,
      `DROP TABLE IF EXISTS "LikedSong" CASCADE`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    ];

    const results = [];
    for (const sql of alterations) {
      try {
        await prisma.$executeRawUnsafe(sql);
        results.push({ sql: sql.slice(0, 60) + '...', status: 'ok' });
      } catch (e: any) {
        results.push({ sql: sql.slice(0, 60) + '...', status: 'skipped', reason: e.message });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

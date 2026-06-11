import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const MIGRATE_SECRET = process.env.MIGRATE_SECRET || 'musyfi-migrate-2024';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');

  if (secret !== MIGRATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Create ImportStatus enum if not exists
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "ImportStatus" AS ENUM ('pending', 'processing', 'ready', 'failed');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    const alterations = [
      // Add all columns that might be missing
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "videoId" TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "youtubeUrl" TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "liked" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "playCount" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "lastPlayedAt" TIMESTAMP(3)`,
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "driveFileId" TEXT`,
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "importStatus" "ImportStatus" NOT NULL DEFAULT 'ready'`,
      // Migrate data from old columns if they exist
      `UPDATE "Song" SET "videoId" = COALESCE("sourceUrl", id) WHERE "videoId" = '' OR "videoId" IS NULL`,
      `UPDATE "Song" SET "youtubeUrl" = CASE WHEN "sourceUrl" ~ '^[a-zA-Z0-9_-]{11}$' THEN 'https://www.youtube.com/watch?v=' || "sourceUrl" ELSE COALESCE("sourceUrl", '') END WHERE "youtubeUrl" = '' OR "youtubeUrl" IS NULL`,
      // Add User columns if missing
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    ];

    const results = [];
    for (const sql of alterations) {
      try {
        await prisma.$executeRawUnsafe(sql);
        results.push({ sql: sql.slice(0, 80), status: 'ok' });
      } catch (e: any) {
        results.push({ sql: sql.slice(0, 80), status: 'skipped', reason: e.message });
      }
    }

    // Count songs to confirm DB is working
    const songCount = await prisma.song.count();
    const userCount = await prisma.user.count();

    return NextResponse.json({
      success: true,
      message: 'Migration complete!',
      stats: { songs: songCount, users: userCount },
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

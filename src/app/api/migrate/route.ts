import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  // Accept both secrets for compatibility
  if (secret !== 'musyfi-migrate-2024' && secret !== (process.env.MIGRATE_SECRET || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const alterations = [
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "videoId" TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "youtubeUrl" TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "liked" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "playCount" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "lastPlayedAt" TIMESTAMP(3)`,
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "driveFileId" TEXT`,
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      `DO $$ BEGIN CREATE TYPE "ImportStatus" AS ENUM ('pending', 'processing', 'ready', 'failed'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "importStatus" "ImportStatus" NOT NULL DEFAULT 'ready'`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    ];

    const results = [];
    for (const sql of alterations) {
      try {
        await prisma.$executeRawUnsafe(sql);
        results.push({ status: 'ok', sql: sql.slice(0, 60) });
      } catch (e: any) {
        results.push({ status: 'skipped', sql: sql.slice(0, 60), reason: e.message });
      }
    }

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

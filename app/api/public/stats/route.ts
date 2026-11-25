import { NextResponse } from 'next/server';
import { getDb } from '@/lib/persistence/db';
import { countPublicSchedules } from '@/lib/modules/mod-03-schedule-engine/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();
    const count = async (table: string) =>
      Number(((await db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get()) as { c: number | string }).c);
    // `sections` keeps its name for the landing page, but it counts only the
    // class meetings the public may see: drafts must not leak (spec §35).
    const [departments, faculty, courses, sections] = await Promise.all([
      count('departments'), count('faculty'), count('subjects'), countPublicSchedules(),
    ]);
    return NextResponse.json({ departments, faculty, courses, sections });
  } catch {
    return NextResponse.json({ error: 'stats unavailable' }, { status: 500 });
  }
}

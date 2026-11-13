import { NextResponse } from 'next/server';
import { getDb } from '@/lib/persistence/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();
    const count = async (table: string) =>
      Number(((await db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get()) as { c: number | string }).c);
    const [departments, faculty, courses, sections] = await Promise.all([
      count('departments'), count('faculty'), count('subjects'), count('schedules'),
    ]);
    return NextResponse.json({ departments, faculty, courses, sections });
  } catch {
    return NextResponse.json({ error: 'stats unavailable' }, { status: 500 });
  }
}

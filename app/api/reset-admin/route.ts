import { NextResponse } from 'next/server';
import { getDb } from '@/lib/persistence/db';

export async function GET() {
  const db = getDb();
  const r1 = db.prepare('UPDATE students SET student_id = ? WHERE student_id = ?').run('2025-0001', '2022-0001');
  const r2 = db.prepare('UPDATE users SET username = ? WHERE username = ?').run('2025-0001', '2022-0001');
  return NextResponse.json({ studentChanged: r1.changes, userChanged: r2.changes });
}

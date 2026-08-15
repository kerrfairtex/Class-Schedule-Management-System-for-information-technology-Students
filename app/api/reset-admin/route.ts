import { NextResponse } from 'next/server';
import { getDb } from '@/lib/persistence/db';

export async function GET() {
  const db = getDb();
  const result = db.prepare('UPDATE students SET first_name = ?, last_name = ?, email = ? WHERE student_id = ?').run('Kerr', 'Fairtex', 'kfairtex@trac.edu.ph', '2022-0001');
  return NextResponse.json({ changed: result.changes });
}

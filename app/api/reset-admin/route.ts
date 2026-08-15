import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/persistence/db';

export async function GET() {
  const db = getDb();
  const hash = bcrypt.hashSync('admin123', 10);
  const result = db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hash, 'admin');
  return NextResponse.json({ changed: result.changes });
}

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/persistence/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();
    const facts = await db
      .prepare(
        `SELECT id, category, key, value, value_type, status, confidence,
                effective_from, effective_until, verified_at, verified_by,
                review_due_at, notes
         FROM institutional_facts
         ORDER BY category, key`
      )
      .all();
    return NextResponse.json({ facts });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
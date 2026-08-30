import { NextResponse } from 'next/server';
import { getDb } from '@/lib/persistence/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const sources = db
      .prepare(
        `SELECT id, title, source_type, authority_level, publisher, url,
                document_date, accessed_at, status, notes
         FROM sources
         ORDER BY authority_level, id`
      )
      .all();
    return NextResponse.json({ sources });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
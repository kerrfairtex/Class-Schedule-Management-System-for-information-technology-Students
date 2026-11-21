import { NextResponse } from 'next/server';
import { checkDatabase, PG_SCHEMA } from '@/lib/persistence/db';

// Must hit the database on every request, never a cached build-time result.
export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = new Date().toISOString();
  try {
    const { adapter, schema } = await checkDatabase();
    if (adapter === 'postgres' && schema !== PG_SCHEMA) {
      console.error(`[health] active schema is "${schema}", expected "${PG_SCHEMA}"`);
      return NextResponse.json({ status: 'error', database: 'wrong-schema', timestamp }, { status: 503 });
    }
    return NextResponse.json({ status: 'ok', database: 'up', adapter, timestamp });
  } catch (e) {
    // Details stay in the server log; the response never exposes connection info.
    console.error('[health] database check failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ status: 'error', database: 'down', timestamp }, { status: 503 });
  }
}

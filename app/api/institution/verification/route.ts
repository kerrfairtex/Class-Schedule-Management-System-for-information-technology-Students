import { NextResponse } from 'next/server';
import { getDb } from '@/lib/persistence/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();

    // Aggregate counts (spec §66 dashboard)
    const factsByStatus = db
      .prepare(`SELECT status, COUNT(*) as c FROM institutional_facts GROUP BY status`)
      .all() as Array<{ status: string; c: number }>;
    const sourcesByLevel = db
      .prepare(`SELECT authority_level, COUNT(*) as c FROM sources GROUP BY authority_level`)
      .all() as Array<{ authority_level: number; c: number }>;
    const total = db
      .prepare(`SELECT
        (SELECT COUNT(*) FROM institutional_facts) as facts,
        (SELECT COUNT(*) FROM sources) as sources,
        (SELECT COUNT(*) FROM institutional_facts WHERE review_due_at IS NOT NULL AND review_due_at < date('now')) as review_overdue`)
      .get() as { facts: number; sources: number; review_overdue: number };

    // Last verification baseline (system setting)
    const baseline = db
      .prepare(`SELECT value FROM system_settings WHERE key = 'verification_baseline'`)
      .get() as { value: string } | undefined;

    return NextResponse.json({
      baseline: baseline?.value ?? null,
      totals: total,
      facts_by_status: factsByStatus,
      sources_by_level: sourcesByLevel,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
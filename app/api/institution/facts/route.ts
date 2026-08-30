import { NextResponse } from 'next/server';
import { getDb } from '@/lib/persistence/db';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * GET /api/institution/facts
 *
 * Query params:
 *   limit  — page size (default 50, capped at 200)
 *   offset — skip N rows (default 0)
 *   status — optional filter: VERIFIED|OFFICIAL|GOVERNMENT_SUPPORTED|
 *            CORROBORATED|PENDING_VERIFICATION|UNVERIFIED|CONFLICTING|DEPRECATED
 *   category — optional filter by category
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const limitRaw = Number(searchParams.get('limit'));
    const limit = Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(MAX_LIMIT, Math.floor(limitRaw))
      : DEFAULT_LIMIT;

    const offsetRaw = Number(searchParams.get('offset'));
    const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0
      ? Math.floor(offsetRaw)
      : 0;

    const status = searchParams.get('status');
    const category = searchParams.get('category');

    const filters: string[] = [];
    const params: unknown[] = [];
    if (status) {
      filters.push('status = ?');
      params.push(status);
    }
    if (category) {
      filters.push('category = ?');
      params.push(category);
    }
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const db = getDb();

    const total = (db
      .prepare(
        `SELECT COUNT(*) as c FROM institutional_facts ${whereClause}`
      )
      .get(...params) as { c: number }).c;

    const facts = db
      .prepare(
        `SELECT id, category, key, value, value_type, status, confidence,
                effective_from, effective_until, verified_at, verified_by,
                review_due_at, notes
         FROM institutional_facts
         ${whereClause}
         ORDER BY category, key
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    return NextResponse.json({
      facts,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + facts.length < total,
        nextOffset: offset + facts.length < total ? offset + facts.length : null,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
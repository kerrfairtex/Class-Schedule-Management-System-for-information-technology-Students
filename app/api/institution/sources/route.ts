import { NextResponse } from 'next/server';
import { getDb } from '@/lib/persistence/db';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * GET /api/institution/sources
 *
 * Query params:
 *   limit  — page size (default 50, capped at 200)
 *   offset — skip N rows (default 0)
 *   source_type — optional filter: LAW|OFFICIAL_WEBSITE|GOVERNMENT|
 *                 ACADEMIC_RECORD|SECONDARY|SOCIAL
 *   authority_level — optional filter 1..6
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

    const sourceType = searchParams.get('source_type');
    const authorityLevel = searchParams.get('authority_level');

    const filters: string[] = [];
    const params: unknown[] = [];
    if (sourceType) {
      filters.push('source_type = ?');
      params.push(sourceType);
    }
    if (authorityLevel) {
      const al = Number(authorityLevel);
      if (Number.isFinite(al)) {
        filters.push('authority_level = ?');
        params.push(al);
      }
    }
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const db = getDb();

    const total = (db
      .prepare(
        `SELECT COUNT(*) as c FROM sources ${whereClause}`
      )
      .get(...params) as { c: number }).c;

    const sources = db
      .prepare(
        `SELECT id, title, source_type, authority_level, publisher, url,
                document_date, accessed_at, status, notes
         FROM sources
         ${whereClause}
         ORDER BY authority_level, id
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    return NextResponse.json({
      sources,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + sources.length < total,
        nextOffset: offset + sources.length < total ? offset + sources.length : null,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
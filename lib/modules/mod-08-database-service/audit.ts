import { getDb } from '@/lib/persistence/db';

export async function logAudit(
  userId: number | null,
  action: string,
  entityType?: string,
  // entityId is explicitly nullable: an INSERT that cannot return its id must
  // still be auditable. It MUST never be NaN — a NaN here fails against the
  // int4 column with 'invalid input syntax for type integer: "NaN"'.
  entityId?: number | null,
  details?: string
) {
  const db = await getDb();
  const safeEntityId =
    entityId === null || entityId === undefined || !Number.isFinite(entityId)
      ? null
      : entityId;
  await db.prepare(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
     VALUES (?, ?, ?, ?, ?)`
  ).run(userId ?? null, action, entityType ?? null, safeEntityId, details ?? null);
}

export async function getAuditLogs(limit = 50) {
  const db = await getDb();
  return db
    .prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?')
    .all(limit);
}

export interface AuditEntry {
  id: number;
  created_at: string;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: string | null;
  username: string | null;
}

/** One page of the audit log, newest first, with optional exact filters. */
export async function getAuditPage(opts: {
  action?: string;
  entityType?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ entries: AuditEntry[]; total: number; actions: string[]; entityTypes: string[] }> {
  const pageSize = Math.min(Math.max(opts.pageSize ?? 50, 10), 200);
  const page = Math.max(opts.page ?? 1, 1);
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.action) {
    where.push('a.action = ?');
    params.push(opts.action);
  }
  if (opts.entityType) {
    where.push('a.entity_type = ?');
    params.push(opts.entityType);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const db = await getDb();
  const [entries, total, actions, entityTypes] = await Promise.all([
    db
      .prepare(
        `SELECT a.id, a.created_at, a.action, a.entity_type, a.entity_id, a.details, u.username
         FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
         ${clause} ORDER BY a.id DESC LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, (page - 1) * pageSize),
    db.prepare(`SELECT COUNT(*) AS c FROM audit_logs a ${clause}`).get(...params),
    db.prepare('SELECT DISTINCT action FROM audit_logs ORDER BY action').all(),
    db.prepare('SELECT DISTINCT entity_type FROM audit_logs WHERE entity_type IS NOT NULL ORDER BY entity_type').all(),
  ]);
  return {
    entries: entries as AuditEntry[],
    total: Number((total as { c: number | string }).c),
    actions: (actions as { action: string }[]).map((r) => r.action),
    entityTypes: (entityTypes as { entity_type: string }[]).map((r) => r.entity_type),
  };
}

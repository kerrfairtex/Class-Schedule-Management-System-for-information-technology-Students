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

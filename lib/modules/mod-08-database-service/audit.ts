import { getDb } from '@/lib/persistence/db';

export function logAudit(
  userId: number | null,
  action: string,
  entityType?: string,
  entityId?: number,
  details?: string
) {
  const db = getDb();
  db.prepare(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
     VALUES (?, ?, ?, ?, ?)`
  ).run(userId, action, entityType ?? null, entityId ?? null, details ?? null);
}

export function getAuditLogs(limit = 50) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?')
    .all(limit);
}

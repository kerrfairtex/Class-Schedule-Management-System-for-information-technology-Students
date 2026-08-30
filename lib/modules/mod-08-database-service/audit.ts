import { createHash } from 'crypto';
import { getDb } from '@/lib/persistence/db';

/**
 * Hash an IP address with SHA-256 (truncated) so audit logs can detect
 * repeat offenders without storing raw IPs (privacy + spec section 36).
 */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

/**
 * Truncate user-agent to a safe length. Most UAs are <200 chars but we cap
 * defensively to avoid abuse of the audit table.
 */
export function sanitizeUserAgent(ua: string | null | undefined): string | null {
  if (!ua) return null;
  return ua.slice(0, 500);
}

export interface AuditContext {
  ip?: string | null;
  userAgent?: string | null;
}

export function logAudit(
  userId: number | null,
  action: string,
  entityType?: string,
  entityId?: number,
  details?: string,
  context?: AuditContext
) {
  const db = getDb();
  db.prepare(
    `INSERT INTO audit_logs
       (user_id, action, entity_type, entity_id, details, ip_hash, user_agent,
        old_value, new_value)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    userId,
    action,
    entityType ?? null,
    entityId ?? null,
    details ?? null,
    hashIp(context?.ip),
    sanitizeUserAgent(context?.userAgent),
    null,
    null
  );
}

/**
 * Extended audit entry with old/new pair (spec section 36 example).
 */
export function logAuditChange(
  userId: number | null,
  action: string,
  entityType: string,
  entityId: number,
  oldValue: unknown,
  newValue: unknown,
  context?: AuditContext
) {
  const db = getDb();
  db.prepare(
    `INSERT INTO audit_logs
       (user_id, action, entity_type, entity_id, details, ip_hash, user_agent,
        old_value, new_value)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    userId,
    action,
    entityType,
    entityId,
    null,
    hashIp(context?.ip),
    sanitizeUserAgent(context?.userAgent),
    oldValue === undefined ? null : JSON.stringify(oldValue),
    newValue === undefined ? null : JSON.stringify(newValue)
  );
}

export function getAuditLogs(limit = 50) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?')
    .all(limit);
}
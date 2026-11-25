import { getDb, withTransaction } from '@/lib/persistence/db';
import { logAudit } from './audit';

/**
 * Deployment data environment (spec §63/§64).
 *
 *   DEMO       — sample data; never shown on the public site
 *   VERIFIED   — checked against registrar/HR records; may be public
 *   PRODUCTION — fully authorized institutional data; may be public
 *
 * New schedules copy this value. The public site shows only PUBLISHED
 * schedules whose own data_environment is VERIFIED or PRODUCTION.
 */
export const DATA_ENVIRONMENTS = ['DEMO', 'VERIFIED', 'PRODUCTION'] as const;
export type DataEnvironment = (typeof DATA_ENVIRONMENTS)[number];

export async function getDataEnvironment(): Promise<DataEnvironment> {
  const db = await getDb();
  const row = (await db
    .prepare(`SELECT value FROM system_settings WHERE key = 'data_environment'`)
    .get()) as { value: string } | undefined;
  return (DATA_ENVIRONMENTS as readonly string[]).includes(row?.value ?? '')
    ? (row!.value as DataEnvironment)
    : 'DEMO';
}

/**
 * Change the deployment's data environment. With `semesterId`, also stamp
 * that semester's existing schedules, so classes already published become
 * visible (or hidden) on the public site in one audited step.
 */
export async function setDataEnvironment(
  value: DataEnvironment,
  options: { semesterId?: number; userId?: number; username?: string } = {}
): Promise<{ schedulesUpdated: number }> {
  const result = await withTransaction(async (tx) => {
    const updated = await tx
      .prepare(
        `UPDATE system_settings SET value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
         WHERE key = 'data_environment'`
      )
      .run(value, options.username ?? null);
    if (!updated.changes) {
      await tx
        .prepare(
          `INSERT INTO system_settings (key, value, description, updated_by)
           VALUES ('data_environment', ?, 'Per spec §64: deployment data environment.', ?)`
        )
        .run(value, options.username ?? null);
    }
    let schedulesUpdated = 0;
    if (options.semesterId) {
      const r = await tx
        .prepare('UPDATE schedules SET data_environment = ?, updated_at = CURRENT_TIMESTAMP WHERE semester_id = ?')
        .run(value, options.semesterId);
      schedulesUpdated = r.changes ?? 0;
    }
    return { schedulesUpdated };
  });
  // Written after the change commits.
  await logAudit(
    options.userId ?? null,
    'SET_DATA_ENVIRONMENT',
    'system_settings',
    null,
    `data_environment=${value}${options.semesterId ? `; semester ${options.semesterId}: ${result.schedulesUpdated} schedules` : ''}`
  );
  return result;
}

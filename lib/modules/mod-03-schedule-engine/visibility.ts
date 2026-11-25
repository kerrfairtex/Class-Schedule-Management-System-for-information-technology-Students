/**
 * Who may see a schedule, by status (spec §32–§35, §63).
 *
 * This is the ONE place that decides visibility. Every page and API that
 * lists schedules must build its WHERE clause from here, so the public site,
 * the portals and the landing-page counters cannot drift apart again.
 *
 *   staff   — admins and schedulers: every status, including drafts
 *   faculty — APPROVED and PUBLISHED (they see a load before students do)
 *   student — PUBLISHED only
 *   public  — PUBLISHED only, and never DEMO data (spec §63)
 */

export type ScheduleAudience = 'staff' | 'faculty' | 'student' | 'public';

const VISIBLE_STATUSES: Record<ScheduleAudience, readonly string[] | null> = {
  staff: null,
  faculty: ['APPROVED', 'PUBLISHED'],
  student: ['PUBLISHED'],
  public: ['PUBLISHED'],
};

/** Data environments that may be shown to anonymous visitors (spec §63). */
export const PUBLIC_DATA_ENVIRONMENTS = ['VERIFIED', 'PRODUCTION'] as const;

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

const quoteList = (values: readonly string[]) => values.map((v) => `'${v}'`).join(', ');

/**
 * SQL condition restricting `alias` (the schedules table alias) to what the
 * audience may see. Returns `1 = 1` for staff so it can always be AND-ed.
 *
 * The output only ever contains the constants above and a checked alias, so
 * it is safe to interpolate; it never carries request input.
 */
export function scheduleVisibilitySql(audience: ScheduleAudience, alias = 's'): string {
  if (!IDENTIFIER.test(alias)) throw new Error(`Invalid table alias: ${alias}`);
  const statuses = VISIBLE_STATUSES[audience];
  const conditions: string[] = [];
  if (statuses) conditions.push(`${alias}.status IN (${quoteList(statuses)})`);
  if (audience === 'public') {
    conditions.push(`${alias}.data_environment IN (${quoteList(PUBLIC_DATA_ENVIRONMENTS)})`);
  }
  return conditions.length ? conditions.join(' AND ') : '1 = 1';
}

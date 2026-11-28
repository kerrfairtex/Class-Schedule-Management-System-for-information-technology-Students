import { getDb, withTransaction } from '@/lib/persistence/db';
import { logAudit } from './audit';
import { DomainError } from '@/lib/modules/mod-02-master-list/validation';

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

/**
 * Limits every class must respect. Stored as rows in system_settings, so no
 * migration is needed; a missing row means the default below.
 */
export interface SchedulingRules {
  /** Earliest start and latest end of any class, HH:MM. */
  dayStart: string;
  dayEnd: string;
  /** Teaching hours an instructor may have in one week and in one day. */
  maxFacultyHoursWeek: number;
  maxFacultyHoursDay: number;
  /** Hours an instructor or section may be in class without a break. */
  maxContinuousHours: number;
}

export const DEFAULT_SCHEDULING_RULES: SchedulingRules = {
  dayStart: '07:00',
  dayEnd: '19:00',
  maxFacultyHoursWeek: 24,
  maxFacultyHoursDay: 8,
  maxContinuousHours: 4,
};

/** A gap shorter than this between two classes does not count as a break. */
export const MIN_BREAK_MINUTES = 30;

const RULE_KEYS: Record<keyof SchedulingRules, { key: string; description: string }> = {
  dayStart: { key: 'schedule_day_start', description: 'Earliest time a class may start (HH:MM).' },
  dayEnd: { key: 'schedule_day_end', description: 'Latest time a class may end (HH:MM).' },
  maxFacultyHoursWeek: { key: 'max_faculty_hours_week', description: 'Most teaching hours per instructor per week.' },
  maxFacultyHoursDay: { key: 'max_faculty_hours_day', description: 'Most teaching hours per instructor per day.' },
  maxContinuousHours: {
    key: 'max_continuous_hours',
    description: `Most hours in class without a break of ${MIN_BREAK_MINUTES}+ minutes (instructor or section).`,
  },
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Check a full set of rules; returns the first problem, or null. */
export function schedulingRulesProblem(r: SchedulingRules): string | null {
  if (!HHMM.test(r.dayStart) || !HHMM.test(r.dayEnd)) return 'School day times must be HH:MM.';
  if (r.dayEnd <= r.dayStart) return 'The school day must end after it starts.';
  const hours = [r.maxFacultyHoursWeek, r.maxFacultyHoursDay, r.maxContinuousHours];
  if (hours.some((h) => !Number.isFinite(h) || h <= 0 || h > 168)) return 'Hour limits must be numbers above 0.';
  if (r.maxFacultyHoursDay > 24 || r.maxContinuousHours > 24) return 'Daily limits cannot exceed 24 hours.';
  if (r.maxFacultyHoursDay > r.maxFacultyHoursWeek) return 'The daily limit cannot be more than the weekly limit.';
  return null;
}

export async function getSchedulingRules(): Promise<SchedulingRules> {
  const db = await getDb();
  const rows = (await db
    .prepare(`SELECT key, value FROM system_settings WHERE key IN (${Object.values(RULE_KEYS).map(() => '?').join(', ')})`)
    .all(...Object.values(RULE_KEYS).map((k) => k.key))) as { key: string; value: string }[];
  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const rules = { ...DEFAULT_SCHEDULING_RULES };
  for (const [field, { key }] of Object.entries(RULE_KEYS) as [keyof SchedulingRules, { key: string }][]) {
    const raw = stored.get(key);
    if (raw === undefined) continue;
    if (field === 'dayStart' || field === 'dayEnd') rules[field] = raw;
    else rules[field] = Number(raw);
  }
  // A hand-edited bad row must not disable every check: fall back to defaults.
  return schedulingRulesProblem(rules) ? { ...DEFAULT_SCHEDULING_RULES } : rules;
}

export async function setSchedulingRules(
  rules: SchedulingRules,
  options: { userId?: number; username?: string } = {}
): Promise<void> {
  const problem = schedulingRulesProblem(rules);
  if (problem) throw new DomainError(problem);
  await withTransaction(async (tx) => {
    for (const [field, { key, description }] of Object.entries(RULE_KEYS) as [keyof SchedulingRules, { key: string; description: string }][]) {
      const value = String(rules[field]);
      const updated = await tx
        .prepare(`UPDATE system_settings SET value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?`)
        .run(value, options.username ?? null, key);
      if (!updated.changes) {
        await tx
          .prepare(`INSERT INTO system_settings (key, value, description, updated_by) VALUES (?, ?, ?, ?)`)
          .run(key, value, description, options.username ?? null);
      }
    }
  });
  await logAudit(options.userId ?? null, 'SET_SCHEDULING_RULES', 'system_settings', null, JSON.stringify(rules));
}

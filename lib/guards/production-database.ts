/**
 * Guard against running destructive operations against the production
 * database.
 *
 * The repo `.env` and Render's `DATABASE_URL` point at the SAME Supabase
 * project, so a "local" test run silently writes to production. A CRUD
 * matrix run locally once deleted real rows (students, faculty, rooms and
 * their login accounts) before it was caught.
 *
 * Two things are protected:
 *   1. the destructive test suites, via the vitest setup file;
 *   2. any script that writes, via `assertNotProductionDatabase()`.
 *
 * The check is based on the DATABASE_URL host and project ref, so it still
 * works when the password differs. Set `CSMS_ALLOW_PRODUCTION_WRITES=1`
 * to override deliberately (for example when the task IS to fix something
 * on production).
 */

/** Hosts that are treated as production. */
const PRODUCTION_HOSTS = [
  'aws-0-ap-south-1.pooler.supabase.com',
  'aws-0-ap-northeast-1.pooler.supabase.com',
  'aws-0-ap-southeast-1.pooler.supabase.com',
  'aws-0-ap-northeast-2.pooler.supabase.com',
  'aws-0-ap-east-1.pooler.supabase.com',
  'aws-0-ap-west-1.pooler.supabase.com',
  'aws-0-eu-central-1.pooler.supabase.com',
  'aws-0-eu-west-1.pooler.supabase.com',
];

/**
 * The Supabase project refs that hold production data.
 *
 * A project ref is the part right after "postgres." in the connection
 * string. It identifies the database even if the host changes.
 */
const PRODUCTION_PROJECT_REFS = [
  'qqgwnqylngdddtrgrocc',
  'ebyepweqwihdvjecrufk',
];

/** The override that lets a deliberate production write through. */
export const ALLOW_FLAG = 'CSMS_ALLOW_PRODUCTION_WRITES';

export interface ProductionTarget {
  isProduction: boolean;
  host: string;
  projectRef: string;
  reason: string;
}

/** Read DATABASE_URL without ever echoing the password. */
function parseDatabaseUrl(url: string): { host: string; projectRef: string } {
  let host = '';
  let projectRef = '';
  try {
    const parsed = new URL(url);
    host = parsed.hostname;
  } catch {
    // Not a URL we can parse - fall back to a regex.
    const hostMatch = /@([^/:?]+)/.exec(url);
    host = hostMatch ? hostMatch[1] : '';
  }
  const refMatch = /postgres\.([a-z0-9]{10,})/.exec(url);
  projectRef = refMatch ? refMatch[1] : '';
  return { host, projectRef };
}

/**
 * Decide whether the current DATABASE_URL points at production.
 *
 * Returns the reason so the error message can explain itself.
 */
export function detectProductionDatabase(
  url: string | undefined = process.env.DATABASE_URL
): ProductionTarget {
  if (!url || url.trim() === '') {
    return { isProduction: false, host: '', projectRef: '', reason: 'DATABASE_URL is not set' };
  }
  const { host, projectRef } = parseDatabaseUrl(url);

  if (projectRef && PRODUCTION_PROJECT_REFS.includes(projectRef)) {
    return {
      isProduction: true,
      host,
      projectRef,
      reason: `the Supabase project ref ${projectRef} holds production data`,
    };
  }
  if (host && PRODUCTION_HOSTS.includes(host)) {
    return {
      isProduction: true,
      host,
      projectRef,
      reason: `the host ${host} is a production Supabase pooler`,
    };
  }
  return { isProduction: false, host, projectRef, reason: 'not a known production target' };
}

/**
 * Refuse to continue when DATABASE_URL points at production.
 *
 * Call this at the top of any script or test that writes.
 */
export function assertNotProductionDatabase(
  url: string | undefined = process.env.DATABASE_URL
): void {
  if (process.env[ALLOW_FLAG] === '1') {
    console.warn(
      `[guard] ${ALLOW_FLAG}=1 - allowing a write to ${url ? 'the configured database' : 'nothing'} on purpose.`
    );
    return;
  }
  const target = detectProductionDatabase(url);
  if (target.isProduction) {
    throw new Error(
      `[guard] REFUSING TO RUN: DATABASE_URL points at production because ${target.reason}.\n` +
        `  host: ${target.host}\n` +
        '  Running a destructive test here would modify real production data.\n' +
        '  Point DATABASE_URL at a scratch database, or set ' +
        `${ALLOW_FLAG}=1 if you deliberately want to write to production.`
    );
  }
}

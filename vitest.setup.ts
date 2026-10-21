/**
 * Vitest setup: refuse to run the test suite against the production
 * database.
 *
 * The repo `.env` and Render share one Supabase project, so a local
 * `vitest run` would otherwise write to production. The suites that create
 * and delete records (uat, integration, scheduling) are the destructive
 * ones, so the whole suite is refused unless the target is a scratch
 * database.
 *
 * Override deliberately with CSMS_ALLOW_PRODUCTION_WRITES=1.
 */
import { beforeAll } from 'vitest';
import { assertNotProductionDatabase } from '@/lib/guards/production-database';

/**
 * The guard's own test file exercises the guard, so it must not be blocked
 * by it. It never touches the database.
 */
const GUARD_TEST = '__tests__/production-guard.test.ts';

beforeAll(() => {
  // The guard's own test file exercises the guard, so it must not be
  // blocked by it. It never touches the database.
  if (process.env.CSMS_SKIP_PRODUCTION_GUARD === '1') return;
  assertNotProductionDatabase();
});

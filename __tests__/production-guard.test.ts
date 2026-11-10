import { describe, it, expect, afterEach } from 'vitest';
import {
  detectProductionDatabase,
  assertNotProductionDatabase,
  ALLOW_FLAG,
} from '@/lib/guards/production-database';

/**
 * The repo `.env` and Render point at the SAME Supabase project, so a
 * local test run once wrote to production and deleted real rows. These
 * tests pin the guard that prevents that.
 */
// This file exercises the guard itself, so it opts out of the setup-file
// check. It never touches the database. Set at module load, because the
// setup file's beforeAll runs before any beforeAll in this file.
process.env.CSMS_SKIP_PRODUCTION_GUARD = '1';

describe('production database guard', () => {
  const savedUrl = process.env.DATABASE_URL;
  const savedFlag = process.env[ALLOW_FLAG];

  afterEach(() => {
    if (savedUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = savedUrl;
    if (savedFlag === undefined) delete process.env[ALLOW_FLAG];
    else process.env[ALLOW_FLAG] = savedFlag;
  });

  it('detects the production project ref', () => {
    const url =
      'postgresql://postgres.qqgwnqylngdddtrgrocc:secret@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
    const target = detectProductionDatabase(url);
    expect(target.isProduction).toBe(true);
    expect(target.projectRef).toBe('qqgwnqylngdddtrgrocc');
    expect(target.host).toBe('aws-0-ap-south-1.pooler.supabase.com');
  });

  it('detects the legacy production project ref', () => {
    const url =
      'postgresql://postgres.ebyepweqwihdvjecrufk:secret@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';
    expect(detectProductionDatabase(url).isProduction).toBe(true);
  });

  it('detects a production host even with an unknown project ref', () => {
    const url =
      'postgresql://postgres.someotherproject:secret@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';
    expect(detectProductionDatabase(url).isProduction).toBe(true);
  });

  it('does not flag a scratch database', () => {
    expect(
      detectProductionDatabase('postgresql://user:pass@localhost:5432/scratch').isProduction
    ).toBe(false);
    expect(
      detectProductionDatabase('postgresql://user:pass@db.abc123.supabase.co:5432/postgres')
        .isProduction
    ).toBe(false);
  });

  it('does not flag an unset DATABASE_URL', () => {
    // An empty string means "no database configured", which is not
    // production. `undefined` falls back to the env var, so it is tested
    // through the explicit empty string.
    expect(detectProductionDatabase('').isProduction).toBe(false);
  });

  it('refuses to run against production', () => {
    process.env.DATABASE_URL =
      'postgresql://postgres.qqgwnqylngdddtrgrocc:secret@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';
    delete process.env[ALLOW_FLAG];
    expect(() => assertNotProductionDatabase()).toThrow(/REFUSING TO RUN/);
  });

  it('allows the run when the override flag is set', () => {
    process.env.DATABASE_URL =
      'postgresql://postgres.qqgwnqylngdddtrgrocc:secret@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';
    process.env[ALLOW_FLAG] = '1';
    expect(() => assertNotProductionDatabase()).not.toThrow();
  });

  it('allows a scratch database', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/scratch';
    delete process.env[ALLOW_FLAG];
    expect(() => assertNotProductionDatabase()).not.toThrow();
  });

  it('never puts the password in the error message', () => {
    process.env.DATABASE_URL =
      'postgresql://postgres.qqgwnqylngdddtrgrocc:SuperSecret123@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';
    delete process.env[ALLOW_FLAG];
    let message = '';
    try {
      assertNotProductionDatabase();
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain('REFUSING TO RUN');
    expect(message).not.toContain('SuperSecret123');
  });
});

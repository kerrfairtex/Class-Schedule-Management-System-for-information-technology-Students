import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb, destroyTestDb, type TestFixtures } from '@/lib/persistence/test-db';
import { getDataEnvironment, setDataEnvironment } from '@/lib/modules/mod-08-database-service/settings';
import { createSchedule, getPublicSchedules, transitionSchedule } from '@/lib/modules/mod-03-schedule-engine/service';
import { listAppTables } from '@/lib/persistence/db';

let db: Database.Database;
let fixtures: TestFixtures;

async function publishedClass() {
  const s = await createSchedule({
    section_id: fixtures.sectionId,
    subject_id: fixtures.subjectId,
    faculty_id: fixtures.facultyId,
    room_id: fixtures.roomId,
    time_slot_id: fixtures.timeSlotId,
    semester_id: fixtures.semesterId,
  });
  for (const step of ['PENDING_REVIEW', 'APPROVED', 'PUBLISHED'] as const) await transitionSchedule(s.id, step);
  return s;
}

describe('data environment setting (spec §63/§64)', () => {
  beforeEach(() => {
    ({ db, fixtures } = createTestDb());
  });
  afterEach(() => destroyTestDb(db));

  it('defaults to DEMO when unset', async () => {
    expect(await getDataEnvironment()).toBe('DEMO');
  });

  it('creates the setting if missing and updates it afterwards', async () => {
    await setDataEnvironment('VERIFIED', { username: 'registrar' });
    expect(await getDataEnvironment()).toBe('VERIFIED');
    await setDataEnvironment('PRODUCTION');
    expect(await getDataEnvironment()).toBe('PRODUCTION');
    const rows = db.prepare(`SELECT COUNT(*) AS c FROM system_settings WHERE key = 'data_environment'`).get() as { c: number };
    expect(rows.c).toBe(1);
  });

  it('makes an already-published semester public in one step, and audits it', async () => {
    await publishedClass(); // stamped DEMO
    expect(await getPublicSchedules()).toHaveLength(0);

    const r = await setDataEnvironment('VERIFIED', { semesterId: fixtures.semesterId, userId: undefined });
    expect(r.schedulesUpdated).toBe(1);
    expect(await getPublicSchedules()).toHaveLength(1);

    const audit = db.prepare(`SELECT details FROM audit_logs WHERE action = 'SET_DATA_ENVIRONMENT'`).get() as { details: string };
    expect(audit.details).toContain('data_environment=VERIFIED');
  });

  it('leaves existing schedules alone without a semester', async () => {
    await publishedClass();
    await setDataEnvironment('VERIFIED');
    expect(await getPublicSchedules()).toHaveLength(0);
  });

  it('lists only this app’s own tables', async () => {
    const tables = await listAppTables();
    expect(tables).toContain('schedules');
    expect(tables).toContain('system_settings');
    expect(tables.some((t) => t.startsWith('sqlite_'))).toBe(false);
  });
});

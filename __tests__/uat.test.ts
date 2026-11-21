import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb, destroyTestDb, type TestFixtures } from '@/lib/persistence/test-db';
import { authenticate, toSessionUser, authorize } from '@/lib/modules/mod-01-auth/service';
import { createUser } from '@/lib/modules/mod-01-auth/service';
import { getDashboardStats, getActiveSemester, getSections } from '@/lib/modules/mod-02-master-list/service';
import { generateSchedulesForSection, getSchedulesBySemester } from '@/lib/modules/mod-03-schedule-engine/service';
import { createBackup } from '@/lib/modules/mod-08-database-service/backup';
import { getAuditLogs } from '@/lib/modules/mod-08-database-service/audit';

let db: Database.Database;
let fixtures: TestFixtures;

describe('UAT: Acceptance criteria', () => {
  beforeEach(async () => {
    ({ db, fixtures } = createTestDb());
    await createUser({ username: 'admin', password: 'admin123', role: 'admin' });
    await createUser({ username: 'fac-001', password: 'faculty123', role: 'faculty', faculty_id: fixtures.facultyId });
    await createUser({ username: '2022-0001', password: 'student123', role: 'student', student_id: fixtures.studentId });
  });

  afterEach(() => {
    destroyTestDb(db);
  });

  it('UAT-01: admin authenticates and gets dashboard stats', async () => {
    const user = await authenticate('admin', 'admin123');
    expect(user).not.toBeNull();
    const session = await toSessionUser(user!);
    expect(authorize(session, ['admin'])).toBe(true);
    const stats = await getDashboardStats();
    expect(stats.faculty).toBeGreaterThan(0);
    expect(stats.subjects).toBeGreaterThan(0);
  });

  it('UAT-02: faculty authenticates with correct role', async () => {
    const user = await authenticate('fac-001', 'faculty123');
    expect(user).not.toBeNull();
    const session = await toSessionUser(user!);
    expect(session.role).toBe('faculty');
    expect(authorize(session, ['faculty'])).toBe(true);
  });

  it('UAT-03: student authenticates with correct role', async () => {
    const user = await authenticate('2022-0001', 'student123');
    expect(user).not.toBeNull();
    const session = await toSessionUser(user!);
    expect(session.role).toBe('student');
    expect(authorize(session, ['student'])).toBe(true);
  });

  it('UAT-04: invalid credentials rejected', async () => {
    expect(await authenticate('admin', 'wrong')).toBeNull();
    expect(await authenticate('nobody', 'pass')).toBeNull();
  });

  it('UAT-05: schedule generation produces entries', async () => {
    const semester = (await getActiveSemester())!;
    const result = await generateSchedulesForSection(fixtures.sectionId, semester.id, 1);
    expect(result.created).toBeGreaterThan(0);
    const schedules = await getSchedulesBySemester(semester.id);
    expect(schedules.length).toBeGreaterThan(0);
  });

  it('UAT-06: sections available for active semester', async () => {
    const semester = (await getActiveSemester())!;
    const sections = await getSections(semester.id);
    expect(sections.length).toBeGreaterThan(0);
  });

  it('UAT-07: database backup creates file', async () => {
    const path = await createBackup();
    expect(path).toBeTruthy();
  });

  it('UAT-08: audit log records actions', async () => {
    const semester = (await getActiveSemester())!;
    await generateSchedulesForSection(fixtures.sectionId, semester.id, 1);
    const logs = await getAuditLogs();
    expect(logs.length).toBeGreaterThan(0);
  });

  it('UAT-09: faculty cannot authorize as admin', async () => {
    const user = await authenticate('fac-001', 'faculty123');
    const session = await toSessionUser(user!);
    expect(authorize(session, ['admin'])).toBe(false);
  });

  it('UAT-10: student cannot authorize as faculty', async () => {
    const user = await authenticate('2022-0001', 'student123');
    const session = await toSessionUser(user!);
    expect(authorize(session, ['faculty'])).toBe(false);
  });

  it('UAT-11: re-generation is idempotent (no duplicates)', async () => {
    const semester = (await getActiveSemester())!;
    await generateSchedulesForSection(fixtures.sectionId, semester.id, 1);
    const first = await getSchedulesBySemester(semester.id).length;
    await generateSchedulesForSection(fixtures.sectionId, semester.id, 1);
    const second = await getSchedulesBySemester(semester.id).length;
    expect(second).toBe(first);
  });

  it('UAT-12: semester is active and named', async () => {
    const semester = await getActiveSemester();
    expect(semester).not.toBeNull();
    expect(semester!.is_active).toBe(1);
    expect(semester!.name).toBeTruthy();
  });

  it('UAT-13: RBAC blocks unauthenticated access', async () => {
    expect(authorize(null, ['admin'])).toBe(false);
    expect(authorize(null, ['faculty'])).toBe(false);
    expect(authorize(null, ['student'])).toBe(false);
  });
});

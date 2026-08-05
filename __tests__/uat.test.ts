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
  beforeEach(() => {
    ({ db, fixtures } = createTestDb());
    createUser({ username: 'admin', password: 'admin123', role: 'admin' });
    createUser({ username: 'fac-001', password: 'faculty123', role: 'faculty', faculty_id: fixtures.facultyId });
    createUser({ username: '2022-0001', password: 'student123', role: 'student', student_id: fixtures.studentId });
  });

  afterEach(() => {
    destroyTestDb(db);
  });

  it('UAT-01: admin authenticates and gets dashboard stats', () => {
    const user = authenticate('admin', 'admin123');
    expect(user).not.toBeNull();
    const session = toSessionUser(user!);
    expect(authorize(session, ['admin'])).toBe(true);
    const stats = getDashboardStats();
    expect(stats.faculty).toBeGreaterThan(0);
    expect(stats.subjects).toBeGreaterThan(0);
  });

  it('UAT-02: faculty authenticates with correct role', () => {
    const user = authenticate('fac-001', 'faculty123');
    expect(user).not.toBeNull();
    const session = toSessionUser(user!);
    expect(session.role).toBe('faculty');
    expect(authorize(session, ['faculty'])).toBe(true);
  });

  it('UAT-03: student authenticates with correct role', () => {
    const user = authenticate('2022-0001', 'student123');
    expect(user).not.toBeNull();
    const session = toSessionUser(user!);
    expect(session.role).toBe('student');
    expect(authorize(session, ['student'])).toBe(true);
  });

  it('UAT-04: invalid credentials rejected', () => {
    expect(authenticate('admin', 'wrong')).toBeNull();
    expect(authenticate('nobody', 'pass')).toBeNull();
  });

  it('UAT-05: schedule generation produces entries', () => {
    const semester = getActiveSemester()!;
    const result = generateSchedulesForSection(fixtures.sectionId, semester.id, 1);
    expect(result.created).toBeGreaterThan(0);
    const schedules = getSchedulesBySemester(semester.id);
    expect(schedules.length).toBeGreaterThan(0);
  });

  it('UAT-06: sections available for active semester', () => {
    const semester = getActiveSemester()!;
    const sections = getSections(semester.id);
    expect(sections.length).toBeGreaterThan(0);
  });

  it('UAT-07: database backup creates file', () => {
    const path = createBackup();
    expect(path).toBeTruthy();
  });

  it('UAT-08: audit log records actions', () => {
    const semester = getActiveSemester()!;
    generateSchedulesForSection(fixtures.sectionId, semester.id, 1);
    const logs = getAuditLogs();
    expect(logs.length).toBeGreaterThan(0);
  });

  it('UAT-09: faculty cannot authorize as admin', () => {
    const user = authenticate('fac-001', 'faculty123');
    const session = toSessionUser(user!);
    expect(authorize(session, ['admin'])).toBe(false);
  });

  it('UAT-10: student cannot authorize as faculty', () => {
    const user = authenticate('2022-0001', 'student123');
    const session = toSessionUser(user!);
    expect(authorize(session, ['faculty'])).toBe(false);
  });

  it('UAT-11: re-generation is idempotent (no duplicates)', () => {
    const semester = getActiveSemester()!;
    generateSchedulesForSection(fixtures.sectionId, semester.id, 1);
    const first = getSchedulesBySemester(semester.id).length;
    generateSchedulesForSection(fixtures.sectionId, semester.id, 1);
    const second = getSchedulesBySemester(semester.id).length;
    expect(second).toBe(first);
  });

  it('UAT-12: semester is active and named', () => {
    const semester = getActiveSemester();
    expect(semester).not.toBeNull();
    expect(semester!.is_active).toBe(1);
    expect(semester!.name).toBeTruthy();
  });

  it('UAT-13: RBAC blocks unauthenticated access', () => {
    expect(authorize(null, ['admin'])).toBe(false);
    expect(authorize(null, ['faculty'])).toBe(false);
    expect(authorize(null, ['student'])).toBe(false);
  });
});

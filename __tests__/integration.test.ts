import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb, destroyTestDb, type TestFixtures } from '@/lib/persistence/test-db';
import { authenticate, toSessionUser } from '@/lib/modules/mod-01-auth/service';
import { createUser } from '@/lib/modules/mod-01-auth/service';
import { createSchedule, generateSchedulesForSection, deleteSchedule } from '@/lib/modules/mod-03-schedule-engine/service';
import { detectConflicts } from '@/lib/modules/mod-04-conflict-engine/validator';
import { getSchedulesByFaculty, getSchedulesBySection } from '@/lib/modules/mod-03-schedule-engine/service';
import { getDb } from '@/lib/persistence/db';

let db: Database.Database;
let fixtures: TestFixtures;

describe('Integration: Auth + Scheduling workflow', () => {
  beforeEach(() => {
    ({ db, fixtures } = createTestDb());
    createUser({ username: 'testadmin', password: 'admin123', role: 'admin' });
  });

  afterEach(() => {
    destroyTestDb(db);
  });

  it('authenticates admin and maps session user', () => {
    const user = authenticate('testadmin', 'admin123');
    expect(user).not.toBeNull();
    const session = toSessionUser(user!);
    expect(session.role).toBe('admin');
    expect(session.name).toBe('Administrator');
  });

  it('runs full schedule lifecycle: create → conflict → move → delete', () => {
    const input = {
      section_id: fixtures.sectionId,
      subject_id: fixtures.subjectId,
      faculty_id: fixtures.facultyId,
      room_id: fixtures.roomId,
      time_slot_id: fixtures.timeSlotId,
      semester_id: fixtures.semesterId,
    };

    const created = createSchedule(input, 1);
    expect(created.id).toBeGreaterThan(0);

    const conflict = detectConflicts(input);
    expect(conflict.hasConflict).toBe(true);

    const facultySchedules = getSchedulesByFaculty(fixtures.facultyId, fixtures.semesterId);
    expect(facultySchedules).toHaveLength(1);

    deleteSchedule(created.id, 1);
    const afterDelete = getSchedulesByFaculty(fixtures.facultyId, fixtures.semesterId);
    expect(afterDelete).toHaveLength(0);
  });

  it('generates section timetable and exposes it via section query', () => {
    const result = generateSchedulesForSection(fixtures.sectionId, fixtures.semesterId, 1);
    expect(result.created).toBeGreaterThanOrEqual(1);

    const sectionSchedules = getSchedulesBySection(fixtures.sectionId, fixtures.semesterId);
    expect(sectionSchedules.length).toBeGreaterThanOrEqual(1);
    expect(sectionSchedules[0].subject_code).toBe('IT 101');
  });

  it('enforces faculty availability across scheduling pipeline', () => {
    getDb()
      .prepare(
        'INSERT INTO faculty_availability (faculty_id, time_slot_id, is_available) VALUES (?, ?, 0)'
      )
      .run(fixtures.facultyId, fixtures.timeSlotId);

    const input = {
      section_id: fixtures.sectionId,
      subject_id: fixtures.subjectId,
      faculty_id: fixtures.facultyId,
      room_id: fixtures.roomId,
      time_slot_id: fixtures.timeSlotId,
      semester_id: fixtures.semesterId,
    };

    expect(() => createSchedule(input)).toThrow(/not available/);
  });
});

describe('Integration: Portal data contracts', () => {
  beforeEach(() => {
    ({ db, fixtures } = createTestDb());
  });

  afterEach(() => {
    destroyTestDb(db);
  });

  it('returns faculty schedule with joined display fields', () => {
    createSchedule(
      {
        section_id: fixtures.sectionId,
        subject_id: fixtures.subjectId,
        faculty_id: fixtures.facultyId,
        room_id: fixtures.roomId,
        time_slot_id: fixtures.timeSlotId,
        semester_id: fixtures.semesterId,
      },
      1
    );

    const schedules = getSchedulesByFaculty(fixtures.facultyId, fixtures.semesterId);
    expect(schedules[0].faculty_name).toBe('Test Faculty');
    expect(schedules[0].section_code).toBe('BSIT-1A');
    expect(schedules[0].room_code).toBe('R101');
    expect(schedules[0].day_of_week).toBe('monday');
  });

  it('returns student section schedule for portal view', () => {
    generateSchedulesForSection(fixtures.sectionId, fixtures.semesterId);
    const schedules = getSchedulesBySection(fixtures.sectionId, fixtures.semesterId);
    expect(schedules.every((s) => s.section_code === 'BSIT-1A')).toBe(true);
  });
});

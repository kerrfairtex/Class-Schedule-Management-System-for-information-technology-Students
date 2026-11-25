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
  beforeEach(async () => {
    ({ db, fixtures } = createTestDb());
    await createUser({ username: 'testadmin', password: 'admin123', role: 'admin' });
  });

  afterEach(() => {
    destroyTestDb(db);
  });

  it('authenticates admin and maps session user', async () => {
    const user = await authenticate('testadmin', 'admin123');
    expect(user).not.toBeNull();
    const session = await toSessionUser(user!);
    expect(session.role).toBe('admin');
    expect(session.name).toBe('Administrator');
  });

  it('runs full schedule lifecycle: create → conflict → move → delete', async () => {
    const input = {
      section_id: fixtures.sectionId,
      subject_id: fixtures.subjectId,
      faculty_id: fixtures.facultyId,
      room_id: fixtures.roomId,
      time_slot_id: fixtures.timeSlotId,
      semester_id: fixtures.semesterId,
    };

    const created = await createSchedule(input, 1);
    expect(created.id).toBeGreaterThan(0);

    const conflict = await detectConflicts(input);
    expect(conflict.hasBlockingConflict || conflict.hasConflict).toBe(true);

    const facultySchedules = await getSchedulesByFaculty(fixtures.facultyId, fixtures.semesterId);
    expect(facultySchedules).toHaveLength(1);

    await deleteSchedule(created.id, 1);
    const afterDelete = await getSchedulesByFaculty(fixtures.facultyId, fixtures.semesterId);
    expect(afterDelete).toHaveLength(0);
  });

  it('generates section timetable and exposes it via section query', async () => {
    const result = await generateSchedulesForSection(fixtures.sectionId, fixtures.semesterId, 1);
    expect(result.created).toBeGreaterThanOrEqual(1);

    const sectionSchedules = await getSchedulesBySection(fixtures.sectionId, fixtures.semesterId);
    expect(sectionSchedules.length).toBeGreaterThanOrEqual(1);
    expect(sectionSchedules[0].subject_code).toBe('IT 101');
  });

  it('tolerates non-blocking availability warnings per spec §33', async () => {
    // Spec §33: faculty availability is NON-blocking. Availability warnings
    // should NOT throw. The schedule is created but a non-blocking
    // conflict is recorded (visible in /admin/conflicts for advisory).
    await (await getDb())
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

    await expect(createSchedule(input)).resolves.toBeDefined();
  });
});

describe('Integration: Portal data contracts', () => {
  beforeEach(async () => {
    ({ db, fixtures } = createTestDb());
  });

  afterEach(() => {
    destroyTestDb(db);
  });

  it('returns faculty schedule with joined display fields', async () => {
    await createSchedule(
      {
        section_id: fixtures.sectionId,
        subject_id: fixtures.subjectId,
        faculty_id: fixtures.facultyId,
        room_id: fixtures.roomId,
        time_slot_id: fixtures.timeSlotId,
        semester_id: fixtures.semesterId,
      }
    );

    const schedules = await getSchedulesByFaculty(fixtures.facultyId, fixtures.semesterId);
    expect(schedules[0].faculty_name).toBe('Test Faculty');
    expect(schedules[0].section_code).toBe('BSIT-1A');
    expect(schedules[0].room_code).toBe('R101');
    expect(schedules[0].day_of_week).toBe('monday');
  });

  it('returns a section schedule for the public timetable', async () => {
    await generateSchedulesForSection(fixtures.sectionId, fixtures.semesterId);
    const schedules = await getSchedulesBySection(fixtures.sectionId, fixtures.semesterId);
    expect(schedules.every((s) => s.section_code === 'BSIT-1A')).toBe(true);
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb, destroyTestDb } from '@/lib/persistence/test-db';
import { detectConflicts, validateScheduleMove } from '@/lib/modules/mod-04-conflict-engine/validator';
import { createSchedule, generateSchedulesForSection } from '@/lib/modules/mod-03-schedule-engine/service';
import type { TestFixtures } from '@/lib/persistence/test-db';

let db: Database.Database;
let fixtures: TestFixtures;

function baseInput() {
  return {
    section_id: fixtures.sectionId,
    subject_id: fixtures.subjectId,
    faculty_id: fixtures.facultyId,
    room_id: fixtures.roomId,
    time_slot_id: fixtures.timeSlotId,
    semester_id: fixtures.semesterId,
  };
}

describe('MOD-04 Conflict Engine', () => {
  beforeEach(() => {
    ({ db, fixtures } = createTestDb());
  });

  afterEach(() => {
    destroyTestDb(db);
  });

  it('allows a valid schedule with no conflicts', () => {
    const result = detectConflicts(baseInput());
    expect(result.hasConflict).toBe(false);
    expect(result.conflicts).toHaveLength(0);
  });

  it('detects faculty double-booking', () => {
    createSchedule(baseInput());
    const result = detectConflicts(baseInput());
    expect(result.hasConflict).toBe(true);
    expect(result.conflicts).toContain('Faculty is already assigned to another class at this time');
  });

  it('detects room double-booking', () => {
    createSchedule(baseInput());
    const result = detectConflicts({
      ...baseInput(),
      section_id: fixtures.sectionId,
      subject_id: fixtures.subjectId,
      faculty_id: fixtures.facultyId,
    });
    expect(result.hasConflict).toBe(true);
    expect(result.conflicts).toContain('Room is already booked at this time');
  });

  it('detects section double-booking', () => {
    createSchedule(baseInput());
    const result = detectConflicts({
      ...baseInput(),
      faculty_id: fixtures.facultyId,
      room_id: fixtures.roomId,
    });
    expect(result.hasConflict).toBe(true);
    expect(result.conflicts).toContain('Section already has a class at this time');
  });

  it('detects faculty unavailability', () => {
    db.prepare(
      'INSERT INTO faculty_availability (faculty_id, time_slot_id, is_available) VALUES (?, ?, 0)'
    ).run(fixtures.facultyId, fixtures.timeSlotId);

    const result = detectConflicts(baseInput());
    expect(result.hasConflict).toBe(true);
    expect(result.conflicts).toContain('Faculty is not available at this time slot');
  });

  it('excludes current schedule when validating a move', () => {
    const schedule = createSchedule(baseInput());
    const result = validateScheduleMove(schedule.id, fixtures.timeSlotId2);
    expect(result.hasConflict).toBe(false);
  });

  it('rejects move that causes faculty conflict', () => {
    createSchedule(baseInput());
    const second = createSchedule({
      ...baseInput(),
      time_slot_id: fixtures.timeSlotId2,
    });

    const result = validateScheduleMove(second.id, fixtures.timeSlotId);
    expect(result.hasConflict).toBe(true);
  });
});

describe('MOD-03 Schedule Engine', () => {
  beforeEach(() => {
    ({ db, fixtures } = createTestDb());
  });

  afterEach(() => {
    destroyTestDb(db);
  });

  it('creates a schedule when no conflicts exist', () => {
    const schedule = createSchedule(baseInput());
    expect(schedule.section_id).toBe(fixtures.sectionId);
    expect(schedule.subject_code).toBe('IT 101');
    expect(schedule.faculty_name).toBe('Test Faculty');
  });

  it('throws when creating a conflicting schedule', () => {
    createSchedule(baseInput());
    expect(() => createSchedule(baseInput())).toThrow(/Faculty is already assigned/);
  });

  it('generates schedules for a section from curriculum', () => {
    const result = generateSchedulesForSection(fixtures.sectionId, fixtures.semesterId);
    expect(result.created).toBeGreaterThanOrEqual(1);
    expect(result.errors).toHaveLength(0);
  });
});

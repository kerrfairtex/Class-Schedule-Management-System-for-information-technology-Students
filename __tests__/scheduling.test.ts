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

/** Helper: collect all conflict messages (blocking + non-blocking) for assertions. */
function messages(result: Awaited<ReturnType<typeof detectConflicts>>): string[] {
  return [...result.blockingConflicts, ...result.nonBlockingConflicts].map((c) => c.message);
}

describe('MOD-04 Conflict Engine', () => {
  beforeEach(async () => {
    ({ db, fixtures } = createTestDb());
  });

  afterEach(() => {
    destroyTestDb(db);
  });

  it('allows a valid schedule with no conflicts', async () => {
    const result = await detectConflicts(baseInput());
    expect(result.hasConflict).toBe(false);
    expect(result.hasBlockingConflict).toBe(false);
    expect(messages(result)).toHaveLength(0);
  });

  it('detects faculty double-booking', async () => {
    await createSchedule(baseInput());
    const result = await detectConflicts(baseInput());
    expect(result.hasBlockingConflict).toBe(true);
    expect(messages(result)).toContain('Faculty is already assigned to another class at this time');
  });

  it('detects room double-booking', async () => {
    await createSchedule(baseInput());
    const result = await detectConflicts({
      ...baseInput(),
      section_id: fixtures.sectionId,
      subject_id: fixtures.subjectId,
      faculty_id: fixtures.facultyId,
    });
    expect(result.hasBlockingConflict).toBe(true);
    expect(messages(result)).toContain('Room is already booked at this time');
  });

  it('detects section double-booking', async () => {
    await createSchedule(baseInput());
    const result = await detectConflicts({
      ...baseInput(),
      faculty_id: fixtures.facultyId,
      room_id: fixtures.roomId,
    });
    expect(result.hasBlockingConflict).toBe(true);
    expect(messages(result)).toContain('Section already has a class at this time');
  });

  it('detects faculty unavailability (non-blocking)', async () => {
    db.prepare(
      'INSERT INTO faculty_availability (faculty_id, time_slot_id, is_available) VALUES (?, ?, 0)'
    ).run(fixtures.facultyId, fixtures.timeSlotId);

    const result = await detectConflicts(baseInput());
    // Per spec §33: availability is NON-blocking
    expect(result.hasBlockingConflict).toBe(false);
    expect(result.hasConflict).toBe(true);
    expect(messages(result)).toContain('Faculty is not available at this time slot');
  });

  it('excludes current schedule when validating a move', async () => {
    const schedule = await createSchedule(baseInput());
    const result = await validateScheduleMove(schedule.id, fixtures.timeSlotId2);
    expect(result.hasConflict).toBe(false);
    expect(result.hasBlockingConflict).toBe(false);
  });

  it('rejects move that causes faculty conflict', async () => {
    await createSchedule(baseInput());
    const second = await createSchedule({
      ...baseInput(),
      time_slot_id: fixtures.timeSlotId2,
    });

    const result = await validateScheduleMove(second.id, fixtures.timeSlotId);
    expect(result.hasBlockingConflict).toBe(true);
  });
});

describe('MOD-03 Schedule Engine', () => {
  beforeEach(async () => {
    ({ db, fixtures } = createTestDb());
  });

  afterEach(() => {
    destroyTestDb(db);
  });

  it('creates a schedule when no conflicts exist', async () => {
    const schedule = await createSchedule(baseInput());
    expect(schedule.section_id).toBe(fixtures.sectionId);
    expect(schedule.subject_code).toBe('IT 101');
    expect(schedule.faculty_name).toBe('Test Faculty');
  });

  it('throws when creating a conflicting schedule', async () => {
    await createSchedule(baseInput());
    await expect(createSchedule(baseInput())).rejects.toThrow(/Faculty is already assigned/);
  });

  it('generates schedules for a section from curriculum', async () => {
    // IT 101 has 3 units and no hours set, so it needs 3 lecture hours; the
    // fixture has only two 1-hour periods. Both are used and the shortfall
    // is reported instead of the subject counting as done.
    const result = await generateSchedulesForSection(fixtures.sectionId, fixtures.semesterId);
    expect(result.created).toBe(2);
    expect(result.errors).toEqual(['IT 101 lecture: placed 2 of 3 hours']);
  });
});
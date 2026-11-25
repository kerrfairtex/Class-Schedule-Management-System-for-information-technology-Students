import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb, destroyTestDb, type TestFixtures } from '@/lib/persistence/test-db';
import {
  countPublicSchedules,
  createSchedule,
  getPublicSchedules,
  getSchedulesByFaculty,
  getSchedulesBySection,
  transitionSchedule,
} from '@/lib/modules/mod-03-schedule-engine/service';
import { detectConflicts } from '@/lib/modules/mod-04-conflict-engine/validator';
import { scheduleVisibilitySql } from '@/lib/modules/mod-03-schedule-engine/visibility';
import type { ScheduleStatus } from '@/lib/domain/types';

let db: Database.Database;
let fixtures: TestFixtures;

function input() {
  return {
    section_id: fixtures.sectionId,
    subject_id: fixtures.subjectId,
    faculty_id: fixtures.facultyId,
    room_id: fixtures.roomId,
    time_slot_id: fixtures.timeSlotId,
    semester_id: fixtures.semesterId,
  };
}

function setDataEnvironment(value: string) {
  db.prepare(`INSERT INTO system_settings (key, value) VALUES ('data_environment', ?)`).run(value);
}

async function walk(id: number, ...steps: ScheduleStatus[]) {
  for (const step of steps) {
    const r = await transitionSchedule(id, step, undefined, 'registrar');
    expect(r.ok, r.message).toBe(true);
  }
}

describe('schedule visibility (spec §35, §63)', () => {
  beforeEach(() => {
    ({ db, fixtures } = createTestDb());
  });
  afterEach(() => destroyTestDb(db));

  it('builds staff, faculty, student and public conditions', () => {
    expect(scheduleVisibilitySql('staff')).toBe('1 = 1');
    expect(scheduleVisibilitySql('faculty', 'x')).toBe(`x.status IN ('APPROVED', 'PUBLISHED')`);
    expect(scheduleVisibilitySql('student')).toBe(`s.status IN ('PUBLISHED')`);
    expect(scheduleVisibilitySql('public')).toContain(`s.data_environment IN ('VERIFIED', 'PRODUCTION')`);
    expect(() => scheduleVisibilitySql('staff', 's; DROP TABLE x')).toThrow();
  });

  it('creates schedules as DRAFT stamped with the deployment data environment', async () => {
    setDataEnvironment('VERIFIED');
    const s = await createSchedule(input());
    expect(s.status).toBe('DRAFT');
    expect(s.data_environment).toBe('VERIFIED');
  });

  it('defaults to DEMO when the deployment has no data_environment setting', async () => {
    const s = await createSchedule(input());
    expect(s.data_environment).toBe('DEMO');
  });

  it('hides a draft from students, faculty and the public but not staff', async () => {
    setDataEnvironment('VERIFIED');
    const s = await createSchedule(input());

    expect(await getSchedulesBySection(fixtures.sectionId, fixtures.semesterId)).toHaveLength(1);
    expect(await getSchedulesBySection(fixtures.sectionId, fixtures.semesterId, 'student')).toHaveLength(0);
    expect(await getSchedulesByFaculty(fixtures.facultyId, fixtures.semesterId, 'faculty')).toHaveLength(0);
    expect(await getPublicSchedules()).toHaveLength(0);
    expect(await countPublicSchedules()).toBe(0);

    await walk(s.id, 'PENDING_REVIEW', 'APPROVED');
    expect(await getSchedulesByFaculty(fixtures.facultyId, fixtures.semesterId, 'faculty')).toHaveLength(1);
    expect(await getSchedulesBySection(fixtures.sectionId, fixtures.semesterId, 'student')).toHaveLength(0);

    await walk(s.id, 'PUBLISHED');
    expect(await getSchedulesBySection(fixtures.sectionId, fixtures.semesterId, 'student')).toHaveLength(1);
    expect(await getPublicSchedules()).toHaveLength(1);
    expect(await countPublicSchedules()).toBe(1);
  });

  it('never shows DEMO schedules publicly, even when published', async () => {
    const s = await createSchedule(input());
    await walk(s.id, 'PENDING_REVIEW', 'APPROVED', 'PUBLISHED');
    expect(await getSchedulesBySection(fixtures.sectionId, fixtures.semesterId, 'student')).toHaveLength(1);
    expect(await getPublicSchedules()).toHaveLength(0);
  });

  it('records the approver as a bound parameter, quotes and all', async () => {
    const s = await createSchedule(input());
    await walk(s.id, 'PENDING_REVIEW');
    const r = await transitionSchedule(s.id, 'APPROVED', undefined, "o'brien");
    expect(r.ok).toBe(true);
    const row = db.prepare('SELECT approved_by FROM schedules WHERE id = ?').get(s.id) as { approved_by: string };
    expect(row.approved_by).toBe("o'brien");
  });

  it('frees the slot once a class is archived', async () => {
    const s = await createSchedule(input());
    expect((await detectConflicts(input())).hasBlockingConflict).toBe(true);
    await walk(s.id, 'ARCHIVED');
    expect((await detectConflicts(input())).hasBlockingConflict).toBe(false);
    await expect(createSchedule(input())).resolves.toBeTruthy();
  });

  it('rejects a double booking at the database level', () => {
    const insert = db.prepare(
      `INSERT INTO schedules (section_id, subject_id, faculty_id, room_id, time_slot_id, semester_id,
                              day_of_week, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?, 'monday', '09:00', '10:00')`
    );
    const v = input();
    insert.run(v.section_id, v.subject_id, v.faculty_id, v.room_id, v.time_slot_id, v.semester_id);
    expect(() =>
      insert.run(v.section_id, v.subject_id, v.faculty_id, v.room_id, v.time_slot_id, v.semester_id)
    ).toThrow(/UNIQUE/);
  });
});

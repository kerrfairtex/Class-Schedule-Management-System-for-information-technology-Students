import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb, destroyTestDb, type TestFixtures } from '@/lib/persistence/test-db';
import { createClassMeetings, createSchedule } from '@/lib/modules/mod-03-schedule-engine/service';
import { detectConflicts } from '@/lib/modules/mod-04-conflict-engine/validator';
import { friendlyDbError } from '@/lib/modules/mod-02-master-list/validation';
import {
  DEFAULT_SCHEDULING_RULES,
  getSchedulingRules,
  setSchedulingRules,
} from '@/lib/modules/mod-08-database-service/settings';

let db: Database.Database;
let f: TestFixtures;

const base = () => ({
  section_id: f.sectionId,
  subject_id: f.subjectId,
  faculty_id: f.facultyId,
  room_id: f.roomId,
  semester_id: f.semesterId,
});
const msg = (p: Promise<unknown>) => p.then(() => 'ok', (e) => friendlyDbError(e));
const kinds = async (day: string, start: string, end: string, extra: Record<string, number> = {}) =>
  (await detectConflicts({ ...base(), ...extra, day_of_week: day, start_time: start, end_time: end })).blockingConflicts.map(
    (c) => c.kind
  );

describe('scheduling rules', () => {
  beforeEach(() => ({ db, fixtures: f } = createTestDb()));
  afterEach(() => destroyTestDb(db));

  it('uses defaults until an admin saves rules, and rejects bad rules', async () => {
    expect(await getSchedulingRules()).toEqual(DEFAULT_SCHEDULING_RULES);
    expect(await msg(setSchedulingRules({ ...DEFAULT_SCHEDULING_RULES, dayStart: '19:00', dayEnd: '07:00' }))).toBe(
      'The school day must end after it starts.'
    );
    expect(await msg(setSchedulingRules({ ...DEFAULT_SCHEDULING_RULES, maxFacultyHoursDay: 30 }))).toBe(
      'Daily limits cannot exceed 24 hours.'
    );
    await setSchedulingRules({ ...DEFAULT_SCHEDULING_RULES, dayStart: '08:00' });
    expect((await getSchedulingRules()).dayStart).toBe('08:00');
  });

  it('blocks classes outside school hours', async () => {
    expect(await kinds('monday', '06:00', '07:30')).toEqual(['hours']);
    expect(await kinds('monday', '18:00', '19:30')).toEqual(['hours']);
    expect(await kinds('monday', '07:00', '08:00')).toEqual([]);
  });

  it('blocks an instructor not assigned to the subject', async () => {
    db.prepare(
      `INSERT INTO faculty (employee_id, first_name, last_name, email, phone, department_id) VALUES (?, ?, ?, ?, ?, ?)`
    ).run('FAC-2', 'Other', 'Teacher', 'o@trac.edu.ph', '09000000001', f.departmentId);
    const other = (db.prepare(`SELECT id FROM faculty WHERE employee_id = 'FAC-2'`).get() as { id: number }).id;
    expect(await kinds('monday', '08:00', '09:00', { faculty_id: other })).toEqual(['qualification']);
    expect(await msg(createSchedule({ ...base(), faculty_id: other, day_of_week: 'monday', start_time: '08:00', end_time: '09:00' }))).toMatch(
      /not assigned to teach this subject/
    );
  });

  it('counts every day of a new multi-day class toward the weekly load', async () => {
    await setSchedulingRules({ ...DEFAULT_SCHEDULING_RULES, maxFacultyHoursWeek: 5, maxFacultyHoursDay: 4 });
    // MWF 2 hours = 6 hours: no single day is over, the week is.
    expect(await msg(createClassMeetings({ ...base(), days: ['monday', 'wednesday', 'friday'], start_time: '08:00', end_time: '10:00' }))).toMatch(
      /Instructor would teach 6 hours this week \(limit 5\)/
    );
    expect((db.prepare('SELECT COUNT(*) c FROM schedules').get() as { c: number }).c).toBe(0);
    const ok = await createClassMeetings({ ...base(), days: ['monday', 'wednesday'], start_time: '08:00', end_time: '10:00' });
    expect(ok.ids).toHaveLength(2);
  });

  it('blocks going over the daily load', async () => {
    await setSchedulingRules({ ...DEFAULT_SCHEDULING_RULES, maxFacultyHoursDay: 4 });
    await createSchedule({ ...base(), day_of_week: 'monday', start_time: '08:00', end_time: '10:00' });
    await createSchedule({ ...base(), day_of_week: 'monday', start_time: '13:00', end_time: '15:00' });
    expect(await kinds('monday', '16:00', '17:00')).toEqual(['load']);
    expect(await kinds('tuesday', '16:00', '17:00')).toEqual([]);
  });

  it('requires a 30-minute break after the longest run allowed', async () => {
    await setSchedulingRules({ ...DEFAULT_SCHEDULING_RULES, maxContinuousHours: 3 });
    await createSchedule({ ...base(), day_of_week: 'monday', start_time: '08:00', end_time: '10:00' });
    // A 15-minute gap is not a break: 08:00–11:30 is 3.5 hours in a row.
    const r = await detectConflicts({ ...base(), day_of_week: 'monday', start_time: '10:15', end_time: '11:30' });
    expect(r.blockingConflicts.map((c) => c.message)).toEqual([
      'Instructor would be in class 3.5 hours in a row on Monday without a 30-minute break (limit 3)',
      'Section would be in class 3.5 hours in a row on Monday without a 30-minute break (limit 3)',
    ]);
    // A 30-minute gap is a break.
    expect(await kinds('monday', '10:30', '11:30')).toEqual([]);
  });

  it('an edited class is not counted twice against its own limits', async () => {
    await setSchedulingRules({ ...DEFAULT_SCHEDULING_RULES, maxFacultyHoursDay: 3 });
    const s = await createSchedule({ ...base(), day_of_week: 'monday', start_time: '08:00', end_time: '11:00' });
    const r = await detectConflicts({ ...base(), day_of_week: 'monday', start_time: '08:00', end_time: '11:00' }, s.id);
    expect(r.hasBlockingConflict).toBe(false);
  });
});

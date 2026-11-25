import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb, destroyTestDb, type TestFixtures } from '@/lib/persistence/test-db';
import {
  createClassMeetings,
  createSchedule,
  generateSchedulesForSection,
  getSectionLoad,
  moveSchedule,
  updateSchedule,
} from '@/lib/modules/mod-03-schedule-engine/service';
import { detectConflicts } from '@/lib/modules/mod-04-conflict-engine/validator';
import { friendlyDbError } from '@/lib/modules/mod-02-master-list/validation';

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

describe('classes with free times and lecture/lab parts', () => {
  beforeEach(() => ({ db, fixtures: f } = createTestDb()));
  afterEach(() => destroyTestDb(db));

  it('saves a 2-hour lecture with its own times', async () => {
    const s = await createSchedule({ ...base(), day_of_week: 'wednesday', start_time: '07:30', end_time: '09:30' });
    expect(s).toMatchObject({ day_of_week: 'wednesday', start_time: '07:30', end_time: '09:30', component: 'LEC', time_slot_id: null });
  });

  it('detects overlaps, not just identical periods', async () => {
    await createSchedule({ ...base(), day_of_week: 'monday', start_time: '07:30', end_time: '09:30' });
    // 08:30–10:00 overlaps 07:30–09:30 for the same room, teacher and section.
    const r = await detectConflicts({ ...base(), day_of_week: 'monday', start_time: '08:30', end_time: '10:00' });
    expect(r.blockingConflicts.map((c) => c.kind).sort()).toEqual(['faculty', 'room', 'section']);
    expect(r.blockingConflicts[0].detail).toMatch(/IT 101 \(BSIT-1A\), Monday 7:30 AM–9:30 AM/);
    // Back to back is fine.
    const ok = await detectConflicts({ ...base(), day_of_week: 'monday', start_time: '09:30', end_time: '10:30' });
    expect(ok.hasBlockingConflict).toBe(false);
  });

  it('a 2-hour class clashes with a 1-hour period it covers', async () => {
    await createSchedule({ ...base(), day_of_week: 'monday', start_time: '08:00', end_time: '10:00' });
    // fixture period: Monday 09:00–10:00
    expect((await detectConflicts({ ...base(), time_slot_id: f.timeSlotId })).hasBlockingConflict).toBe(true);
  });

  it('creates one class on several days at once, or none', async () => {
    const r = await createClassMeetings({ ...base(), days: ['monday', 'wednesday', 'friday'], start_time: '13:00', end_time: '14:00' });
    expect(r.ids).toHaveLength(3);
    // Wednesday now clashes, so a TTh+W request saves nothing.
    const before = (db.prepare('SELECT COUNT(*) c FROM schedules').get() as { c: number }).c;
    expect(await msg(createClassMeetings({ ...base(), days: ['tuesday', 'wednesday'], start_time: '13:30', end_time: '14:30' }))).toMatch(
      /^Wednesday: Faculty is already assigned/
    );
    expect((db.prepare('SELECT COUNT(*) c FROM schedules').get() as { c: number }).c).toBe(before);
  });

  it('rejects bad times', async () => {
    expect(await msg(createSchedule({ ...base(), day_of_week: 'monday', start_time: '10:00', end_time: '09:00' }))).toBe(
      'The class must end after it starts.'
    );
    expect(await msg(createSchedule({ ...base(), day_of_week: 'funday', start_time: '09:00', end_time: '10:00' }))).toBe('Choose a day.');
  });

  it('moves a class and keeps its length; edits instructor/room/part/time', async () => {
    const s = await createSchedule({ ...base(), day_of_week: 'monday', start_time: '13:00', end_time: '16:00', component: 'LAB' });
    const moved = await moveSchedule(s.id, { day_of_week: 'thursday', start_time: '08:00' });
    expect(moved).toMatchObject({ day_of_week: 'thursday', start_time: '08:00', end_time: '11:00' });
    const edited = await updateSchedule(s.id, { component: 'LEC', start_time: '08:00', end_time: '09:30' });
    expect(edited).toMatchObject({ component: 'LEC', end_time: '09:30', status: 'DRAFT' });
  });

  it('warns when a lab is placed in a lecture room', async () => {
    const s = await createSchedule({ ...base(), day_of_week: 'friday', start_time: '13:00', end_time: '16:00', component: 'LAB' });
    expect(s.warnings).toContain('This lab class is in a lecture room, not a laboratory');
  });

  it('schedules lecture and lab hours separately and reports load', async () => {
    db.prepare('UPDATE subjects SET lec_units = 2, lab_units = 1, lec_hours = 2, lab_hours = 1 WHERE id = ?').run(f.subjectId);
    db.prepare("INSERT INTO time_slots (day_of_week, start_time, end_time) VALUES ('wednesday', '13:00', '14:00')").run();
    const result = await generateSchedulesForSection(f.sectionId, f.semesterId);
    expect(result).toEqual({ created: 3, errors: [] });
    const load = await getSectionLoad(f.sectionId, f.semesterId);
    expect(load.map((r) => [r.component, r.required_hours, r.scheduled_hours])).toEqual([
      ['LAB', 1, 1],
      ['LEC', 2, 2],
    ]);
    // Re-running adds nothing: both parts already have meetings.
    expect(await generateSchedulesForSection(f.sectionId, f.semesterId)).toEqual({ created: 0, errors: [] });
  });
});

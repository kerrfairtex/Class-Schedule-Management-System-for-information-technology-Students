import { getDb } from '@/lib/persistence/db';
import type { ClassComponent, Conflict, ConflictResult, ScheduleInput } from '@/lib/domain/types';
import { DAY_LABELS, WEEK_ORDER } from '@/lib/domain/constants';
import { getSchedulingRules, MIN_BREAK_MINUTES } from '@/lib/modules/mod-08-database-service/settings';

/**
 * MOD-04 conflict detection (spec §33/§34).
 *
 * Classes have free start and end times, so a clash is an OVERLAP on the same
 * day, not "the same period": a 7:30–9:30 lecture clashes with an 8:30–9:30
 * class in the same room. Back-to-back classes (one ends 9:30, the next
 * starts 9:30) do not clash.
 */

/** Cancelled and archived classes no longer hold their room, teacher or slot. */
const OCCUPIES_SLOT = `s.status NOT IN ('CANCELLED', 'ARCHIVED')`;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A class meeting with its time resolved. */
export interface TimedInput {
  section_id: number;
  subject_id: number;
  faculty_id: number;
  room_id: number;
  semester_id: number;
  time_slot_id: number | null;
  day_of_week: string;
  start_time: string;
  end_time: string;
  component: ClassComponent;
}

export class ScheduleTimeError extends Error {}

const to12h = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

/**
 * Turn a period id or an explicit day/start/end into one timed meeting.
 * Explicit times win; a period fills in whatever is missing.
 */
export async function resolveTimes(input: ScheduleInput): Promise<TimedInput> {
  let { day_of_week: day, start_time: start, end_time: end } = input;
  const slotId = input.time_slot_id ?? null;
  if ((!day || !start || !end) && slotId) {
    const db = await getDb();
    const slot = (await db
      .prepare('SELECT day_of_week, start_time, end_time FROM time_slots WHERE id = ?')
      .get(slotId)) as { day_of_week: string; start_time: string; end_time: string } | undefined;
    if (!slot) throw new ScheduleTimeError('That period no longer exists.');
    day ??= slot.day_of_week;
    start ??= slot.start_time;
    end ??= slot.end_time;
  }
  if (!day || !(WEEK_ORDER as readonly string[]).includes(day)) throw new ScheduleTimeError('Choose a day.');
  if (!start || !end || !TIME.test(start) || !TIME.test(end)) throw new ScheduleTimeError('Times must be HH:MM.');
  if (end <= start) throw new ScheduleTimeError('The class must end after it starts.');
  return {
    section_id: input.section_id,
    subject_id: input.subject_id,
    faculty_id: input.faculty_id,
    room_id: input.room_id,
    semester_id: input.semester_id,
    time_slot_id: slotId,
    day_of_week: day,
    start_time: start,
    end_time: end,
    component: input.component === 'LAB' ? 'LAB' : 'LEC',
  };
}

interface Clash {
  id: number;
  subject_code: string;
  section_code: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

const describe = (c: Clash) =>
  `${c.subject_code} (${c.section_code}), ${DAY_LABELS[c.day_of_week] ?? c.day_of_week} ${to12h(c.start_time)}–${to12h(c.end_time)}`;

/** First active class in the same semester and day whose time overlaps. */
async function firstOverlap(
  column: 'faculty_id' | 'room_id' | 'section_id',
  t: TimedInput,
  excludeScheduleId?: number
): Promise<Clash | undefined> {
  const db = await getDb();
  const exclude = excludeScheduleId ? 'AND s.id <> ?' : '';
  const params: unknown[] = [t[column], t.semester_id, t.day_of_week, t.end_time, t.start_time];
  if (excludeScheduleId) params.push(excludeScheduleId);
  return (await db
    .prepare(
      `SELECT s.id, sub.code AS subject_code, sec.code AS section_code, s.day_of_week, s.start_time, s.end_time
       FROM schedules s
       JOIN subjects sub ON sub.id = s.subject_id
       JOIN sections sec ON sec.id = s.section_id
       WHERE s.${column} = ? AND s.semester_id = ? AND s.day_of_week = ?
         AND s.start_time < ? AND ? < s.end_time
         AND ${OCCUPIES_SLOT} ${exclude}
       ORDER BY s.start_time LIMIT 1`
    )
    .get(...params)) as Clash | undefined;
}

const fmtHours = (mins: number) => String(Math.round((mins / 60) * 10) / 10);

/** Same-day classes of one instructor or section, this meeting excluded. */
async function dayMeetings(column: 'faculty_id' | 'section_id', t: TimedInput, excludeScheduleId?: number) {
  const db = await getDb();
  const exclude = excludeScheduleId ? 'AND s.id <> ?' : '';
  const params: unknown[] = [t[column], t.semester_id];
  if (excludeScheduleId) params.push(excludeScheduleId);
  return (await db
    .prepare(
      `SELECT s.day_of_week, s.start_time, s.end_time FROM schedules s
       WHERE s.${column} = ? AND s.semester_id = ? AND ${OCCUPIES_SLOT} ${exclude}`
    )
    .all(...params)) as { day_of_week: string; start_time: string; end_time: string }[];
}

/**
 * Length of the run of classes containing this meeting, where a gap shorter
 * than MIN_BREAK_MINUTES does not count as a break.
 */
function continuousMinutes(t: TimedInput, sameDay: { start_time: string; end_time: string }[]): number {
  const blocks = [...sameDay, t]
    .map((m) => [minutes(m.start_time), minutes(m.end_time)] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [s, e] of blocks) {
    const last = merged[merged.length - 1];
    if (last && s - last[1] < MIN_BREAK_MINUTES) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  const start = minutes(t.start_time);
  const run = merged.find(([s, e]) => s <= start && start < e);
  return run ? run[1] - run[0] : 0;
}

/**
 * Department rules (Settings → Scheduling rules): school hours, a qualified
 * instructor, instructor load, and a break after long runs. All blocking.
 * `otherNewMinutes` is the length of sibling meetings saved in the same
 * request (e.g. the Wednesday and Friday of an MWF class), so the weekly load
 * counts them too.
 */
async function ruleViolations(t: TimedInput, excludeScheduleId: number | undefined, otherNewMinutes: number): Promise<Conflict[]> {
  const rules = await getSchedulingRules();
  const db = await getDb();
  const out: Conflict[] = [];
  const day = DAY_LABELS[t.day_of_week] ?? t.day_of_week;
  const length = minutes(t.end_time) - minutes(t.start_time);

  if (t.start_time < rules.dayStart || t.end_time > rules.dayEnd) {
    out.push({
      kind: 'hours',
      message: `Class is outside school hours (${to12h(rules.dayStart)}–${to12h(rules.dayEnd)})`,
      blocking: true,
    });
  }

  const qualified = await db
    .prepare('SELECT 1 AS ok FROM faculty_subjects WHERE faculty_id = ? AND subject_id = ?')
    .get(t.faculty_id, t.subject_id);
  if (!qualified) {
    out.push({
      kind: 'qualification',
      message: 'Instructor is not assigned to teach this subject (assign it in Master List first)',
      blocking: true,
    });
  }

  const [facultyClasses, sectionClasses] = await Promise.all([
    dayMeetings('faculty_id', t, excludeScheduleId),
    dayMeetings('section_id', t, excludeScheduleId),
  ]);
  const total = (ms: { start_time: string; end_time: string }[]) =>
    ms.reduce((sum, m) => sum + minutes(m.end_time) - minutes(m.start_time), 0);

  const week = total(facultyClasses) + length + otherNewMinutes;
  if (week > rules.maxFacultyHoursWeek * 60) {
    out.push({
      kind: 'load',
      message: `Instructor would teach ${fmtHours(week)} hours this week (limit ${rules.maxFacultyHoursWeek})`,
      blocking: true,
    });
  }
  const facultyToday = facultyClasses.filter((m) => m.day_of_week === t.day_of_week);
  const today = total(facultyToday) + length;
  if (today > rules.maxFacultyHoursDay * 60) {
    out.push({
      kind: 'load',
      message: `Instructor would teach ${fmtHours(today)} hours on ${day} (limit ${rules.maxFacultyHoursDay})`,
      blocking: true,
    });
  }

  const limit = rules.maxContinuousHours * 60;
  const runs = [
    ['Instructor', facultyToday],
    ['Section', sectionClasses.filter((m) => m.day_of_week === t.day_of_week)],
  ] as const;
  for (const [who, sameDay] of runs) {
    const run = continuousMinutes(t, sameDay);
    if (run > limit) {
      out.push({
        kind: 'break',
        message: `${who} would be in class ${fmtHours(run)} hours in a row on ${day} without a ${MIN_BREAK_MINUTES}-minute break (limit ${rules.maxContinuousHours})`,
        blocking: true,
      });
    }
  }
  return out;
}

/**
 * All conflicts for a proposed class meeting: BLOCKING ones must be fixed
 * before saving or publishing; NON-BLOCKING ones are warnings the admin may
 * accept.
 */
export async function detectConflicts(
  input: ScheduleInput,
  excludeScheduleId?: number,
  options: { otherNewMinutes?: number } = {}
): Promise<ConflictResult> {
  const t = await resolveTimes(input);
  const db = await getDb();
  const blocking: Conflict[] = [];
  const nonBlocking: Conflict[] = [];
  blocking.push(...(await ruleViolations(t, excludeScheduleId, options.otherNewMinutes ?? 0)));

  const checks = [
    ['faculty_id', 'faculty', 'Faculty is already assigned to another class at this time'],
    ['room_id', 'room', 'Room is already booked at this time'],
    ['section_id', 'section', 'Section already has a class at this time'],
  ] as const;
  for (const [column, kind, message] of checks) {
    const clash = await firstOverlap(column, t, excludeScheduleId);
    if (clash) {
      blocking.push({ kind, message, blocking: true, conflictingScheduleId: clash.id, detail: describe(clash) });
    }
  }

  const [sectionRow, roomRow] = await Promise.all([
    db.prepare('SELECT capacity FROM sections WHERE id = ?').get(t.section_id),
    db.prepare('SELECT capacity, room_type FROM rooms WHERE id = ?').get(t.room_id),
  ]) as [{ capacity: number | null } | undefined, { capacity: number | null; room_type?: string } | undefined];

  if (
    sectionRow &&
    roomRow &&
    typeof sectionRow.capacity === 'number' &&
    typeof roomRow.capacity === 'number' &&
    sectionRow.capacity > 0 &&
    sectionRow.capacity > roomRow.capacity
  ) {
    blocking.push({
      kind: 'capacity',
      message: `Section capacity (${sectionRow.capacity}) exceeds room capacity (${roomRow.capacity})`,
      blocking: true,
    });
  }

  // Faculty marked unavailable in any standard period this class overlaps.
  const unavailable = await db
    .prepare(
      `SELECT ts.start_time, ts.end_time FROM faculty_availability fa
       JOIN time_slots ts ON ts.id = fa.time_slot_id
       WHERE fa.faculty_id = ? AND fa.is_available = 0
         AND ts.day_of_week = ? AND ts.start_time < ? AND ? < ts.end_time
       LIMIT 1`
    )
    .get(t.faculty_id, t.day_of_week, t.end_time, t.start_time);
  if (unavailable) {
    nonBlocking.push({ kind: 'availability', message: 'Faculty is not available at this time slot', blocking: false });
  }

  if (t.component === 'LAB' && roomRow?.room_type === 'LECTURE') {
    nonBlocking.push({ kind: 'room-type', message: 'This lab class is in a lecture room, not a laboratory', blocking: false });
  }

  return {
    hasConflict: blocking.length > 0 || nonBlocking.length > 0,
    blockingConflicts: blocking,
    nonBlockingConflicts: nonBlocking,
    hasBlockingConflict: blocking.length > 0,
  };
}

type StoredSchedule = ScheduleInput & { id: number; day_of_week: string; start_time: string; end_time: string };

async function stored(scheduleId: number): Promise<StoredSchedule | undefined> {
  const db = await getDb();
  return (await db.prepare('SELECT * FROM schedules WHERE id = ?').get(scheduleId)) as StoredSchedule | undefined;
}

const notFound = (): ConflictResult => ({
  hasConflict: true,
  hasBlockingConflict: true,
  blockingConflicts: [{ kind: 'time', message: 'Schedule not found', blocking: true }],
  nonBlockingConflicts: [],
});

/**
 * Conflicts for moving a class. `target` is a period id or a new day/start;
 * the class keeps its length unless `end_time` is given.
 */
export async function validateScheduleMove(
  scheduleId: number,
  target: number | { day_of_week: string; start_time: string; end_time?: string }
): Promise<ConflictResult> {
  const s = await stored(scheduleId);
  if (!s) return notFound();
  const times = await movedTimes(s, target);
  return detectConflicts({ ...s, ...times, time_slot_id: times.time_slot_id }, scheduleId);
}

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const hhmm = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

/** New day/start/end for a moved class, keeping its length by default. */
export async function movedTimes(
  s: { start_time: string; end_time: string },
  target: number | { day_of_week: string; start_time: string; end_time?: string }
): Promise<{ day_of_week: string; start_time: string; end_time: string; time_slot_id: number | null }> {
  const length = minutes(s.end_time) - minutes(s.start_time);
  if (typeof target === 'number') {
    const db = await getDb();
    const slot = (await db
      .prepare('SELECT day_of_week, start_time FROM time_slots WHERE id = ?')
      .get(target)) as { day_of_week: string; start_time: string } | undefined;
    if (!slot) throw new ScheduleTimeError('That period no longer exists.');
    const end = minutes(slot.start_time) + length;
    if (end >= 24 * 60) throw new ScheduleTimeError('The class would run past midnight.');
    return { day_of_week: slot.day_of_week, start_time: slot.start_time, end_time: hhmm(end), time_slot_id: target };
  }
  if (!TIME.test(target.start_time)) throw new ScheduleTimeError('Times must be HH:MM.');
  const end = target.end_time ?? hhmm(minutes(target.start_time) + length);
  if (minutes(target.start_time) + length >= 24 * 60 && !target.end_time) {
    throw new ScheduleTimeError('The class would run past midnight.');
  }
  return { day_of_week: target.day_of_week, start_time: target.start_time, end_time: end, time_slot_id: null };
}

/**
 * All blocking conflicts in a semester. Used by /admin/conflicts and the
 * publish-time validator.
 */
export async function detectAllConflictsInSemester(semesterId: number): Promise<Array<{
  scheduleId: number;
  conflicts: Conflict[];
}>> {
  const db = await getDb();
  const schedules = (await db
    .prepare(
      `SELECT id, section_id, subject_id, faculty_id, room_id, time_slot_id, semester_id,
              day_of_week, start_time, end_time, component
       FROM schedules s
       WHERE s.semester_id = ? AND ${OCCUPIES_SLOT}`
    )
    .all(semesterId)) as StoredSchedule[];

  const out: Array<{ scheduleId: number; conflicts: Conflict[] }> = [];
  for (const s of schedules) {
    const r = await detectConflicts(s, s.id);
    if (r.blockingConflicts.length > 0) out.push({ scheduleId: s.id, conflicts: r.blockingConflicts });
  }
  return out;
}

/**
 * Spec §34: a schedule shall not become PUBLISHED while a blocking conflict
 * exists.
 */
export async function validateForPublish(scheduleId: number): Promise<ConflictResult> {
  const s = await stored(scheduleId);
  if (!s) return notFound();
  return detectConflicts(s, s.id);
}

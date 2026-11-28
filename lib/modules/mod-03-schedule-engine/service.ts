import { getDb, withTransaction } from '@/lib/persistence/db';
import {
  detectConflicts,
  movedTimes,
  resolveTimes,
  ScheduleTimeError,
  validateForPublish,
  type TimedInput,
} from '@/lib/modules/mod-04-conflict-engine/validator';
import type { ClassComponent, Conflict, Schedule, ScheduleInput, ScheduleStatus } from '@/lib/domain/types';
import { logAudit } from '@/lib/modules/mod-08-database-service/audit';
import { getDataEnvironment } from '@/lib/modules/mod-08-database-service/settings';
import { DomainError } from '@/lib/modules/mod-02-master-list/validation';
import { scheduleVisibilitySql, type ScheduleAudience } from './visibility';
import { ALLOWED_TRANSITIONS, EDITABLE_STATUSES } from '@/lib/domain/schedule-status';

/**
 * Throws unless the class may still be moved or deleted. Editing a class
 * under review or approved sends it back to DRAFT so it is reviewed again.
 */
async function requireEditable(scheduleId: number, verb: string): Promise<ScheduleStatus> {
  const status = await currentStatus(scheduleId);
  if (!status) throw new DomainError('That schedule no longer exists');
  if (!EDITABLE_STATUSES.includes(status)) {
    throw new DomainError(
      status === 'PUBLISHED'
        ? `Cannot ${verb} a published class. Cancel it instead, then create a replacement.`
        : `Cannot ${verb} a ${status.toLowerCase()} class.`
    );
  }
  return status;
}

const SCHEDULE_SELECT = `
  SELECT s.*,
    sec.code AS section_code, sec.year_level,
    sub.code AS subject_code, sub.name AS subject_name,
    f.first_name || ' ' || f.last_name AS faculty_name,
    r.code AS room_code, r.name AS room_name, r.room_type
  FROM schedules s
  JOIN sections sec ON sec.id = s.section_id
  JOIN subjects sub ON sub.id = s.subject_id
  JOIN faculty f ON f.id = s.faculty_id
  JOIN rooms r ON r.id = s.room_id
`;

/** "Room is already booked at this time (IT 101 (BSIT-1A), Monday 8:00–9:00 AM)". */
const conflictMessage = (conflicts: Conflict[]) =>
  conflicts.map((c) => (c.detail ? `${c.message}: ${c.detail}` : c.message)).join('; ');

/** Time errors from the conflict engine are user-facing. */
async function timed(input: ScheduleInput): Promise<TimedInput> {
  try {
    return await resolveTimes(input);
  } catch (e) {
    if (e instanceof ScheduleTimeError) throw new DomainError(e.message);
    throw e;
  }
}

export async function getSchedulesBySemester(
  semesterId: number,
  audience: ScheduleAudience = 'staff'
): Promise<Schedule[]> {
  const db = await getDb();
  return await db
    .prepare(
      `${SCHEDULE_SELECT} WHERE s.semester_id = ? AND ${scheduleVisibilitySql(audience)}
       ORDER BY sec.code, s.day_of_week, s.start_time`
    )
    .all(semesterId) as Schedule[];
}

export async function getSchedulesBySection(
  sectionId: number,
  semesterId: number,
  audience: ScheduleAudience = 'staff'
): Promise<Schedule[]> {
  const db = await getDb();
  return await db
    .prepare(
      `${SCHEDULE_SELECT} WHERE s.section_id = ? AND s.semester_id = ? AND ${scheduleVisibilitySql(audience)}
       ORDER BY s.day_of_week, s.start_time`
    )
    .all(sectionId, semesterId) as Schedule[];
}

export async function getSchedulesByFaculty(
  facultyId: number,
  semesterId: number,
  audience: ScheduleAudience = 'staff'
): Promise<Schedule[]> {
  const db = await getDb();
  return await db
    .prepare(
      `${SCHEDULE_SELECT} WHERE s.faculty_id = ? AND s.semester_id = ? AND ${scheduleVisibilitySql(audience)}
       ORDER BY s.day_of_week, s.start_time`
    )
    .all(facultyId, semesterId) as Schedule[];
}

/** Schedules an anonymous visitor may see in the active semester. */
export async function getPublicSchedules(): Promise<Schedule[]> {
  const db = await getDb();
  return await db
    .prepare(
      `${SCHEDULE_SELECT}
       JOIN semesters sem ON sem.id = s.semester_id AND sem.is_active = 1
       WHERE ${scheduleVisibilitySql('public')}
       ORDER BY sec.code, sub.code, s.day_of_week, s.start_time`
    )
    .all() as Schedule[];
}

/** Number of class meetings an anonymous visitor may see this semester. */
export async function countPublicSchedules(): Promise<number> {
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS c FROM schedules s
       JOIN semesters sem ON sem.id = s.semester_id AND sem.is_active = 1
       WHERE ${scheduleVisibilitySql('public')}`
    )
    .get() as { c: number | string };
  return Number(row.c);
}


/** The standard period with exactly these times, if one exists. */
async function matchingSlot(t: TimedInput): Promise<number | null> {
  if (t.time_slot_id) return t.time_slot_id;
  const db = await getDb();
  const row = (await db
    .prepare('SELECT id FROM time_slots WHERE day_of_week = ? AND start_time = ? AND end_time = ?')
    .get(t.day_of_week, t.start_time, t.end_time)) as { id: number } | undefined;
  return row?.id ?? null;
}

async function insertMeeting(db: any, t: TimedInput, dataEnvironment: string): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO schedules
         (section_id, subject_id, faculty_id, room_id, time_slot_id, semester_id,
          day_of_week, start_time, end_time, component, status, data_environment)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)`
    )
    .run(
      t.section_id,
      t.subject_id,
      t.faculty_id,
      t.room_id,
      await matchingSlot(t),
      t.semester_id,
      t.day_of_week,
      t.start_time,
      t.end_time,
      t.component,
      dataEnvironment
    );
  // The PostgreSQL facade returns the id in `lastID`; SQLite in `lastInsertRowid`.
  return Number(result.lastInsertRowid ?? result.lastID);
}

export async function createSchedule(
  input: ScheduleInput,
  userId?: number
): Promise<Schedule & { warnings: string[] }> {
  const t = await timed(input);
  const conflict = await detectConflicts(t);
  if (conflict.hasBlockingConflict) throw new DomainError(conflictMessage(conflict.blockingConflicts));

  // Spec §64: stamp the deployment's environment so DEMO data never goes public.
  const dataEnvironment = await getDataEnvironment();
  const db = await getDb();
  const insertedId = await insertMeeting(db, t, dataEnvironment);
  await logAudit(userId ?? null, 'CREATE', 'schedule', insertedId, JSON.stringify(t));
  const created = await db.prepare(`${SCHEDULE_SELECT} WHERE s.id = ?`).get(insertedId) as Schedule;
  // Non-blocking advisories (e.g. faculty marked unavailable) are allowed but
  // must be shown to the admin, not silently dropped.
  return { ...created, warnings: conflict.nonBlockingConflicts.map((c) => c.message) };
}

/**
 * One class on several days at once (e.g. Monday, Wednesday, Friday
 * 8:00–9:00). All days are checked first and saved together, or none are.
 */
export async function createClassMeetings(
  input: Omit<ScheduleInput, 'day_of_week' | 'time_slot_id'> & { days: string[]; start_time: string; end_time: string },
  userId?: number
): Promise<{ ids: number[]; warnings: string[] }> {
  const days = Array.from(new Set(input.days));
  if (days.length === 0) throw new DomainError('Choose at least one day.');
  const meetings = await Promise.all(days.map((day_of_week) => timed({ ...input, day_of_week })));

  const problems: string[] = [];
  const warnings = new Set<string>();
  // Each day's weekly-load check also counts the other days saved with it.
  const lengths = meetings.map((t) => mins(t.end_time) - mins(t.start_time));
  const allNew = lengths.reduce((a, b) => a + b, 0);
  for (const [i, t] of meetings.entries()) {
    const r = await detectConflicts(t, undefined, { otherNewMinutes: allNew - lengths[i] });
    if (r.hasBlockingConflict) problems.push(`${t.day_of_week[0].toUpperCase()}${t.day_of_week.slice(1)}: ${conflictMessage(r.blockingConflicts)}`);
    r.nonBlockingConflicts.forEach((c) => warnings.add(c.message));
  }
  if (problems.length) throw new DomainError(problems.join(' | '));

  const dataEnvironment = await getDataEnvironment();
  const ids = await withTransaction(async (tx) => {
    const out: number[] = [];
    for (const t of meetings) out.push(await insertMeeting(tx, t, dataEnvironment));
    return out;
  });
  for (let i = 0; i < ids.length; i++) {
    await logAudit(userId ?? null, 'CREATE', 'schedule', ids[i], JSON.stringify(meetings[i]));
  }
  return { ids, warnings: Array.from(warnings) };
}

/**
 * Move a class to a standard period (keeping its length) or to any day and
 * start time. A class under review or approved goes back to DRAFT.
 */
export async function moveSchedule(
  scheduleId: number,
  target: number | { day_of_week: string; start_time: string; end_time?: string },
  userId?: number
): Promise<Schedule> {
  const status = await requireEditable(scheduleId, 'move');
  const db = await getDb();
  const current = (await db.prepare('SELECT * FROM schedules WHERE id = ?').get(scheduleId)) as Schedule & {
    start_time: string;
    end_time: string;
  };
  let times;
  try {
    times = await movedTimes(current, target);
  } catch (e) {
    if (e instanceof ScheduleTimeError) throw new DomainError(e.message);
    throw e;
  }
  const t = await timed({ ...current, ...times });
  const conflict = await detectConflicts(t, scheduleId);
  if (conflict.hasBlockingConflict) throw new DomainError(conflictMessage(conflict.blockingConflicts));

  await db
    .prepare(
      `UPDATE schedules SET day_of_week = ?, start_time = ?, end_time = ?, time_slot_id = ?,
       status = 'DRAFT', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
    .run(t.day_of_week, t.start_time, t.end_time, await matchingSlot(t), scheduleId);

  const reset = status === 'DRAFT' ? '' : `; ${status} → DRAFT`;
  await logAudit(userId ?? null, 'UPDATE', 'schedule', scheduleId, `${t.day_of_week} ${t.start_time}-${t.end_time}${reset}`);
  return await db.prepare(`${SCHEDULE_SELECT} WHERE s.id = ?`).get(scheduleId) as Schedule;
}

/** Drag-and-drop onto a standard period. */
export async function updateScheduleTimeSlot(scheduleId: number, timeSlotId: number, userId?: number): Promise<Schedule> {
  return moveSchedule(scheduleId, timeSlotId, userId);
}

/**
 * Change anything about a class: instructor, room, lecture/lab part, day,
 * start and end. Same checks as creating it; returns to DRAFT if it was
 * under review or approved.
 */
export async function updateSchedule(
  scheduleId: number,
  changes: Partial<Pick<ScheduleInput, 'faculty_id' | 'room_id' | 'subject_id' | 'component' | 'day_of_week' | 'start_time' | 'end_time'>>,
  userId?: number
): Promise<Schedule & { warnings: string[] }> {
  const status = await requireEditable(scheduleId, 'edit');
  const db = await getDb();
  const current = (await db.prepare('SELECT * FROM schedules WHERE id = ?').get(scheduleId)) as Schedule;
  const t = await timed({ ...current, ...changes, time_slot_id: null } as ScheduleInput);
  const conflict = await detectConflicts(t, scheduleId);
  if (conflict.hasBlockingConflict) throw new DomainError(conflictMessage(conflict.blockingConflicts));

  await db
    .prepare(
      `UPDATE schedules SET subject_id = ?, faculty_id = ?, room_id = ?, component = ?,
       day_of_week = ?, start_time = ?, end_time = ?, time_slot_id = ?,
       status = 'DRAFT', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
    .run(t.subject_id, t.faculty_id, t.room_id, t.component, t.day_of_week, t.start_time, t.end_time, await matchingSlot(t), scheduleId);
  const reset = status === 'DRAFT' ? '' : `; ${status} → DRAFT`;
  await logAudit(userId ?? null, 'UPDATE', 'schedule', scheduleId, `${JSON.stringify(changes)}${reset}`);
  const updated = await db.prepare(`${SCHEDULE_SELECT} WHERE s.id = ?`).get(scheduleId) as Schedule;
  return { ...updated, warnings: conflict.nonBlockingConflicts.map((c) => c.message) };
}

export async function deleteSchedule(scheduleId: number, userId?: number) {
  await requireEditable(scheduleId, 'delete');
  const db = await getDb();
  await db.prepare('DELETE FROM schedules WHERE id = ?').run(scheduleId);
  await logAudit(userId ?? null, 'DELETE', 'schedule', scheduleId);
}

/**
 * Spec section 32–34: schedule status workflow.
 *
 * Allowed transitions:
 *   (none)  → DRAFT          (createSchedule)
 *   DRAFT   → PENDING_REVIEW (submitForReview)
 *   PENDING_REVIEW → DRAFT  (recallToDraft)
 *   PENDING_REVIEW → APPROVED (approve)
 *   APPROVED → DRAFT        (revokeApproval)
 *   APPROVED → PUBLISHED    (publish — BLOCKED if any blocking conflict)
 *   PUBLISHED → CANCELLED   (cancel)
 *   any     → ARCHIVED       (archive)
 *
 * Per spec section 34, transitions to PUBLISHED MUST be validated against
 * blocking conflicts. If any blocking conflict exists, the transition
 * returns { ok: false, conflicts } and the schedule is left APPROVED.
 */

export type { ScheduleStatus };

export interface TransitionResult {
  ok: boolean;
  fromStatus?: ScheduleStatus;
  toStatus?: ScheduleStatus;
  message?: string;
  blockingConflicts?: import('@/lib/domain/types').Conflict[];
}

async function currentStatus(scheduleId: number): Promise<ScheduleStatus | null> {
  const db = await getDb();
  const row = await db
    .prepare('SELECT status FROM schedules WHERE id = ?')
    .get(scheduleId) as { status: ScheduleStatus } | undefined;
  return row?.status ?? null;
}

export async function transitionSchedule(
  scheduleId: number,
  toStatus: ScheduleStatus,
  userId?: number,
  userName?: string
): Promise<TransitionResult> {
  const fromStatus = await currentStatus(scheduleId);
  if (!fromStatus) {
    return { ok: false, message: 'Schedule not found' };
  }
  const allowed = ALLOWED_TRANSITIONS[fromStatus] ?? [];
  if (!allowed.includes(toStatus)) {
    return {
      ok: false,
      fromStatus,
      message: `Illegal transition: ${fromStatus} → ${toStatus}`,
    };
  }

  // Spec section 34: PUBLISH requires no blocking conflicts
  if (toStatus === 'PUBLISHED') {
    const v = await validateForPublish(scheduleId);
    if (v.hasBlockingConflict) {
      return {
        ok: false,
        fromStatus,
        message: 'Cannot publish: blocking conflicts exist',
        blockingConflicts: v.blockingConflicts,
      };
    }
  }

  const db = await getDb();
  const setPublishedAt = toStatus === 'PUBLISHED' ? ', published_at = CURRENT_TIMESTAMP' : '';
  const recordsApprover = toStatus === 'APPROVED' || toStatus === 'PUBLISHED';
  const setApprover = recordsApprover ? ', approved_by = ?' : '';
  const params = recordsApprover
    ? [toStatus, userName ?? null, scheduleId]
    : [toStatus, scheduleId];

  await db.prepare(
    `UPDATE schedules
     SET status = ?, updated_at = CURRENT_TIMESTAMP ${setPublishedAt} ${setApprover}
     WHERE id = ?`
  ).run(...params);

  await logAudit(
    userId ?? null,
    `${toStatus}`,
    'schedule',
    scheduleId,
    `${fromStatus} → ${toStatus}`
  );

  return { ok: true, fromStatus, toStatus };
}

/** Curriculum semester (1 or 2) for a semester name like "1st Semester". */
export function semesterNumberOf(name: string | undefined): number {
  return name?.includes('1') ? 1 : 2;
}

/**
 * What the manual-entry form needs to offer only sensible choices: the
 * curriculum (which subjects a section takes this semester) and which
 * faculty are qualified to teach each subject.
 */
export async function getSchedulingReferences(): Promise<{
  curriculum: { program_id: number; subject_id: number; year_level: number; semester_number: number }[];
  facultySubjects: { faculty_id: number; subject_id: number }[];
}> {
  const db = await getDb();
  const [curriculum, facultySubjects] = await Promise.all([
    db.prepare('SELECT program_id, subject_id, year_level, semester_number FROM curriculum').all(),
    db.prepare('SELECT faculty_id, subject_id FROM faculty_subjects').all(),
  ]);
  return { curriculum, facultySubjects };
}

/** Weekly hours to schedule for each part of a subject. */
export function requiredParts(subject: {
  credit_hours: number;
  lec_hours?: number | string | null;
  lab_hours?: number | string | null;
}): { component: ClassComponent; hours: number }[] {
  const lec = Number(subject.lec_hours ?? 0);
  const lab = Number(subject.lab_hours ?? 0);
  // Subjects not yet given hours fall back to one lecture hour per unit.
  if (lec === 0 && lab === 0) return [{ component: 'LEC', hours: Number(subject.credit_hours) }];
  return [
    { component: 'LEC' as const, hours: lec },
    { component: 'LAB' as const, hours: lab },
  ].filter((p) => p.hours > 0);
}

const mins = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/**
 * MOD-03 auto-generation for one section: for every curriculum subject, place
 * its lecture hours and its lab hours as DRAFT meetings in free standard
 * periods, one instructor per part, labs in laboratories when possible.
 * Parts that already have meetings are skipped, so re-running is safe.
 */
export async function generateSchedulesForSection(
  sectionId: number,
  semesterId: number,
  userId?: number
): Promise<{ created: number; errors: string[] }> {
  const db = await getDb();
  const section = await db
    .prepare('SELECT * FROM sections WHERE id = ?')
    .get(sectionId) as { program_id: number; year_level: number } | undefined;
  if (!section) throw new DomainError('Section not found');

  const semester = await db
    .prepare('SELECT name FROM semesters WHERE id = ?')
    .get(semesterId) as { name: string } | undefined;
  const semesterNumber = semesterNumberOf(semester?.name);

  const subjects = await db
    .prepare(
      `SELECT c.subject_id, s.code, s.credit_hours, s.lec_hours, s.lab_hours
       FROM curriculum c JOIN subjects s ON s.id = c.subject_id
       WHERE c.program_id = ? AND c.year_level = ? AND c.semester_number = ?
       ORDER BY s.code`
    )
    .all(section.program_id, section.year_level, semesterNumber) as {
    subject_id: number;
    code: string;
    credit_hours: number;
    lec_hours: number | string | null;
    lab_hours: number | string | null;
  }[];

  const slots = (await db.prepare('SELECT id, day_of_week, start_time, end_time FROM time_slots').all()) as {
    id: number;
    day_of_week: string;
    start_time: string;
    end_time: string;
  }[];
  const dayRank = (d: string) => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(d);
  slots.sort((a, b) => dayRank(a.day_of_week) - dayRank(b.day_of_week) || a.start_time.localeCompare(b.start_time));
  const rooms = (await db.prepare('SELECT id, capacity, room_type FROM rooms ORDER BY capacity DESC').all()) as {
    id: number;
    capacity: number;
    room_type?: string;
  }[];

  let created = 0;
  const errors: string[] = [];

  for (const subject of subjects) {
    const facultyList = (await db
      .prepare(
        `SELECT f.id FROM faculty f JOIN faculty_subjects fs ON fs.faculty_id = f.id WHERE fs.subject_id = ?`
      )
      .all(subject.subject_id)) as { id: number }[];
    if (facultyList.length === 0) {
      errors.push(`No faculty assigned for ${subject.code}`);
      continue;
    }

    for (const part of requiredParts(subject)) {
      const existing = await db
        .prepare(
          'SELECT id FROM schedules WHERE section_id = ? AND subject_id = ? AND semester_id = ? AND component = ?'
        )
        .get(sectionId, subject.subject_id, semesterId, part.component);
      if (existing) continue;

      const preferred = part.component === 'LAB' ? 'LAB' : 'LECTURE';
      const roomOrder = [...rooms.filter((r) => r.room_type === preferred), ...rooms.filter((r) => r.room_type !== preferred)];
      const needed = Math.round(part.hours * 60);
      let placed = 0;

      for (const faculty of facultyList) {
        for (const slot of slots) {
          if (placed >= needed) break;
          for (const room of roomOrder) {
            const input: ScheduleInput = {
              section_id: sectionId,
              subject_id: subject.subject_id,
              faculty_id: faculty.id,
              room_id: room.id,
              time_slot_id: slot.id,
              semester_id: semesterId,
              component: part.component,
            };
            // Blocking conflicts prevent creation; warnings are tolerated (spec §33/§34).
            if (!(await detectConflicts(input)).hasBlockingConflict) {
              await createSchedule(input, userId);
              created++;
              placed += mins(slot.end_time) - mins(slot.start_time);
              break;
            }
          }
        }
        if (placed > 0) break; // keep one instructor per part
      }

      const label = `${subject.code} ${part.component === 'LAB' ? 'lab' : 'lecture'}`;
      if (placed === 0) errors.push(`Could not schedule ${label}: no free period`);
      else if (placed < needed) errors.push(`${label}: placed ${placed / 60} of ${part.hours} hours`);
    }
  }
  return { created, errors };
}

/** Scheduled versus required weekly hours per subject part for one section. */
export interface LoadRow {
  subject_id: number;
  subject_code: string;
  subject_name: string;
  component: ClassComponent;
  required_hours: number;
  scheduled_hours: number;
}

export async function getSectionLoad(sectionId: number, semesterId: number): Promise<LoadRow[]> {
  const db = await getDb();
  const section = (await db.prepare('SELECT program_id, year_level FROM sections WHERE id = ?').get(sectionId)) as
    | { program_id: number; year_level: number }
    | undefined;
  if (!section) return [];
  const semester = (await db.prepare('SELECT name FROM semesters WHERE id = ?').get(semesterId)) as { name: string } | undefined;

  const [curriculum, scheduled] = await Promise.all([
    db
      .prepare(
        `SELECT s.id AS subject_id, s.code, s.name, s.credit_hours, s.lec_hours, s.lab_hours
         FROM curriculum c JOIN subjects s ON s.id = c.subject_id
         WHERE c.program_id = ? AND c.year_level = ? AND c.semester_number = ?`
      )
      .all(section.program_id, section.year_level, semesterNumberOf(semester?.name)),
    db
      .prepare(
        `SELECT s.subject_id, sub.code, sub.name, sub.credit_hours, sub.lec_hours, sub.lab_hours,
                s.component, s.start_time, s.end_time
         FROM schedules s JOIN subjects sub ON sub.id = s.subject_id
         WHERE s.section_id = ? AND s.semester_id = ? AND s.status NOT IN ('CANCELLED', 'ARCHIVED')`
      )
      .all(sectionId, semesterId),
  ]) as [
    Array<{ subject_id: number; code: string; name: string; credit_hours: number; lec_hours: number; lab_hours: number }>,
    Array<{ subject_id: number; code: string; name: string; credit_hours: number; lec_hours: number; lab_hours: number; component: ClassComponent; start_time: string; end_time: string }>,
  ];

  const rows = new Map<string, LoadRow>();
  const subjects = new Map<number, (typeof curriculum)[number]>();
  for (const c of [...curriculum, ...scheduled]) subjects.set(c.subject_id, c);
  for (const sub of subjects.values()) {
    for (const part of requiredParts(sub)) {
      rows.set(`${sub.subject_id}|${part.component}`, {
        subject_id: sub.subject_id,
        subject_code: sub.code,
        subject_name: sub.name,
        component: part.component,
        required_hours: part.hours,
        scheduled_hours: 0,
      });
    }
  }
  for (const m of scheduled) {
    const key = `${m.subject_id}|${m.component}`;
    const row =
      rows.get(key) ??
      { subject_id: m.subject_id, subject_code: m.code, subject_name: m.name, component: m.component, required_hours: 0, scheduled_hours: 0 };
    row.scheduled_hours = Math.round((row.scheduled_hours + (mins(m.end_time) - mins(m.start_time)) / 60) * 10) / 10;
    rows.set(key, row);
  }
  return Array.from(rows.values()).sort(
    (a, b) => a.subject_code.localeCompare(b.subject_code) || a.component.localeCompare(b.component)
  );
}

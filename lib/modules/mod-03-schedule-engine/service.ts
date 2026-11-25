import { getDb, withTransaction } from '@/lib/persistence/db';
import { detectConflicts, validateScheduleMove, validateForPublish } from '@/lib/modules/mod-04-conflict-engine/validator';
import type { Schedule, ScheduleInput, ScheduleStatus } from '@/lib/domain/types';
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
    r.code AS room_code, r.name AS room_name,
    ts.day_of_week, ts.start_time, ts.end_time
  FROM schedules s
  JOIN sections sec ON sec.id = s.section_id
  JOIN subjects sub ON sub.id = s.subject_id
  JOIN faculty f ON f.id = s.faculty_id
  JOIN rooms r ON r.id = s.room_id
  JOIN time_slots ts ON ts.id = s.time_slot_id
`;

export async function getSchedulesBySemester(
  semesterId: number,
  audience: ScheduleAudience = 'staff'
): Promise<Schedule[]> {
  const db = await getDb();
  return await db
    .prepare(
      `${SCHEDULE_SELECT} WHERE s.semester_id = ? AND ${scheduleVisibilitySql(audience)}
       ORDER BY sec.code, ts.day_of_week, ts.start_time`
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
       ORDER BY ts.day_of_week, ts.start_time`
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
       ORDER BY ts.day_of_week, ts.start_time`
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
       ORDER BY sec.code, sub.code, ts.day_of_week, ts.start_time`
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


export async function createSchedule(
  input: ScheduleInput,
  userId?: number
): Promise<Schedule & { warnings: string[] }> {
  const conflict = await detectConflicts(input);
  if (conflict.hasBlockingConflict) {
    throw new DomainError(conflict.blockingConflicts.map((c) => c.message).join('; '));
  }

  // Spec §64: stamp the deployment's environment so DEMO data never goes public.
  const dataEnvironment = await getDataEnvironment();
  const db = await getDb();
  const result = await db
    .prepare(
      `INSERT INTO schedules
         (section_id, subject_id, faculty_id, room_id, time_slot_id, semester_id, status, data_environment)
       VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?)`
    )
    .run(
      input.section_id,
      input.subject_id,
      input.faculty_id,
      input.room_id,
      input.time_slot_id,
      input.semester_id,
      dataEnvironment
    );

  // The PostgreSQL facade returns the generated id in `lastID` /
  // `lastInsertRowid`; reading only `lastInsertRowid` yielded undefined on
  // PostgreSQL, which became NaN and failed against int4 columns.
  const insertedId = result.lastInsertRowid ?? result.lastID;
  await logAudit(userId ?? null, 'CREATE', 'schedule', insertedId ?? null, JSON.stringify(input));
  const created = await db.prepare(`${SCHEDULE_SELECT} WHERE s.id = ?`).get(insertedId) as Schedule;
  // Non-blocking advisories (e.g. faculty marked unavailable) are allowed but
  // must be shown to the admin, not silently dropped.
  return { ...created, warnings: conflict.nonBlockingConflicts.map((c) => c.message) };
}

export async function updateScheduleTimeSlot(
  scheduleId: number,
  timeSlotId: number,
  userId?: number
): Promise<Schedule> {
  const status = await requireEditable(scheduleId, 'move');
  const conflict = await validateScheduleMove(scheduleId, timeSlotId);
  if (conflict.hasBlockingConflict) {
    throw new DomainError(conflict.blockingConflicts.map((c) => c.message).join('; '));
  }

  const db = await getDb();
  await db.prepare(
    `UPDATE schedules SET time_slot_id = ?, status = 'DRAFT', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(timeSlotId, scheduleId);

  const reset = status === 'DRAFT' ? '' : `; ${status} → DRAFT`;
  await logAudit(userId ?? null, 'UPDATE', 'schedule', scheduleId, `time_slot_id=${timeSlotId}${reset}`);
  return await db.prepare(`${SCHEDULE_SELECT} WHERE s.id = ?`).get(scheduleId) as Schedule;
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

export async function generateSchedulesForSection(
  sectionId: number,
  semesterId: number,
  userId?: number
): Promise<{ created: number; errors: string[] }> {
  const db = await getDb();
  const section = await db
    .prepare('SELECT * FROM sections WHERE id = ?')
    .get(sectionId) as { program_id: number; year_level: number } | undefined;
  if (!section) throw new Error('Section not found');

  const semester = await db
    .prepare('SELECT name FROM semesters WHERE id = ?')
    .get(semesterId) as { name: string } | undefined;
  const semesterNumber = semesterNumberOf(semester?.name);

  const subjects = await db
    .prepare(
      `SELECT c.subject_id, s.code, s.name, s.credit_hours
       FROM curriculum c JOIN subjects s ON s.id = c.subject_id
       WHERE c.program_id = ? AND c.year_level = ? AND c.semester_number = ?`
    )
    .all(section.program_id, section.year_level, semesterNumber) as {
    subject_id: number;
    code: string;
    name: string;
    credit_hours: number;
  }[];

  const timeSlots = await db.prepare('SELECT id FROM time_slots ORDER BY day_of_week, start_time').all() as {
    id: number;
  }[];
  const rooms = await db.prepare('SELECT id, capacity FROM rooms ORDER BY capacity DESC').all() as {
    id: number;
    capacity: number;
  }[];

  let created = 0;
  const errors: string[] = [];

  return withTransaction(async () => {
    for (const subject of subjects) {
      const existing = await db
    .prepare(
          'SELECT id FROM schedules WHERE section_id = ? AND subject_id = ? AND semester_id = ?'
        )
        .get(sectionId, subject.subject_id, semesterId);
      if (existing) continue;

      const facultyList = await db
    .prepare(
          `SELECT f.id FROM faculty f
           JOIN faculty_subjects fs ON fs.faculty_id = f.id
           WHERE fs.subject_id = ?`
        )
        .all(subject.subject_id) as { id: number }[];

      if (facultyList.length === 0) {
        errors.push(`No faculty assigned for ${subject.code}`);
        continue;
      }

      let assigned = false;
      for (const faculty of facultyList) {
        for (const slot of timeSlots) {
          for (const room of rooms) {
            const input: ScheduleInput = {
              section_id: sectionId,
              subject_id: subject.subject_id,
              faculty_id: faculty.id,
              room_id: room.id,
              time_slot_id: slot.id,
              semester_id: semesterId,
            };
            const conflict = await detectConflicts(input);
            // Per spec §33/§34: blocking conflicts prevent creation; non-blocking
            // (e.g. availability) are tolerated.
            if (!conflict.hasBlockingConflict) {
              await createSchedule(input, userId);
              created++;
              assigned = true;
              break;
            }
          }
          if (assigned) break;
        }
        if (assigned) break;
      }

      if (!assigned) {
        errors.push(`Could not schedule ${subject.code} — no available slot`);
      }
    }
    return { created, errors };
  });
}

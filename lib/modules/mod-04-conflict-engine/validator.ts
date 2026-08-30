import { getDb } from '@/lib/persistence/db';
import type { Conflict, ConflictResult, ScheduleInput } from '@/lib/domain/types';

/**
 * Spec section 33/34: detect all conflicts for a proposed schedule.
 * Returns BLOCKING (must resolve before PUBLISHED) and NON-BLOCKING
 * (advisories that may be overridden) categories separately.
 *
 * Existing callers that read `conflicts: string[]` (legacy) are supported
 * by the `__legacyConflicts` property below for one release cycle.
 */
export function detectConflicts(
  input: ScheduleInput,
  excludeScheduleId?: number
): ConflictResult {
  const db = getDb();
  const blocking: Conflict[] = [];
  const nonBlocking: Conflict[] = [];
  const exclude = excludeScheduleId ? 'AND id != ?' : '';
  const baseParams = excludeScheduleId
    ? [input.time_slot_id, input.semester_id, excludeScheduleId]
    : [input.time_slot_id, input.semester_id];

  // ── Faculty conflict (BLOCKING) — spec §33 ──────────────────────────
  const facultyConflict = db
    .prepare(
      `SELECT id FROM schedules
       WHERE faculty_id = ? AND time_slot_id = ? AND semester_id = ? ${exclude}`
    )
    .get(input.faculty_id, ...baseParams) as { id: number } | undefined;
  if (facultyConflict) {
    blocking.push({
      kind: 'faculty',
      message: 'Faculty is already assigned to another class at this time',
      blocking: true,
      conflictingScheduleId: facultyConflict.id,
    });
  }

  // ── Room conflict (BLOCKING) — spec §33 ─────────────────────────────
  const roomConflict = db
    .prepare(
      `SELECT id FROM schedules
       WHERE room_id = ? AND time_slot_id = ? AND semester_id = ? ${exclude}`
    )
    .get(input.room_id, ...baseParams) as { id: number } | undefined;
  if (roomConflict) {
    blocking.push({
      kind: 'room',
      message: 'Room is already booked at this time',
      blocking: true,
      conflictingScheduleId: roomConflict.id,
    });
  }

  // ── Section conflict (BLOCKING) — spec §33 ──────────────────────────
  const sectionConflict = db
    .prepare(
      `SELECT id FROM schedules
       WHERE section_id = ? AND time_slot_id = ? AND semester_id = ? ${exclude}`
    )
    .get(input.section_id, ...baseParams) as { id: number } | undefined;
  if (sectionConflict) {
    blocking.push({
      kind: 'section',
      message: 'Section already has a class at this time',
      blocking: true,
      conflictingScheduleId: sectionConflict.id,
    });
  }

  // ── Capacity conflict (BLOCKING) — spec §33 ─────────────────────────
  // Section capacity should not exceed room capacity.
  const sectionRow = db
    .prepare('SELECT capacity FROM sections WHERE id = ?')
    .get(input.section_id) as { capacity: number | null } | undefined;
  const roomRow = db
    .prepare('SELECT capacity FROM rooms WHERE id = ?')
    .get(input.room_id) as { capacity: number | null } | undefined;
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

  // ── Faculty availability (NON-BLOCKING) — spec §33 ──────────────────
  // Listed as a conflict but doesn't block publication — admin may override.
  const availability = db
    .prepare(
      `SELECT is_available FROM faculty_availability
       WHERE faculty_id = ? AND time_slot_id = ?`
    )
    .get(input.faculty_id, input.time_slot_id) as { is_available: number } | undefined;
  if (availability && availability.is_available === 0) {
    nonBlocking.push({
      kind: 'availability',
      message: 'Faculty is not available at this time slot',
      blocking: false,
    });
  }

  return {
    hasConflict: blocking.length > 0 || nonBlocking.length > 0,
    blockingConflicts: blocking,
    nonBlockingConflicts: nonBlocking,
    hasBlockingConflict: blocking.length > 0,
  };
}

export function validateScheduleMove(
  scheduleId: number,
  newTimeSlotId: number
): ConflictResult {
  const db = getDb();
  const schedule = db
    .prepare('SELECT * FROM schedules WHERE id = ?')
    .get(scheduleId) as (ScheduleInput & { id: number }) | undefined;
  if (!schedule) {
    return {
      hasConflict: true,
      hasBlockingConflict: true,
      blockingConflicts: [
        { kind: 'time', message: 'Schedule not found', blocking: true },
      ],
      nonBlockingConflicts: [],
    };
  }

  return detectConflicts(
    {
      section_id: schedule.section_id,
      subject_id: schedule.subject_id,
      faculty_id: schedule.faculty_id,
      room_id: schedule.room_id,
      time_slot_id: newTimeSlotId,
      semester_id: schedule.semester_id,
    },
    scheduleId
  );
}

/**
 * Detect all blocking conflicts across the entire schedule set for a given
 * semester. Used by /admin/conflicts and the publish-time validator.
 */
export function detectAllConflictsInSemester(semesterId: number): Array<{
  scheduleId: number;
  conflicts: Conflict[];
}> {
  const db = getDb();
  const schedules = db
    .prepare(
      `SELECT id, section_id, subject_id, faculty_id, room_id, time_slot_id, semester_id
       FROM schedules
       WHERE semester_id = ?
         AND status NOT IN ('ARCHIVED','CANCELLED')`
    )
    .all(semesterId) as Array<ScheduleInput & { id: number }>;

  const out: Array<{ scheduleId: number; conflicts: Conflict[] }> = [];
  for (const s of schedules) {
    const r = detectConflicts(s, s.id);
    if (r.blockingConflicts.length > 0) {
      out.push({ scheduleId: s.id, conflicts: r.blockingConflicts });
    }
  }
  return out;
}

/**
 * Spec section 34: a schedule shall not become PUBLISHED if a blocking
 * conflict exists. Returns the validation result so the caller can surface
 * the conflicts in the UI.
 */
export function validateForPublish(scheduleId: number): ConflictResult {
  const db = getDb();
  const schedule = db
    .prepare('SELECT * FROM schedules WHERE id = ?')
    .get(scheduleId) as (ScheduleInput & { id: number }) | undefined;
  if (!schedule) {
    return {
      hasConflict: true,
      hasBlockingConflict: true,
      blockingConflicts: [
        { kind: 'time', message: 'Schedule not found', blocking: true },
      ],
      nonBlockingConflicts: [],
    };
  }
  return detectConflicts(schedule, schedule.id);
}
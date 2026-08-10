import { getDb } from '@/lib/persistence/db';
import type { ConflictResult, ScheduleInput } from '@/lib/domain/types';

export function detectConflicts(
  input: ScheduleInput,
  excludeScheduleId?: number
): ConflictResult {
  const db = getDb();
  const conflicts: string[] = [];
  const exclude = excludeScheduleId ? 'AND id != ?' : '';
  const baseParams = excludeScheduleId
    ? [input.time_slot_id, input.semester_id, excludeScheduleId]
    : [input.time_slot_id, input.semester_id];

  const facultyConflict = db
    .prepare(
      `SELECT id FROM schedules
       WHERE faculty_id = ? AND time_slot_id = ? AND semester_id = ? ${exclude}`
    )
    .get(input.faculty_id, ...baseParams);
  if (facultyConflict) {
    conflicts.push('Faculty is already assigned to another class at this time');
  }

  const roomConflict = db
    .prepare(
      `SELECT id FROM schedules
       WHERE room_id = ? AND time_slot_id = ? AND semester_id = ? ${exclude}`
    )
    .get(input.room_id, ...baseParams);
  if (roomConflict) {
    conflicts.push('Room is already booked at this time');
  }

  const sectionConflict = db
    .prepare(
      `SELECT id FROM schedules
       WHERE section_id = ? AND time_slot_id = ? AND semester_id = ? ${exclude}`
    )
    .get(input.section_id, ...baseParams);
  if (sectionConflict) {
    conflicts.push('Section already has a class at this time');
  }

  const availability = db
    .prepare(
      `SELECT is_available FROM faculty_availability
       WHERE faculty_id = ? AND time_slot_id = ?`
    )
    .get(input.faculty_id, input.time_slot_id) as { is_available: number } | undefined;
  if (availability && availability.is_available === 0) {
    conflicts.push('Faculty is not available at this time slot');
  }

  return { hasConflict: conflicts.length > 0, conflicts };
}

export function validateScheduleMove(
  scheduleId: number,
  newTimeSlotId: number
): ConflictResult {
  const db = getDb();
  const schedule = db
    .prepare('SELECT * FROM schedules WHERE id = ?')
    .get(scheduleId) as ScheduleInput & { id: number } | undefined;
  if (!schedule) return { hasConflict: true, conflicts: ['Schedule not found'] };

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

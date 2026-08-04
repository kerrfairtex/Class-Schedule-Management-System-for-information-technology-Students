import { getDb, withTransaction } from '@/lib/persistence/db';
import { detectConflicts } from '@/lib/modules/mod-04-conflict-engine/validator';
import type { Schedule, ScheduleInput } from '@/lib/domain/types';
import { logAudit } from '@/lib/modules/mod-08-database-service/audit';

const SCHEDULE_SELECT = `
  SELECT s.*,
    sec.code AS section_code,
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

export function getSchedulesBySemester(semesterId: number): Schedule[] {
  const db = getDb();
  return db
    .prepare(`${SCHEDULE_SELECT} WHERE s.semester_id = ? ORDER BY ts.day_of_week, ts.start_time`)
    .all(semesterId) as Schedule[];
}

export function getSchedulesBySection(sectionId: number, semesterId: number): Schedule[] {
  const db = getDb();
  return db
    .prepare(
      `${SCHEDULE_SELECT} WHERE s.section_id = ? AND s.semester_id = ? ORDER BY ts.day_of_week, ts.start_time`
    )
    .all(sectionId, semesterId) as Schedule[];
}

export function getSchedulesByFaculty(facultyId: number, semesterId: number): Schedule[] {
  const db = getDb();
  return db
    .prepare(
      `${SCHEDULE_SELECT} WHERE s.faculty_id = ? AND s.semester_id = ? ORDER BY ts.day_of_week, ts.start_time`
    )
    .all(facultyId, semesterId) as Schedule[];
}

export function createSchedule(input: ScheduleInput, userId?: number): Schedule {
  const conflict = detectConflicts(input);
  if (conflict.hasConflict) throw new Error(conflict.conflicts.join('; '));

  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO schedules (section_id, subject_id, faculty_id, room_id, time_slot_id, semester_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.section_id,
      input.subject_id,
      input.faculty_id,
      input.room_id,
      input.time_slot_id,
      input.semester_id
    );

  logAudit(userId ?? null, 'CREATE', 'schedule', Number(result.lastInsertRowid), JSON.stringify(input));
  return db
    .prepare(`${SCHEDULE_SELECT} WHERE s.id = ?`)
    .get(result.lastInsertRowid) as Schedule;
}

export function updateScheduleTimeSlot(
  scheduleId: number,
  timeSlotId: number,
  userId?: number
): Schedule {
  const conflict = validateScheduleMove(scheduleId, timeSlotId);
  if (conflict.hasConflict) throw new Error(conflict.conflicts.join('; '));

  const db = getDb();
  db.prepare(
    'UPDATE schedules SET time_slot_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(timeSlotId, scheduleId);

  logAudit(userId ?? null, 'UPDATE', 'schedule', scheduleId, `time_slot_id=${timeSlotId}`);
  return db.prepare(`${SCHEDULE_SELECT} WHERE s.id = ?`).get(scheduleId) as Schedule;
}

export function deleteSchedule(scheduleId: number, userId?: number) {
  const db = getDb();
  db.prepare('DELETE FROM schedules WHERE id = ?').run(scheduleId);
  logAudit(userId ?? null, 'DELETE', 'schedule', scheduleId);
}

import { validateScheduleMove } from '@/lib/modules/mod-04-conflict-engine/validator';

export function generateSchedulesForSection(
  sectionId: number,
  semesterId: number,
  userId?: number
): { created: number; errors: string[] } {
  const db = getDb();
  const section = db
    .prepare('SELECT * FROM sections WHERE id = ?')
    .get(sectionId) as { program_id: number; year_level: number } | undefined;
  if (!section) throw new Error('Section not found');

  const semester = db
    .prepare('SELECT name FROM semesters WHERE id = ?')
    .get(semesterId) as { name: string } | undefined;
  const semesterNumber = semester?.name.includes('1') ? 1 : 2;

  const subjects = db
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

  const timeSlots = db.prepare('SELECT id FROM time_slots ORDER BY day_of_week, start_time').all() as {
    id: number;
  }[];
  const rooms = db.prepare('SELECT id, capacity FROM rooms ORDER BY capacity DESC').all() as {
    id: number;
    capacity: number;
  }[];

  let created = 0;
  const errors: string[] = [];

  return withTransaction(() => {
    for (const subject of subjects) {
      const existing = db
        .prepare(
          'SELECT id FROM schedules WHERE section_id = ? AND subject_id = ? AND semester_id = ?'
        )
        .get(sectionId, subject.subject_id, semesterId);
      if (existing) continue;

      const facultyList = db
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
            const conflict = detectConflicts(input);
            if (!conflict.hasConflict) {
              createSchedule(input, userId);
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

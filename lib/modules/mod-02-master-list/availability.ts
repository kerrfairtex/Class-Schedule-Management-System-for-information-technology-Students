import { getDb } from '@/lib/persistence/db';
import type { Faculty, TimeSlot } from '@/lib/domain/types';
import { logAudit, type AuditContext } from '@/lib/modules/mod-08-database-service/audit';

export interface FacultyAvailabilityRow {
  faculty_id: number;
  employee_id: string;
  faculty_name: string;
  time_slot_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_available: number;
}

export function getFacultyAvailability(facultyId?: number): FacultyAvailabilityRow[] {
  const db = getDb();
  const sql = `
    SELECT
      f.id AS faculty_id,
      f.employee_id,
      f.first_name || ' ' || f.last_name AS faculty_name,
      ts.id AS time_slot_id,
      ts.day_of_week,
      ts.start_time,
      ts.end_time,
      COALESCE(fa.is_available, 1) AS is_available
    FROM faculty f
    CROSS JOIN time_slots ts
    LEFT JOIN faculty_availability fa
      ON fa.faculty_id = f.id AND fa.time_slot_id = ts.id
    ${facultyId ? 'WHERE f.id = ?' : ''}
    ORDER BY f.last_name, ts.day_of_week, ts.start_time
  `;
  return (facultyId ? db.prepare(sql).all(facultyId) : db.prepare(sql).all()) as FacultyAvailabilityRow[];
}

export function setFacultyAvailability(
  facultyId: number,
  timeSlotId: number,
  isAvailable: boolean,
  userId?: number,
  auditCtx?: AuditContext
) {
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM faculty_availability WHERE faculty_id = ? AND time_slot_id = ?')
    .get(facultyId, timeSlotId);

  if (existing) {
    db.prepare('UPDATE faculty_availability SET is_available = ? WHERE faculty_id = ? AND time_slot_id = ?').run(
      isAvailable ? 1 : 0,
      facultyId,
      timeSlotId
    );
  } else {
    db.prepare(
      'INSERT INTO faculty_availability (faculty_id, time_slot_id, is_available) VALUES (?, ?, ?)'
    ).run(facultyId, timeSlotId, isAvailable ? 1 : 0);
  }

  logAudit(
    userId ?? null,
    'UPDATE',
    'faculty_availability',
    facultyId,
    `slot=${timeSlotId} available=${isAvailable}`,
    auditCtx
  );
}

export function getFacultyList(): Pick<Faculty, 'id' | 'employee_id' | 'first_name' | 'last_name'>[] {
  return getDb()
    .prepare('SELECT id, employee_id, first_name, last_name FROM faculty ORDER BY last_name')
    .all() as Pick<Faculty, 'id' | 'employee_id' | 'first_name' | 'last_name'>[];
}

export function getAvailabilityGrid(facultyId: number) {
  const db = getDb();
  const slots = db
    .prepare('SELECT * FROM time_slots ORDER BY day_of_week, start_time')
    .all() as TimeSlot[];

  const availability = db
    .prepare('SELECT time_slot_id, is_available FROM faculty_availability WHERE faculty_id = ?')
    .all(facultyId) as { time_slot_id: number; is_available: number }[];

  const map = new Map(availability.map((a) => [a.time_slot_id, a.is_available]));

  return slots.map((slot) => ({
    ...slot,
    is_available: map.has(slot.id) ? map.get(slot.id)! : 1,
  }));
}

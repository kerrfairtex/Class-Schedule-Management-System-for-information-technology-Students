/**
 * Academic years, semesters and class periods (time slots).
 *
 * Exactly one semester (and its academic year) is active at a time (spec
 * §22): every schedule list, the public site and auto-generation read the
 * active semester.
 */
import { getDb, withTransaction } from '@/lib/persistence/db';
import { logAudit } from '@/lib/modules/mod-08-database-service/audit';
import { DomainError } from './validation';
import { WEEK_ORDER } from '@/lib/domain/constants';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const YEAR_LABEL = /^(\d{4})-(\d{4})$/;

export interface TermSemester {
  id: number;
  name: string;
  is_active: number;
  schedule_count: number;
}

export interface TermYear {
  id: number;
  label: string;
  start_date: string | null;
  end_date: string | null;
  is_active: number;
  semesters: TermSemester[];
}

export async function listTerms(): Promise<TermYear[]> {
  const db = await getDb();
  const [years, semesters] = await Promise.all([
    db.prepare('SELECT id, label, start_date, end_date, is_active FROM academic_years ORDER BY label DESC').all(),
    db
      .prepare(
        `SELECT s.id, s.academic_year_id, s.name, s.is_active,
                (SELECT COUNT(*) FROM schedules sc WHERE sc.semester_id = s.id) AS schedule_count
         FROM semesters s ORDER BY s.id`
      )
      .all(),
  ]);
  return (years as Omit<TermYear, 'semesters'>[]).map((y) => ({
    ...y,
    semesters: (semesters as Array<TermSemester & { academic_year_id: number }>)
      .filter((s) => s.academic_year_id === y.id)
      .map((s) => ({ id: s.id, name: s.name, is_active: s.is_active, schedule_count: Number(s.schedule_count) })),
  }));
}

export async function createAcademicYear(
  input: { label: string; start_date?: string | null; end_date?: string | null },
  userId?: number
): Promise<number> {
  const label = input.label.trim();
  const m = YEAR_LABEL.exec(label);
  if (!m || Number(m[2]) !== Number(m[1]) + 1) {
    throw new DomainError('Academic year must look like 2026-2027 (two consecutive years).');
  }
  const start = input.start_date || null;
  const end = input.end_date || null;
  if ((start && !DATE.test(start)) || (end && !DATE.test(end))) throw new DomainError('Dates must be YYYY-MM-DD.');
  if (start && end && end <= start) throw new DomainError('The end date must be after the start date.');

  const db = await getDb();
  const existing = await db.prepare('SELECT id FROM academic_years WHERE label = ?').get(label);
  if (existing) throw new DomainError(`Academic year ${label} already exists.`);
  const r = await db
    .prepare('INSERT INTO academic_years (label, start_date, end_date, is_active) VALUES (?, ?, ?, 0)')
    .run(label, start, end);
  const id = Number(r.lastInsertRowid ?? r.lastID);
  await logAudit(userId ?? null, 'CREATE', 'academic_year', id, label);
  return id;
}

export const SEMESTER_NAMES = ['1st Semester', '2nd Semester', 'Summer'] as const;

export async function addSemester(academicYearId: number, name: string, userId?: number): Promise<number> {
  if (!(SEMESTER_NAMES as readonly string[]).includes(name)) {
    throw new DomainError(`Semester must be one of: ${SEMESTER_NAMES.join(', ')}.`);
  }
  const db = await getDb();
  const year = await db.prepare('SELECT label FROM academic_years WHERE id = ?').get(academicYearId);
  if (!year) throw new DomainError('That academic year no longer exists.');
  const dup = await db
    .prepare('SELECT id FROM semesters WHERE academic_year_id = ? AND name = ?')
    .get(academicYearId, name);
  if (dup) throw new DomainError(`${name} already exists for that academic year.`);
  const r = await db
    .prepare('INSERT INTO semesters (academic_year_id, name, is_active) VALUES (?, ?, 0)')
    .run(academicYearId, name);
  const id = Number(r.lastInsertRowid ?? r.lastID);
  await logAudit(userId ?? null, 'CREATE', 'semester', id, `${name} (year ${academicYearId})`);
  return id;
}

/** Make one semester (and its academic year) the only active ones. */
export async function activateSemester(semesterId: number, userId?: number): Promise<void> {
  const db = await getDb();
  const sem = (await db
    .prepare('SELECT id, academic_year_id, name FROM semesters WHERE id = ?')
    .get(semesterId)) as { id: number; academic_year_id: number; name: string } | undefined;
  if (!sem) throw new DomainError('That semester no longer exists.');
  await withTransaction(async (tx) => {
    await tx.prepare('UPDATE semesters SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END').run(sem.id);
    await tx
      .prepare('UPDATE academic_years SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END')
      .run(sem.academic_year_id);
  });
  await logAudit(userId ?? null, 'ACTIVATE', 'semester', sem.id, sem.name);
}

export async function addTimeSlot(
  input: { day_of_week: string; start_time: string; end_time: string },
  userId?: number
): Promise<number> {
  const { day_of_week: day, start_time: start, end_time: end } = input;
  if (!(WEEK_ORDER as readonly string[]).includes(day)) throw new DomainError('Choose a day of the week.');
  if (!TIME.test(start) || !TIME.test(end)) throw new DomainError('Times must be HH:MM (24-hour).');
  if (end <= start) throw new DomainError('The period must end after it starts.');

  const db = await getDb();
  const overlap = (await db
    .prepare(
      `SELECT start_time, end_time FROM time_slots
       WHERE day_of_week = ? AND start_time < ? AND ? < end_time`
    )
    .get(day, end, start)) as { start_time: string; end_time: string } | undefined;
  if (overlap) {
    throw new DomainError(`That overlaps the existing ${overlap.start_time}–${overlap.end_time} period on that day.`);
  }
  const r = await db
    .prepare('INSERT INTO time_slots (day_of_week, start_time, end_time) VALUES (?, ?, ?)')
    .run(day, start, end);
  const id = Number(r.lastInsertRowid ?? r.lastID);
  await logAudit(userId ?? null, 'CREATE', 'time_slot', id, `${day} ${start}-${end}`);
  return id;
}

/** Remove a period that no class uses. Its availability marks go with it. */
export async function deleteTimeSlot(id: number, userId?: number): Promise<void> {
  const db = await getDb();
  const used = (await db.prepare('SELECT COUNT(*) AS c FROM schedules WHERE time_slot_id = ?').get(id)) as {
    c: number | string;
  };
  if (Number(used.c) > 0) {
    throw new DomainError(`That period is used by ${used.c} class(es). Move or delete them first.`);
  }
  await withTransaction(async (tx) => {
    await tx.prepare('DELETE FROM faculty_availability WHERE time_slot_id = ?').run(id);
    const r = await tx.prepare('DELETE FROM time_slots WHERE id = ?').run(id);
    if (!r.changes) throw new DomainError('That period no longer exists.');
  });
  await logAudit(userId ?? null, 'DELETE', 'time_slot', id);
}

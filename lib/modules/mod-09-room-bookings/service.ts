/**
 * MOD-09 Room bookings: one-off use of a room on a date (exam, event,
 * meeting, maintenance). A booking may not overlap another booking in the
 * same room, nor a class that meets in that room on that weekday.
 */
import { getDb } from '@/lib/persistence/db';
import { logAudit } from '@/lib/modules/mod-08-database-service/audit';
import { DomainError } from '@/lib/modules/mod-02-master-list/validation';
import { formatRange, weekdayOf } from '@/lib/modules/mod-03-schedule-engine/public-timetable';

export const BOOKING_KINDS = ['EXAM', 'EVENT', 'MEETING', 'MAINTENANCE'] as const;
export type BookingKind = (typeof BOOKING_KINDS)[number];

export const BOOKING_KIND_LABEL: Record<BookingKind, string> = {
  EXAM: 'Exam',
  EVENT: 'Event',
  MEETING: 'Meeting',
  MAINTENANCE: 'Maintenance',
};

export interface RoomBooking {
  id: number;
  room_id: number;
  room_code: string;
  room_name: string;
  title: string;
  kind: BookingKind;
  booking_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
}

export interface BookingInput {
  room_id: number;
  title: string;
  kind: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  notes?: string | null;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const SELECT = `
  SELECT b.id, b.room_id, r.code AS room_code, r.name AS room_name, b.title, b.kind,
         b.booking_date, b.start_time, b.end_time, b.notes
  FROM room_bookings b JOIN rooms r ON r.id = b.room_id`;

/** Bookings on or after `fromDate` (default: all), optionally for one room. */
export async function listBookings(opts: { fromDate?: string; toDate?: string; roomId?: number } = {}): Promise<RoomBooking[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.fromDate) {
    where.push('b.booking_date >= ?');
    params.push(opts.fromDate);
  }
  if (opts.toDate) {
    where.push('b.booking_date <= ?');
    params.push(opts.toDate);
  }
  if (opts.roomId) {
    where.push('b.room_id = ?');
    params.push(opts.roomId);
  }
  const db = await getDb();
  return (await db
    .prepare(`${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY b.booking_date, b.start_time`)
    .all(...params)) as RoomBooking[];
}

function validate(input: BookingInput): BookingInput & { kind: BookingKind } {
  const title = input.title.trim();
  if (!title || title.length > 160) throw new DomainError('Give the booking a title (up to 160 characters).');
  if (!(BOOKING_KINDS as readonly string[]).includes(input.kind)) throw new DomainError('Choose a booking type.');
  if (!DATE.test(input.booking_date)) throw new DomainError('Choose a date.');
  if (!TIME.test(input.start_time) || !TIME.test(input.end_time)) throw new DomainError('Times must be HH:MM.');
  if (input.end_time <= input.start_time) throw new DomainError('The booking must end after it starts.');
  const notes = input.notes?.trim() || null;
  if (notes && notes.length > 1000) throw new DomainError('Notes can be up to 1,000 characters.');
  return { ...input, title, notes, kind: input.kind as BookingKind };
}

export async function createBooking(input: BookingInput, userId?: number): Promise<number> {
  const b = validate(input);
  const db = await getDb();

  const room = await db.prepare('SELECT id FROM rooms WHERE id = ?').get(b.room_id);
  if (!room) throw new DomainError('That room no longer exists.');

  const clash = (await db
    .prepare(
      `SELECT title, start_time, end_time FROM room_bookings
       WHERE room_id = ? AND booking_date = ? AND start_time < ? AND ? < end_time`
    )
    .get(b.room_id, b.booking_date, b.end_time, b.start_time)) as
    | { title: string; start_time: string; end_time: string }
    | undefined;
  if (clash) {
    throw new DomainError(
      `The room is already booked for "${clash.title}" (${formatRange(clash.start_time, clash.end_time)}).`
    );
  }

  // Classes that meet in this room on that weekday this semester. Cancelled
  // and archived classes no longer hold the room.
  const cls = (await db
    .prepare(
      `SELECT sub.code AS subject_code, sec.code AS section_code, ts.start_time, ts.end_time
       FROM schedules s
       JOIN time_slots ts ON ts.id = s.time_slot_id
       JOIN subjects sub ON sub.id = s.subject_id
       JOIN sections sec ON sec.id = s.section_id
       JOIN semesters sem ON sem.id = s.semester_id AND sem.is_active = 1
       WHERE s.room_id = ? AND ts.day_of_week = ? AND ts.start_time < ? AND ? < ts.end_time
         AND s.status NOT IN ('CANCELLED', 'ARCHIVED')`
    )
    .get(b.room_id, weekdayOf(b.booking_date), b.end_time, b.start_time)) as
    | { subject_code: string; section_code: string; start_time: string; end_time: string }
    | undefined;
  if (cls) {
    throw new DomainError(
      `${cls.subject_code} (${cls.section_code}) meets in this room then (${formatRange(cls.start_time, cls.end_time)}). Choose another time or room.`
    );
  }

  const r = await db
    .prepare(
      `INSERT INTO room_bookings (room_id, title, kind, booking_date, start_time, end_time, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(b.room_id, b.title, b.kind, b.booking_date, b.start_time, b.end_time, b.notes ?? null, userId ?? null);
  const id = Number(r.lastInsertRowid ?? r.lastID);
  await logAudit(userId ?? null, 'CREATE', 'room_booking', id, `${b.booking_date} ${b.start_time}-${b.end_time} ${b.title}`);
  return id;
}

export async function deleteBooking(id: number, userId?: number): Promise<void> {
  const db = await getDb();
  const r = await db.prepare('DELETE FROM room_bookings WHERE id = ?').run(id);
  if (!r.changes) throw new DomainError('That booking no longer exists.');
  await logAudit(userId ?? null, 'DELETE', 'room_booking', id);
}

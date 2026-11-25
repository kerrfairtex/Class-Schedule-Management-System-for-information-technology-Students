import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb, destroyTestDb, type TestFixtures } from '@/lib/persistence/test-db';
import {
  activateSemester,
  addSemester,
  addTimeSlot,
  createAcademicYear,
  deleteTimeSlot,
  listTerms,
} from '@/lib/modules/mod-02-master-list/terms';
import { friendlyDbError } from '@/lib/modules/mod-02-master-list/validation';
import { createBooking, deleteBooking, listBookings } from '@/lib/modules/mod-09-room-bookings/service';
import {
  createAnnouncement,
  listCurrentAnnouncements,
  updateAnnouncement,
} from '@/lib/modules/mod-10-announcements/service';
import { getAuditPage } from '@/lib/modules/mod-08-database-service/audit';
import { createSchedule } from '@/lib/modules/mod-03-schedule-engine/service';
import { teachingLoad, weekdayOf } from '@/lib/modules/mod-03-schedule-engine/public-timetable';

let db: Database.Database;
let fixtures: TestFixtures;

const msg = (p: Promise<unknown>) => p.then(() => 'ok', (e) => friendlyDbError(e));

// 2026-11-23 is a Monday; the fixture slot is Monday 09:00–10:00.
const MONDAY = '2026-11-23';

describe('academic terms and class periods', () => {
  beforeEach(() => ({ db, fixtures } = createTestDb()));
  afterEach(() => destroyTestDb(db));

  it('creates a year and semester and makes it the only active one', async () => {
    const year = await createAcademicYear({ label: '2026-2027', start_date: '2026-08-01', end_date: '2027-05-31' });
    const sem = await addSemester(year, '1st Semester');
    await activateSemester(sem);
    const active = db.prepare('SELECT id FROM semesters WHERE is_active = 1').all() as { id: number }[];
    expect(active).toEqual([{ id: sem }]);
    const years = await listTerms();
    expect(years.find((y) => y.id === year)?.is_active).toBe(1);
    expect(years.filter((y) => y.is_active === 1)).toHaveLength(1);
  });

  it('rejects malformed or duplicate years and semesters', async () => {
    expect(await msg(createAcademicYear({ label: '2026-2028' }))).toMatch(/consecutive/);
    expect(await msg(createAcademicYear({ label: '2025-2026' }))).toMatch(/already exists/);
    const year = await createAcademicYear({ label: '2027-2028' });
    await addSemester(year, '2nd Semester');
    expect(await msg(addSemester(year, '2nd Semester'))).toMatch(/already exists/);
    expect(await msg(addSemester(year, '3rd Semester'))).toMatch(/must be one of/);
  });

  it('adds periods without overlaps and deletes only unused ones', async () => {
    expect(await msg(addTimeSlot({ day_of_week: 'monday', start_time: '09:30', end_time: '10:30' }))).toMatch(/overlaps/);
    const sat = await addTimeSlot({ day_of_week: 'saturday', start_time: '08:00', end_time: '09:00' });
    expect(sat).toBeGreaterThan(0);
    await deleteTimeSlot(sat);

    await createSchedule({
      section_id: fixtures.sectionId,
      subject_id: fixtures.subjectId,
      faculty_id: fixtures.facultyId,
      room_id: fixtures.roomId,
      time_slot_id: fixtures.timeSlotId,
      semester_id: fixtures.semesterId,
    });
    expect(await msg(deleteTimeSlot(fixtures.timeSlotId))).toMatch(/used by 1 class/);
  });
});

describe('room bookings', () => {
  beforeEach(() => ({ db, fixtures } = createTestDb()));
  afterEach(() => destroyTestDb(db));

  const booking = (over: Partial<Parameters<typeof createBooking>[0]> = {}) => ({
    room_id: fixtures.roomId,
    title: 'Midterm exam',
    kind: 'EXAM',
    booking_date: MONDAY,
    start_time: '13:00',
    end_time: '15:00',
    ...over,
  });

  it('books a free room and lists it', async () => {
    expect(weekdayOf(MONDAY)).toBe('monday');
    const id = await createBooking(booking());
    const list = await listBookings({ fromDate: MONDAY });
    expect(list.map((b) => b.id)).toEqual([id]);
    expect(list[0].room_code).toBe('R101');
    await deleteBooking(id);
    expect(await listBookings()).toHaveLength(0);
  });

  it('refuses overlapping bookings in the same room', async () => {
    await createBooking(booking());
    expect(await msg(createBooking(booking({ title: 'Seminar', kind: 'EVENT', start_time: '14:00', end_time: '16:00' })))).toMatch(
      /already booked for "Midterm exam"/
    );
    // Back-to-back is fine.
    await expect(createBooking(booking({ start_time: '15:00', end_time: '16:00' }))).resolves.toBeGreaterThan(0);
  });

  it('refuses a booking over a class that meets in the room that weekday', async () => {
    await createSchedule({
      section_id: fixtures.sectionId,
      subject_id: fixtures.subjectId,
      faculty_id: fixtures.facultyId,
      room_id: fixtures.roomId,
      time_slot_id: fixtures.timeSlotId,
      semester_id: fixtures.semesterId,
    });
    expect(await msg(createBooking(booking({ start_time: '09:30', end_time: '11:00' })))).toMatch(/IT 101 \(BSIT-1A\) meets in this room/);
    // Tuesday the same time is free.
    await expect(createBooking(booking({ booking_date: '2026-11-24', start_time: '09:30', end_time: '11:00' }))).resolves.toBeGreaterThan(0);
  });

  it('validates input', async () => {
    expect(await msg(createBooking(booking({ title: '  ' })))).toMatch(/title/);
    expect(await msg(createBooking(booking({ kind: 'PARTY' })))).toMatch(/type/);
    expect(await msg(createBooking(booking({ end_time: '12:00' })))).toMatch(/end after/);
  });
});

describe('announcements', () => {
  beforeEach(() => ({ db, fixtures } = createTestDb()));
  afterEach(() => destroyTestDb(db));

  it('shows announcements only within their dates, pinned first', async () => {
    await createAnnouncement({ title: 'Old', body: 'Past', starts_on: '2026-10-01', ends_on: '2026-10-31' });
    await createAnnouncement({ title: 'Enrollment', body: 'Open', starts_on: '2026-11-20' });
    const pinned = await createAnnouncement({ title: 'Typhoon', body: 'No classes', starts_on: '2026-11-01', pinned: true });
    await createAnnouncement({ title: 'Future', body: 'Later', starts_on: '2026-12-01' });
    const titles = (await listCurrentAnnouncements(MONDAY)).map((a) => a.title);
    expect(titles).toEqual(['Typhoon', 'Enrollment']);

    await updateAnnouncement(pinned, { title: 'Typhoon', body: 'Classes resume', starts_on: '2026-11-01', ends_on: '2026-11-22' });
    expect((await listCurrentAnnouncements(MONDAY)).map((a) => a.title)).toEqual(['Enrollment']);
  });

  it('rejects an end date before the start date', async () => {
    expect(await msg(createAnnouncement({ title: 'X', body: 'Y', starts_on: '2026-11-20', ends_on: '2026-11-19' }))).toMatch(
      /on or after/
    );
  });
});

describe('audit log and teaching load', () => {
  beforeEach(() => ({ db, fixtures } = createTestDb()));
  afterEach(() => destroyTestDb(db));

  it('pages and filters the audit log', async () => {
    await createAnnouncement({ title: 'A', body: 'B', starts_on: MONDAY });
    await createBooking({ room_id: fixtures.roomId, title: 'Meet', kind: 'MEETING', booking_date: MONDAY, start_time: '16:00', end_time: '17:00' });
    const all = await getAuditPage({});
    expect(all.total).toBe(2);
    expect(all.entityTypes).toEqual(['announcement', 'room_booking']);
    const one = await getAuditPage({ entityType: 'room_booking' });
    expect(one.entries.map((e) => e.entity_type)).toEqual(['room_booking']);
  });

  it('sums weekly hours and meetings by day', () => {
    const e = (id: number, day: string, start: string, end: string, subject_id = 1, section_id = 1) => ({
      id, section_id, subject_id, faculty_id: 1, room_id: 1, time_slot_id: id, semester_id: 1,
      day_of_week: day, start_time: start, end_time: end,
    });
    const load = teachingLoad([e(1, 'tuesday', '07:30', '09:00'), e(2, 'monday', '13:00', '14:00', 2, 2), e(3, 'monday', '14:00', '15:00')]);
    expect(load).toEqual({
      meetings: 3,
      hours: 3.5,
      subjects: 2,
      sections: 2,
      byDay: [
        { day: 'monday', meetings: 2, hours: 2 },
        { day: 'tuesday', meetings: 1, hours: 1.5 },
      ],
    });
  });
});

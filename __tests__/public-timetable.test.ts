import { describe, it, expect } from 'vitest';
import {
  campusNow,
  daysOf,
  formatTime,
  freeRoomIds,
  roomStatusAt,
  rowsOf,
} from '@/lib/modules/mod-03-schedule-engine/public-timetable';
import type { Schedule } from '@/lib/domain/types';

const cls = (id: number, room_id: number, day: string, start: string, end: string): Schedule => ({
  id,
  section_id: 1,
  subject_id: 1,
  faculty_id: 1,
  room_id,
  time_slot_id: id,
  semester_id: 1,
  day_of_week: day,
  start_time: start,
  end_time: end,
});

describe('public timetable helpers', () => {
  it('formats 24-hour times for students', () => {
    expect(formatTime('07:30')).toBe('7:30 AM');
    expect(formatTime('12:00')).toBe('12:00 PM');
    expect(formatTime('13:30')).toBe('1:30 PM');
    expect(formatTime('00:15')).toBe('12:15 AM');
  });

  it('reads the campus clock in Manila time, not server UTC', () => {
    // 2026-11-23 is a Monday. 01:00 UTC is 09:00 in Manila.
    expect(campusNow(new Date('2026-11-23T01:00:00Z'))).toEqual({ day: 'monday', time: '09:00', date: '2026-11-23' });
    // 23:30 UTC Sunday is already Monday 07:30 in Manila.
    expect(campusNow(new Date('2026-11-22T23:30:00Z'))).toEqual({ day: 'monday', time: '07:30', date: '2026-11-23' });
  });

  it('orders days by the week and rows by time', () => {
    const slots = [
      { id: 1, day_of_week: 'saturday', start_time: '13:30', end_time: '14:30' },
      { id: 2, day_of_week: 'monday', start_time: '07:30', end_time: '08:30' },
      { id: 3, day_of_week: 'friday', start_time: '07:30', end_time: '08:30' },
    ];
    expect(daysOf(slots)).toEqual(['monday', 'friday', 'saturday']);
    expect(rowsOf(slots)).toEqual([
      { start: '07:30', end: '08:30' },
      { start: '13:30', end: '14:30' },
    ]);
  });

  it('knows whether a room is in use now and what comes next', () => {
    const entries = [cls(1, 10, 'monday', '07:30', '08:30'), cls(2, 10, 'monday', '10:30', '11:30')];
    expect(roomStatusAt(entries, 10, 'monday', '08:00').current?.id).toBe(1);
    expect(roomStatusAt(entries, 10, 'monday', '08:30').current).toBeUndefined(); // end is exclusive
    expect(roomStatusAt(entries, 10, 'monday', '08:30').next?.id).toBe(2);
    expect(roomStatusAt(entries, 10, 'tuesday', '08:00')).toEqual({ current: undefined, next: undefined });
  });

  it('lists rooms that are free in a slot', () => {
    const entries = [cls(1, 10, 'monday', '07:30', '08:30')];
    expect(freeRoomIds(entries, [10, 11], 'monday', '07:30')).toEqual([11]);
    expect(freeRoomIds(entries, [10, 11], 'monday', '08:30')).toEqual([10, 11]);
  });
});

/**
 * Pure helpers for the public timetable pages (/schedules, /rooms).
 * No database access here, so they are easy to test and reuse.
 */
import type { Schedule } from '@/lib/domain/types';
import { WEEK_ORDER } from '@/lib/domain/constants';

/** The campus clock: Bongao, Tawi-Tawi. The server itself runs in UTC. */
export const CAMPUS_TIME_ZONE = 'Asia/Manila';

export interface Slot {
  id: number;
  day_of_week: string;
  start_time: string; // "HH:MM", zero-padded
  end_time: string;
}

/** "13:30" → "1:30 PM". */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

export const formatRange = (start: string, end: string) => `${formatTime(start)}–${formatTime(end)}`;

/** Current campus weekday ("monday") and time ("HH:MM"). */
export function campusNow(now: Date = new Date()): { day: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CAMPUS_TIME_ZONE,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { day: get('weekday').toLowerCase(), time: `${get('hour')}:${get('minute')}` };
}

const dayRank = (d: string) => {
  const i = (WEEK_ORDER as readonly string[]).indexOf(d);
  return i === -1 ? WEEK_ORDER.length : i;
};

/** Days that have slots, in week order. */
export function daysOf(slots: Slot[]): string[] {
  return Array.from(new Set(slots.map((s) => s.day_of_week))).sort((a, b) => dayRank(a) - dayRank(b));
}

/** Distinct start/end rows across the week, in time order. */
export function rowsOf(slots: Slot[]): { start: string; end: string }[] {
  const seen = new Map<string, string>();
  for (const s of slots) if (!seen.has(s.start_time)) seen.set(s.start_time, s.end_time);
  return Array.from(seen, ([start, end]) => ({ start, end })).sort((a, b) => a.start.localeCompare(b.start));
}

/** Classes sorted by day then time, for list views. */
export function sortByWeek(entries: Schedule[]): Schedule[] {
  return [...entries].sort(
    (a, b) =>
      dayRank(a.day_of_week ?? '') - dayRank(b.day_of_week ?? '') ||
      (a.start_time ?? '').localeCompare(b.start_time ?? '')
  );
}

const occupies = (e: Schedule, day: string, time: string) =>
  e.day_of_week === day && (e.start_time ?? '') <= time && time < (e.end_time ?? '');

/** What a room is doing at a moment: the class in it now, and the next one today. */
export function roomStatusAt(
  entries: Schedule[],
  roomId: number,
  day: string,
  time: string
): { current?: Schedule; next?: Schedule } {
  const today = sortByWeek(entries.filter((e) => e.room_id === roomId && e.day_of_week === day));
  return {
    current: today.find((e) => occupies(e, day, time)),
    next: today.find((e) => (e.start_time ?? '') > time),
  };
}

/** Rooms with no published class in the given slot. */
export function freeRoomIds(entries: Schedule[], roomIds: number[], day: string, time: string): number[] {
  const busy = new Set(entries.filter((e) => occupies(e, day, time)).map((e) => e.room_id));
  return roomIds.filter((id) => !busy.has(id));
}

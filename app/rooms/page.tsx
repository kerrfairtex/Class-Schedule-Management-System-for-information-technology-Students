import Link from 'next/link';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { WeeklyTimetable } from '@/components/public/WeeklyTimetable';
import { getRooms, getTimeSlots } from '@/lib/modules/mod-02-master-list/service';
import { getPublicSchedules } from '@/lib/modules/mod-03-schedule-engine/service';
import {
  campusNow,
  formatCampusDate,
  formatRange,
  formatTime,
  freeRoomIds,
  roomStatusAt,
  rowsOf,
  weekdayOf,
} from '@/lib/modules/mod-03-schedule-engine/public-timetable';
import { BOOKING_KIND_LABEL, listBookings, type RoomBooking } from '@/lib/modules/mod-09-room-bookings/service';
import { readIfMigrated } from '@/lib/persistence/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Rooms and availability — TRAC BSIT',
  description: 'Which BSIT rooms are free right now, a free-room search by date and period, and each room’s weekly schedule.',
};

interface PageProps {
  searchParams: Promise<{ room?: string; date?: string; time?: string }>;
}

const overlaps = (b: RoomBooking, start: string, end: string) => b.start_time < end && start < b.end_time;

export default async function RoomsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const now = campusNow();
  const [rooms, slots, entries] = await Promise.all([getRooms(), getTimeSlots(), getPublicSchedules()]);
  const rows = rowsOf(slots);

  // Search by calendar date (default today) so bookings count too.
  const searchDate = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : undefined;
  const searchRow = params.time ? rows.find((r) => r.start === params.time) : undefined;
  const selected = params.room ? rooms.find((r) => r.code === params.room) : undefined;

  const [todayBookings, searchBookings, roomBookings] = await Promise.all([
    readIfMigrated(() => listBookings({ fromDate: now.date, toDate: now.date }), [], 'room bookings'),
    searchDate
      ? readIfMigrated(() => listBookings({ fromDate: searchDate, toDate: searchDate }), [], 'room bookings')
      : Promise.resolve([] as RoomBooking[]),
    selected
      ? readIfMigrated(() => listBookings({ fromDate: now.date, roomId: selected.id }), [], 'room bookings')
      : Promise.resolve([] as RoomBooking[]),
  ]);

  const inClassHours = slots.some((s) => s.day_of_week === now.day && s.start_time <= now.time && now.time < s.end_time);

  let freeForSearch: Set<number> | null = null;
  if (searchDate && searchRow) {
    const free = freeRoomIds(entries, rooms.map((r) => r.id), weekdayOf(searchDate), searchRow.start);
    const booked = new Set(searchBookings.filter((b) => overlaps(b, searchRow.start, searchRow.end)).map((b) => b.room_id));
    freeForSearch = new Set(free.filter((id) => !booked.has(id)));
  }

  return (
    <div className="min-h-screen">
      <PublicHeader active="/rooms" />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {selected ? (
          <section aria-labelledby="room-heading">
            <Link href="/rooms" className="link text-sm">All rooms</Link>
            <h1 id="room-heading" className="page-title mt-2">
              {selected.code}
            </h1>
            <p className="page-lead">
              {selected.name}, {selected.building_name}. Seats {selected.capacity}.
            </p>

            <h2 className="mb-3 mt-8 text-xl font-bold">Weekly classes</h2>
            <WeeklyTimetable
              caption={`Weekly schedule for room ${selected.code}`}
              entries={entries.filter((e) => e.room_id === selected.id)}
              slots={slots}
              mode="room"
              now={now}
            />

            <h2 className="mb-3 mt-10 text-xl font-bold">Upcoming bookings</h2>
            {roomBookings.length === 0 ? (
              <p className="text-muted">No exams or events booked in this room.</p>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {roomBookings.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                    <span>
                      <strong>{b.title}</strong> <span className="text-sm text-muted">{BOOKING_KIND_LABEL[b.kind]}</span>
                    </span>
                    <time className="text-sm text-ink-soft" dateTime={b.booking_date}>
                      {formatCampusDate(b.booking_date, { year: false })}, {formatRange(b.start_time, b.end_time)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <>
            <h1 className="page-title">Rooms</h1>
            <p className="page-lead">
              Free and busy rooms on campus at {formatTime(now.time)}, {formatCampusDate(now.date, { year: false })}.
              {!inClassHours && ' Classes are not in session.'}
            </p>

            <section aria-labelledby="search-heading" className="card mt-8">
              <h2 id="search-heading" className="text-lg font-bold">Find a free room</h2>
              <form action="/rooms" method="get" className="mt-3 flex flex-wrap items-end gap-3">
                <label>
                  <span className="label-field">Date</span>
                  <input type="date" name="date" defaultValue={searchDate ?? now.date} className="input-field" required />
                </label>
                <label>
                  <span className="label-field">Period</span>
                  <select name="time" defaultValue={searchRow?.start ?? ''} className="select-field" required>
                    {rows.map((r) => (
                      <option key={r.start} value={r.start}>{formatRange(r.start, r.end)}</option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="btn-primary">Search</button>
              </form>
              {freeForSearch && searchDate && searchRow && (
                <p role="status" className="mt-4 text-ink-soft">
                  <strong className="text-ink">{freeForSearch.size} of {rooms.length}</strong> rooms are free on{' '}
                  {formatCampusDate(searchDate)}, {formatRange(searchRow.start, searchRow.end)}. They are marked
                  below.
                </p>
              )}
            </section>

            {rooms.length === 0 ? (
              <p className="mt-8 text-muted">No rooms have been added yet.</p>
            ) : (
              <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rooms.map((r) => {
                  const { current, next } = roomStatusAt(entries, r.id, now.day, now.time);
                  const booking = todayBookings.find(
                    (b) => b.room_id === r.id && b.start_time <= now.time && now.time < b.end_time
                  );
                  const busy = !!current || !!booking;
                  const freeInSearch = freeForSearch?.has(r.id);
                  const status = freeForSearch
                    ? { label: freeInSearch ? 'Free then' : 'Taken then', free: !!freeInSearch }
                    : { label: busy ? 'In use' : 'Free now', free: !busy };
                  return (
                    <li key={r.id}>
                      <Link
                        href={`/rooms?room=${encodeURIComponent(r.code)}`}
                        className={`block h-full rounded-lg border bg-surface p-4 hover:border-lagoon ${
                          freeInSearch ? 'border-seagrass' : 'border-line'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-display text-lg font-bold">{r.code}</p>
                            <p className="text-sm text-ink-soft">{r.name}</p>
                          </div>
                          <span
                            className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                              status.free ? 'bg-seagrass-50 text-seagrass' : 'bg-coral-50 text-coral'
                            }`}
                          >
                            {status.label}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          {r.building_name}, {r.capacity} seats
                        </p>
                        <p className="mt-3 text-sm text-ink-soft">
                          {booking
                            ? `${booking.title} until ${formatTime(booking.end_time)}`
                            : current
                              ? `${current.subject_code}, ${current.section_code}, until ${formatTime(current.end_time ?? '')}`
                              : next
                                ? `Next: ${next.subject_code} at ${formatTime(next.start_time ?? '')}`
                                : 'No more classes today'}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        <p className="mt-10 max-w-prose text-sm text-muted">
          Availability comes from the published class schedule and the department&apos;s room bookings. Check with
          the department office before using a room for a long session.
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}

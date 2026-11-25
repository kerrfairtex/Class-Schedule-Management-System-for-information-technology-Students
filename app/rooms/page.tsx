import Link from 'next/link';
import { PublicHeader } from '@/components/public/PublicHeader';
import { WeeklyTimetable } from '@/components/public/WeeklyTimetable';
import { getRooms, getTimeSlots } from '@/lib/modules/mod-02-master-list/service';
import { getPublicSchedules } from '@/lib/modules/mod-03-schedule-engine/service';
import {
  campusNow,
  daysOf,
  formatRange,
  formatTime,
  freeRoomIds,
  roomStatusAt,
  rowsOf,
} from '@/lib/modules/mod-03-schedule-engine/public-timetable';
import { DAY_LABELS } from '@/lib/domain/constants';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Rooms & Availability — TRAC BSIT CSMS',
  description: 'See which BSIT rooms are free right now, find a free room for any class period, and view each room’s weekly schedule.',
};

interface PageProps {
  searchParams: Promise<{ room?: string; day?: string; time?: string }>;
}

export default async function RoomsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [rooms, slots, entries] = await Promise.all([getRooms(), getTimeSlots(), getPublicSchedules()]);
  const now = campusNow();
  const days = daysOf(slots);
  const rows = rowsOf(slots);

  // Is "now" inside a class period at all? (Evenings and Sundays are not.)
  const inClassHours = slots.some((s) => s.day_of_week === now.day && s.start_time <= now.time && now.time < s.end_time);

  const selected = params.room ? rooms.find((r) => r.code === params.room) : undefined;

  // "Find a free room" search (validated against real days/periods only).
  const searchDay = params.day && days.includes(params.day) ? params.day : undefined;
  const searchRow = params.time ? rows.find((r) => r.start === params.time) : undefined;
  const freeForSearch =
    searchDay && searchRow
      ? new Set(freeRoomIds(entries, rooms.map((r) => r.id), searchDay, searchRow.start))
      : null;

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <PublicHeader active="/rooms" />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-3xl font-bold sm:text-4xl">Rooms &amp; Availability</h1>
        <p className="mt-2 text-slate-400">
          Now: {DAY_LABELS[now.day] ?? now.day}, {formatTime(now.time)} (campus time).{' '}
          {!inClassHours && 'Outside class hours.'}
        </p>

        {selected ? (
          <section aria-labelledby="room-heading" className="mt-8">
            <Link href="/rooms" className="text-sm text-cyber-cyan underline-offset-2 hover:underline">
              ← All rooms
            </Link>
            <h2 id="room-heading" className="mt-2 text-2xl font-bold">
              {selected.code} · {selected.name}
            </h2>
            <p className="mb-4 text-sm text-slate-400">
              {selected.building_name} · {selected.capacity} seats · weekly schedule
            </p>
            <WeeklyTimetable
              caption={`Weekly schedule for room ${selected.code}`}
              entries={entries.filter((e) => e.room_id === selected.id)}
              slots={slots}
              mode="room"
              now={now}
            />
          </section>
        ) : (
          <>
            <section aria-labelledby="search-heading" className="mt-8 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
              <h2 id="search-heading" className="text-lg font-semibold">Find a free room</h2>
              <form action="/rooms" method="get" className="mt-3 flex flex-wrap items-end gap-2">
                <label className="text-sm text-slate-400">
                  <span className="mb-1 block">Day</span>
                  <select name="day" defaultValue={searchDay ?? (days.includes(now.day) ? now.day : days[0])} className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100">
                    {days.map((d) => (
                      <option key={d} value={d}>{DAY_LABELS[d] ?? d}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-400">
                  <span className="mb-1 block">Time</span>
                  <select name="time" defaultValue={searchRow?.start ?? ''} className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100">
                    {rows.map((r) => (
                      <option key={r.start} value={r.start}>{formatRange(r.start, r.end)}</option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="rounded-lg bg-cyber-teal px-4 py-2 text-sm font-medium text-midnight hover:bg-cyber-cyan">
                  Search
                </button>
              </form>
              {freeForSearch && searchDay && searchRow && (
                <p role="status" className="mt-3 text-sm text-slate-300">
                  {freeForSearch.size} of {rooms.length} rooms free on {DAY_LABELS[searchDay]},{' '}
                  {formatRange(searchRow.start, searchRow.end)}. Free rooms are marked below.
                </p>
              )}
            </section>

            {rooms.length === 0 ? (
              <p className="mt-8 text-slate-500">No rooms have been added yet.</p>
            ) : (
              <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rooms.map((r) => {
                  const { current, next } = roomStatusAt(entries, r.id, now.day, now.time);
                  const freeInSearch = freeForSearch?.has(r.id);
                  return (
                    <li key={r.id}>
                      <Link
                        href={`/rooms?room=${encodeURIComponent(r.code)}`}
                        className={`block h-full rounded-xl border p-4 hover:border-cyber-teal/60 ${
                          freeInSearch ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-slate-700 bg-slate-900/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-mono font-semibold text-cyber-cyan">{r.code}</p>
                            <p className="text-sm text-slate-300">{r.name}</p>
                            <p className="text-xs text-slate-500">
                              {r.building_name} · {r.capacity} seats
                            </p>
                          </div>
                          {freeForSearch ? (
                            <span className={`rounded-full px-2 py-0.5 text-xs ${freeInSearch ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                              {freeInSearch ? 'Free then' : 'Booked then'}
                            </span>
                          ) : current ? (
                            <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-300">In use</span>
                          ) : (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">Free now</span>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-slate-400">
                          {current
                            ? `${current.subject_code} · ${current.section_code} until ${formatTime(current.end_time ?? '')}`
                            : next
                              ? `Next class ${formatTime(next.start_time ?? '')}: ${next.subject_code} · ${next.section_code}`
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

        <p className="mt-10 text-xs text-slate-500">
          Availability is based on the published class schedule only. A room shown as free may still be reserved
          for an exam or event; check with the department office before using it.
        </p>
      </main>
    </div>
  );
}

import Link from 'next/link';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { getPublicSchedules } from '@/lib/modules/mod-03-schedule-engine/service';
import {
  campusNow,
  formatCampusDate,
  formatRange,
  formatTime,
  sortByWeek,
} from '@/lib/modules/mod-03-schedule-engine/public-timetable';
import { BOOKING_KIND_LABEL, listBookings } from '@/lib/modules/mod-09-room-bookings/service';
import { readIfMigrated } from '@/lib/persistence/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Today's classes — TRAC BSIT",
  description: 'Every BSIT class meeting today, in time order, with rooms and instructors, and room bookings.',
};

export default async function TodayPage() {
  const now = campusNow();
  const [entries, bookings] = await Promise.all([
    getPublicSchedules(),
    readIfMigrated(() => listBookings({ fromDate: now.date, toDate: now.date }), [], 'room bookings'),
  ]);
  const today = sortByWeek(entries.filter((e) => e.day_of_week === now.day));

  // Group by start time so a student scans one period at a time.
  const periods = new Map<string, typeof today>();
  for (const e of today) {
    const key = `${e.start_time}|${e.end_time}`;
    periods.set(key, [...(periods.get(key) ?? []), e]);
  }

  return (
    <div className="min-h-screen">
      <PublicHeader active="/today" />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="page-title">Today&apos;s classes</h1>
        <p className="page-lead">
          <time dateTime={now.date}>{formatCampusDate(now.date)}</time>. It is {formatTime(now.time)} on campus.
        </p>

        {today.length === 0 ? (
          <p className="mt-8 notice-info max-w-prose">
            No published classes meet today. See the{' '}
            <Link href="/schedules" className="link">weekly schedules</Link>.
          </p>
        ) : (
          <ol className="mt-8 space-y-6">
            {Array.from(periods).map(([key, list]) => {
              const [start, end] = key.split('|');
              const current = start <= now.time && now.time < end;
              const past = end <= now.time;
              return (
                <li key={key} className={`rounded-lg border border-line bg-surface ${past ? 'opacity-60' : ''}`}>
                  <h2 className={`flex items-baseline justify-between gap-3 rounded-t-lg px-4 py-2 text-base font-bold ${current ? 'now-band' : 'border-b border-line'}`}>
                    <time>{formatRange(start, end)}</time>
                    {current && <span className="text-sm font-semibold">Now</span>}
                    {past && <span className="text-sm font-normal text-muted">Done</span>}
                  </h2>
                  <ul className="divide-y divide-line">
                    {list.map((e) => (
                      <li key={e.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-baseline">
                        <p>
                          <strong>{e.subject_code}</strong> <span className="text-ink-soft">{e.subject_name}</span>
                        </p>
                        <p className="text-sm text-ink-soft">
                          <Link className="link" href={`/schedules?section=${encodeURIComponent(e.section_code ?? '')}`}>
                            {e.section_code}
                          </Link>
                          {' in '}
                          <Link className="link" href={`/rooms?room=${encodeURIComponent(e.room_code ?? '')}`}>
                            {e.room_code}
                          </Link>
                          {', '}
                          {e.faculty_name}
                        </p>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        )}

        {bookings.length > 0 && (
          <section aria-labelledby="bookings-heading" className="mt-10">
            <h2 id="bookings-heading" className="text-xl font-bold">Room bookings today</h2>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {bookings.map((b) => (
                <li key={b.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                  <span>
                    <strong>{b.title}</strong>{' '}
                    <span className="text-sm text-muted">{BOOKING_KIND_LABEL[b.kind]}</span>
                  </span>
                  <span className="text-sm text-ink-soft">
                    <time>{formatRange(b.start_time, b.end_time)}</time>, {b.room_code}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}

import Image from 'next/image';
import Link from 'next/link';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { SectionPicker } from '@/components/public/SectionPicker';
import { AnnouncementList } from '@/components/public/AnnouncementList';
import { ORGANIZATION } from '@/lib/domain/constants';
import { getActiveSemester, getRooms, getSections } from '@/lib/modules/mod-02-master-list/service';
import { getPublicSchedules } from '@/lib/modules/mod-03-schedule-engine/service';
import { campusNow, formatCampusDate, formatTime, sortByWeek } from '@/lib/modules/mod-03-schedule-engine/public-timetable';
import { listBookings } from '@/lib/modules/mod-09-room-bookings/service';
import { listCurrentAnnouncements } from '@/lib/modules/mod-10-announcements/service';
import { readIfMigrated } from '@/lib/persistence/db';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const now = campusNow();
  const [semester, entries, rooms, bookings, announcements] = await Promise.all([
    getActiveSemester(),
    getPublicSchedules(),
    getRooms(),
    readIfMigrated(() => listBookings({ fromDate: now.date, toDate: now.date }), [], 'room bookings'),
    readIfMigrated(() => listCurrentAnnouncements(now.date, 3), [], 'announcements'),
  ]);
  const sections = semester ? await getSections(semester.id) : [];

  const today = sortByWeek(entries.filter((e) => e.day_of_week === now.day));
  const inSession = today.filter((e) => (e.start_time ?? '') <= now.time && now.time < (e.end_time ?? ''));
  const upNext = today.filter((e) => (e.start_time ?? '') > now.time).slice(0, 3);

  const busyRooms = new Set([
    ...inSession.map((e) => e.room_id),
    ...bookings.filter((b) => b.start_time <= now.time && now.time < b.end_time).map((b) => b.room_id),
  ]);
  const freeRooms = rooms.filter((r) => !busyRooms.has(r.id)).length;

  const countBySection = new Map<number, number>();
  for (const e of entries) countBySection.set(e.section_id, (countBySection.get(e.section_id) ?? 0) + 1);

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main>
        <section className="border-b border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
            <div>
              <p className="text-sm text-muted">
                <time dateTime={`${now.date}T${now.time}`}>
                  {formatCampusDate(now.date)}, {formatTime(now.time)}
                </time>
              </p>
              <h1 className="mt-3 font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
                Find your class.
              </h1>
              <p className="mt-4 max-w-prose text-lg text-ink-soft">
                Weekly timetables, rooms and instructors for every BSIT section at {ORGANIZATION.college}. No account
                needed.
              </p>

              <div className="mt-8">
                {entries.length === 0 ? (
                  <p className="notice-warning max-w-prose">
                    This semester&apos;s timetable has not been published yet. Check back after the department releases
                    it.
                  </p>
                ) : (
                  <SectionPicker sections={sections} counts={countBySection} heading="Choose your section" />
                )}
              </div>
            </div>

            <aside aria-labelledby="now-heading" className="self-start rounded-lg border border-line">
              <div className="flex items-baseline justify-between gap-3 border-b border-line px-5 py-4">
                <h2 id="now-heading" className="text-lg font-bold">Right now</h2>
                <Link href="/today" className="link text-sm">All of today</Link>
              </div>
              {inSession.length > 0 ? (
                <ul>
                  {inSession.map((e) => (
                    <li key={e.id} className="now-band border-b border-line px-5 py-3 last:border-b-0">
                      <p className="font-semibold">
                        {e.subject_code} <span className="font-normal text-ink-soft">{e.subject_name}</span>
                      </p>
                      <p className="text-sm text-ink-soft">
                        {e.section_code} in{' '}
                        <Link href={`/rooms?room=${encodeURIComponent(e.room_code ?? '')}`} className="link">
                          {e.room_code}
                        </Link>{' '}
                        until {formatTime(e.end_time ?? '')}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-4 text-ink-soft">No classes in session.</p>
              )}
              {upNext.length > 0 && (
                <div className="border-t border-line px-5 py-4">
                  <h3 className="text-sm font-bold">Coming up today</h3>
                  <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                    {upNext.map((e) => (
                      <li key={e.id}>
                        <time className="font-semibold text-ink">{formatTime(e.start_time ?? '')}</time> {e.subject_code},{' '}
                        {e.section_code}, {e.room_code}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Link
                href="/rooms"
                className="flex items-center justify-between border-t border-line px-5 py-4 text-sm hover:bg-paper"
              >
                <span>
                  <strong className="text-seagrass">{freeRooms}</strong> of {rooms.length} rooms free now
                </span>
                <span className="link">Find a room</span>
              </Link>
            </aside>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
          <section aria-labelledby="news-heading">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="news-heading" className="text-2xl font-bold">Announcements</h2>
              <Link href="/announcements" className="link text-sm">See all</Link>
            </div>
            <AnnouncementList items={announcements} empty="No announcements right now." />
          </section>

          <section aria-labelledby="about-heading">
            <h2 id="about-heading" className="text-2xl font-bold">BSIT at TRAC</h2>
            <Image
              src="/it-building.png"
              alt="The IT building at Tawi-Tawi Regional Agricultural College"
              width={640}
              height={360}
              sizes="(min-width: 1024px) 28rem, 100vw"
              className="mt-4 aspect-video w-full rounded-lg border border-line object-cover"
              priority
            />
            <p className="mt-4 text-ink-soft">
              The Bachelor of Science in Information Technology is offered by the {ORGANIZATION.institute} of{' '}
              {ORGANIZATION.college} in {ORGANIZATION.location}. The college was established by Batas Pambansa Blg.
              384 in 1983.
            </p>
            <p className="mt-3">
              <Link href="/about" className="link">About the program</Link>
            </p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

import Link from 'next/link';
import { PortalLayout } from '@/components/PortalLayout';
import { requireFaculty } from '@/lib/auth';
import { getDb } from '@/lib/persistence/db';
import { getActiveAcademicYear, getActiveSemester } from '@/lib/modules/mod-02-master-list/service';
import { getFacultyAvailability } from '@/lib/modules/mod-02-master-list/availability';
import { getSchedulesByFaculty } from '@/lib/modules/mod-03-schedule-engine/service';
import {
  campusNow,
  formatCampusDate,
  formatRange,
  isoWeek,
  sortByWeek,
  teachingLoad,
} from '@/lib/modules/mod-03-schedule-engine/public-timetable';
import { DAY_LABELS } from '@/lib/domain/constants';
import { FACULTY_NAV, navFor } from '@/lib/domain/navigation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard — TRAC BSIT faculty' };

export default async function FacultyDashboardPage() {
  const session = await requireFaculty();
  const now = campusNow();
  const db = await getDb();
  const [faculty, semester, year, availability] = await Promise.all([
    db.prepare('SELECT first_name, last_name FROM faculty WHERE id = ?').get(session.facultyId) as Promise<
      { first_name: string; last_name: string } | undefined
    >,
    getActiveSemester(),
    getActiveAcademicYear(),
    getFacultyAvailability(session.facultyId),
  ]);
  // Faculty see approved classes before students do (visibility.ts).
  const schedules = semester ? await getSchedulesByFaculty(session.facultyId, semester.id, 'faculty') : [];
  const load = teachingLoad(schedules);
  const today = sortByWeek(schedules.filter((s) => s.day_of_week === now.day));
  const unavailable = availability.filter((a) => Number(a.is_available) === 0).length;
  const notPublic = schedules.filter((s) => s.status === 'APPROVED').length;
  const maxHours = Math.max(...load.byDay.map((d) => d.hours), 1);
  const name = faculty ? `${faculty.first_name} ${faculty.last_name}` : session.name;
  const term = semester ? `${semester.name}, A.Y. ${year?.label ?? ''}` : 'No active semester';

  return (
    <PortalLayout
      role="faculty"
      name={name}
      details={[{ label: 'Semester', value: semester?.name ?? 'Not set' }]}
      links={navFor(FACULTY_NAV, '/faculty/dashboard')}
      termBar={{ term, week: `Week ${isoWeek(now.date)}` }}
    >
      <h1 className="page-title">Your teaching week</h1>
      <p className="page-lead">{term}.</p>

      {notPublic > 0 && (
        <p className="notice-info mt-6 max-w-prose">
          {notPublic} of your classes are approved but not yet published, so students cannot see them yet.
        </p>
      )}

      <section aria-labelledby="load-heading" className="mt-8">
        <h2 id="load-heading" className="text-xl font-bold">Teaching load</h2>
        <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
          {[
            { label: 'Classes a week', value: load.meetings },
            { label: 'Hours a week', value: load.hours },
            { label: 'Subjects', value: load.subjects },
            { label: 'Sections', value: load.sections },
          ].map((m) => (
            <div key={m.label} className="bg-surface p-4">
              <dt className="text-sm text-muted">{m.label}</dt>
              <dd className="font-display text-3xl font-bold tabular">{m.value}</dd>
            </div>
          ))}
        </dl>
        {load.byDay.length > 0 && (
          <table className="data-table mt-4 max-w-xl">
            <caption className="sr-only">Hours by day</caption>
            <tbody>
              {load.byDay.map((d) => (
                <tr key={d.day}>
                  <th scope="row" className="w-28 border-b-0 font-normal text-ink-soft">{DAY_LABELS[d.day] ?? d.day}</th>
                  <td className="w-full border-b-0">
                    <div className="h-2 rounded bg-lagoon" style={{ width: `${(d.hours / maxHours) * 100}%` }} aria-hidden="true" />
                  </td>
                  <td className="whitespace-nowrap border-b-0 text-right tabular">
                    {d.meetings} class{d.meetings === 1 ? '' : 'es'}, {d.hours} h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="today-heading">
          <h2 id="today-heading" className="text-xl font-bold">
            Today, <time dateTime={now.date}>{formatCampusDate(now.date, { year: false })}</time>
          </h2>
          {today.length === 0 ? (
            <p className="mt-3 text-muted">No classes today.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
              {today.map((s) => {
                const current = (s.start_time ?? '') <= now.time && now.time < (s.end_time ?? '');
                return (
                  <li key={s.id} className={`flex gap-4 px-4 py-3 ${current ? 'now-band' : ''}`}>
                    <time className="w-36 shrink-0 font-semibold">{formatRange(s.start_time ?? '', s.end_time ?? '')}</time>
                    <span>
                      <strong>{s.subject_code}</strong> {s.subject_name}
                      <span className="block text-sm text-ink-soft">
                        {s.section_code} in {s.room_code}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="links-heading">
          <h2 id="links-heading" className="text-xl font-bold">Your schedule</h2>
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
            <li>
              <Link href="/faculty/schedule" className="block px-4 py-3 hover:bg-paper">
                <span className="font-semibold text-lagoon">Teaching schedule</span>
                <span className="block text-sm text-muted">Weekly grid or list, ready to print.</span>
              </Link>
            </li>
            <li>
              <Link href="/faculty/availability" className="block px-4 py-3 hover:bg-paper">
                <span className="font-semibold text-lagoon">My availability</span>
                <span className="block text-sm text-muted">
                  {unavailable === 0
                    ? 'You are available for every period.'
                    : `${unavailable} period(s) marked unavailable.`}
                </span>
              </Link>
            </li>
            <li>
              <Link href="/change-password" className="block px-4 py-3 hover:bg-paper">
                <span className="font-semibold text-lagoon">Change password</span>
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </PortalLayout>
  );
}

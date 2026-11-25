import Link from 'next/link';
import { PortalLayout } from '@/components/PortalLayout';
import { requireAdmin } from '@/lib/auth';
import { getActiveAcademicYear, getActiveSemester, getDashboardStats } from '@/lib/modules/mod-02-master-list/service';
import { getSchedulesBySemester } from '@/lib/modules/mod-03-schedule-engine/service';
import { detectAllConflictsInSemester } from '@/lib/modules/mod-04-conflict-engine/validator';
import { getDataEnvironment } from '@/lib/modules/mod-08-database-service/settings';
import { BOOKING_KIND_LABEL, listBookings } from '@/lib/modules/mod-09-room-bookings/service';
import { listCurrentAnnouncements } from '@/lib/modules/mod-10-announcements/service';
import { addDays, campusNow, formatCampusDate, formatRange, isoWeek } from '@/lib/modules/mod-03-schedule-engine/public-timetable';
import { readIfMigrated } from '@/lib/persistence/db';
import { STATUS_LABEL } from '@/lib/domain/schedule-status';
import type { ScheduleStatus } from '@/lib/domain/types';
import { ADMIN_NAV, navFor } from '@/lib/domain/navigation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard — TRAC BSIT admin' };

const PIPELINE: ScheduleStatus[] = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PUBLISHED'];

const MANAGE = [
  { href: '/admin/schedule-board', title: 'Schedule board', text: 'Create, move and publish classes.' },
  { href: '/admin/terms', title: 'Terms and periods', text: 'Academic years, the active semester, class periods.' },
  { href: '/admin/bookings', title: 'Room bookings', text: 'Reserve rooms for exams, events and meetings.' },
  { href: '/admin/announcements', title: 'Announcements', text: 'Post notices on the public site.' },
  { href: '/admin/master-list', title: 'Master list', text: 'Faculty, sections, subjects, rooms, users.' },
  { href: '/admin/audit', title: 'Audit log', text: 'Who changed what, and when.' },
];

export default async function AdminDashboardPage() {
  const session = await requireAdmin();
  const now = campusNow();
  const [stats, semester, year, dataEnvironment, bookings, announcements] = await Promise.all([
    getDashboardStats(),
    getActiveSemester(),
    getActiveAcademicYear(),
    getDataEnvironment(),
    readIfMigrated(() => listBookings({ fromDate: now.date, toDate: addDays(now.date, 7) }), null, 'room bookings'),
    readIfMigrated(() => listCurrentAnnouncements(now.date, 100), null, 'announcements'),
  ]);
  const [schedules, conflicts] = semester
    ? await Promise.all([getSchedulesBySemester(semester.id), detectAllConflictsInSemester(semester.id)])
    : [[], []];

  const byStatus = new Map<ScheduleStatus, number>();
  for (const s of schedules) byStatus.set(s.status ?? 'DRAFT', (byStatus.get(s.status ?? 'DRAFT') ?? 0) + 1);
  const term = semester ? `${semester.name}, A.Y. ${year?.label ?? ''}` : 'No active semester';

  const attention: { tone: 'error' | 'warning' | 'info'; text: string; href: string; action: string }[] = [];
  if (!semester) attention.push({ tone: 'warning', text: 'No semester is active.', href: '/admin/terms', action: 'Set the active semester' });
  if (conflicts.length > 0)
    attention.push({ tone: 'error', text: `${conflicts.length} class(es) have a blocking conflict.`, href: '/admin/conflicts', action: 'Review conflicts' });
  if ((byStatus.get('PENDING_REVIEW') ?? 0) > 0)
    attention.push({ tone: 'info', text: `${byStatus.get('PENDING_REVIEW')} class(es) are waiting for review.`, href: '/admin/schedule-board', action: 'Open the schedule board' });
  if (dataEnvironment === 'DEMO' && (byStatus.get('PUBLISHED') ?? 0) > 0)
    attention.push({ tone: 'warning', text: 'Published classes are hidden from the public site while data is marked DEMO.', href: '/admin/settings', action: 'Review data settings' });
  if (bookings === null || announcements === null)
    attention.push({ tone: 'warning', text: 'Room bookings and announcements need database migration 003.', href: '/admin/settings', action: 'See settings' });

  const records = [
    { label: 'Faculty', value: stats.faculty },
    { label: 'Sections', value: stats.sections },
    { label: 'Subjects', value: stats.subjects },
    { label: 'Rooms', value: stats.rooms },
    { label: 'Student records', value: stats.students },
  ];

  return (
    <PortalLayout
      role="admin"
      name={session.name}
      details={[{ label: 'Semester', value: semester?.name ?? 'Not set' }]}
      links={navFor(ADMIN_NAV, '/admin/dashboard')}
      termBar={{ term, week: `Week ${isoWeek(now.date)}`, conflicts: conflicts.length }}
    >
      <h1 className="page-title">Dashboard</h1>
      <p className="page-lead">{term}.</p>

      {attention.length > 0 && (
        <section aria-labelledby="attention-heading" className="mt-6">
          <h2 id="attention-heading" className="sr-only">Needs attention</h2>
          <ul className="space-y-2">
            {attention.map((a) => (
              <li key={a.text} className={`notice-${a.tone} flex flex-wrap items-center justify-between gap-2`}>
                <span>{a.text}</span>
                <Link href={a.href} className="link">{a.action}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="pipeline-heading" className="mt-8">
        <h2 id="pipeline-heading" className="text-xl font-bold">Classes this semester</h2>
        <ol className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
          {PIPELINE.map((st) => (
            <li key={st} className="bg-surface p-4">
              <p className="text-sm text-muted">{STATUS_LABEL[st]}</p>
              <p className="font-display text-3xl font-bold tabular">{byStatus.get(st) ?? 0}</p>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-sm text-muted">
          Classes move from left to right: draft, review, approval, then published for students.
        </p>
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="manage-heading">
          <h2 id="manage-heading" className="text-xl font-bold">Manage</h2>
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
            {MANAGE.map((m) => (
              <li key={m.href}>
                <Link href={m.href} className="block px-4 py-3 hover:bg-paper">
                  <span className="font-semibold text-lagoon">{m.title}</span>
                  <span className="block text-sm text-muted">{m.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-10">
          <section aria-labelledby="bookings-heading">
            <div className="flex items-baseline justify-between">
              <h2 id="bookings-heading" className="text-xl font-bold">Room bookings, next 7 days</h2>
              <Link href="/admin/bookings" className="link text-sm">All bookings</Link>
            </div>
            {!bookings || bookings.length === 0 ? (
              <p className="mt-3 text-muted">Nothing booked.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line border-y border-line text-sm">
                {bookings.slice(0, 6).map((b) => (
                  <li key={b.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>
                      <strong>{b.title}</strong> <span className="text-muted">{BOOKING_KIND_LABEL[b.kind]}, {b.room_code}</span>
                    </span>
                    <time dateTime={b.booking_date} className="text-ink-soft">
                      {formatCampusDate(b.booking_date, { year: false })}, {formatRange(b.start_time, b.end_time)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="records-heading">
            <h2 id="records-heading" className="text-xl font-bold">Records</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              {records.map((r) => (
                <div key={r.label} className="flex justify-between border-b border-line py-1">
                  <dt className="text-muted">{r.label}</dt>
                  <dd className="font-semibold tabular">{Number(r.value)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-sm text-muted">
              {announcements ? `${announcements.length} announcement(s) showing on the public site.` : ''}
            </p>
          </section>
        </div>
      </div>
    </PortalLayout>
  );
}

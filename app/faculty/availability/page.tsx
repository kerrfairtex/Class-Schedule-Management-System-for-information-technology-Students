import { PortalLayout } from '@/components/PortalLayout';
import { AvailabilityGrid } from '@/components/faculty/AvailabilityGrid';
import { requireFaculty } from '@/lib/auth';
import { getActiveSemester } from '@/lib/modules/mod-02-master-list/service';
import { getFacultyAvailability } from '@/lib/modules/mod-02-master-list/availability';
import { getSchedulesByFaculty } from '@/lib/modules/mod-03-schedule-engine/service';
import { daysOf } from '@/lib/modules/mod-03-schedule-engine/public-timetable';
import { FACULTY_NAV, navFor } from '@/lib/domain/navigation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My availability — TRAC BSIT faculty' };

export default async function FacultyAvailabilityPage() {
  const session = await requireFaculty();
  const semester = await getActiveSemester();
  const [rows, schedules] = await Promise.all([
    getFacultyAvailability(session.facultyId),
    semester ? getSchedulesByFaculty(session.facultyId, semester.id) : Promise.resolve([]),
  ]);
  // A period is "teaching" if any class overlaps it (classes can have free times).
  const teachingIn = (day: string, start: string, end: string) => {
    const c = schedules.find((s) => s.day_of_week === day && (s.start_time ?? '') < end && start < (s.end_time ?? ''));
    return c ? `${c.subject_code}${c.component === 'LAB' ? ' lab' : ''}, ${c.section_code}` : undefined;
  };
  const slots = rows
    .map((r) => ({
      time_slot_id: r.time_slot_id,
      day_of_week: r.day_of_week,
      start_time: r.start_time,
      end_time: r.end_time,
      is_available: Number(r.is_available) === 1,
      teaching: teachingIn(r.day_of_week, r.start_time, r.end_time),
    }))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <PortalLayout role="faculty" name={session.name} links={navFor(FACULTY_NAV, '/faculty/availability')}>
      <h1 className="page-title">My availability</h1>
      <p className="page-lead">
        Mark the periods you cannot teach. The schedule board warns the administrator before placing a class in an
        unavailable period; it does not move classes you already have.
      </p>
      {slots.length === 0 ? (
        <p className="mt-6 text-muted">No class periods have been set up yet.</p>
      ) : (
        <div className="mt-6">
          <AvailabilityGrid days={daysOf(slots)} slots={slots} />
        </div>
      )}
    </PortalLayout>
  );
}

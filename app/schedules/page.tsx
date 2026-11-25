import Link from 'next/link';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { SectionPicker } from '@/components/public/SectionPicker';
import { PrintButton } from '@/components/public/PrintButton';
import { WeeklyTimetable } from '@/components/public/WeeklyTimetable';
import {
  getActiveAcademicYear,
  getActiveSemester,
  getSections,
  getTimeSlots,
} from '@/lib/modules/mod-02-master-list/service';
import { getPublicSchedules } from '@/lib/modules/mod-03-schedule-engine/service';
import { campusNow, formatRange, sortByWeek } from '@/lib/modules/mod-03-schedule-engine/public-timetable';
import { DAY_LABELS } from '@/lib/domain/constants';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Class Schedules — TRAC BSIT CSMS',
  description: 'Find the published weekly class schedule for any BSIT section or instructor. No account needed.',
};

interface PageProps {
  searchParams: Promise<{ section?: string; faculty?: string }>;
}

export default async function SchedulesPage({ searchParams }: PageProps) {
  const { section: sectionCode, faculty: facultyParam } = await searchParams;
  const [semester, year, slots, entries] = await Promise.all([
    getActiveSemester(),
    getActiveAcademicYear(),
    getTimeSlots(),
    // Spec §35/§63: only PUBLISHED, non-DEMO classes of the active semester.
    getPublicSchedules(),
  ]);
  const sections = semester ? await getSections(semester.id) : [];

  const countBySection = new Map<number, number>();
  for (const e of entries) countBySection.set(e.section_id, (countBySection.get(e.section_id) ?? 0) + 1);

  const instructors = Array.from(
    new Map(entries.map((e) => [e.faculty_id, e.faculty_name ?? ''])),
    ([id, name]) => ({ id, name })
  ).sort((a, b) => a.name.localeCompare(b.name));

  const selectedSection = sectionCode ? sections.find((s) => s.code === sectionCode) : undefined;
  const facultyId = facultyParam ? Number(facultyParam) : undefined;
  const selectedFaculty = facultyId ? instructors.find((f) => f.id === facultyId) : undefined;

  const view = selectedSection
    ? {
        title: `Section ${selectedSection.code}`,
        mode: 'section' as const,
        list: entries.filter((e) => e.section_id === selectedSection.id),
      }
    : selectedFaculty
      ? {
          title: selectedFaculty.name,
          mode: 'faculty' as const,
          list: entries.filter((e) => e.faculty_id === selectedFaculty.id),
        }
      : null;

  const term = [semester?.name, year?.label && `A.Y. ${year.label}`].filter(Boolean).join(', ');
  const notFound = (sectionCode && !selectedSection) || (facultyParam && !selectedFaculty);

  return (
    <div className="min-h-screen">
      <PublicHeader active="/schedules" />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="page-title">Class schedules</h1>
        <p className="page-lead">
          {term ? `${term}. ` : ''}The published timetable for every section. No account needed.
        </p>

        {entries.length === 0 ? (
          <div role="status" className="mt-8 notice-warning max-w-prose">
            <p className="font-semibold">This semester&apos;s timetable has not been published yet.</p>
            <p className="mt-1">
              Schedules appear here once the department approves and publishes them. Check back soon or{' '}
              <Link href="/contact" className="link">contact the department</Link>.
            </p>
          </div>
        ) : (
          <>
            {/* Pickers: work without JavaScript (plain links and a GET form). */}
            <section aria-label="Find a schedule" className="mt-8 card print:hidden">
              <SectionPicker
                sections={sections}
                counts={countBySection}
                selectedId={selectedSection?.id}
                heading="Choose your section"
              />
              <form action="/schedules" method="get" className="mt-6 flex flex-wrap items-end gap-2 border-t border-line pt-5">
                <label className="min-w-[14rem]">
                  <span className="label-field">Or an instructor</span>
                  <select
                    name="faculty"
                    defaultValue={selectedFaculty ? String(selectedFaculty.id) : ''}
                    className="select-field"
                  >
                    <option value="">Choose…</option>
                    {instructors.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="btn-primary">
                  Show timetable
                </button>
              </form>
            </section>

            {notFound && (
              <p role="alert" className="mt-6 notice-error">
                That section or instructor has no published classes this semester. Choose one above.
              </p>
            )}

            {view && (
              <section aria-labelledby="timetable-heading" className="mt-8">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 id="timetable-heading" className="text-2xl font-bold">{view.title}</h2>
                    <p className="text-sm text-muted">{view.list.length} class meetings a week</p>
                  </div>
                  <PrintButton label="Print timetable" />
                </div>

                {view.list.length === 0 ? (
                  <p className="notice-info">
                    No published classes for this {view.mode === 'section' ? 'section' : 'instructor'} yet.
                  </p>
                ) : (
                  <>
                    <WeeklyTimetable
                      caption={`Weekly timetable: ${view.title}`}
                      entries={view.list}
                      slots={slots}
                      mode={view.mode}
                      now={campusNow()}
                    />
                    <h3 className="mb-2 mt-10 text-lg font-bold">Class list</h3>
                    <div className="overflow-x-auto">
                      <table className="data-table min-w-[560px]">
                        <caption className="sr-only">Class list: {view.title}</caption>
                        <thead>
                          <tr>
                            <th scope="col">Subject</th>
                            <th scope="col">{view.mode === 'section' ? 'Instructor' : 'Section'}</th>
                            <th scope="col">Day</th>
                            <th scope="col">Time</th>
                            <th scope="col">Room</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortByWeek(view.list).map((e) => (
                            <tr key={e.id}>
                              <td><strong>{e.subject_code}</strong> {e.subject_name}</td>
                              <td>{view.mode === 'section' ? e.faculty_name : e.section_code}</td>
                              <td>{DAY_LABELS[e.day_of_week ?? ''] ?? e.day_of_week}</td>
                              <td className="whitespace-nowrap">{formatRange(e.start_time ?? '', e.end_time ?? '')}</td>
                              <td>
                                <Link href={`/rooms?room=${encodeURIComponent(e.room_code ?? '')}`} className="link">
                                  {e.room_code}
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>
            )}
          </>
        )}

        <p className="mt-10 text-sm text-muted print:hidden">
          Only schedules approved and published by the department appear here. See also the{' '}
          <Link href="/academic-calendar" className="link">academic calendar</Link> and{' '}
          <Link href="/schedules/archive" className="link">past academic years</Link>.
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}

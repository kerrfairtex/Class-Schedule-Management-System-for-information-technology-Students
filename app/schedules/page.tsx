import Link from 'next/link';
import { PublicHeader } from '@/components/public/PublicHeader';
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

  const byYear = new Map<number, typeof sections>();
  for (const s of sections) byYear.set(s.year_level, [...(byYear.get(s.year_level) ?? []), s]);
  const term = [semester?.name, year?.label && `A.Y. ${year.label}`].filter(Boolean).join(' · ');
  const notFound = (sectionCode && !selectedSection) || (facultyParam && !selectedFaculty);

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <PublicHeader active="/schedules" />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-3xl font-bold sm:text-4xl">Class Schedules</h1>
        <p className="mt-2 text-slate-400">
          {term || 'No active semester'} · Published timetable. No account needed.
        </p>

        {entries.length === 0 ? (
          <div role="status" className="mt-8 rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 text-amber-200">
            <p className="font-semibold">The class schedule for this semester has not been published yet.</p>
            <p className="mt-1 text-sm text-amber-200/80">
              Schedules appear here once the department approves and publishes them. Check back soon or{' '}
              <Link href="/contact" className="underline">contact the department</Link>.
            </p>
          </div>
        ) : (
          <>
            {/* Pickers: work without JavaScript (plain links and a GET form). */}
            <section aria-labelledby="find-heading" className="mt-8 rounded-xl border border-slate-700 bg-slate-900/40 p-4 print:hidden">
              <h2 id="find-heading" className="text-lg font-semibold">Find your schedule</h2>
              <p className="mt-1 text-sm text-slate-400">Choose your section:</p>
              <div className="mt-3 space-y-3">
                {Array.from(byYear)
                  .sort(([a], [b]) => a - b)
                  .map(([yearLevel, list]) => (
                    <div key={yearLevel} className="flex flex-wrap items-center gap-2">
                      <span className="w-16 shrink-0 text-xs uppercase tracking-wide text-slate-500">Year {yearLevel}</span>
                      {list.map((s) => {
                        const n = countBySection.get(s.id) ?? 0;
                        const active = selectedSection?.id === s.id;
                        return (
                          <Link
                            key={s.id}
                            href={`/schedules?section=${encodeURIComponent(s.code)}`}
                            aria-current={active ? 'page' : undefined}
                            className={`rounded-full border px-3 py-1.5 text-sm ${
                              active
                                ? 'border-cyber-teal bg-cyber-teal/15 text-cyber-cyan'
                                : 'border-slate-600 text-slate-200 hover:border-cyber-teal'
                            }`}
                          >
                            {s.code}
                            <span className="ml-1 text-xs text-slate-500">({n})</span>
                          </Link>
                        );
                      })}
                    </div>
                  ))}
              </div>

              <form action="/schedules" method="get" className="mt-4 flex flex-wrap items-end gap-2">
                <label className="text-sm text-slate-400">
                  <span className="mb-1 block">Or an instructor:</span>
                  <select
                    name="faculty"
                    defaultValue={selectedFaculty ? String(selectedFaculty.id) : ''}
                    className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                  >
                    <option value="">Choose…</option>
                    {instructors.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="rounded-lg bg-cyber-teal px-4 py-2 text-sm font-medium text-midnight hover:bg-cyber-cyan">
                  Show
                </button>
              </form>
            </section>

            {notFound && (
              <p role="alert" className="mt-6 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">
                That section or instructor has no published classes this semester. Choose one above.
              </p>
            )}

            {view && (
              <section aria-labelledby="timetable-heading" className="mt-8">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 id="timetable-heading" className="text-2xl font-bold">{view.title}</h2>
                    <p className="text-sm text-slate-400">{term} · {view.list.length} class meeting(s) per week</p>
                  </div>
                  <PrintButton label="Print timetable" />
                </div>

                {view.list.length === 0 ? (
                  <p className="rounded-lg border border-slate-700 p-4 text-slate-400">
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
                    <h3 className="mb-2 mt-8 text-lg font-semibold">Class list</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-left text-sm">
                        <caption className="sr-only">Class list: {view.title}</caption>
                        <thead className="border-b border-slate-700 text-xs uppercase tracking-wide text-slate-400">
                          <tr>
                            <th scope="col" className="py-2 pr-4">Subject</th>
                            <th scope="col" className="py-2 pr-4">{view.mode === 'section' ? 'Instructor' : 'Section'}</th>
                            <th scope="col" className="py-2 pr-4">Day</th>
                            <th scope="col" className="py-2 pr-4">Time</th>
                            <th scope="col" className="py-2 pr-4">Room</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortByWeek(view.list).map((e) => (
                            <tr key={e.id} className="border-b border-slate-800">
                              <td className="py-2 pr-4"><strong>{e.subject_code}</strong> {e.subject_name}</td>
                              <td className="py-2 pr-4">{view.mode === 'section' ? e.faculty_name : e.section_code}</td>
                              <td className="py-2 pr-4">{DAY_LABELS[e.day_of_week ?? ''] ?? e.day_of_week}</td>
                              <td className="whitespace-nowrap py-2 pr-4">{formatRange(e.start_time ?? '', e.end_time ?? '')}</td>
                              <td className="py-2 pr-4">
                                <Link href={`/rooms?room=${encodeURIComponent(e.room_code ?? '')}`} className="text-cyber-cyan underline-offset-2 hover:underline">
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

        <p className="mt-10 text-xs text-slate-500 print:hidden">
          Only schedules approved and published by the department appear here.{' '}
          <Link href="/academic-calendar" className="underline">Academic calendar</Link>
          {' · '}
          <Link href="/schedules/archive" className="underline">Past academic years</Link>
        </p>
      </main>
    </div>
  );
}

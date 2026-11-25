'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PortalLayout, PrintHeader, ViewToggle } from '@/components/PortalLayout';
import { TimeGrid } from '@/components/TimeGrid';
import { WEEK_ORDER } from '@/lib/domain/constants';
import { ScheduleList } from '@/components/ScheduleList';
import { Printer } from 'lucide-react';
import type { Schedule } from '@/lib/domain/types';
import { FACULTY_NAV, navFor } from '@/lib/domain/navigation';

export default function FacultySchedulePage() {
  const router = useRouter();
  const [faculty, setFaculty] = useState<Record<string, string> | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [semester, setSemester] = useState<{ name: string } | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetch('/api/faculty')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) router.push('/login');
        else {
          setFaculty(d.faculty);
          setSchedules(d.schedules);
          setSemester(d.semester);
        }
      });
  }, [router]);

  const name = faculty ? `${faculty.first_name} ${faculty.last_name}` : '';
  const links = navFor(FACULTY_NAV, '/faculty/schedule');

  return (
    <PortalLayout
      role="faculty"
      name={name}
      details={[
        { label: 'Employee ID', value: faculty?.employee_id || '' },
        { label: 'Semester', value: semester?.name || '' },
      ]}
      links={links}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:mb-2">
        <div>
          <h1 className="text-2xl font-bold">Teaching Schedule</h1>
          <p className="text-sm text-muted">Your approved and published classes this semester.</p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle view={view} onChange={setView} />
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print / PDF
          </button>
        </div>
      </div>

      <PrintHeader title="Faculty Teaching Schedule" subtitle={semester?.name || ''} name={name} />

      {view === 'grid' ? (
        <TimeGrid
          caption="Weekly teaching schedule"
          days={WEEK_ORDER.filter((d) => schedules.some((x) => x.day_of_week === d))}
          entries={schedules}
          minWidth={720}
          blockClassName={(e) => (e.component === 'LAB' ? 'border-seagrass/40 bg-seagrass-50' : 'border-lagoon/30 bg-lagoon-50')}
          renderBlock={(e) => (
            <div className="p-1.5">
              <p className="font-bold">
                {e.subject_code} <span className="font-semibold text-ink-soft">{e.component === 'LAB' ? 'Lab' : 'Lec'}</span>
              </p>
              <p className="text-ink-soft">{e.section_code}, {e.room_code}</p>
              {e.status === 'APPROVED' && <p className="text-muted">Not yet published</p>}
            </div>
          )}
        />
      ) : (
        <ScheduleList schedules={schedules} showSection />
      )}
    </PortalLayout>
  );
}

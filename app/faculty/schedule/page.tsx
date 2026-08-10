'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PortalLayout, PrintHeader, ViewToggle } from '@/components/PortalLayout';
import { ScheduleGrid } from '@/components/ScheduleGrid';
import { ScheduleList } from '@/components/ScheduleList';
import { Printer } from 'lucide-react';
import type { Schedule } from '@/lib/domain/types';

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
  const links = [
    { href: '/faculty/dashboard', label: 'Dashboard' },
    { href: '/faculty/schedule', label: 'My Schedule', active: true },
  ];

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
          <p className="text-sm text-slate-500">MOD-06 — View and print only</p>
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
        <ScheduleGrid schedules={schedules} showSection />
      ) : (
        <ScheduleList schedules={schedules} showSection />
      )}
    </PortalLayout>
  );
}

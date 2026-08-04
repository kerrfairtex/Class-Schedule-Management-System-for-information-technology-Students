'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PortalSidebar } from '@/components/Sidebar';
import { ScheduleGrid } from '@/components/ScheduleGrid';
import { Printer } from 'lucide-react';
import type { Schedule } from '@/lib/domain/types';
import { ORGANIZATION } from '@/lib/domain/constants';

export default function FacultySchedulePage() {
  const router = useRouter();
  const [faculty, setFaculty] = useState<Record<string, string> | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [semester, setSemester] = useState<{ name: string } | null>(null);

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

  return (
    <div className="flex min-h-screen">
      <PortalSidebar
        title="Faculty"
        name={name}
        subtitle={ORGANIZATION.departmentCode}
        details={[
          { label: 'Employee ID', value: faculty?.employee_id || '' },
          { label: 'Semester', value: semester?.name || '' },
        ]}
        links={[{ href: '/faculty/schedule', label: 'My Schedule', active: true }]}
      />
      <main className="flex-1 p-8">
        <div className="mb-6 flex items-center justify-between print:mb-2">
          <div>
            <h1 className="text-2xl font-bold">Teaching Schedule</h1>
            <p className="text-sm text-slate-500">MOD-06 Faculty Portal — View Only</p>
          </div>
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 print:hidden">
            <Printer className="h-4 w-4" />
            Print Schedule
          </button>
        </div>

        <div className="mb-4 hidden print:block">
          <p className="text-sm font-medium">{ORGANIZATION.college}</p>
          <p className="text-sm">{ORGANIZATION.department}</p>
          <p className="text-lg font-bold">{name} — {semester?.name}</p>
        </div>

        <ScheduleGrid schedules={schedules} showSection />
      </main>
    </div>
  );
}

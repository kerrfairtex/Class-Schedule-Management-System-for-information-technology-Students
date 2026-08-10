'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PortalLayout } from '@/components/PortalLayout';
import { ScheduleStats } from '@/components/ScheduleList';
import { Calendar, Clock, BookOpen } from 'lucide-react';
import type { Schedule } from '@/lib/domain/types';
import { ORGANIZATION } from '@/lib/domain/constants';
import Link from 'next/link';

export default function FacultyDashboardPage() {
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
  const links = [
    { href: '/faculty/dashboard', label: 'Dashboard', active: true },
    { href: '/faculty/schedule', label: 'My Schedule' },
  ];

  const upcoming = getUpcomingClasses(schedules);

  return (
    <PortalLayout
      role="faculty"
      name={name}
      details={[
        { label: 'Employee ID', value: faculty?.employee_id || '' },
        { label: 'Email', value: faculty?.email || '' },
        { label: 'Semester', value: semester?.name || '' },
      ]}
      links={links}
    >
      <h1 className="mb-2 text-2xl font-bold">Faculty Dashboard</h1>
      <p className="mb-6 text-sm text-slate-500">
        MOD-06 Faculty Portal — {ORGANIZATION.shortName} / {ORGANIZATION.departmentCode}
      </p>

      <ScheduleStats schedules={schedules} />

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Link href="/faculty/schedule" className="card flex items-center gap-4 transition hover:border-primary/30">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <p className="font-semibold">View Full Schedule</p>
            <p className="text-sm text-slate-500">Grid and list views with print export</p>
          </div>
        </Link>
        <div className="card flex items-center gap-4">
          <BookOpen className="h-8 w-8 text-primary" />
          <div>
            <p className="font-semibold">{new Set(schedules.map((s) => s.subject_code)).size} Subjects</p>
            <p className="text-sm text-slate-500">Assigned this semester</p>
          </div>
        </div>
      </div>

      {upcoming.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Clock className="h-5 w-5 text-primary" />
            Upcoming Classes
          </h2>
          <div className="space-y-2">
            {upcoming.map((s) => (
              <div key={s.id} className="card flex justify-between text-sm">
                <span className="font-medium">{s.subject_code} — {s.section_code}</span>
                <span className="text-slate-500">{s.day_of_week} {s.start_time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </PortalLayout>
  );
}

function getUpcomingClasses(schedules: Schedule[]): Schedule[] {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];
  return schedules.filter((s) => s.day_of_week === today).slice(0, 5);
}

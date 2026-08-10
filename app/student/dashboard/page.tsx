'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PortalLayout } from '@/components/PortalLayout';
import { ScheduleStats } from '@/components/ScheduleList';
import { Calendar, Search } from 'lucide-react';
import type { Schedule } from '@/lib/domain/types';
import { ORGANIZATION } from '@/lib/domain/constants';
import Link from 'next/link';

export default function StudentDashboardPage() {
  const router = useRouter();
  const [student, setStudent] = useState<Record<string, string> | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [semester, setSemester] = useState<{ name: string } | null>(null);

  useEffect(() => {
    fetch('/api/student')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) router.push('/login');
        else if (d.student) {
          setStudent(d.student);
          setSchedules(d.schedules);
          setSemester(d.semester);
        }
      });
  }, [router]);

  const name = student ? `${student.first_name} ${student.last_name}` : '';
  const links = [
    { href: '/student/dashboard', label: 'Dashboard', active: true },
    { href: '/student/schedule', label: 'My Schedule' },
  ];

  return (
    <PortalLayout
      role="student"
      name={name}
      subtitle={student?.section_code}
      details={[
        { label: 'Student ID', value: student?.student_id || '' },
        { label: 'Section', value: student?.section_code || '' },
        { label: 'Semester', value: semester?.name || '' },
      ]}
      links={links}
    >
      <h1 className="mb-2 text-2xl font-bold">Student Dashboard</h1>
      <p className="mb-6 text-sm text-slate-500">
        MOD-07 Student Portal — {ORGANIZATION.shortName} / {ORGANIZATION.departmentCode}
      </p>

      <ScheduleStats schedules={schedules} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/student/schedule" className="card flex items-center gap-4 transition hover:border-primary/30">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <p className="font-semibold">My Class Schedule</p>
            <p className="text-sm text-slate-500">View grid or list, print your timetable</p>
          </div>
        </Link>
        <Link href="/student/schedule?search=1" className="card flex items-center gap-4 transition hover:border-primary/30">
          <Search className="h-8 w-8 text-primary" />
          <div>
            <p className="font-semibold">Search Sections</p>
            <p className="text-sm text-slate-500">Look up any section&apos;s timetable</p>
          </div>
        </Link>
      </div>
    </PortalLayout>
  );
}

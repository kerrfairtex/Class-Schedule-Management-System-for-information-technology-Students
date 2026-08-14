'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PortalLayout } from '@/components/PortalLayout';
import { Calendar, Search, BookOpen, GraduationCap, Clock } from 'lucide-react';
import type { Schedule } from '@/lib/domain/types';
import { ORGANIZATION } from '@/lib/domain/constants';
import Link from 'next/link';
import { MetricCard, QuickLink } from '@/components/DashboardComponents';

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
    { href: '/student/dashboard', label: 'Mission Log', active: true },
    { href: '/student/schedule', label: 'Schedule Matrix' },
  ];

  const uniqueSubjects = new Set(schedules.map((s) => s.subject_code)).size;
  const uniqueDays = new Set(schedules.map((s) => s.day_of_week)).size;

  const telemetry = {
    term: semester?.name || 'No Active Semester',
    week: getCurrentWeekLabel(),
    health: 'healthy' as const,
    conflicts: 0,
  };

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
      telemetry={telemetry}
    >
      <div className="space-y-8 animate-in">
        <div>
          <h1 className="mb-1 text-3xl font-bold text-slate-100 tracking-tight">Mission Log</h1>
          <p className="text-slate-400">MOD-07 Student Portal — {ORGANIZATION.shortName} / {ORGANIZATION.departmentCode}</p>
        </div>

        <section aria-label="Schedule Metrics">
          <h2 className="mb-4 text-lg font-semibold text-slate-300 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-cyber-teal" />
            Schedule Telemetry
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={<GraduationCap className="h-5 w-5" />}
              iconClass="metric-icon-teal"
              label="Total Classes"
              value={schedules.length}
            />
            <MetricCard
              icon={<BookOpen className="h-5 w-5" />}
              iconClass="metric-icon-emerald"
              label="Unique Subjects"
              value={uniqueSubjects}
            />
            <MetricCard
              icon={<Calendar className="h-5 w-5" />}
              iconClass="metric-icon-amber"
              label="Active Days"
              value={uniqueDays}
            />
            <MetricCard
              icon={<Clock className="h-5 w-5" />}
              iconClass="metric-icon-violet"
              label="Weekly Hours"
              value={schedules.length}
            />
          </div>
        </section>

        <section aria-label="Quick Actions">
          <h2 className="mb-4 text-lg font-semibold text-slate-300 flex items-center gap-2">
            <Search className="h-5 w-5 text-cyber-teal" />
            Navigation Commands
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <QuickLink
              href="/student/schedule"
              title="Schedule Matrix"
              description="View grid or list, print your timetable"
              icon={<Calendar className="h-5 w-5" />}
            />
            <QuickLink
              href="/student/schedule?search=1"
              title="Section Lookup"
              description="Search any section's timetable"
              icon={<Search className="h-5 w-5" />}
            />
          </div>
        </section>
      </div>
    </PortalLayout>
  );
}

function getCurrentWeekLabel(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `Week ${week}`;
}
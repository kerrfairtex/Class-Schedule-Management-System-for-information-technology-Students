'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PortalLayout } from '@/components/PortalLayout';
import { Calendar, Clock, BookOpen, Users, Activity } from 'lucide-react';
import type { Schedule } from '@/lib/domain/types';
import { ORGANIZATION } from '@/lib/domain/constants';
import Link from 'next/link';
import { MetricCard, QuickLink } from '@/components/DashboardComponents';

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
    { href: '/faculty/dashboard', label: 'Mission Log', active: true },
    { href: '/faculty/schedule', label: 'Schedule Matrix' },
  ];

  const upcoming = getUpcomingClasses(schedules);
  const uniqueSubjects = new Set(schedules.map((s) => s.subject_code)).size;
  const uniqueSections = new Set(schedules.map((s) => s.section_code)).size;

  const telemetry = {
    term: semester?.name || 'No Active Semester',
    week: getCurrentWeekLabel(),
    health: 'healthy' as const,
    conflicts: 0,
  };

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
      telemetry={telemetry}
    >
      <div className="space-y-8 animate-in">
        <div>
          <h1 className="mb-1 text-3xl font-bold text-slate-100 tracking-tight">Mission Log</h1>
          <p className="text-slate-400">MOD-06 Faculty Portal — {ORGANIZATION.shortName} / {ORGANIZATION.departmentCode}</p>
        </div>

        <section aria-label="Teaching Metrics">
          <h2 className="mb-4 text-lg font-semibold text-slate-300 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-cyber-teal" />
            Teaching Telemetry
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={<BookOpen className="h-5 w-5" />}
              iconClass="metric-icon-teal"
              label="Assigned Subjects"
              value={uniqueSubjects}
            />
            <MetricCard
              icon={<Users className="h-5 w-5" />}
              iconClass="metric-icon-emerald"
              label="Active Sections"
              value={uniqueSections}
            />
            <MetricCard
              icon={<Calendar className="h-5 w-5" />}
              iconClass="metric-icon-amber"
              label="Weekly Classes"
              value={schedules.length}
            />
            <MetricCard
              icon={<Clock className="h-5 w-5" />}
              iconClass="metric-icon-violet"
              label="Upcoming Today"
              value={upcoming.length}
            />
          </div>
        </section>

        <section aria-label="Quick Actions">
          <h2 className="mb-4 text-lg font-semibold text-slate-300 flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyber-teal" />
            Navigation Commands
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <QuickLink
              href="/faculty/schedule"
              title="Schedule Matrix"
              description="Grid and list views with print export"
              icon={<Calendar className="h-5 w-5" />}
            />
            <QuickLink
              href="/faculty/schedule?view=list"
              title="Class Roster"
              description="List view with section details"
              icon={<Users className="h-5 w-5" />}
            />
          </div>
        </section>

        {upcoming.length > 0 && (
          <section aria-label="Upcoming Classes">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-300">
              <Clock className="h-5 w-5 text-cyber-teal" />
              Upcoming Operations
            </h2>
            <div className="space-y-2">
              {upcoming.map((s) => (
                <div key={s.id} className="card flex justify-between text-sm">
                  <span className="font-medium font-mono text-cyber-cyan">{s.subject_code} — {s.section_code}</span>
                  <span className="text-slate-500 font-mono">{s.day_of_week} {s.start_time}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </PortalLayout>
  );
}

function getUpcomingClasses(schedules: Schedule[]): Schedule[] {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];
  return schedules.filter((s) => s.day_of_week === today).slice(0, 5);
}

function getCurrentWeekLabel(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `Week ${week}`;
}
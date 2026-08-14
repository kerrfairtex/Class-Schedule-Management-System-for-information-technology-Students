import { PortalLayout } from '@/components/PortalLayout';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getDashboardStats, getActiveSemester, getActiveAcademicYear } from '@/lib/modules/mod-02-master-list/service';
import { getSchedulesBySemester } from '@/lib/modules/mod-03-schedule-engine/service';
import { LayoutDashboard, Users, GraduationCap, BookOpen, Building2, Calendar, Layers, Database, AlertTriangle, Activity, Server } from 'lucide-react';
import { ORGANIZATION } from '@/lib/domain/constants';
import { MetricCard, QuickLink } from '@/components/DashboardComponents';

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== 'admin') redirect('/login');

  const stats = getDashboardStats();
  const semester = getActiveSemester();
  const academicYear = getActiveAcademicYear();

  // Count conflicts for telemetry
  const schedules = getSchedulesBySemester(semester?.id || 0);
  const conflicts = detectConflictsCount(schedules);

  const adminLinks = [
    { href: '/admin/dashboard', label: 'Mission Control', icon: <LayoutDashboard className="h-4 w-4" />, active: true, moduleId: 'admin-control' },
    { href: '/admin/master-list', label: 'Master List (MOD-02)', icon: <BookOpen className="h-4 w-4" />, moduleId: 'master-list' },
    { href: '/admin/faculty-availability', label: 'Faculty Load', icon: <Users className="h-4 w-4" />, moduleId: 'faculty-availability' },
    { href: '/admin/schedule-board', label: 'Schedule Board (MOD-05)', icon: <Calendar className="h-4 w-4" />, moduleId: 'schedule-board' },
  ];

  const telemetry = {
    term: `${academicYear?.label || 'AY 2024-2025'} • ${semester?.name || 'No Active Semester'}`,
    week: getCurrentWeekLabel(),
    health: (conflicts > 0 ? 'warning' : 'healthy') as 'warning' | 'healthy' | 'critical',
    conflicts,
  };

  return (
    <PortalLayout
      role="admin"
      name={session.name}
      subtitle={ORGANIZATION.departmentCode}
      details={[
        { label: 'College', value: ORGANIZATION.shortName },
        { label: 'Semester', value: semester?.name || 'Not set' },
      ]}
      links={adminLinks}
      telemetry={telemetry}
    >
      <div className="space-y-8 animate-in">
        <div>
          <h1 className="mb-1 text-3xl font-bold text-slate-100 tracking-tight">Mission Control</h1>
          <p className="text-slate-400">{ORGANIZATION.college} — Department Scheduling MIS</p>
        </div>


        <section aria-label="System Metrics">
          <h2 className="mb-4 text-lg font-semibold text-slate-300 flex items-center gap-2">
            <Server className="h-5 w-5 text-cyber-teal" />
            System Telemetry
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              icon={<Users className="h-5 w-5" />}
              iconClass="metric-icon-teal"
              label="Active Personnel"
              value={stats.faculty + stats.students}
              trend={{ value: stats.faculty, label: 'Faculty' }}
              subValue={stats.students}
              subLabel="Students"
            />
            <MetricCard
              icon={<GraduationCap className="h-5 w-5" />}
              iconClass="metric-icon-emerald"
              label="Enrolled IT Students"
              value={stats.students}
            />
            <MetricCard
              icon={<BookOpen className="h-5 w-5" />}
              iconClass="metric-icon-amber"
              label="Active Subjects"
              value={stats.subjects}
            />
            <MetricCard
              icon={<Layers className="h-5 w-5" />}
              iconClass="metric-icon-violet"
              label="Active Sections"
              value={stats.sections}
            />
            <MetricCard
              icon={<Building2 className="h-5 w-5" />}
              iconClass="metric-icon-teal"
              label="Lab Nodes"
              value={stats.rooms}
            />
            <MetricCard
              icon={<Calendar className="h-5 w-5" />}
              iconClass={conflicts > 0 ? 'metric-icon-red' : 'metric-icon-emerald'}
              label="Scheduled Operations"
              value={stats.schedules}
              trend={conflicts > 0 ? { value: conflicts, label: 'Conflicts', down: true } : undefined}
            />
          </div>
        </section>

        <section aria-label="Quick Actions">
          <h2 className="mb-4 text-lg font-semibold text-slate-300 flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyber-teal" />
            Operational Commands
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <QuickLink
              href="/admin/master-list"
              title="Master List (MOD-02)"
              description="Manage faculty, subjects, rooms, sections, and curriculum."
              icon={<BookOpen className="h-5 w-5" />}
            />
            <QuickLink
              href="/admin/schedule-board"
              title="Schedule Board (MOD-05)"
              description="Generate schedules, drag-and-drop manual adjustments."
              icon={<Calendar className="h-5 w-5" />}
            />
            <QuickLink
              href="/admin/faculty-availability"
              title="Faculty Load Matrix"
              description="View and configure faculty availability constraints."
              icon={<Users className="h-5 w-5" />}
            />
            <QuickLink
              href="/api/admin?resource=audit"
              title="Audit Logs"
              description="Review system audit trail and security events."
              icon={<AlertTriangle className="h-5 w-5" />}
            />
          </div>
        </section>
      </div>
    </PortalLayout>
  );
}

// Helper functions
function detectConflictsCount(schedules: any[]): number {
  const facultyMap = new Map<string, number>();
  const roomMap = new Map<string, number>();
  const sectionMap = new Map<string, number>();
  let conflicts = 0;

  for (const s of schedules) {
    const key = `${s.day_of_week}-${s.start_time}`;
    const fKey = `${s.faculty_id}-${key}`;
    const rKey = `${s.room_id}-${key}`;
    const secKey = `${s.section_id}-${key}`;

    if (facultyMap.has(fKey)) conflicts++;
    else facultyMap.set(fKey, 1);

    if (roomMap.has(rKey)) conflicts++;
    else roomMap.set(rKey, 1);

    if (sectionMap.has(secKey)) conflicts++;
    else sectionMap.set(secKey, 1);
  }

  return conflicts;
}

function getCurrentWeekLabel(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `Week ${week}`;
}
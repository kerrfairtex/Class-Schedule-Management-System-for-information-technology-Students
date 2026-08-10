import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { PortalSidebar } from '@/components/Sidebar';
import Link from 'next/link';
import { getDashboardStats, getActiveSemester } from '@/lib/modules/mod-02-master-list/service';
import { ORGANIZATION } from '@/lib/domain/constants';
import { Users, GraduationCap, BookOpen, Building, Calendar, Layers } from 'lucide-react';

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== 'admin') redirect('/login');

  const stats = getDashboardStats();
  const semester = getActiveSemester();

  const adminLinks = [
    { href: '/admin/dashboard', label: 'Dashboard', active: true },
    { href: '/admin/master-list', label: 'Master List (MOD-02)' },
    { href: '/admin/faculty-availability', label: 'Faculty Availability' },
    { href: '/admin/schedule-board', label: 'Schedule Board (MOD-05)' },
  ];

  return (
    <div className="flex min-h-screen">
      <PortalSidebar
        title="Admin"
        name={session.name}
        subtitle={ORGANIZATION.departmentCode}
        details={[
          { label: 'College', value: ORGANIZATION.shortName },
          { label: 'Semester', value: semester?.name || 'Not set' },
        ]}
        links={adminLinks}
      />
      <main className="flex-1 p-8">
        <h1 className="mb-2 text-2xl font-bold">Admin Dashboard</h1>
        <p className="mb-8 text-slate-600">
          {ORGANIZATION.college} — Department Scheduling MIS
        </p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard icon={<Users />} label="Faculty" value={stats.faculty} />
          <StatCard icon={<GraduationCap />} label="Students" value={stats.students} />
          <StatCard icon={<BookOpen />} label="Subjects" value={stats.subjects} />
          <StatCard icon={<Layers />} label="Sections" value={stats.sections} />
          <StatCard icon={<Building />} label="Rooms" value={stats.rooms} />
          <StatCard icon={<Calendar />} label="Schedules" value={stats.schedules} />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <QuickLink
            href="/admin/master-list"
            title="Master List (MOD-02)"
            description="Manage faculty, subjects, rooms, sections, and curriculum."
          />
          <QuickLink
            href="/admin/schedule-board"
            title="Schedule Board (MOD-05)"
            description="Generate schedules, drag-and-drop manual adjustments."
          />
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="rounded-lg bg-primary/10 p-3 text-primary">{icon}</div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function QuickLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="card transition hover:border-primary/30 hover:shadow-md">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </Link>
  );
}

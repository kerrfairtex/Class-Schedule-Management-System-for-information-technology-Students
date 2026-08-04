import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getDashboardStats } from '@/lib/services';
import { Sidebar } from '@/components/Sidebar';
import { Users, GraduationCap, BookOpen, Shield } from 'lucide-react';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== 'admin') redirect('/admin/login');

  const stats = getDashboardStats();

  return (
    <div className="flex min-h-screen">
      <Sidebar
        role="admin"
        name={session.name}
        details={[{ label: 'Role', value: 'Administrator' }]}
        links={[
          { href: '/admin/dashboard', label: 'Dashboard', active: true },
          { href: '/admin/faculty', label: 'Manage Faculty' },
          { href: '/admin/students', label: 'Manage Students' },
          { href: '/admin/subjects', label: 'Manage Subjects' },
        ]}
      />
      <main className="flex-1 p-8">
        <h1 className="mb-8 text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<Shield className="h-6 w-6" />} label="Admins" value={stats.adminCount} />
          <StatCard icon={<Users className="h-6 w-6" />} label="Faculty" value={stats.facultyCount} />
          <StatCard icon={<GraduationCap className="h-6 w-6" />} label="Students" value={stats.studentCount} />
          <StatCard icon={<BookOpen className="h-6 w-6" />} label="Subjects" value={stats.subjectCount} />
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <QuickLink href="/admin/faculty" title="Register Faculty" description="Add new faculty members" />
          <QuickLink href="/admin/students" title="Register Students" description="Add new student records" />
          <QuickLink href="/admin/subjects" title="Manage Subjects" description="Add subjects by year" />
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
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function QuickLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="card transition hover:border-primary/30 hover:shadow-md">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </Link>
  );
}

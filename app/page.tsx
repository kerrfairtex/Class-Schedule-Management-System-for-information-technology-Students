import Link from 'next/link';
import { Calendar, GraduationCap, Shield, Users } from 'lucide-react';
import { ORGANIZATION } from '@/lib/domain/constants';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-700">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 py-12">
        <div className="mb-12 text-center text-white">
          <Calendar className="mx-auto mb-4 h-16 w-16" />
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-emerald-200">
            {ORGANIZATION.college}
          </p>
          <h1 className="mb-3 text-4xl font-bold tracking-tight md:text-5xl">
            Class Schedule Management System
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-emerald-100">
            Department-level academic scheduling MIS for {ORGANIZATION.departmentCode} — LAN-based,
            local-first, SQLite-backed.
          </p>
        </div>

        <div className="grid w-full max-w-4xl gap-6 md:grid-cols-3">
          <PortalCard
            href="/login"
            icon={<Shield className="h-8 w-8" />}
            title="Admin Portal"
            description="Master lists, schedule generation, drag-and-drop board, reports."
          />
          <PortalCard
            href="/login"
            icon={<Users className="h-8 w-8" />}
            title="Faculty Portal"
            description="View and print teaching schedules. Read-only access."
          />
          <PortalCard
            href="/login"
            icon={<GraduationCap className="h-8 w-8" />}
            title="Student Portal"
            description="Search and view section timetables. Print schedules."
          />
        </div>

        <div className="mt-12 max-w-2xl rounded-xl bg-white/10 p-6 text-center text-sm text-emerald-100 backdrop-blur">
          <p className="font-medium text-white">Demo Credentials (TRAC / BSIT)</p>
          <p className="mt-2">Admin: admin / admin123</p>
          <p>Faculty: fac-001 / faculty123</p>
          <p>Student: 2022-0001 / student123</p>
        </div>

        <div className="mt-8 text-center text-xs text-emerald-200/70">
          <p>MOD-01 Auth · MOD-02 Master List · MOD-03 Schedule Engine · MOD-04 Conflict Engine</p>
          <p>MOD-05 Manual Adjustment · MOD-06 Faculty Portal · MOD-07 Student Portal · MOD-08 DB Service</p>
        </div>
      </div>
    </div>
  );
}

function PortalCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl bg-white p-8 shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="mb-4 text-emerald-800 transition group-hover:text-emerald-600">{icon}</div>
      <h2 className="mb-2 text-xl font-semibold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-600">{description}</p>
    </Link>
  );
}

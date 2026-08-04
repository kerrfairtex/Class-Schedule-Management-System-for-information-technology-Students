import Link from 'next/link';
import { GraduationCap, Users, Shield } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-primary to-primary-light">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 py-12">
        <div className="mb-12 text-center text-white">
          <GraduationCap className="mx-auto mb-4 h-16 w-16" />
          <h1 className="mb-3 text-4xl font-bold tracking-tight md:text-5xl">
            University Timetable Portal
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-blue-100">
            A centralized platform for students, faculty, and administrators to manage
            class schedules with conflict-free timetabling.
          </p>
        </div>

        <div className="grid w-full max-w-4xl gap-6 md:grid-cols-3">
          <PortalCard
            href="/student/login"
            icon={<GraduationCap className="h-8 w-8" />}
            title="Student Portal"
            description="View your timetable and select faculty for each subject."
          />
          <PortalCard
            href="/faculty/login"
            icon={<Users className="h-8 w-8" />}
            title="Faculty Portal"
            description="Set your teaching schedule, rooms, and subjects."
          />
          <PortalCard
            href="/admin/login"
            icon={<Shield className="h-8 w-8" />}
            title="Admin Portal"
            description="Manage students, faculty, subjects, and system data."
          />
        </div>

        <div className="mt-12 rounded-xl bg-white/10 p-6 text-center text-sm text-blue-100 backdrop-blur">
          <p className="font-medium text-white">Demo Credentials</p>
          <p className="mt-2">Admin: admin / admin</p>
          <p>Faculty: sandeep / pratap (token: 42544674)</p>
          <p>Student: SAP 500060879 / 123</p>
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
      <div className="mb-4 text-primary transition group-hover:text-primary-light">{icon}</div>
      <h2 className="mb-2 text-xl font-semibold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-600">{description}</p>
    </Link>
  );
}

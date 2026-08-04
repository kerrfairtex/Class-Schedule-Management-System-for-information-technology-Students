import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getStudentBySap } from '@/lib/services';
import { Sidebar } from '@/components/Sidebar';
import Link from 'next/link';

export default async function StudentDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== 'student') redirect('/student/login');

  const student = getStudentBySap(parseInt(session.id, 10));
  if (!student) redirect('/student/login');

  return (
    <div className="flex min-h-screen">
      <Sidebar
        role="student"
        name={`${student.first_name} ${student.last_name}`}
        subtitle={student.branch}
        details={[
          { label: 'SAP ID', value: String(student.sap) },
          { label: 'Year', value: String(student.year) },
          { label: 'Email', value: student.email },
          { label: 'Contact', value: student.phone },
        ]}
        links={[
          { href: '/student/dashboard', label: 'Dashboard', active: true },
          { href: '/student/timetable', label: 'Set Timetable' },
        ]}
      />
      <main className="flex-1 p-8">
        <h1 className="mb-4 text-2xl font-bold">
          Welcome, {student.first_name} {student.last_name}
        </h1>
        <p className="mb-6 text-slate-600">
          Select faculty for your subjects and build your personalized class schedule.
        </p>
        <Link href="/student/timetable" className="btn-primary inline-block">
          Go to Timetable
        </Link>
      </main>
    </div>
  );
}

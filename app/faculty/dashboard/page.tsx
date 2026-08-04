import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getFacultyByUsername } from '@/lib/services';
import { Sidebar } from '@/components/Sidebar';
import Link from 'next/link';

export default async function FacultyDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== 'faculty') redirect('/faculty/login');

  const faculty = getFacultyByUsername(session.id);
  if (!faculty) redirect('/faculty/login');

  return (
    <div className="flex min-h-screen">
      <Sidebar
        role="faculty"
        name={faculty.name}
        subtitle={faculty.designation}
        details={[
          { label: 'Email', value: faculty.email },
          { label: 'Contact', value: faculty.contact },
          { label: 'Subject 1', value: faculty.subject1 || '—' },
          { label: 'Subject 2', value: faculty.subject2 || '—' },
          { label: 'Status', value: faculty.finalized ? 'Finalized' : 'Draft' },
        ]}
        links={[
          { href: '/faculty/dashboard', label: 'Dashboard', active: true },
          { href: '/faculty/timetable', label: 'Set Timetable' },
        ]}
      />
      <main className="flex-1 p-8">
        <h1 className="mb-4 text-2xl font-bold">Welcome, {faculty.name}</h1>
        <p className="mb-6 text-slate-600">
          Use the timetable page to set your teaching schedule. You will need your access token to
          begin editing.
        </p>
        <div className="card max-w-lg">
          <h2 className="mb-2 font-semibold">Your Access Token</h2>
          <p className="font-mono text-lg text-primary">{faculty.token}</p>
          <p className="mt-2 text-sm text-slate-500">
            Enter this token on the timetable page to verify your identity before making changes.
          </p>
          <Link href="/faculty/timetable" className="btn-primary mt-4 inline-block">
            Go to Timetable
          </Link>
        </div>
      </main>
    </div>
  );
}

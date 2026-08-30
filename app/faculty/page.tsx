import Link from 'next/link';
import { getDb } from '@/lib/persistence/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Faculty — TRAC BSIT CSMS',
};

export default async function FacultyPage() {
  const db = getDb();
  const faculty = db
    .prepare(
      `SELECT f.id, f.employee_id, f.first_name, f.last_name, f.email, f.phone,
              f.data_environment,
              d.code as dept_code,
              (SELECT GROUP_CONCAT(sub.code, ', ')
                 FROM faculty_subjects fs JOIN subjects sub ON sub.id = fs.subject_id
                 WHERE fs.faculty_id = f.id) as subjects
       FROM faculty f
       JOIN departments d ON d.id = f.department_id
       ORDER BY f.last_name, f.first_name`
    )
    .all() as Array<{
      id: number;
      employee_id: string;
      first_name: string;
      last_name: string;
      email: string | null;
      phone: string | null;
      data_environment: string;
      dept_code: string;
      subjects: string | null;
    }>;

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/" className="mb-4 inline-block text-sm text-cyber-teal hover:text-cyber-cyan">
          ← Back to home
        </Link>
        <h1 className="mb-6 text-4xl font-bold">Faculty Roster</h1>
        <p className="mb-8 text-sm text-slate-400">
          Faculty directory. Records tagged{' '}
          <code className="rounded bg-slate-800 px-1 text-amber-400">DEMO</code> are
          sample/seed records and have not been authorized for production
          display (spec §63).
        </p>
        <div className="space-y-3">
          {faculty.map((f) => (
            <article
              key={f.id}
              className="rounded border border-slate-700 bg-slate-900/50 p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {f.first_name} {f.last_name}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {f.employee_id} · {f.dept_code}
                  </p>
                  {f.subjects && (
                    <p className="mt-2 text-xs text-slate-500">
                      Subjects: {f.subjects}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    f.data_environment === 'PRODUCTION'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : f.data_environment === 'VERIFIED'
                      ? 'bg-cyber-teal/20 text-cyber-teal'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {f.data_environment}
                </span>
              </div>
            </article>
          ))}
          {faculty.length === 0 && <p className="text-slate-500">No faculty defined.</p>}
        </div>
      </div>
    </div>
  );
}
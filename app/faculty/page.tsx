import Link from 'next/link';
import { PublicHeader } from '@/components/public/PublicHeader';
import { getDb } from '@/lib/persistence/db';
import { getPublicSchedules } from '@/lib/modules/mod-03-schedule-engine/service';
import { PublicFooter } from '@/components/public/PublicFooter';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Faculty — TRAC BSIT CSMS',
  description: 'BSIT faculty, the subjects they handle, and their published teaching schedules.',
};

export default async function FacultyPage() {
  const db = await getDb();
  // Public directory: names, department and subjects only. Employee IDs are
  // login usernames and contact details are personal, so neither is shown.
  // Portable SQL (no string_agg) so it also runs on local SQLite.
  const [faculty, assignments, published] = await Promise.all([
    db
      .prepare(
        `SELECT f.id, f.first_name, f.last_name, d.code AS dept_code
         FROM faculty f JOIN departments d ON d.id = f.department_id
         ORDER BY f.last_name, f.first_name`
      )
      .all() as Promise<Array<{ id: number; first_name: string; last_name: string; dept_code: string }>>,
    db
      .prepare(
        `SELECT fs.faculty_id, sub.code FROM faculty_subjects fs
         JOIN subjects sub ON sub.id = fs.subject_id ORDER BY sub.code`
      )
      .all() as Promise<Array<{ faculty_id: number; code: string }>>,
    getPublicSchedules(),
  ]);

  const subjectsOf = new Map<number, string[]>();
  for (const a of assignments) subjectsOf.set(a.faculty_id, [...(subjectsOf.get(a.faculty_id) ?? []), a.code]);
  const classCount = new Map<number, number>();
  for (const e of published) classCount.set(e.faculty_id, (classCount.get(e.faculty_id) ?? 0) + 1);

  return (
    <div className="min-h-screen">
      <PublicHeader active="/faculty" />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-3xl font-bold sm:text-4xl">Faculty</h1>
        <p className="mt-2 text-muted">BSIT instructors, the subjects they handle, and their published class schedules.</p>

        {faculty.length === 0 ? (
          <p className="mt-8 text-muted">No faculty have been added yet.</p>
        ) : (
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {faculty.map((f) => {
              const n = classCount.get(f.id) ?? 0;
              const subjects = subjectsOf.get(f.id) ?? [];
              return (
                <li key={f.id} className="rounded-xl border border-line bg-surface p-4">
                  <h2 className="text-lg font-semibold">
                    {f.first_name} {f.last_name}
                  </h2>
                  <p className="text-sm text-muted">{f.dept_code}</p>
                  {subjects.length > 0 && (
                    <p className="mt-2 text-xs text-muted">Subjects: {subjects.join(', ')}</p>
                  )}
                  {n > 0 ? (
                    <Link
                      href={`/schedules?faculty=${f.id}`}
                      className="mt-3 inline-block text-sm text-lagoon underline-offset-2 hover:underline"
                    >
                      Teaching schedule, {n} classes a week
                    </Link>
                  ) : (
                    <p className="mt-3 text-xs text-muted">No published classes this semester.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}

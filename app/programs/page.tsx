import { getDb } from '@/lib/persistence/db';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Programs — TRAC BSIT CSMS',
};

export default async function ProgramsPage() {
  const db = await getDb();
  const programs = await db
    .prepare(
      `SELECT p.id, p.code, p.name, d.code as dept_code, d.name as dept_name,
              (SELECT COUNT(*) FROM sections s WHERE s.program_id = p.id) as section_count,
              (SELECT COUNT(*) FROM subjects sub WHERE sub.program_id = p.id) as subject_count
       FROM programs p
       JOIN departments d ON d.id = p.department_id
       ORDER BY p.code`
    )
    .all() as Array<{
      id: number;
      code: string;
      name: string;
      dept_code: string;
      dept_name: string;
      section_count: number;
      subject_count: number;
    }>;

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-6 text-4xl font-bold">Programs</h1>
        <p className="mb-8 text-sm text-muted">
          Programs offered under the Institute of Computing Studies.
          Sample data is tagged <code className="rounded bg-surface px-1">DEMO</code> per spec §63.
        </p>
        <div className="space-y-4">
          {programs.map((p) => (
            <article key={p.id} className="rounded border border-line bg-surface p-5">
              <div className="mb-2 flex items-center gap-3">
                <span className="rounded bg-lagoon-50 px-2 py-1 text-xs font-bold text-lagoon">
                  {p.code}
                </span>
                <h2 className="text-xl font-semibold">{p.name}</h2>
              </div>
              <p className="mb-3 text-sm text-muted">
                Department: {p.dept_name} ({p.dept_code})
              </p>
              <p className="text-xs text-muted">
                {p.section_count} section(s) · {p.subject_count} subject(s)
              </p>
            </article>
          ))}
          {programs.length === 0 && (
            <p className="text-muted">No programs defined.</p>
          )}
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
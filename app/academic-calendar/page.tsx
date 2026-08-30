import Link from 'next/link';
import { getDb } from '@/lib/persistence/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Academic Calendar — TRAC BSIT CSMS',
};

export default async function AcademicCalendarPage() {
  const db = getDb();
  const years = db
    .prepare(
      `SELECT id, label, start_date, end_date, is_active
       FROM academic_years
       ORDER BY id DESC`
    )
    .all() as Array<{
      id: number;
      label: string;
      start_date: string | null;
      end_date: string | null;
      is_active: number;
    }>;

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/" className="mb-4 inline-block text-sm text-cyber-teal hover:text-cyber-cyan">
          ← Back to home
        </Link>
        <h1 className="mb-6 text-4xl font-bold">Academic Calendar</h1>
        <p className="mb-8 text-sm text-slate-400">
          Academic years and semesters tracked by the CSMS.
          Per spec §22, there must be only one active/current term for the
          scheduling context.
        </p>
        <div className="space-y-3">
          {years.map((y) => (
            <article
              key={y.id}
              className="flex items-center justify-between rounded border border-slate-700 bg-slate-900/50 p-4"
            >
              <div>
                <h2 className="text-lg font-semibold">
                  Academic Year {y.label}
                </h2>
                {y.start_date && y.end_date && (
                  <p className="text-sm text-slate-400">
                    {y.start_date} → {y.end_date}
                  </p>
                )}
              </div>
              {y.is_active === 1 ? (
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-wide text-emerald-300">
                  Current
                </span>
              ) : (
                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-500">
                  Inactive
                </span>
              )}
            </article>
          ))}
          {years.length === 0 && <p className="text-slate-500">No academic years defined.</p>}
        </div>
      </div>
    </div>
  );
}
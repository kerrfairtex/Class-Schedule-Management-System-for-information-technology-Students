import Link from 'next/link';
import { getDb } from '@/lib/persistence/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Schedules — TRAC BSIT CSMS',
};

interface TermRow {
  id: number;
  label: string;
  name: string;
  is_current: number;
}

export default async function SchedulesPage() {
  const db = getDb();
  // List active/current academic terms
  const terms = db
    .prepare(
      `SELECT ay.id as ay_id, ay.label, ay.is_active as ay_active,
              s.id as sem_id, s.name as sem_name, s.is_active as sem_active
       FROM academic_years ay
       LEFT JOIN semesters s ON s.academic_year_id = ay.id
       ORDER BY ay.id DESC, s.id`
    )
    .all() as Array<{
      ay_id: number;
      label: string;
      ay_active: number;
      sem_id: number;
      sem_name: string;
      sem_active: number;
    }>;

  // Build unique academic-year list (since semesters repeat per year)
  const years = new Map<number, { id: number; label: string; active: number }>();
  for (const r of terms) {
    if (!years.has(r.ay_id)) years.set(r.ay_id, { id: r.ay_id, label: r.label, active: r.ay_active });
  }

  // Per spec §35 + §63: public schedule = status='PUBLISHED' AND
  // data_environment IN ('VERIFIED','PRODUCTION'). DEMO records must never
  // appear in public counts even if accidentally published.
  const published = db
    .prepare(
      `SELECT COUNT(*) as c FROM schedules
       WHERE status = 'PUBLISHED'
         AND data_environment IN ('VERIFIED','PRODUCTION')`
    )
    .get() as { c: number };

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/" className="mb-4 inline-block text-sm text-cyber-teal hover:text-cyber-cyan">
          ← Back to home
        </Link>
        <h1 className="mb-2 text-4xl font-bold">Class Schedules</h1>
        <p className="mb-8 text-slate-400">
          Per spec §35, only PUBLISHED schedules appear publicly.
          Currently <strong className="text-slate-100">{published.c}</strong> schedule(s) have been
          published.
        </p>

        <h2 className="mb-3 text-xl font-semibold">Academic Years</h2>
        <div className="space-y-3">
          {Array.from(years.values()).map((y) => (
            <Link
              key={y.id}
              href={`/schedules/${y.id}`}
              className="block rounded border border-slate-700 bg-slate-900/50 p-4 hover:border-cyber-teal/50"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">{y.label}</span>
                {y.active === 1 ? (
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs uppercase tracking-wide text-emerald-300">
                    Current
                  </span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-xs text-slate-500">
          Schedules appear here only after they have been validated, approved,
          and published by an authorized CSMS administrator (spec §32–§34).
        </p>
      </div>
    </div>
  );
}
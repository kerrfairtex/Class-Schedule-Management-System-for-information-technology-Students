import Link from 'next/link';
import { PublicHeader } from '@/components/public/PublicHeader';
import { getDb } from '@/lib/persistence/db';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Past academic years — TRAC BSIT CSMS' };

export default async function ScheduleArchivePage() {
  const db = await getDb();
  const years = (await db
    .prepare('SELECT id, label, is_active FROM academic_years ORDER BY id DESC')
    .all()) as Array<{ id: number; label: string; is_active: number }>;

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <PublicHeader active="/schedules" />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-3xl font-bold">Schedules by academic year</h1>
        <p className="mt-2 text-slate-400">
          Published class lists for each academic year. For the current timetable by section, use{' '}
          <Link href="/schedules" className="text-cyber-cyan underline">Class Schedules</Link>.
        </p>
        {years.length === 0 ? (
          <p className="mt-8 text-slate-500">No academic years recorded yet.</p>
        ) : (
          <ul className="mt-8 space-y-3">
            {years.map((y) => (
              <li key={y.id}>
                <Link
                  href={`/schedules/${y.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 p-4 hover:border-cyber-teal/50"
                >
                  <span className="text-lg font-medium">A.Y. {y.label}</span>
                  {y.is_active === 1 && (
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs uppercase tracking-wide text-emerald-300">
                      Current
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

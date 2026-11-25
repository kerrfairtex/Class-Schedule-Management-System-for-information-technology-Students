import { getDb } from '@/lib/persistence/db';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Academic Calendar — TRAC BSIT CSMS',
};

export default async function AcademicCalendarPage() {
  const db = await getDb();
  const years = await db
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
    <div className="min-h-screen">
      <PublicHeader active="/academic-calendar" />
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-6 text-4xl font-bold">Academic Calendar</h1>
        <p className="mb-8 text-sm text-muted">
          Academic years and semesters tracked by the CSMS.
          Per spec §22, there must be only one active/current term for the
          scheduling context.
        </p>
        <div className="space-y-3">
          {years.map((y) => (
            <article
              key={y.id}
              className="flex items-center justify-between rounded border border-line bg-surface p-4"
            >
              <div>
                <h2 className="text-lg font-semibold">
                  Academic Year {y.label}
                </h2>
                {y.start_date && y.end_date && (
                  <p className="text-sm text-muted">
                    {y.start_date} to {y.end_date}
                  </p>
                )}
              </div>
              {y.is_active === 1 ? (
                <span className="rounded-full border border-seagrass/40 bg-seagrass-50 px-3 py-1 text-xs text-seagrass">
                  Current
                </span>
              ) : (
                <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">
                  Inactive
                </span>
              )}
            </article>
          ))}
          {years.length === 0 && <p className="text-muted">No academic years defined.</p>}
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
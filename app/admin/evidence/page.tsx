import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/persistence/db';
import { campusNow } from '@/lib/modules/mod-03-schedule-engine/public-timetable';
import { PortalLayout } from '@/components/PortalLayout';
import { ADMIN_NAV, navFor } from '@/lib/domain/navigation';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin · Evidence Dashboard — TRAC BSIT CSMS',
};

const STATUS_LABEL: Record<string, string> = {
  VERIFIED: 'VERIFIED',
  OFFICIAL: 'OFFICIAL',
  GOVERNMENT_SUPPORTED: 'GOVERNMENT',
  CORROBORATED: 'CORROBORATED',
  PENDING_VERIFICATION: 'PENDING VERIFICATION',
  UNVERIFIED: 'UNVERIFIED',
  CONFLICTING: 'CONFLICTING',
  DEPRECATED: 'DEPRECATED',
};

const STATUS_COLOR: Record<string, string> = {
  VERIFIED: 'border-seagrass/40 bg-seagrass-50 text-seagrass',
  OFFICIAL: 'border-lagoon/40 bg-lagoon-50 text-lagoon',
  GOVERNMENT_SUPPORTED: 'border-lagoon/40 bg-lagoon-50 text-lagoon-dark',
  CORROBORATED: 'border-violet-500/40 bg-paper-2 text-ink-soft',
  PENDING_VERIFICATION: 'border-sand-dark/50 bg-sand text-ink',
  UNVERIFIED: 'border-coral/40 bg-coral-50 text-coral',
  CONFLICTING: 'border-coral/40 bg-red-600/10 text-coral',
  DEPRECATED: 'border-line-strong bg-paper-2 text-muted',
};

export default async function AdminEvidencePage() {
  const session = await requireAdmin();
  const db = await getDb();
  const facts = await db
    .prepare(
      `SELECT id, category, key, value, status, confidence, verified_at, review_due_at, NULL AS source_id
       FROM institutional_facts
       ORDER BY status, category, key`
    )
    .all() as Array<{
      id: string;
      category: string;
      key: string;
      value: string;
      status: string;
      confidence: string;
      verified_at: string;
      review_due_at: string | null;
      source_id: string;
    }>;

  const byStatus: Record<string, number> = {};
  for (const f of facts) byStatus[f.status] = (byStatus[f.status] ?? 0) + 1;

  const overdue = await db
    .prepare(
      `SELECT COUNT(*) as c FROM institutional_facts
       WHERE review_due_at IS NOT NULL AND review_due_at < ?`
    )
    // Dates are stored as YYYY-MM-DD text; compare with the campus date.
    .get(campusNow().date) as { c: number };

  return (
    <PortalLayout role="admin" name={session.name} links={navFor(ADMIN_NAV, '/admin/evidence')}>
        <h1 className="mb-2 text-3xl font-bold">Evidence Dashboard</h1>
        <p className="mb-8 text-muted">
          Source-of-Truth overview (spec §66).
        </p>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded border border-line bg-surface p-4">
            <p className="text-xs text-muted">Total Facts</p>
            <p className="mt-2 text-3xl font-bold">{facts.length}</p>
          </div>
          <div className="rounded border border-seagrass/40 bg-seagrass-50 p-4">
            <p className="text-xs text-seagrass">
              Verified / Official
            </p>
            <p className="mt-2 text-3xl font-bold">
              {(byStatus.VERIFIED ?? 0) + (byStatus.OFFICIAL ?? 0)}
            </p>
          </div>
          <div className="rounded border border-sand-dark/50 bg-sand p-4">
            <p className="text-xs text-ink">Pending</p>
            <p className="mt-2 text-3xl font-bold">{byStatus.PENDING_VERIFICATION ?? 0}</p>
          </div>
          <div className="rounded border border-coral/40 bg-coral-50 p-4">
            <p className="text-xs text-coral">Review Overdue</p>
            <p className="mt-2 text-3xl font-bold">{overdue.c}</p>
          </div>
        </div>

        <h2 className="mb-4 text-xl font-semibold">All Facts</h2>
        <div className="space-y-3">
          {facts.map((f) => (
            <article key={f.id} className="rounded border border-line bg-surface p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <code className="text-xs text-muted">{f.id}</code>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs   ${STATUS_COLOR[f.status] ?? ''}`}
                >
                  {STATUS_LABEL[f.status] ?? f.status}
                </span>
                <span className="rounded border border-line px-2 py-0.5 text-xs text-muted">
                  {f.category}
                </span>
                {f.review_due_at && (
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      f.review_due_at < new Date().toISOString().slice(0, 10)
                        ? 'bg-coral-50 text-coral'
                        : 'bg-surface text-muted'
                    }`}
                  >
                    Due: {f.review_due_at}
                  </span>
                )}
              </div>
              <h3 className="mb-1 font-medium">{f.key.replace(/_/g, ' ')}</h3>
              <p className="text-sm text-ink-soft">{f.value}</p>
              <p className="mt-2 text-xs text-muted">
                Source: {f.source_id} · Verified: {f.verified_at}
              </p>
            </article>
          ))}
        </div>
    </PortalLayout>
  );
}

import Link from 'next/link';
import { getDb } from '@/lib/persistence/db';

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
  VERIFIED: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  OFFICIAL: 'border-cyber-teal/40 bg-cyber-teal/10 text-cyber-teal',
  GOVERNMENT_SUPPORTED: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
  CORROBORATED: 'border-violet-500/40 bg-violet-500/10 text-violet-300',
  PENDING_VERIFICATION: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  UNVERIFIED: 'border-red-500/40 bg-red-500/10 text-red-300',
  CONFLICTING: 'border-red-600/40 bg-red-600/10 text-red-400',
  DEPRECATED: 'border-slate-500/40 bg-slate-500/10 text-slate-400',
};

export default async function AdminEvidencePage() {
  const db = getDb();
  const facts = db
    .prepare(
      `SELECT id, category, key, value, status, confidence, verified_at, review_due_at, source_id
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

  const overdue = db
    .prepare(
      `SELECT COUNT(*) as c FROM institutional_facts
       WHERE review_due_at IS NOT NULL AND review_due_at < date('now')`
    )
    .get() as { c: number };

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/login" className="text-sm text-cyber-teal hover:text-cyber-cyan">
            ← Admin Portal
          </Link>
          <Link href="/admin/settings" className="text-sm text-cyber-teal hover:text-cyber-cyan">
            Settings →
          </Link>
        </div>
        <h1 className="mb-2 text-3xl font-bold">Evidence Dashboard</h1>
        <p className="mb-8 text-slate-400">
          Source-of-Truth overview (spec §66).
        </p>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded border border-slate-700 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Facts</p>
            <p className="mt-2 text-3xl font-bold">{facts.length}</p>
          </div>
          <div className="rounded border border-emerald-500/40 bg-emerald-500/10 p-4">
            <p className="text-xs uppercase tracking-wide text-emerald-300">
              Verified / Official
            </p>
            <p className="mt-2 text-3xl font-bold">
              {(byStatus.VERIFIED ?? 0) + (byStatus.OFFICIAL ?? 0)}
            </p>
          </div>
          <div className="rounded border border-amber-500/40 bg-amber-500/10 p-4">
            <p className="text-xs uppercase tracking-wide text-amber-300">Pending</p>
            <p className="mt-2 text-3xl font-bold">{byStatus.PENDING_VERIFICATION ?? 0}</p>
          </div>
          <div className="rounded border border-red-500/40 bg-red-500/10 p-4">
            <p className="text-xs uppercase tracking-wide text-red-300">Review Overdue</p>
            <p className="mt-2 text-3xl font-bold">{overdue.c}</p>
          </div>
        </div>

        <h2 className="mb-4 text-xl font-semibold">All Facts</h2>
        <div className="space-y-3">
          {facts.map((f) => (
            <article key={f.id} className="rounded border border-slate-700 bg-slate-900/50 p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <code className="text-xs text-slate-500">{f.id}</code>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs uppercase tracking-wide ${STATUS_COLOR[f.status] ?? ''}`}
                >
                  {STATUS_LABEL[f.status] ?? f.status}
                </span>
                <span className="rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-400">
                  {f.category}
                </span>
                {f.review_due_at && (
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      f.review_due_at < new Date().toISOString().slice(0, 10)
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    Due: {f.review_due_at}
                  </span>
                )}
              </div>
              <h3 className="mb-1 font-medium">{f.key.replace(/_/g, ' ')}</h3>
              <p className="text-sm text-slate-300">{f.value}</p>
              <p className="mt-2 text-xs text-slate-500">
                Source: {f.source_id} · Verified: {f.verified_at}
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
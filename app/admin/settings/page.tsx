import Link from 'next/link';
import { getDb } from '@/lib/persistence/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin · System Settings — TRAC BSIT CSMS',
};

export default async function AdminSettingsPage() {
  const db = getDb();
  const settings = db
    .prepare(`SELECT key, value, description, updated_at FROM system_settings ORDER BY key`)
    .all() as Array<{ key: string; value: string; description: string | null; updated_at: string }>;

  const tables = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
    )
    .all() as Array<{ name: string }>;

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/login" className="text-sm text-cyber-teal hover:text-cyber-cyan">
            ← Admin Portal
          </Link>
          <Link href="/admin/evidence" className="text-sm text-cyber-teal hover:text-cyber-cyan">
            Evidence →
          </Link>
        </div>
        <h1 className="mb-2 text-3xl font-bold">System Settings</h1>
        <p className="mb-8 text-slate-400">
          Deployment environment and source-of-truth configuration (spec §64).
        </p>

        <h2 className="mb-3 text-lg font-semibold">Settings</h2>
        <div className="mb-8 space-y-2">
          {settings.map((s) => (
            <article key={s.key} className="rounded border border-slate-700 bg-slate-900/50 p-4">
              <div className="flex items-baseline justify-between">
                <code className="text-sm text-cyber-teal">{s.key}</code>
                <span className="text-xs text-slate-500">{s.updated_at}</span>
              </div>
              <p className="mt-1 text-lg font-medium">{s.value}</p>
              {s.description && (
                <p className="mt-1 text-xs text-slate-500">{s.description}</p>
              )}
            </article>
          ))}
        </div>

        <h2 className="mb-3 text-lg font-semibold">Database Tables</h2>
        <p className="mb-4 text-xs text-slate-500">
          {tables.length} tables in the operational + evidence layer.
        </p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {tables.map((t) => (
            <code
              key={t.name}
              className="rounded border border-slate-800 bg-slate-900/30 px-2 py-1 text-xs text-slate-400"
            >
              {t.name}
            </code>
          ))}
        </div>

        <div className="mt-8 border-t border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <p className="font-medium text-amber-300">Production Safety Checklist (spec §65)</p>
          <ul className="mt-2 space-y-1 text-amber-200">
            <li>□ Remove demo faculty (data_environment = DEMO)</li>
            <li>□ Remove demo students</li>
            <li>□ Remove fake rooms</li>
            <li>□ Remove test schedules</li>
            <li>□ Verify institutional name, location, contacts</li>
            <li>□ Verify mission, vision, evidence links</li>
            <li>□ Verify current academic term</li>
            <li>□ Verify published schedules</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
import { requireAdmin } from '@/lib/auth';
import { AdminTopNav } from '@/components/admin/AdminTopNav';
import { DataEnvironmentForm } from '@/components/admin/DataEnvironmentForm';
import { getDb, listAppTables } from '@/lib/persistence/db';
import { getDataEnvironment } from '@/lib/modules/mod-08-database-service/settings';
import { getActiveSemester } from '@/lib/modules/mod-02-master-list/service';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin · System Settings — TRAC BSIT CSMS',
};

export default async function AdminSettingsPage() {
  await requireAdmin();
  const db = await getDb();
  const [settings, tables, dataEnvironment, semester] = await Promise.all([
    db
      .prepare(`SELECT key, value, description, updated_at FROM system_settings ORDER BY key`)
      .all() as Promise<Array<{ key: string; value: string; description: string | null; updated_at: string }>>,
    // Only this app's own tables: the database is shared with other apps.
    listAppTables(),
    getDataEnvironment(),
    getActiveSemester(),
  ]);

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <AdminTopNav current="/admin/settings" />
        <h1 className="mb-2 text-3xl font-bold">System Settings</h1>
        <p className="mb-8 text-slate-400">
          Deployment environment and source-of-truth configuration (spec §64).
        </p>

        <section aria-labelledby="visibility-heading" className="mb-10">
          <h2 id="visibility-heading" className="mb-2 text-lg font-semibold">Public visibility of schedules</h2>
          <p className="mb-4 text-sm text-slate-400">
            The public site shows a class only when it is <strong>Published</strong> and its data is{' '}
            <strong>VERIFIED</strong> or <strong>PRODUCTION</strong>. While the data environment is{' '}
            <strong>DEMO</strong>, published classes reach faculty but stay off the public pages.
          </p>
          <DataEnvironmentForm current={dataEnvironment} semesterName={semester?.name ?? null} />
        </section>

        <h2 className="mb-3 text-lg font-semibold">Settings</h2>
        {settings.length === 0 ? (
          <p className="mb-8 text-sm text-slate-500">No settings recorded yet.</p>
        ) : (
          <div className="mb-8 space-y-2">
            {settings.map((s) => (
              <article key={s.key} className="rounded border border-slate-700 bg-slate-900/50 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <code className="text-sm text-cyber-teal">{s.key}</code>
                  <span className="text-xs text-slate-500">{s.updated_at}</span>
                </div>
                <p className="mt-1 text-lg font-medium">{s.value}</p>
                {s.description && <p className="mt-1 text-xs text-slate-500">{s.description}</p>}
              </article>
            ))}
          </div>
        )}

        <h2 className="mb-3 text-lg font-semibold">CSMS database tables</h2>
        <p className="mb-4 text-xs text-slate-500">
          {tables.length} tables in the CSMS schema. Other apps&apos; tables on the shared database are not listed.
        </p>
        <ul className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {tables.map((name) => (
            <li key={name}>
              <code className="block rounded border border-slate-800 bg-slate-900/30 px-2 py-1 text-xs text-slate-400">
                {name}
              </code>
            </li>
          ))}
        </ul>

        <div className="mt-8 border-t border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <p className="font-medium text-amber-300">Production Safety Checklist (spec §65)</p>
          <ul className="mt-2 space-y-1 text-amber-200">
            <li>□ Remove demo faculty (data_environment = DEMO)</li>
            <li>□ Remove demo student records and any old student logins</li>
            <li>□ Remove fake rooms</li>
            <li>□ Remove test schedules</li>
            <li>□ Verify institutional name, location, contacts</li>
            <li>□ Verify mission, vision, evidence links</li>
            <li>□ Verify current academic term</li>
            <li>□ Verify published schedules, then set the data environment to VERIFIED</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

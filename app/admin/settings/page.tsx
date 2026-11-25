import { requireAdmin } from '@/lib/auth';
import { DataEnvironmentForm } from '@/components/admin/DataEnvironmentForm';
import { getDb, listAppTables } from '@/lib/persistence/db';
import { getDataEnvironment } from '@/lib/modules/mod-08-database-service/settings';
import { getActiveSemester } from '@/lib/modules/mod-02-master-list/service';
import { PortalLayout } from '@/components/PortalLayout';
import { ADMIN_NAV, navFor } from '@/lib/domain/navigation';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin · System Settings — TRAC BSIT CSMS',
};

export default async function AdminSettingsPage() {
  const session = await requireAdmin();
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
    <PortalLayout role="admin" name={session.name} links={navFor(ADMIN_NAV, '/admin/settings')}>
        <h1 className="mb-2 text-3xl font-bold">System Settings</h1>
        <p className="mb-8 text-muted">
          Data environment and system settings.
        </p>

        <section aria-labelledby="visibility-heading" className="mb-10">
          <h2 id="visibility-heading" className="mb-2 text-lg font-semibold">Public visibility of schedules</h2>
          <p className="mb-4 text-sm text-muted">
            The public site shows a class only when it is <strong>Published</strong> and its data is{' '}
            <strong>VERIFIED</strong> or <strong>PRODUCTION</strong>. While the data environment is{' '}
            <strong>DEMO</strong>, published classes reach faculty but stay off the public pages.
          </p>
          <DataEnvironmentForm current={dataEnvironment} semesterName={semester?.name ?? null} />
        </section>

        <h2 className="mb-3 text-lg font-semibold">Settings</h2>
        {settings.length === 0 ? (
          <p className="mb-8 text-sm text-muted">No settings recorded yet.</p>
        ) : (
          <div className="mb-8 space-y-2">
            {settings.map((s) => (
              <article key={s.key} className="rounded border border-line bg-surface p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <code className="text-sm text-lagoon">{s.key}</code>
                  <span className="text-xs text-muted">{s.updated_at}</span>
                </div>
                <p className="mt-1 text-lg font-medium">{s.value}</p>
                {s.description && <p className="mt-1 text-xs text-muted">{s.description}</p>}
              </article>
            ))}
          </div>
        )}

        <h2 className="mb-3 text-lg font-semibold">CSMS database tables</h2>
        <p className="mb-4 text-xs text-muted">
          {tables.length} tables in the CSMS schema. Other apps&apos; tables on the shared database are not listed.
        </p>
        <ul className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {tables.map((name) => (
            <li key={name}>
              <code className="block rounded border border-line bg-surface px-2 py-1 text-xs text-muted">
                {name}
              </code>
            </li>
          ))}
        </ul>

        <div className="mt-8 border-t border-sand-dark/50 bg-sand p-4 text-sm">
          <p className="font-medium text-ink">Before going live</p>
          <ul className="mt-2 space-y-1 text-ink">
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
    </PortalLayout>
  );
}

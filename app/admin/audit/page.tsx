import Link from 'next/link';
import { PortalLayout } from '@/components/PortalLayout';
import { requireAdmin } from '@/lib/auth';
import { getAuditPage } from '@/lib/modules/mod-08-database-service/audit';
import { ADMIN_NAV, navFor } from '@/lib/domain/navigation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Audit log — TRAC BSIT admin' };

const PAGE_SIZE = 50;

interface PageProps {
  searchParams: Promise<{ action?: string; entity?: string; page?: string }>;
}

const readable = (s: string) => s.replace(/_/g, ' ').toLowerCase();

export default async function AuditPage({ searchParams }: PageProps) {
  const session = await requireAdmin();
  const params = await searchParams;
  const page = Math.max(Number(params.page) || 1, 1);
  const { entries, total, actions, entityTypes } = await getAuditPage({
    action: params.action || undefined,
    entityType: params.entity || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const hrefFor = (p: number) => {
    const q = new URLSearchParams();
    if (params.action) q.set('action', params.action);
    if (params.entity) q.set('entity', params.entity);
    if (p > 1) q.set('page', String(p));
    const s = q.toString();
    return `/admin/audit${s ? `?${s}` : ''}`;
  };

  return (
    <PortalLayout role="admin" name={session.name} links={navFor(ADMIN_NAV, '/admin/audit')}>
      <h1 className="page-title">Audit log</h1>
      <p className="page-lead">Every change made through the system, newest first. Entries cannot be edited.</p>

      <form action="/admin/audit" method="get" className="filter-toolbar mt-6 flex flex-wrap items-end gap-3">
        <label>
          <span className="label-field">Action</span>
          <select name="action" defaultValue={params.action ?? ''} className="select-field">
            <option value="">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>{readable(a)}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="label-field">Record type</span>
          <select name="entity" defaultValue={params.entity ?? ''} className="select-field">
            <option value="">All records</option>
            {entityTypes.map((t) => (
              <option key={t} value={t}>{readable(t)}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn-primary">Filter</button>
        {(params.action || params.entity) && (
          <Link href="/admin/audit" className="btn-ghost">Clear</Link>
        )}
      </form>

      <p className="mt-4 text-sm text-muted" role="status">
        {total} entr{total === 1 ? 'y' : 'ies'}
        {pages > 1 && `, page ${page} of ${pages}`}
      </p>

      {entries.length === 0 ? (
        <p className="mt-4 text-muted">No entries match.</p>
      ) : (
        <div className="mt-2 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="data-table min-w-[720px]">
            <caption className="sr-only">Audit log entries</caption>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Who</th>
                <th scope="col">Action</th>
                <th scope="col">Record</th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap text-muted">
                    <time dateTime={e.created_at}>{String(e.created_at).slice(0, 16).replace('T', ' ')}</time>
                  </td>
                  <td>{e.username ?? <span className="text-muted">system</span>}</td>
                  <td className="font-semibold">{readable(e.action)}</td>
                  <td>
                    {e.entity_type ? readable(e.entity_type) : ''}
                    {e.entity_id ? ` #${e.entity_id}` : ''}
                  </td>
                  <td className="max-w-md break-words text-ink-soft">{e.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex gap-3">
          {page > 1 && <Link className="btn-secondary" href={hrefFor(page - 1)}>Newer</Link>}
          {page < pages && <Link className="btn-secondary" href={hrefFor(page + 1)}>Older</Link>}
        </nav>
      )}
    </PortalLayout>
  );
}

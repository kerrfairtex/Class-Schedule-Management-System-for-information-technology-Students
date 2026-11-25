import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/persistence/db';
import { PortalLayout } from '@/components/PortalLayout';
import { ADMIN_NAV, navFor } from '@/lib/domain/navigation';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin · Schedules — TRAC BSIT CSMS',
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING REVIEW',
  APPROVED: 'APPROVED',
  PUBLISHED: 'PUBLISHED',
  CANCELLED: 'CANCELLED',
  ARCHIVED: 'ARCHIVED',
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'border-line-strong bg-paper-2 text-ink-soft',
  PENDING_REVIEW: 'border-sand-dark/50 bg-sand text-ink',
  APPROVED: 'border-lagoon/40 bg-lagoon-50 text-lagoon-dark',
  PUBLISHED: 'border-seagrass/40 bg-seagrass-50 text-seagrass',
  CANCELLED: 'border-coral/40 bg-coral-50 text-coral',
  ARCHIVED: 'border-line bg-surface text-muted',
};

export default async function AdminSchedulesPage() {
  const session = await requireAdmin();
  const db = await getDb();
  const activeSemester = await db
    .prepare(`SELECT id, name FROM semesters WHERE is_active = 1`)
    .get() as { id: number; name: string } | undefined;

  const schedules = activeSemester
    ? (await db
        .prepare(
          `SELECT s.id, s.status, s.published_at, s.approved_by,
                  sub.code as subject_code, sub.name as subject_name,
                  f.first_name || ' ' || f.last_name as faculty_name,
                  r.code as room_code, r.capacity as room_capacity,
                  sec.code as section_code, sec.capacity as section_capacity,
                  s.day_of_week, s.start_time, s.end_time,
                  sec.data_environment, r.data_environment as room_de
           FROM schedules s
           JOIN subjects sub ON sub.id = s.subject_id
           JOIN faculty f ON f.id = s.faculty_id
           JOIN rooms r ON r.id = s.room_id
           JOIN sections sec ON sec.id = s.section_id
           WHERE s.semester_id = ?
           ORDER BY s.day_of_week, s.start_time`
        )
        .all(activeSemester.id) as Array<{
          id: number;
          status: string;
          published_at: string | null;
          approved_by: string | null;
          subject_code: string;
          subject_name: string;
          faculty_name: string;
          room_code: string;
          room_capacity: number;
          section_code: string;
          section_capacity: number;
          day_of_week: string;
          start_time: string;
          end_time: string;
          data_environment: string;
          room_de: string;
        }>)
    : [];

  // Aggregate counts by status
  const byStatus: Record<string, number> = {};
  for (const s of schedules) byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;

  return (
    <PortalLayout role="admin" name={session.name} links={navFor(ADMIN_NAV, '/admin/schedules')}>
        <h1 className="mb-2 text-3xl font-bold">Schedule Management</h1>
        <p className="mb-2 text-muted">
          Active semester: <strong>{activeSemester?.name ?? 'None'}</strong>
        </p>
        <p className="mb-8 text-sm text-muted">
          Classes move from draft to pending review, approved, then published.
          PUBLISHED requires zero blocking conflicts.
        </p>

        <div className="mb-8 grid gap-3 md:grid-cols-6">
          {Object.entries(STATUS_LABEL).map(([key, label]) => (
            <div
              key={key}
              className={`rounded border p-3 text-center ${STATUS_COLOR[key]}`}
            >
              <p className="text-xs">{label}</p>
              <p className="mt-1 text-2xl font-bold">{byStatus[key] ?? 0}</p>
            </div>
          ))}
        </div>

        {schedules.length === 0 ? (
          <div className="rounded border border-sand-dark/50 bg-sand p-4 text-sm text-ink">
            <strong>No schedules yet.</strong> Use the Schedule Board to create
            draft schedules. They will appear here as DRAFT until they are
            transitioned through the approval workflow.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Day</th>
                  <th>Time</th>
                  <th>Subject</th>
                  <th>Section</th>
                  <th>Faculty</th>
                  <th>Room</th>
                  <th>Data</th>
                  <th>Published</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.id}>
                    <td className="text-muted">#{s.id}</td>
                    <td>
                      <span className={`rounded px-2 py-0.5 text-xs ${STATUS_COLOR[s.status]}`}>
                        {STATUS_LABEL[s.status] ?? s.status}
                      </span>
                    </td>
                    <td className="capitalize">{s.day_of_week}</td>
                    <td className="text-muted">
                      {s.start_time}–{s.end_time}
                    </td>
                    <td>
                      <strong>{s.subject_code}</strong> {s.subject_name}
                    </td>
                    <td>{s.section_code}</td>
                    <td>{s.faculty_name}</td>
                    <td>
                      {s.room_code} <span className="text-xs text-muted">({s.section_capacity}/{s.room_capacity})</span>
                    </td>
                    <td>
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          s.data_environment === 'PRODUCTION'
                            ? 'bg-seagrass-50 text-seagrass'
                            : s.data_environment === 'VERIFIED'
                            ? 'bg-lagoon-50 text-lagoon'
                            : 'bg-sand text-ink'
                        }`}
                      >
                        {s.data_environment}
                      </span>
                    </td>
                    <td className="text-xs text-muted">
                      {s.published_at ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </PortalLayout>
  );
}

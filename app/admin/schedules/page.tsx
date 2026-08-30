import Link from 'next/link';
import { getDb } from '@/lib/persistence/db';

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
  DRAFT: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
  PENDING_REVIEW: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  APPROVED: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
  PUBLISHED: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  CANCELLED: 'border-red-500/40 bg-red-500/10 text-red-300',
  ARCHIVED: 'border-slate-700 bg-slate-800 text-slate-500',
};

export default async function AdminSchedulesPage() {
  const db = getDb();
  const activeSemester = db
    .prepare(`SELECT id, name FROM semesters WHERE is_active = 1`)
    .get() as { id: number; name: string } | undefined;

  const schedules = activeSemester
    ? (db
        .prepare(
          `SELECT s.id, s.status, s.published_at, s.approved_by,
                  sub.code as subject_code, sub.name as subject_name,
                  f.first_name || ' ' || f.last_name as faculty_name,
                  r.code as room_code, r.capacity as room_capacity,
                  sec.code as section_code, sec.capacity as section_capacity,
                  ts.day_of_week, ts.start_time, ts.end_time,
                  sec.data_environment, r.data_environment as room_de
           FROM schedules s
           JOIN subjects sub ON sub.id = s.subject_id
           JOIN faculty f ON f.id = s.faculty_id
           JOIN rooms r ON r.id = s.room_id
           JOIN sections sec ON sec.id = s.section_id
           JOIN time_slots ts ON ts.id = s.time_slot_id
           WHERE s.semester_id = ?
           ORDER BY ts.day_of_week, ts.start_time`
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
    <div className="min-h-screen bg-midnight text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/login" className="text-sm text-cyber-teal hover:text-cyber-cyan">
            ← Admin Portal
          </Link>
          <Link href="/admin/conflicts" className="text-sm text-cyber-teal hover:text-cyber-cyan">
            Conflicts →
          </Link>
        </div>
        <h1 className="mb-2 text-3xl font-bold">Schedule Management</h1>
        <p className="mb-2 text-slate-400">
          Active semester: <strong>{activeSemester?.name ?? 'None'}</strong>
        </p>
        <p className="mb-8 text-sm text-slate-500">
          Spec §32–§34: status workflow DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED.
          PUBLISHED requires zero blocking conflicts.
        </p>

        <div className="mb-8 grid gap-3 md:grid-cols-6">
          {Object.entries(STATUS_LABEL).map(([key, label]) => (
            <div
              key={key}
              className={`rounded border p-3 text-center ${STATUS_COLOR[key]}`}
            >
              <p className="text-xs uppercase tracking-wide">{label}</p>
              <p className="mt-1 text-2xl font-bold">{byStatus[key] ?? 0}</p>
            </div>
          ))}
        </div>

        {schedules.length === 0 ? (
          <div className="rounded border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-300">
            <strong>No schedules yet.</strong> Use the Schedule Board to create
            draft schedules. They will appear here as DRAFT until they are
            transitioned through the approval workflow.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-700 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Day</th>
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Subject</th>
                  <th className="py-2 pr-4">Section</th>
                  <th className="py-2 pr-4">Faculty</th>
                  <th className="py-2 pr-4">Room</th>
                  <th className="py-2 pr-4">Data</th>
                  <th className="py-2 pr-4">Published</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.id} className="border-b border-slate-800">
                    <td className="py-2 pr-4 font-mono text-slate-500">#{s.id}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded px-2 py-0.5 text-xs ${STATUS_COLOR[s.status]}`}>
                        {STATUS_LABEL[s.status] ?? s.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4 capitalize">{s.day_of_week}</td>
                    <td className="py-2 pr-4 text-slate-400">
                      {s.start_time}–{s.end_time}
                    </td>
                    <td className="py-2 pr-4">
                      <strong>{s.subject_code}</strong> {s.subject_name}
                    </td>
                    <td className="py-2 pr-4">{s.section_code}</td>
                    <td className="py-2 pr-4">{s.faculty_name}</td>
                    <td className="py-2 pr-4">
                      {s.room_code} <span className="text-xs text-slate-500">({s.section_capacity}/{s.room_capacity})</span>
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          s.data_environment === 'PRODUCTION'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : s.data_environment === 'VERIFIED'
                            ? 'bg-cyber-teal/20 text-cyber-teal'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {s.data_environment}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-xs text-slate-500">
                      {s.published_at ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
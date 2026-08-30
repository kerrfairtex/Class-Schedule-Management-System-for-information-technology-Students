import Link from 'next/link';
import { getDb } from '@/lib/persistence/db';
import { detectAllConflictsInSemester } from '@/lib/modules/mod-04-conflict-engine/validator';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin · Conflicts — TRAC BSIT CSMS',
};

export default async function AdminConflictsPage() {
  const db = getDb();
  const activeSemester = db
    .prepare(`SELECT id, name FROM semesters WHERE is_active = 1`)
    .get() as { id: number; name: string } | undefined;

  const conflicts = activeSemester
    ? detectAllConflictsInSemester(activeSemester.id)
    : [];

  // Hydrate details for display
  type Detail = {
    scheduleId: number;
    day: string;
    time: string;
    subject: string;
    section: string;
    faculty: string;
    room: string;
    conflicts: Array<{
      kind: string;
      message: string;
      blocking: boolean;
      conflictingScheduleId?: number;
    }>;
  };

  const details: Detail[] = conflicts.map((c) => {
    const row = db
      .prepare(
        `SELECT s.id, ts.day_of_week, ts.start_time, ts.end_time,
                sub.code as subject_code, sec.code as section_code,
                f.first_name || ' ' || f.last_name as faculty_name,
                r.code as room_code
         FROM schedules s
         JOIN time_slots ts ON ts.id = s.time_slot_id
         JOIN subjects sub ON sub.id = s.subject_id
         JOIN sections sec ON sec.id = s.section_id
         JOIN faculty f ON f.id = s.faculty_id
         JOIN rooms r ON r.id = s.room_id
         WHERE s.id = ?`
      )
      .get(c.scheduleId) as {
        id: number;
        day_of_week: string;
        start_time: string;
        end_time: string;
        subject_code: string;
        section_code: string;
        faculty_name: string;
        room_code: string;
      };
    return {
      scheduleId: c.scheduleId,
      day: row.day_of_week,
      time: `${row.start_time}–${row.end_time}`,
      subject: row.subject_code,
      section: row.section_code,
      faculty: row.faculty_name,
      room: row.room_code,
      conflicts: c.conflicts,
    };
  });

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/login" className="text-sm text-cyber-teal hover:text-cyber-cyan">
            ← Admin Portal
          </Link>
          <Link href="/admin/schedules" className="text-sm text-cyber-teal hover:text-cyber-cyan">
            Schedules →
          </Link>
        </div>
        <h1 className="mb-2 text-3xl font-bold">Conflict Detection</h1>
        <p className="mb-8 text-slate-400">
          Active semester: <strong>{activeSemester?.name ?? 'None'}</strong>
        </p>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded border border-red-500/40 bg-red-500/10 p-4">
            <p className="text-xs uppercase tracking-wide text-red-300">
              Schedules With Blocking Conflicts
            </p>
            <p className="mt-2 text-3xl font-bold">{details.length}</p>
          </div>
          <div className="rounded border border-emerald-500/40 bg-emerald-500/10 p-4">
            <p className="text-xs uppercase tracking-wide text-emerald-300">
              Validation Required
            </p>
            <p className="mt-2 text-sm">
              Schedules with blocking conflicts cannot transition to{' '}
              <code className="rounded bg-slate-800 px-1">PUBLISHED</code> (spec §34).
            </p>
          </div>
          <div className="rounded border border-slate-700 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Conflict Categories
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              faculty · room · section · capacity · availability
            </p>
          </div>
        </div>

        {details.length === 0 ? (
          <div className="rounded border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            <strong>No blocking conflicts detected.</strong> Schedules in the
            active semester are conflict-free.
          </div>
        ) : (
          <div className="space-y-4">
            {details.map((d) => (
              <article key={d.scheduleId} className="rounded border border-red-500/40 bg-red-500/5 p-4">
                <div className="mb-2 flex items-center gap-3">
                  <code className="text-sm text-red-300">#{d.scheduleId}</code>
                  <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs uppercase tracking-wide text-red-300">
                    Blocking
                  </span>
                  <span className="text-xs text-slate-400">
                    {d.day} {d.time}
                  </span>
                </div>
                <p className="mb-2 text-sm">
                  <strong>{d.subject}</strong> · {d.section} · {d.faculty} · {d.room}
                </p>
                <ul className="space-y-1 text-sm text-red-300">
                  {d.conflicts.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-red-500" />
                      <span>
                        <code className="rounded bg-slate-800 px-1 text-xs">{c.kind}</code>{' '}
                        {c.message}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
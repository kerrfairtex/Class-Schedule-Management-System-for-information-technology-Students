import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/persistence/db';
import { detectAllConflictsInSemester } from '@/lib/modules/mod-04-conflict-engine/validator';
import { PortalLayout } from '@/components/PortalLayout';
import { ADMIN_NAV, navFor } from '@/lib/domain/navigation';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin · Conflicts — TRAC BSIT CSMS',
};

export default async function AdminConflictsPage() {
  const session = await requireAdmin();
  const db = await getDb();
  const activeSemester = await db
    .prepare(`SELECT id, name FROM semesters WHERE is_active = 1`)
    .get() as { id: number; name: string } | undefined;

  const conflicts = activeSemester
    ? await detectAllConflictsInSemester(activeSemester.id)
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

  const details: Detail[] = await Promise.all(conflicts.map(async (c) => {
    const row = await db
      .prepare(
        `SELECT s.id, s.day_of_week, s.start_time, s.end_time,
                sub.code as subject_code, sec.code as section_code,
                f.first_name || ' ' || f.last_name as faculty_name,
                r.code as room_code
         FROM schedules s
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
  }));

  return (
    <PortalLayout role="admin" name={session.name} links={navFor(ADMIN_NAV, '/admin/conflicts')}>
        <h1 className="mb-2 text-3xl font-bold">Conflict Detection</h1>
        <p className="mb-8 text-muted">
          Active semester: <strong>{activeSemester?.name ?? 'None'}</strong>
        </p>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded border border-coral/40 bg-coral-50 p-4">
            <p className="text-xs text-coral">
              Schedules With Blocking Conflicts
            </p>
            <p className="mt-2 text-3xl font-bold">{details.length}</p>
          </div>
          <div className="rounded border border-seagrass/40 bg-seagrass-50 p-4">
            <p className="text-xs text-seagrass">
              Validation Required
            </p>
            <p className="mt-2 text-sm">
              Schedules with blocking conflicts cannot transition to{' '}
              <code className="rounded bg-surface px-1">PUBLISHED</code>.
            </p>
          </div>
          <div className="rounded border border-line bg-surface p-4">
            <p className="text-xs text-muted">
              Conflict Categories
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              faculty · room · section · capacity · availability
            </p>
          </div>
        </div>

        {details.length === 0 ? (
          <div className="rounded border border-seagrass/40 bg-seagrass-50 p-4 text-sm text-seagrass">
            <strong>No blocking conflicts detected.</strong> Schedules in the
            active semester are conflict-free.
          </div>
        ) : (
          <div className="space-y-4">
            {details.map((d) => (
              <article key={d.scheduleId} className="rounded border border-coral/40 bg-coral-50 p-4">
                <div className="mb-2 flex items-center gap-3">
                  <code className="text-sm text-coral">#{d.scheduleId}</code>
                  <span className="rounded bg-coral-50 px-2 py-0.5 text-xs text-coral">
                    Blocking
                  </span>
                  <span className="text-xs text-muted">
                    {d.day} {d.time}
                  </span>
                </div>
                <p className="mb-2 text-sm">
                  <strong>{d.subject}</strong> · {d.section} · {d.faculty} · {d.room}
                </p>
                <ul className="space-y-1 text-sm text-coral">
                  {d.conflicts.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-red-500" />
                      <span>
                        <code className="rounded bg-surface px-1 text-xs">{c.kind}</code>{' '}
                        {c.message}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
    </PortalLayout>
  );
}

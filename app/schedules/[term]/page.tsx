import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/persistence/db';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ term: string }>;
}

export default async function TermSchedules({ params }: PageProps) {
  const { term } = await params;
  const yearId = Number(term);
  if (!Number.isFinite(yearId)) notFound();

  const db = getDb();
  const year = db
    .prepare(`SELECT id, label, is_active FROM academic_years WHERE id = ?`)
    .get(yearId) as { id: number; label: string; is_active: number } | undefined;
  if (!year) notFound();

  const semesters = db
    .prepare(`SELECT id, name, is_active FROM semesters WHERE academic_year_id = ?`)
    .all(yearId) as Array<{ id: number; name: string; is_active: number }>;

  // Spec §35: only PUBLISHED schedules. Spec §63: only data_environment IN
  // (VERIFIED, PRODUCTION) — DEMO records must never appear in public schedules.
  const published = db
    .prepare(
      `SELECT s.id, sub.code as subject_code, sub.name as subject_name,
              f.first_name || ' ' || f.last_name as faculty_name,
              r.code as room_code, ts.start_time, ts.end_time, ts.day_of_week,
              s.status, s.data_environment
       FROM schedules s
       JOIN subjects sub ON sub.id = s.subject_id
       JOIN faculty f ON f.id = s.faculty_id
       JOIN rooms r ON r.id = s.room_id
       JOIN time_slots ts ON ts.id = s.time_slot_id
       WHERE s.semester_id IN (${semesters.map((s) => s.id).join(',') || 'NULL'})
         AND s.status = 'PUBLISHED'
         AND s.data_environment IN ('VERIFIED','PRODUCTION')
       ORDER BY ts.day_of_week, ts.start_time`
    )
    .all() as Array<{
      id: number;
      subject_code: string;
      subject_name: string;
      faculty_name: string;
      room_code: string;
      start_time: string;
      end_time: string;
      day_of_week: string;
      status: string;
      data_environment: string;
    }>;

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Link href="/schedules" className="mb-4 inline-block text-sm text-cyber-teal hover:text-cyber-cyan">
          ← All academic years
        </Link>
        <h1 className="mb-2 text-4xl font-bold">{year.label}</h1>
        <p className="mb-8 text-slate-400">
          {semesters.map((s) => s.name).join(' · ')}
        </p>

        {published.length === 0 ? (
          <div className="rounded border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-300">
            <strong>No PUBLISHED schedules.</strong> Schedules appear here
            only after validation and approval (spec §32–§35). The current
            seed data is <code className="rounded bg-slate-800 px-1">DEMO</code> and has not
            been authorized for public display.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-700 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="py-2 pr-4">Day</th>
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Subject</th>
                <th className="py-2 pr-4">Faculty</th>
                <th className="py-2 pr-4">Room</th>
              </tr>
            </thead>
            <tbody>
              {published.map((p) => (
                <tr key={p.id} className="border-b border-slate-800">
                  <td className="py-2 pr-4 capitalize">{p.day_of_week}</td>
                  <td className="py-2 pr-4">{p.start_time}–{p.end_time}</td>
                  <td className="py-2 pr-4">{p.subject_code} {p.subject_name}</td>
                  <td className="py-2 pr-4">{p.faculty_name}</td>
                  <td className="py-2 pr-4">{p.room_code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
import Link from 'next/link';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/persistence/db';
import { scheduleVisibilitySql } from '@/lib/modules/mod-03-schedule-engine/visibility';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ term: string }>;
}

export default async function TermSchedules({ params }: PageProps) {
  const { term } = await params;
  const yearId = Number(term);
  if (!Number.isFinite(yearId)) notFound();

  const db = await getDb();
  const year = await db
    .prepare(`SELECT id, label, is_active FROM academic_years WHERE id = ?`)
    .get(yearId) as { id: number; label: string; is_active: number } | undefined;
  if (!year) notFound();

  const semesters = await db
    .prepare(`SELECT id, name, is_active FROM semesters WHERE academic_year_id = ?`)
    .all(yearId) as Array<{ id: number; name: string; is_active: number }>;

  // Spec §35: only PUBLISHED schedules. Spec §63: only data_environment IN
  // (VERIFIED, PRODUCTION) — DEMO records must never appear in public schedules.
  const published = await db
    .prepare(
      `SELECT s.id, sec.code as section_code, sub.code as subject_code, sub.name as subject_name,
              f.first_name || ' ' || f.last_name as faculty_name,
              r.code as room_code, ts.start_time, ts.end_time, ts.day_of_week,
              s.status, s.data_environment
       FROM schedules s
       JOIN sections sec ON sec.id = s.section_id
       JOIN subjects sub ON sub.id = s.subject_id
       JOIN faculty f ON f.id = s.faculty_id
       JOIN rooms r ON r.id = s.room_id
       JOIN time_slots ts ON ts.id = s.time_slot_id
       JOIN semesters sem ON sem.id = s.semester_id
       WHERE sem.academic_year_id = ?
         AND ${scheduleVisibilitySql('public')}
       ORDER BY sec.code, ts.day_of_week, ts.start_time`
    )
    .all(yearId) as Array<{
      id: number;
      section_code: string;
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
    <div className="min-h-screen">
      <PublicHeader active="/schedules" />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/schedules/archive" className="link text-sm">
          All academic years
        </Link>
        <h1 className="page-title mt-2">A.Y. {year.label}</h1>
        <p className="page-lead mb-8">{semesters.map((s) => s.name).join(', ')}</p>

        {published.length === 0 ? (
          <p className="notice-warning max-w-prose">
            No classes have been published for this academic year. Schedules appear here after the department
            approves and publishes them.
          </p>
        ) : (
          <div className="overflow-x-auto">
          <table className="data-table min-w-[640px]">
            <thead>
              <tr>
                <th>Section</th>
                <th>Day</th>
                <th>Time</th>
                <th>Subject</th>
                <th>Faculty</th>
                <th>Room</th>
              </tr>
            </thead>
            <tbody>
              {published.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.section_code}</td>
                  <td className="capitalize">{p.day_of_week}</td>
                  <td>{p.start_time}–{p.end_time}</td>
                  <td>{p.subject_code} {p.subject_name}</td>
                  <td>{p.faculty_name}</td>
                  <td>{p.room_code}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
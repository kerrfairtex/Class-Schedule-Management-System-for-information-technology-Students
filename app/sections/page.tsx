import DetailPage, { Item } from '@/components/glance/DetailPage';
import { getDb } from '@/lib/persistence/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Class Sections Scheduled — TRAC BSIT CSMS' };

export default async function Page() {
  const db = await getDb();
  const rows = (await db
    .prepare(
      `SELECT sch.id, sec.code AS section_code, sec.year_level,
              sub.code AS subject_code, sub.name AS subject_name,
              f.first_name, f.last_name,
              ts.day_of_week, ts.start_time, ts.end_time,
              r.code AS room_code
       FROM schedules sch
       JOIN sections sec ON sec.id = sch.section_id
       JOIN subjects sub ON sub.id = sch.subject_id
       JOIN faculty f ON f.id = sch.faculty_id
       JOIN time_slots ts ON ts.id = sch.time_slot_id
       JOIN rooms r ON r.id = sch.room_id
       ORDER BY sec.code, sub.code, ts.start_time`
    )
    .all()) as Array<{
      id: number; section_code: string; year_level: number;
      subject_code: string; subject_name: string; first_name: string; last_name: string;
      day_of_week: string; start_time: string; end_time: string; room_code: string;
    }>;

  const items: Item[] = rows.map(r => ({
    id: r.id,
    title: `${r.section_code} · ${r.subject_code} · ${r.subject_name}`,
    meta: `${r.day_of_week.charAt(0).toUpperCase()}${r.day_of_week.slice(1)} ${r.start_time}–${r.end_time} · ${r.room_code} · ${r.first_name} ${r.last_name}`,
    tag: `Year ${r.year_level}`,
  }));
  return <DetailPage title="Class Sections Scheduled" subtitle="All scheduled classes this term" items={items} />;
}

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
              f.first_name, f.last_name
       FROM schedules sch
       JOIN sections sec ON sec.id = sch.section_id
       JOIN subjects sub ON sub.id = sch.subject_id
       JOIN faculty f ON f.id = sch.faculty_id
       ORDER BY sec.code, sub.code`
    )
    .all()) as Array<{
      id: number; section_code: string; year_level: number;
      subject_code: string; subject_name: string; first_name: string; last_name: string;
    }>;

  const items: Item[] = rows.map(r => ({
    id: r.id,
    title: `${r.section_code} · ${r.subject_code}`,
    meta: `${r.subject_name} · ${r.first_name} ${r.last_name}`,
    tag: `Year ${r.year_level}`,
  }));
  return <DetailPage title="Class Sections Scheduled" subtitle="All scheduled classes this term" items={items} />;
}

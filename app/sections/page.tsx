import DetailPage, { Item } from '@/components/glance/DetailPage';
import { getPublicSchedules } from '@/lib/modules/mod-03-schedule-engine/service';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Class Sections Scheduled — TRAC BSIT CSMS' };

const capitalize = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

export default async function Page() {
  // Public page: only PUBLISHED, non-DEMO classes of the active semester
  // (spec §35, §63). Drafts stay on the admin Schedule Board.
  const rows = await getPublicSchedules();

  const items: Item[] = rows.map((r) => ({
    id: r.id,
    title: `${r.section_code} · ${r.subject_code} · ${r.subject_name}`,
    meta: `${capitalize(r.day_of_week)} ${r.start_time}–${r.end_time} · ${r.room_code} · ${r.faculty_name}`,
    tag: `Year ${r.year_level}`,
  }));
  return (
    <DetailPage
      title="Class Sections Scheduled"
      subtitle="Published classes this semester"
      items={items}
      emptyText="No class schedules have been published for this semester yet. Check back after the department releases the official timetable."
    />
  );
}

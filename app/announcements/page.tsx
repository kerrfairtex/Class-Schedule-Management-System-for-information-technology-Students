import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { AnnouncementList } from '@/components/public/AnnouncementList';
import { campusNow } from '@/lib/modules/mod-03-schedule-engine/public-timetable';
import { listCurrentAnnouncements } from '@/lib/modules/mod-10-announcements/service';
import { readIfMigrated } from '@/lib/persistence/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Announcements — TRAC BSIT',
  description: 'Current notices from the BSIT department: schedule changes, class suspensions, enrollment.',
};

export default async function AnnouncementsPage() {
  const { date } = campusNow();
  const items = await readIfMigrated(() => listCurrentAnnouncements(date, 50), [], 'announcements');
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="page-title">Announcements</h1>
        <p className="page-lead">Notices from the BSIT department. Pinned notices come first.</p>
        <AnnouncementList items={items} empty="There are no announcements right now." />
      </main>
      <PublicFooter />
    </div>
  );
}

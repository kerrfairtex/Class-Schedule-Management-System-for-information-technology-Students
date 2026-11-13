import DetailPage, { Item } from '@/components/glance/DetailPage';
import { getDb } from '@/lib/persistence/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Courses Offered — TRAC BSIT CSMS' };

export default async function Page() {
  const db = await getDb();
  const rows = (await db
    .prepare(`SELECT id, code, name, credit_hours FROM subjects ORDER BY code`)
    .all()) as Array<{ id: number; code: string; name: string; credit_hours: number }>;

  const items: Item[] = rows.map(r => ({
    id: r.id,
    title: `${r.code} · ${r.name}`,
    meta: `${r.credit_hours} credit hours`,
  }));
  return <DetailPage title="Courses Offered" subtitle="Subjects in the BSIT curriculum" items={items} />;
}

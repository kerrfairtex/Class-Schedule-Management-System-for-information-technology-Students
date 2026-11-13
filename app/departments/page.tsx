import DetailPage, { Item } from '@/components/glance/DetailPage';
import { getDb } from '@/lib/persistence/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Academic Departments — TRAC BSIT CSMS' };

export default async function Page() {
  const db = await getDb();
  const rows = (await db
    .prepare(
      `SELECT d.id, d.code, d.name,
              (SELECT COUNT(*) FROM faculty f WHERE f.department_id = d.id) AS faculty_count
       FROM departments d
       ORDER BY d.code`
    )
    .all()) as Array<{ id: number; code: string; name: string; faculty_count: number | string }>;

  const items: Item[] = rows.map(r => ({
    id: r.id,
    title: `${r.code} · ${r.name}`,
    meta: `${Number(r.faculty_count)} faculty`,
  }));
  return <DetailPage title="Academic Departments" subtitle="Departments under TRAC BSIT" items={items} />;
}

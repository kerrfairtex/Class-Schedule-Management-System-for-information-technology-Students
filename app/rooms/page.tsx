import Link from 'next/link';
import { getDb } from '@/lib/persistence/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Rooms — TRAC BSIT CSMS',
};

export default async function RoomsPage() {
  const db = getDb();
  const rooms = db
    .prepare(
      `SELECT r.id, r.code, r.name, r.capacity, r.data_environment,
              b.code as building_code, b.name as building_name
       FROM rooms r
       JOIN buildings b ON b.id = r.building_id
       ORDER BY b.code, r.code`
    )
    .all() as Array<{
      id: number;
      code: string;
      name: string;
      capacity: number;
      data_environment: string;
      building_code: string;
      building_name: string;
    }>;

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/" className="mb-4 inline-block text-sm text-cyber-teal hover:text-cyber-cyan">
          ← Back to home
        </Link>
        <h1 className="mb-6 text-4xl font-bold">Rooms & Facilities</h1>
        <p className="mb-8 text-sm text-slate-400">
          Room inventory. Per spec §29, room attributes must not be invented;
          sample records are tagged <code className="rounded bg-slate-800 px-1">DEMO</code>.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-700 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="py-2 pr-4">Code</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Building</th>
                <th className="py-2 pr-4">Capacity</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id} className="border-b border-slate-800">
                  <td className="py-2 pr-4 font-mono text-cyber-teal">{r.code}</td>
                  <td className="py-2 pr-4">{r.name}</td>
                  <td className="py-2 pr-4 text-slate-400">
                    {r.building_name} ({r.building_code})
                  </td>
                  <td className="py-2 pr-4">{r.capacity}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        r.data_environment === 'PRODUCTION'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : r.data_environment === 'VERIFIED'
                          ? 'bg-cyber-teal/20 text-cyber-teal'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {r.data_environment}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rooms.length === 0 && (
            <p className="py-4 text-slate-500">No rooms defined.</p>
          )}
        </div>
      </div>
    </div>
  );
}
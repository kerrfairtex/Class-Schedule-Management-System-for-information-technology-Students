import Link from 'next/link';
import { getDb } from '@/lib/persistence/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'About — TRAC BSIT CSMS',
};

export default async function AboutPage() {
  // Read institutional facts from DB
  const db = getDb();
  const facts = db
    .prepare(
      `SELECT key, value, status FROM institutional_facts
       WHERE category IN ('institution','identity','organization','programs')
       ORDER BY category, key`
    )
    .all() as Array<{ key: string; value: string; status: string }>;

  const byKey = Object.fromEntries(facts.map((f) => [f.key, f]));

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-4">
          <Link href="/" className="text-sm text-cyber-teal hover:text-cyber-cyan">
            ← Back to home
          </Link>
        </div>

        <h1 className="mb-6 text-4xl font-bold">About this System</h1>

        <section className="mb-12">
          <h2 className="mb-3 text-2xl font-semibold text-cyber-teal">
            {byKey.legal_name?.value ?? 'Tawi-Tawi Regional Agricultural College'}
          </h2>
          <p className="mb-2 text-lg text-slate-300">
            {byKey.canonical_location?.value ?? 'Nalil, Bongao, Tawi-Tawi, Philippines'}
          </p>
          <p className="text-sm text-slate-500">
            Established {byKey.established_year?.value ?? '1983'} ·{' '}
            {byKey.legal_foundation?.value ?? 'Batas Pambansa Blg. 384'}
          </p>
        </section>

        <section className="mb-12">
          <h2 className="mb-3 text-2xl font-semibold">Mission</h2>
          <p className="text-slate-300">{byKey.mission_current?.value}</p>
          <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
            Source: TRAC official website (SRC-TRAC-WEB)
          </p>
        </section>

        <section className="mb-12">
          <h2 className="mb-3 text-2xl font-semibold">Vision</h2>
          <p className="text-slate-300">{byKey.vision_current?.value}</p>
          <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
            Source: TRAC official website (SRC-TRAC-WEB)
          </p>
        </section>

        <section className="mb-12">
          <h2 className="mb-3 text-2xl font-semibold">Mandate</h2>
          <p className="text-slate-300">{byKey.four_fold_thrust?.value}</p>
        </section>

        <section className="mb-12">
          <h2 className="mb-3 text-2xl font-semibold">Programs</h2>
          <ul className="space-y-2 text-slate-300">
            <li>{byKey.bsit_currently_offered?.value}</li>
            <li>{byKey.bsis_currently_offered?.value}</li>
          </ul>
        </section>

        <section className="mb-12 border-t border-slate-800 pt-6">
          <h2 className="mb-3 text-2xl font-semibold">System Status</h2>
          <p className="text-sm text-slate-400">
            This platform is a digital class scheduling system developed for the
            TRAC BSIT academic scheduling context. Institutional information is
            presented from identified sources and is subject to verification
            and official updates. The system is not yet formally adopted as an
            official institutional platform.
          </p>
        </section>

        <Link
          href="/about/evidence"
          className="inline-block rounded border border-cyber-teal/40 bg-cyber-teal/10 px-4 py-2 text-cyber-teal hover:bg-cyber-teal/20"
        >
          View Source of Truth →
        </Link>
      </div>
    </div>
  );
}
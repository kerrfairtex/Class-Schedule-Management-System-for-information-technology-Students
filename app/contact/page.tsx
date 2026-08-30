import Link from 'next/link';
import { getDb } from '@/lib/persistence/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Contact — TRAC BSIT CSMS',
};

interface ContactRow {
  office: string;
  contact_type: string;
  value: string;
  data_environment: string;
  verified_at: string | null;
}

export default async function ContactPage() {
  const db = getDb();
  const contacts = db
    .prepare(
      `SELECT office, contact_type, value, data_environment, verified_at
       FROM institution_contacts
       ORDER BY office, contact_type`
    )
    .all() as ContactRow[];

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/" className="mb-4 inline-block text-sm text-cyber-teal hover:text-cyber-cyan">
          ← Back to home
        </Link>
        <h1 className="mb-6 text-4xl font-bold">Institutional Contact</h1>
        <p className="mb-2 text-slate-300">
          Tawi-Tawi Regional Agricultural College
        </p>
        <p className="mb-8 text-sm text-slate-400">
          Nalil, Bongao, Tawi-Tawi, Philippines
        </p>

        <div className="mb-12 space-y-3">
          {contacts.map((c, i) => (
            <article
              key={i}
              className="rounded border border-cyber-teal/40 bg-cyber-teal/5 p-4"
            >
              <p className="text-xs uppercase tracking-wide text-cyber-teal">
                {c.office}
              </p>
              <p className="mt-1">
                {c.contact_type === 'email' ? (
                  <a href={`mailto:${c.value}`} className="text-lg hover:text-cyber-cyan">
                    {c.value}
                  </a>
                ) : c.contact_type === 'mobile' || c.contact_type === 'phone' ? (
                  <a href={`tel:${c.value}`} className="text-lg hover:text-cyber-cyan">
                    {c.value}
                  </a>
                ) : (
                  <span className="text-lg">{c.value}</span>
                )}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Status: <strong>{c.data_environment}</strong>
                {c.verified_at && ` · Verified ${c.verified_at}`}
              </p>
            </article>
          ))}
        </div>

        <div className="border-t border-slate-800 pt-6">
          <h2 className="mb-3 text-lg font-semibold uppercase tracking-wide text-slate-300">
            System Developers
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            The Class Schedule Management System was developed by the
            following students. See the{' '}
            <a
              href="/developers"
              className="text-cyber-teal hover:text-cyber-cyan"
            >
              Developers
            </a>{' '}
            page for full attribution. This list represents the system
            developers and does not constitute the official TRAC administration
            or institutional contact directory.
          </p>
        </div>

        <p className="mt-8 text-xs text-slate-500">
          Source: TRAC official website (SRC-TRAC-WEB, accessed 2026-08-31).
        </p>
      </div>
    </div>
  );
}
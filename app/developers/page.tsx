import Link from 'next/link';
import { DEVELOPERS, SYSTEM_IDENTITY } from '@/lib/domain/constants';

export const metadata = {
  title: 'Developers — TRAC BSIT CSMS',
  description: 'System developer attribution for the Class Schedule Management System.',
};

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-4">
          <Link href="/" className="text-sm text-cyber-teal hover:text-cyber-cyan">
            ← Back to home
          </Link>
        </div>

        <header className="mb-8 border-b border-slate-800 pb-6">
          <p className="text-xs uppercase tracking-wide text-cyber-teal">
            {SYSTEM_IDENTITY.short}
          </p>
          <h1 className="mt-2 text-3xl font-bold">{SYSTEM_IDENTITY.product}</h1>
          <p className="mt-1 text-slate-400">
            {SYSTEM_IDENTITY.institution} · {SYSTEM_IDENTITY.program}
          </p>
        </header>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold uppercase tracking-wide text-slate-200">
            Developers
          </h2>
          <p className="mb-4 text-sm text-slate-400">
            The Class Schedule Management System was developed by the following
            students. This list represents the system developers and does not
            constitute the official TRAC administration or institutional
            contact directory.
          </p>
          <ol className="list-decimal space-y-1 pl-6 text-slate-200">
            {DEVELOPERS.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ol>
        </section>

        <section className="mb-10 border-t border-slate-800 pt-6">
          <h2 className="mb-3 text-lg font-semibold text-slate-300">
            About developer attribution
          </h2>
          <p className="text-sm text-slate-400">
            Developer names are presented as system credits only. For any
            technical issue with this platform, contact the{' '}
            <Link
              href="/contact"
              className="text-cyber-teal hover:text-cyber-cyan"
            >
              institutional contact channels
            </Link>
            {' '}listed on the Contact page. Institutional contacts sourced from
            the TRAC official website (SRC-TRAC-WEB) are preferred over
            developer contacts.
          </p>
        </section>

        <div className="border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} {SYSTEM_IDENTITY.institution}. System
            developed for the BSIT academic scheduling context.
          </p>
        </div>
      </div>
    </div>
  );
}
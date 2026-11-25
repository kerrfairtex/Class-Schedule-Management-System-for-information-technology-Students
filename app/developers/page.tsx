import Link from 'next/link';
import { DEVELOPERS, SYSTEM_IDENTITY } from '@/lib/domain/constants';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';

export const metadata = {
  title: 'Developers — TRAC BSIT CSMS',
  description: 'System developer attribution for the Class Schedule Management System.',
};

export default function DevelopersPage() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-4">
        </div>

        <header className="mb-8 border-b border-line pb-6">
          <p className="text-xs text-lagoon">
            {SYSTEM_IDENTITY.short}
          </p>
          <h1 className="mt-2 text-3xl font-bold">{SYSTEM_IDENTITY.product}</h1>
          <p className="mt-1 text-muted">
            {SYSTEM_IDENTITY.institution} · {SYSTEM_IDENTITY.program}
          </p>
        </header>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold text-ink">
            Developers
          </h2>
          <p className="mb-4 text-sm text-muted">
            The Class Schedule Management System was developed by the following
            students. This list represents the system developers and does not
            constitute the official TRAC administration or institutional
            contact directory.
          </p>
          <ol className="list-decimal space-y-1 pl-6 text-ink">
            {DEVELOPERS.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ol>
        </section>

        <section className="mb-10 border-t border-line pt-6">
          <h2 className="mb-3 text-lg font-semibold text-ink-soft">
            About developer attribution
          </h2>
          <p className="text-sm text-muted">
            Developer names are presented as system credits only. For any
            technical issue with this platform, contact the{' '}
            <Link
              href="/contact"
              className="text-lagoon hover:text-lagoon-dark"
            >
              institutional contact channels
            </Link>
            {' '}listed on the Contact page. Institutional contacts sourced from
            the TRAC official website (SRC-TRAC-WEB) are preferred over
            developer contacts.
          </p>
        </section>

        <div className="border-t border-line pt-6 text-center text-xs text-muted">
          <p>
            © {new Date().getFullYear()} {SYSTEM_IDENTITY.institution}. System
            developed for the BSIT academic scheduling context.
          </p>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
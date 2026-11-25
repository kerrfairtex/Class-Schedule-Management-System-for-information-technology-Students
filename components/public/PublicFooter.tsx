import Link from 'next/link';
import { ORGANIZATION, DEVELOPERS } from '@/lib/domain/constants';

/** Footer for every public page: official contacts, links, system status. */
export function PublicFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface print:hidden">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <p className="font-display text-lg font-bold">
            {ORGANIZATION.shortName} {ORGANIZATION.departmentCode} class schedules
          </p>
          <p className="mt-2 max-w-sm text-sm text-muted">
            {ORGANIZATION.institute}, {ORGANIZATION.college}, {ORGANIZATION.location}.
          </p>
          <p className="mt-4 max-w-sm text-xs text-muted">
            A class scheduling system built for the BSIT department. It is not yet formally adopted as an official
            institutional platform; schedules are official once published by the department.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="font-display text-sm font-bold">Students</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="text-ink-soft hover:text-lagoon" href="/schedules">Class schedules</Link></li>
            <li><Link className="text-ink-soft hover:text-lagoon" href="/today">Today&apos;s classes</Link></li>
            <li><Link className="text-ink-soft hover:text-lagoon" href="/rooms">Room availability</Link></li>
            <li><Link className="text-ink-soft hover:text-lagoon" href="/announcements">Announcements</Link></li>
            <li><Link className="text-ink-soft hover:text-lagoon" href="/academic-calendar">Academic calendar</Link></li>
          </ul>
          <h2 className="mt-6 font-display text-sm font-bold">About</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="text-ink-soft hover:text-lagoon" href="/about">About TRAC BSIT</Link></li>
            <li><Link className="text-ink-soft hover:text-lagoon" href="/user-guide">User guide</Link></li>
            <li><Link className="text-ink-soft hover:text-lagoon" href="/login">Sign-in</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className="font-display text-sm font-bold">Contact TRAC</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="text-muted">Office of the Registrar</dt>
              <dd><a className="text-ink-soft hover:text-lagoon" href="mailto:registrar@trac.edu.ph">registrar@trac.edu.ph</a></dd>
            </div>
            <div>
              <dt className="text-muted">Office of Admission</dt>
              <dd>
                <a className="text-ink-soft hover:text-lagoon" href="mailto:admission@trac.edu.ph">admission@trac.edu.ph</a>
                <br />
                <a className="text-ink-soft hover:text-lagoon" href="tel:+639517337474">0951 733 7474</a>
              </dd>
            </div>
            <div>
              <dt className="text-muted">Office of the President</dt>
              <dd><a className="text-ink-soft hover:text-lagoon" href="mailto:op@trac.edu.ph">op@trac.edu.ph</a></dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted">From the TRAC official website, verified 31 August 2026.</p>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted sm:px-6">
          © {new Date().getFullYear()} {ORGANIZATION.college}. Built by{' '}
          <Link className="text-ink-soft hover:text-lagoon" href="/developers">{DEVELOPERS.join(', ')}</Link>.
        </p>
      </div>
    </footer>
  );
}

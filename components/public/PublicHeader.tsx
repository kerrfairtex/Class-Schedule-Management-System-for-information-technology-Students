import Link from 'next/link';
import { ORGANIZATION } from '@/lib/domain/constants';

export const PUBLIC_NAV = [
  { href: '/schedules', label: 'Schedules' },
  { href: '/today', label: 'Today' },
  { href: '/rooms', label: 'Rooms' },
  { href: '/faculty', label: 'Faculty' },
  { href: '/courses', label: 'Courses' },
  { href: '/academic-calendar', label: 'Calendar' },
  { href: '/contact', label: 'Contact' },
] as const;

/** Navigation shared by the public pages. Students need no account. */
export function PublicHeader({ active }: { active?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-baseline gap-2 py-3"
          aria-label={`${ORGANIZATION.shortName} ${ORGANIZATION.departmentCode} class schedules, home`}
        >
          <span className="font-display text-lg font-extrabold tracking-tight text-lagoon">
            {ORGANIZATION.shortName} {ORGANIZATION.departmentCode}
          </span>
          <span className="hidden text-sm text-muted sm:inline">Class schedules</span>
        </Link>
        <Link href="/login" className="ml-auto py-3 text-sm text-muted hover:text-lagoon md:order-last md:ml-0">
          Sign-in
        </Link>
        <nav aria-label="Main" className="-mx-4 w-full overflow-x-auto px-4 md:mx-0 md:w-auto md:flex-1 md:px-0">
          <ul className="flex gap-1">
            {PUBLIC_NAV.map((l) => {
              const current = active === l.href;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={current ? 'page' : undefined}
                    className={`block whitespace-nowrap border-b-2 px-2.5 py-3 text-sm font-semibold ${
                      current ? 'border-lagoon text-lagoon' : 'border-transparent text-ink-soft hover:text-lagoon'
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}

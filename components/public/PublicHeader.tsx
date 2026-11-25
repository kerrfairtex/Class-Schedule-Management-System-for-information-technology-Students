import Link from 'next/link';
import { ORGANIZATION } from '@/lib/domain/constants';

export const PUBLIC_NAV = [
  { href: '/schedules', label: 'Class Schedules' },
  { href: '/rooms', label: 'Rooms' },
  { href: '/faculty', label: 'Faculty' },
  { href: '/courses', label: 'Courses' },
  { href: '/academic-calendar', label: 'Calendar' },
  { href: '/contact', label: 'Contact' },
] as const;

/** Navigation shared by the public pages. Students need no account. */
export function PublicHeader({ active }: { active?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-midnight/90 backdrop-blur-sm print:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0 font-semibold text-slate-100 hover:text-cyber-cyan">
          {ORGANIZATION.shortName} {ORGANIZATION.departmentCode}
        </Link>
        <nav aria-label="Main" className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {PUBLIC_NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active === l.href ? 'page' : undefined}
              className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm ${
                active === l.href ? 'bg-cyber-teal/10 text-cyber-cyan' : 'text-slate-400 hover:text-cyber-cyan'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href="/login" className="hidden shrink-0 text-sm text-slate-500 hover:text-cyber-cyan sm:inline">
          Staff sign in
        </Link>
      </div>
    </header>
  );
}

import Link from 'next/link';
import { ADMIN_NAV } from '@/lib/domain/navigation';

/** Admin menu for the full-width admin pages that have no sidebar. */
export function AdminTopNav({ current }: { current: string }) {
  return (
    <nav aria-label="Admin" className="mb-6 border-b border-slate-800 pb-3 print:hidden">
      <ul className="-mx-1 flex gap-1 overflow-x-auto">
        {ADMIN_NAV.map((item) => (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-current={item.href === current ? 'page' : undefined}
              className={`block whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm ${
                item.href === current ? 'bg-cyber-teal/10 text-cyber-cyan' : 'text-slate-400 hover:text-cyber-cyan'
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
        <li className="ml-auto shrink-0">
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-slate-500 hover:text-red-300">
              Sign out
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}

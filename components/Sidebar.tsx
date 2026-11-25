import Link from 'next/link';
import { LogOut } from 'lucide-react';

interface NavLink {
  href: string;
  label: string;
  active?: boolean;
}

interface PortalSidebarProps {
  title: string;
  name: string;
  subtitle?: string;
  details?: { label: string; value: string }[];
  links: NavLink[];
}

export function PortalSidebar({ title, name, subtitle, details, links }: PortalSidebarProps) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white print:hidden md:w-72 md:border-b-0 md:border-r">
      <div className="border-b border-slate-200 p-4 text-center md:p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{title}</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-900">{name}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {details && details.length > 0 && (
        <div className="space-y-3 border-b border-slate-200 p-6">
          {details.map((d) => (
            <div key={d.label}>
              <p className="text-xs text-slate-400">{d.label}</p>
              <p className="text-sm font-medium text-slate-700">{d.value}</p>
            </div>
          ))}
        </div>
      )}
      <nav aria-label={`${title} navigation`} className="flex flex-1 gap-1 overflow-x-auto p-2 md:block md:space-y-1 md:p-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={link.active ? 'page' : undefined}
            className={`block shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
              link.active
                ? 'bg-primary text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-slate-200 p-4">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </form>
      </div>
    </aside>
  );
}

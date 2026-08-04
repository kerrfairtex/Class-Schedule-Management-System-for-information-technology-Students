import Link from 'next/link';
import { LogOut } from 'lucide-react';

interface SidebarProps {
  role: 'admin' | 'faculty' | 'student';
  name: string;
  subtitle?: string;
  details: { label: string; value: string }[];
  links: { href: string; label: string; active?: boolean }[];
}

export function Sidebar({ role, name, subtitle, details, links }: SidebarProps) {
  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-6 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {role} Information
        </p>
        <h2 className="mt-3 text-lg font-semibold text-slate-900">{name}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>

      <div className="space-y-3 border-b border-slate-200 p-6">
        {details.map((d) => (
          <div key={d.label}>
            <p className="text-xs text-slate-400">{d.label}</p>
            <p className="text-sm font-medium text-slate-700">{d.value}</p>
          </div>
        ))}
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
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

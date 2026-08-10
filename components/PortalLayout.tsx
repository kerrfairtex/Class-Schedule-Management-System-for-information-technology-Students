'use client';

import { PortalSidebar } from '@/components/Sidebar';
import { ORGANIZATION } from '@/lib/domain/constants';

interface PortalLayoutProps {
  role: 'faculty' | 'student';
  name: string;
  subtitle?: string;
  details?: { label: string; value: string }[];
  links: { href: string; label: string; active?: boolean }[];
  children: React.ReactNode;
}

export function PortalLayout({
  role,
  name,
  subtitle,
  details,
  links,
  children,
}: PortalLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <PortalSidebar
        title={role}
        name={name}
        subtitle={subtitle || ORGANIZATION.departmentCode}
        details={details}
        links={links}
      />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}

export function PrintHeader({
  title,
  subtitle,
  name,
}: {
  title: string;
  subtitle?: string;
  name?: string;
}) {
  return (
    <div className="mb-4 hidden print:block print-header">
      <p className="text-sm font-medium">{ORGANIZATION.college}</p>
      <p className="text-sm">{ORGANIZATION.department}</p>
      <p className="text-lg font-bold">{title}</p>
      {subtitle && <p className="text-sm">{subtitle}</p>}
      {name && <p className="text-sm">{name}</p>}
    </div>
  );
}

export function ViewToggle({
  view,
  onChange,
}: {
  view: 'grid' | 'list';
  onChange: (v: 'grid' | 'list') => void;
}) {
  return (
    <div className="flex rounded-lg border border-slate-200 print:hidden">
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={`px-3 py-1.5 text-sm ${view === 'grid' ? 'bg-primary text-white' : 'text-slate-600'}`}
      >
        Grid
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        className={`px-3 py-1.5 text-sm ${view === 'list' ? 'bg-primary text-white' : 'text-slate-600'}`}
      >
        List
      </button>
    </div>
  );
}

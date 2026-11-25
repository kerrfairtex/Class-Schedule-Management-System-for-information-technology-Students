'use client';

import { useState, useSyncExternalStore, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Menu, X, LayoutDashboard, Users, BookOpen, GraduationCap, Building2, Calendar, AlertTriangle, Activity, Database, CalendarRange, DoorOpen, Megaphone, ScrollText, BadgeCheck } from 'lucide-react';
import { ORGANIZATION } from '@/lib/domain/constants';
import { TermBar, type TermBarData } from './TermBar';

interface NavLink {
  href: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  moduleId?: string;
}

interface PortalLayoutProps {
  role: 'admin' | 'faculty' | 'student';
  name: string;
  details?: { label: string; value: string }[];
  links: NavLink[];
  children: React.ReactNode;
  /** Term, week and conflict count shown under the header. */
  termBar?: TermBarData;
}

const MODULE_ICONS: Record<string, React.ReactNode> = {
  'admin-control': <LayoutDashboard className="h-4 w-4" />,
  'faculty-load': <Users className="h-4 w-4" />,
  'student-schedule': <GraduationCap className="h-4 w-4" />,
  'lab-node-status': <Building2 className="h-4 w-4" />,
  'master-list': <BookOpen className="h-4 w-4" />,
  'schedule-board': <Calendar className="h-4 w-4" />,
  'faculty-availability': <Activity className="h-4 w-4" />,
  'database': <Database className="h-4 w-4" />,
  'audit': <AlertTriangle className="h-4 w-4" />,
  'dashboard': <LayoutDashboard className="h-4 w-4" />,
  'schedule': <Calendar className="h-4 w-4" />,
  'terms': <CalendarRange className="h-4 w-4" />,
  'bookings': <DoorOpen className="h-4 w-4" />,
  'announcements': <Megaphone className="h-4 w-4" />,
  'audit-log': <ScrollText className="h-4 w-4" />,
  'evidence': <BadgeCheck className="h-4 w-4" />,
};

function subscribeSidebar(_role: string) {
  // No external subscriptions needed — sidebar state is local React state.
  // We only need a stable subscribe that never invokes the listener.
  return () => {};
}

function getSidebarSnapshot(role: string): string {
  if (typeof window === 'undefined') return 'false';
  return window.localStorage.getItem(`sidebar-collapsed-${role}`) ?? 'false';
}

function getServerSidebarSnapshot(): string {
  return 'false';
}

export function PortalLayout({
  role,
  name,
  details,
  links,
  children,
  termBar,
}: PortalLayoutProps) {
  const stored = useSyncExternalStore(
    useCallback(() => subscribeSidebar(role), [role]),
    () => getSidebarSnapshot(role),
    getServerSidebarSnapshot
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(stored === 'true');

  // Below lg the sidebar is an off-canvas drawer; at lg and up it is fixed
  // and can be collapsed to icons (that preference is remembered).
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem(`sidebar-collapsed-${role}`, JSON.stringify(next));
  };

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const getModuleId = (href: string) => {
    const parts = href.split('/').filter(Boolean);
    return parts.join('-') || 'dashboard';
  };

  return (
    <div className="flex min-h-screen bg-paper">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <PortalSidebar
        role={role}
        name={name}
        details={details}
        links={links.map(l => ({ ...l, moduleId: l.moduleId || getModuleId(l.href) }))}
        // The open drawer always shows labels; collapsing is a desktop option.
        collapsed={sidebarCollapsed && !mobileOpen}
        mobileOpen={mobileOpen}
        onToggle={toggleSidebar}
        onClose={() => setMobileOpen(false)}
      />
      <div
        className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'}`}
      >
        <header className="border-b border-line bg-surface sticky top-0 z-30 lg:hidden">
          <div className="flex h-14 items-center gap-3 px-4">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="btn-icon"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              aria-controls="portal-sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="truncate text-sm font-semibold text-ink">{name}</p>
          </div>
        </header>
        {termBar && <TermBar data={termBar} />}
        <main className="flex-1 p-4 pt-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

interface PortalSidebarProps {
  role: 'admin' | 'faculty' | 'student';
  name: string;
  details?: { label: string; value: string }[];
  links: { href: string; label: string; icon?: React.ReactNode; active?: boolean; moduleId?: string }[];
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

function PortalSidebar({ role, name, details, links, collapsed, mobileOpen, onToggle, onClose }: PortalSidebarProps) {

  return (
    <aside
      id="portal-sidebar"
      aria-label={`${role} navigation`}
      className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'translate-x-0' : 'invisible -translate-x-full'} lg:visible lg:translate-x-0`}
    >
      <div className="flex h-16 items-center justify-between border-b border-line px-4">
        {!collapsed && (
          <div className="min-w-0">
            <Link href="/" className="font-display text-base font-extrabold tracking-tight text-lagoon">
              TRAC BSIT
            </Link>
            <p className="truncate text-sm text-muted">
              {role === 'admin' ? 'Administrator' : 'Faculty'}: {name}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="btn-icon hidden flex-shrink-0 lg:inline-flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          suppressHydrationWarning
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="btn-icon flex-shrink-0 lg:hidden"
          aria-label="Close navigation menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {!collapsed && details && details.length > 0 && (
        <dl className="space-y-2 border-b border-line p-4 text-sm">
          {details.map((d) => (
            <div key={d.label} className="flex justify-between gap-3">
              <dt className="text-muted">{d.label}</dt>
              <dd className="truncate font-semibold text-ink">{d.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {links.map((link) => {
          const Icon = link.icon || MODULE_ICONS[link.moduleId || ''] || <LayoutDashboard className="h-4 w-4" />;
          const isActive = link.active;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''} ${collapsed ? 'sidebar-link-collapsed' : ''}`}
              title={collapsed ? link.label : undefined}
              aria-current={isActive ? 'page' : undefined}
              onClick={onClose}
            >
              <span className="flex h-8 w-8 items-center justify-center" aria-hidden="true">
                {Icon}
              </span>
              {!collapsed && <span className="truncate">{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-line p-4">
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="btn-secondary w-full gap-2 justify-center">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Logout
            </button>
          </form>
        </div>
      )}

      {collapsed && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="btn-icon p-2" title="Logout">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </form>
        </div>
      )}
    </aside>
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
    <div className="mb-4 hidden print:block print-header border-b-2 border-line pb-4">
      <p className="text-sm font-medium text-muted">{ORGANIZATION.college}</p>
      <p className="text-sm text-muted">{ORGANIZATION.department}</p>
      <p className="text-lg font-bold text-ink">{title}</p>
      {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      {name && <p className="text-sm text-muted">{name}</p>}
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
    <div className="flex rounded-lg border border-line bg-surface print:hidden">
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={`px-3 py-1.5 text-sm font-medium transition ${view === 'grid' ? 'bg-lagoon text-white' : 'text-muted hover:text-ink'}`}
      >
        Grid
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        className={`px-3 py-1.5 text-sm font-medium transition ${view === 'list' ? 'bg-lagoon text-white' : 'text-muted hover:text-ink'}`}
      >
        List
      </button>
    </div>
  );
}
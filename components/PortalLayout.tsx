'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, LayoutDashboard, Users, BookOpen, GraduationCap, Building2, Calendar, AlertTriangle, Activity, Server, Database } from 'lucide-react';
import { ORGANIZATION } from '@/lib/domain/constants';
import { TelemetryBar } from './TelemetryBar';
import { MetricCard, QuickLink } from './DashboardComponents';

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
  subtitle?: string;
  details?: { label: string; value: string }[];
  links: NavLink[];
  children: React.ReactNode;
  telemetry?: {
    term: string;
    week: string;
    health: 'healthy' | 'warning' | 'critical';
    conflicts: number;
  };
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
};

export function PortalLayout({
  role,
  name,
  subtitle,
  details,
  links,
  children,
  telemetry,
}: PortalLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(`sidebar-collapsed-${role}`);
    if (saved !== null) {
      setSidebarCollapsed(JSON.parse(saved));
    }
  }, [role]);

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem(`sidebar-collapsed-${role}`, JSON.stringify(next));
  };

  const getModuleId = (href: string) => {
    const parts = href.split('/').filter(Boolean);
    return parts.join('-') || 'dashboard';
  };

  return (
    <div className="flex min-h-screen bg-midnight">
      <PortalSidebar
        role={role}
        name={name}
        subtitle={subtitle || ORGANIZATION.departmentCode}
        details={details}
        links={links.map(l => ({ ...l, moduleId: l.moduleId || getModuleId(l.href) }))}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        mounted={mounted}
      />
      <div className="flex-1 flex flex-col min-w-0 ml-72 transition-all duration-300 lg:ml-72" style={sidebarCollapsed ? { marginLeft: '5rem' } : {}}>
        <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex h-16 items-center justify-between px-6">
            <button
              onClick={toggleSidebar}
              className="btn-icon lg:hidden"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>
            <div className="flex-1 lg:hidden" />
          </div>
        </header>
        {telemetry && <TelemetryBar data={telemetry} />}
        <main className="flex-1 p-6 lg:p-8 pt-4">{children}</main>
      </div>
    </div>
  );
}

interface PortalSidebarProps {
  role: string;
  name: string;
  subtitle?: string;
  details?: { label: string; value: string }[];
  links: (NavLink & { moduleId: string })[];
  collapsed: boolean;
  onToggle: () => void;
  mounted: boolean;
}

function PortalSidebar({ role, name, subtitle, details, links, collapsed, onToggle, mounted }: PortalSidebarProps) {
  const healthColors = {
    healthy: 'text-emerald-400',
    warning: 'text-amber-400',
    critical: 'text-red-400',
  };

  const getModuleHealth = (moduleId: string) => {
    const healthMap: Record<string, 'healthy' | 'warning' | 'critical'> = {
      'admin-control': 'healthy',
      'faculty-load': 'healthy',
      'student-schedule': 'healthy',
      'lab-node-status': 'warning',
      'master-list': 'healthy',
      'schedule-board': 'healthy',
      'faculty-availability': 'healthy',
      'database': 'healthy',
      'audit': 'healthy',
      'dashboard': 'healthy',
      'schedule': 'healthy',
    };
    return healthMap[moduleId] || 'healthy';
  };

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
        {!collapsed && (
          <div className="text-center">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{role.toUpperCase()}</p>
            <h2 className="text-lg font-semibold text-slate-100 truncate">{name}</h2>
            {subtitle && <p className="text-sm text-slate-500 truncate">{subtitle}</p>}
          </div>
        )}
        {mounted && (
          <button
            onClick={onToggle}
            className="btn-icon flex-shrink-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        )}
      </div>

      {!collapsed && details && details.length > 0 && (
        <div className="space-y-3 border-b border-slate-800 p-4 animate-in">
          {details.map((d, i) => (
            <div key={d.label} className={`stagger-${Math.min(i + 1, 6)}`}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{d.label}</p>
              <p className="text-sm font-medium text-slate-100 font-mono truncate">{d.value}</p>
            </div>
          ))}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {links.map((link, index) => {
          const Icon = link.icon || MODULE_ICONS[link.moduleId || ''] || <LayoutDashboard className="h-4 w-4" />;
          const health = getModuleHealth(link.moduleId || '');
          const isActive = link.active;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`
                sidebar-link ${isActive ? 'sidebar-link-active' : ''} ${collapsed ? 'sidebar-link-collapsed' : ''}
                animate-in stagger-${Math.min(index + 1, 6)}
              `}
              title={collapsed ? link.label : undefined}
            >
              <span className="flex h-8 w-8 items-center justify-center relative">
                {Icon}
                <span className={`status-dot absolute -top-0.5 -right-0.5 ${healthColors[health]}`} />
              </span>
              {!collapsed && <span className="truncate">{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-slate-800 p-4 animate-in stagger-6">
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="btn-secondary w-full gap-2 justify-center">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Logout
            </button>
          </form>
        </div>
      )}

      {collapsed && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-in">
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
    <div className="mb-4 hidden print:block print-header border-b-2 border-slate-900 pb-4">
      <p className="text-sm font-medium text-slate-600">{ORGANIZATION.college}</p>
      <p className="text-sm text-slate-500">{ORGANIZATION.department}</p>
      <p className="text-lg font-bold text-slate-900">{title}</p>
      {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
      {name && <p className="text-sm text-slate-500">{name}</p>}
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
    <div className="flex rounded-lg border border-slate-700 bg-slate-900/50 print:hidden">
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={`px-3 py-1.5 text-sm font-medium transition ${view === 'grid' ? 'bg-cyber-teal text-midnight' : 'text-slate-400 hover:text-slate-100'}`}
      >
        Grid
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        className={`px-3 py-1.5 text-sm font-medium transition ${view === 'list' ? 'bg-cyber-teal text-midnight' : 'text-slate-400 hover:text-slate-100'}`}
      >
        List
      </button>
    </div>
  );
}
'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { CourseBadge, getCourseBadgeClass, getCourseCategory, getCourseCategoryLabel } from './CourseBadge';

interface MetricCardProps {
  icon: ReactNode;
  iconClass?: string;
  label: string;
  value: number | string;
  trend?: { value: number; label: string; down?: boolean };
  subValue?: number | string;
  subLabel?: string;
}

export function MetricCard({ icon, iconClass, label, value, trend, subValue, subLabel }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${iconClass || 'bg-slate-800'}`}>
        {icon}
      </div>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
      {trend && (
        <p className={`mt-1 text-xs ${trend.down ? 'text-red-400' : 'text-emerald-400'}`}>
          {trend.value} {trend.label}
        </p>
      )}
      {subValue !== undefined && (
        <p className="mt-1 text-xs text-slate-500">
          {subValue} {subLabel}
        </p>
      )}
    </div>
  );
}

interface QuickLinkProps {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}

export function QuickLink({ href, title, description, icon }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-slate-700 hover:bg-slate-900"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-cyber-teal">
        {icon}
      </div>
      <div>
        <p className="font-medium text-slate-100">{title}</p>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
    </Link>
  );
}

export { CourseBadge, getCourseBadgeClass, getCourseCategory, getCourseCategoryLabel };

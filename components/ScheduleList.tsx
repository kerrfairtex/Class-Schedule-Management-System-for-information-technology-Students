'use client';

import type { Schedule } from '@/lib/domain/types';
import { DAY_LABELS } from '@/lib/domain/constants';
import { getCourseBadgeClass, getCourseCategoryLabel, CourseBadge } from './CourseBadge';

interface ScheduleListProps {
  schedules: Schedule[];
  showFaculty?: boolean;
  showSection?: boolean;
  filters?: {
    yearLevel?: string;
    section?: string;
    room?: string;
    instructor?: string;
  };
}

export function ScheduleList({ schedules, showFaculty, showSection, filters }: ScheduleListProps) {
  // Apply filters
  let filteredSchedules = schedules;
  if (filters) {
    if (filters.yearLevel && filters.yearLevel !== 'all') {
      filteredSchedules = filteredSchedules.filter(s => s.section_code?.startsWith(filters.yearLevel!));
    }
    if (filters.section && filters.section !== 'all') {
      filteredSchedules = filteredSchedules.filter(s => s.section_code === filters.section);
    }
    if (filters.room && filters.room !== 'all') {
      filteredSchedules = filteredSchedules.filter(s => s.room_code === filters.room);
    }
    if (filters.instructor && filters.instructor !== 'all') {
      filteredSchedules = filteredSchedules.filter(s => s.faculty_name?.includes(filters.instructor!));
    }
  }

  if (filteredSchedules.length === 0) {
    return (
      <div className="card text-center text-sm text-slate-500 py-12">
        No classes scheduled.
      </div>
    );
  }

  const sorted = [...filteredSchedules].sort((a, b) => {
    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayDiff =
      dayOrder.indexOf(a.day_of_week || '') - dayOrder.indexOf(b.day_of_week || '');
    if (dayDiff !== 0) return dayDiff;
    return (a.start_time || '').localeCompare(b.start_time || '');
  });

  return (
    <div className="space-y-3 animate-in">
      {sorted.map((s) => (
        <div
          key={s.id}
          className="card flex flex-wrap items-center justify-between gap-4 print:break-inside-avoid print:shadow-none animate-in"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <CourseBadge
              subjectCode={s.subject_code}
              subjectName={s.subject_name}
              size="md"
              showName={true}
            />
            <div className="min-w-0">
              <p className="font-semibold text-slate-100 truncate">
                {s.subject_name}
              </p>
              <p className="text-sm text-slate-500 font-mono">
                {DAY_LABELS[s.day_of_week || '']} · {s.start_time} – {s.end_time}
              </p>
            </div>
          </div>
          <div className="text-right text-sm text-slate-500 flex items-center gap-4 shrink-0">
            <div className="text-left">
              <p className="font-mono text-cyber-cyan">{s.room_code}</p>
              <p className="text-[11px] text-slate-600">{s.room_name}</p>
            </div>
            {showFaculty && s.faculty_name && (
              <div className="text-left">
                <p className="font-mono text-emerald-400">{s.faculty_name}</p>
              </div>
            )}
            {showSection && s.section_code && (
              <div className="text-left">
                <p className="font-mono text-amber-400">Section {s.section_code}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ScheduleStats({ schedules }: { schedules: Schedule[] }) {
  const subjects = new Set(schedules.map((s) => s.subject_code));
  const days = new Set(schedules.map((s) => s.day_of_week));

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      <Stat label="Total Classes" value={schedules.length} iconClass="metric-icon-teal" />
      <Stat label="Subjects" value={subjects.size} iconClass="metric-icon-emerald" />
      <Stat label="Days per Week" value={days.size} iconClass="metric-icon-amber" />
    </div>
  );
}

function Stat({ label, value, iconClass }: { label: string; value: number; iconClass: string }) {
  return (
    <div className="card text-center">
      <div className={`metric-icon ${iconClass} mx-auto mb-2`}>
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </div>
      <p className="text-2xl font-bold text-slate-100 font-mono">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
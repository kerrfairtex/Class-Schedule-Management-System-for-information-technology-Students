'use client';

import { DAYS, DAY_LABELS } from '@/lib/domain/constants';
import type { Schedule } from '@/lib/domain/types';
import { getCourseBadgeClass, getCourseCategoryLabel } from './CourseBadge';

interface ScheduleGridProps {
  schedules: Schedule[];
  emptyLabel?: string;
  showFaculty?: boolean;
  showSection?: boolean;
  filters?: {
    yearLevel?: string;
    section?: string;
    room?: string;
    instructor?: string;
  };
}

export function ScheduleGrid({
  schedules,
  emptyLabel = '—',
  showFaculty = false,
  showSection = false,
  filters,
}: ScheduleGridProps) {
  const timeSlots = getUniqueTimeSlots(schedules);

  function getEntry(day: string, startTime: string) {
    return schedules.find((s) => s.day_of_week === day && s.start_time === startTime);
  }

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

  function getFilteredEntry(day: string, startTime: string) {
    return filteredSchedules.find((s) => s.day_of_week === day && s.start_time === startTime);
  }

  return (
    <div className="schedule-grid animate-in">
      <div className="overflow-x-auto">
        <table className="schedule-grid-table">
          <thead>
            <tr className="schedule-grid-header">
              <th className="px-3 py-3 text-left font-medium text-xs uppercase tracking-wider w-24">TIME</th>
              {DAYS.map((day) => (
                <th key={day} className="px-3 py-3 text-left font-medium text-xs uppercase tracking-wider">
                  {DAY_LABELS[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, idx) => (
              <tr key={slot} className={idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-950/50'}>
                <td className="schedule-grid-time-col w-24">
                  {formatTimeLabel(slot, schedules)}
                </td>
                {DAYS.map((day) => {
                  const entry = getFilteredEntry(day, slot);
                  return (
                    <td key={day} className="schedule-grid-cell">
                      {entry ? (
                        <div className={`schedule-block ${getCourseBadgeClass(entry.subject_code)} relative group`}>
                          <div className="flex items-start justify-between gap-1">
                            <CourseBadgeInline
                              subjectCode={entry.subject_code}
                              categoryLabel={getCourseCategoryLabel(entry.subject_code)}
                            />
                            {showSection && entry.section_code && (
                              <span className="schedule-block-meta font-mono">{entry.section_code}</span>
                            )}
                          </div>
                          <p className="schedule-block-title mt-1 truncate">{entry.subject_name}</p>
                          <p className="schedule-block-meta font-mono">{entry.room_code}</p>
                          {showFaculty && entry.faculty_name && (
                            <p className="schedule-block-meta">{entry.faculty_name}</p>
                          )}
                          {showSection && entry.section_code && (
                            <p className="schedule-block-meta font-mono">{entry.section_code}</p>
                          )}
                        </div>
                      ) : (
                        <span className="schedule-empty">{emptyLabel}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CourseBadgeInline({ subjectCode, categoryLabel }: { subjectCode: string; categoryLabel: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">
      {categoryLabel}
    </span>
  );
}

function getUniqueTimeSlots(schedules: Schedule[]): string[] {
  const slots = new Set(schedules.map((s) => s.start_time!).filter(Boolean));
  if (slots.size === 0) {
    return ['07:30', '08:30', '09:30', '10:30', '11:30', '13:30', '14:30', '15:30'];
  }
  return Array.from(slots).sort();
}

function formatTimeLabel(startTime: string, schedules: Schedule[]): string {
  const match = schedules.find((s) => s.start_time === startTime);
  if (match?.end_time) return `${startTime} - ${match.end_time}`;
  return startTime;
}
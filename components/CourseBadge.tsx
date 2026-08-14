'use client';

import type { Schedule } from '@/lib/domain/types';

interface CourseBadgeProps {
  subjectCode: string;
  subjectName?: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

const COURSE_CATEGORIES: Record<string, { category: string; class: string; label: string }> = {
  // Networking courses
  'IT 201': { category: 'networking', class: 'course-badge-networking', label: 'NET' },
  'IT 202': { category: 'networking', class: 'course-badge-networking', label: 'NET' },
  'IT 301': { category: 'networking', class: 'course-badge-networking', label: 'NET' },
  'IT 302': { category: 'networking', class: 'course-badge-networking', label: 'NET' },
  'IT 401': { category: 'networking', class: 'course-badge-networking', label: 'NET' },
  'IT 402': { category: 'networking', class: 'course-badge-networking', label: 'NET' },
  'CS 301': { category: 'networking', class: 'course-badge-networking', label: 'NET' },
  'CS 302': { category: 'networking', class: 'course-badge-networking', label: 'NET' },

  // Software Engineering courses
  'IT 101': { category: 'software', class: 'course-badge-software', label: 'SE' },
  'IT 102': { category: 'software', class: 'course-badge-software', label: 'SE' },
  'IT 203': { category: 'software', class: 'course-badge-software', label: 'SE' },
  'IT 204': { category: 'software', class: 'course-badge-software', label: 'SE' },
  'IT 303': { category: 'software', class: 'course-badge-software', label: 'SE' },
  'IT 304': { category: 'software', class: 'course-badge-software', label: 'SE' },
  'CS 101': { category: 'software', class: 'course-badge-software', label: 'SE' },
  'CS 102': { category: 'software', class: 'course-badge-software', label: 'SE' },
  'CS 201': { category: 'software', class: 'course-badge-software', label: 'SE' },
  'CS 202': { category: 'software', class: 'course-badge-software', label: 'SE' },

  // Systems Administration courses
  'IT 205': { category: 'systems', class: 'course-badge-systems', label: 'SYS' },
  'IT 206': { category: 'systems', class: 'course-badge-systems', label: 'SYS' },
  'IT 305': { category: 'systems', class: 'course-badge-systems', label: 'SYS' },
  'IT 306': { category: 'systems', class: 'course-badge-systems', label: 'SYS' },
  'IT 403': { category: 'systems', class: 'course-badge-systems', label: 'SYS' },
  'CS 303': { category: 'systems', class: 'course-badge-systems', label: 'SYS' },
  'CS 401': { category: 'systems', class: 'course-badge-systems', label: 'SYS' },

  // General Education courses
  'GE 101': { category: 'gened', class: 'course-badge-gened', label: 'GEN' },
  'GE 102': { category: 'gened', class: 'course-badge-gened', label: 'GEN' },
  'GE 201': { category: 'gened', class: 'course-badge-gened', label: 'GEN' },
  'GE 202': { category: 'gened', class: 'course-badge-gened', label: 'GEN' },
  'MATH 101': { category: 'gened', class: 'course-badge-gened', label: 'GEN' },
  'MATH 102': { category: 'gened', class: 'course-badge-gened', label: 'GEN' },
  'PHYS 101': { category: 'gened', class: 'course-badge-gened', label: 'GEN' },
  'ENG 101': { category: 'gened', class: 'course-badge-gened', label: 'GEN' },
  'FIL 101': { category: 'gened', class: 'course-badge-gened', label: 'GEN' },
};

export function getCourseBadgeClass(subjectCode: string): string {
  const info = COURSE_CATEGORIES[subjectCode];
  return info?.class || 'course-badge-unknown';
}

export function getCourseCategory(subjectCode: string): string {
  const info = COURSE_CATEGORIES[subjectCode];
  return info?.category || 'unknown';
}

export function getCourseCategoryLabel(subjectCode: string): string {
  const info = COURSE_CATEGORIES[subjectCode];
  return info?.label || 'UNK';
}

export function CourseBadge({ subjectCode, subjectName, size = 'md', showName = true }: CourseBadgeProps) {
  const badgeClass = getCourseBadgeClass(subjectCode);
  const categoryLabel = getCourseCategoryLabel(subjectCode);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  return (
    <span className={`${badgeClass} ${sizeClasses[size]}`}>
      <span className="font-mono">{categoryLabel}</span>
      {showName && <span className="font-mono"> {subjectCode}</span>}
    </span>
  );
}

export function CourseBadgeTooltip({ subjectCode, subjectName, children }: { subjectCode: string; subjectName?: string; children: React.ReactNode }) {
  const category = getCourseCategory(subjectCode);
  const categoryLabels: Record<string, string> = {
    networking: 'Networking & Communications',
    software: 'Software Engineering',
    systems: 'Systems Administration',
    gened: 'General Education',
    unknown: 'Unclassified',
  };

  return (
    <div className="relative inline-block" title={`${categoryLabels[category]}: ${subjectCode} — ${subjectName || ''}`}>
      {children}
    </div>
  );
}
export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;

export const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
};

export const TIME_SLOTS = [
  { start: '07:30', end: '08:30', label: '7:30 - 8:30' },
  { start: '08:30', end: '09:30', label: '8:30 - 9:30' },
  { start: '09:30', end: '10:30', label: '9:30 - 10:30' },
  { start: '10:30', end: '11:30', label: '10:30 - 11:30' },
  { start: '11:30', end: '12:30', label: '11:30 - 12:30' },
  { start: '13:30', end: '14:30', label: '1:30 - 2:30' },
  { start: '14:30', end: '15:30', label: '2:30 - 3:30' },
  { start: '15:30', end: '16:30', label: '3:30 - 4:30' },
] as const;

export const ORGANIZATION = {
  college: 'Tawi-Tawi Regional Agricultural College',
  shortName: 'TRAC',
  department: 'Bachelor of Science in Information Technology',
  departmentCode: 'BSIT',
  // Canonical location per institutional source (TRAC official website):
  // "finally transferred to its present site in Barangay, Nalil, Bongao, Tawi-Tawi"
  location: 'Nalil, Bongao, Tawi-Tawi, Philippines',
  // Additional institutional facts verified from the TRAC official website.
  // See lib/evidence/institutional-facts.ts for source-of-truth records.
  institute: 'Institute of Computing Studies',
  legalFoundation: 'Batas Pambansa Blg. 384 (April 8, 1983)',
  systemStatus: 'DEVELOPMENT' as const, // §47: not formally institutionally adopted
} as const;
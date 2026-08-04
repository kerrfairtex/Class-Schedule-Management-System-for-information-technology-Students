export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;

export const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
};

export const TIME_SLOTS = [
  { value: '9:30', label: '9:30 - 10:30' },
  { value: '10:30', label: '10:30 - 11:30' },
  { value: '11:30', label: '11:30 - 12:30' },
  { value: '12:30', label: '12:30 - 1:30' },
  { value: '1:30', label: '1:30 - 2:30' },
  { value: '2:30', label: '2:30 - 3:30' },
  { value: '3:30', label: '3:30 - 4:30' },
  { value: '4:30', label: '4:30 - 5:30' },
] as const;

export const DEFAULT_CREDITS = 4;

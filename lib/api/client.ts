import type { Schedule, ScheduleInput } from '@/lib/domain/types';

let csrfToken: string | null = null;

function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  // We cannot read HttpOnly cookies from document.cookie. The server
  // returns the token in the login response body, so callers must pass
  // it via setCsrfToken() before invoking POSTs.
  return csrfToken;
}

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

export async function apiPost<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = readCsrfCookie();
  if (token) {
    headers['x-csrf-token'] = token;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export interface ScheduleOptions {
  sections: { id: number; code: string }[];
  subjects: { id: number; code: string; name: string }[];
  faculty: { id: number; employee_id: string; first_name: string; last_name: string }[];
  rooms: { id: number; code: string; name: string }[];
  timeSlots: { id: number; day_of_week: string; start_time: string; end_time: string }[];
  semester: { id: number; name: string } | null;
}

export const scheduleApi = {
  getOptions: () => apiGet<ScheduleOptions>('/api/admin?resource=schedule-options'),
  getSchedules: (sectionId?: number) =>
    apiGet<Schedule[]>(
      sectionId
        ? `/api/admin?resource=schedules&sectionId=${sectionId}`
        : '/api/admin?resource=schedules'
    ),
  create: (data: ScheduleInput) => apiPost<Schedule>('/api/admin', { action: 'create-schedule', data }),
  move: (scheduleId: number, timeSlotId: number) =>
    apiPost<Schedule>('/api/admin', { action: 'move-schedule', scheduleId, timeSlotId }),
  delete: (scheduleId: number) =>
    apiPost<{ success: boolean }>('/api/admin', { action: 'delete-schedule', scheduleId }),
  generate: (sectionId: number) =>
    apiPost<{ created: number; errors: string[] }>('/api/admin', {
      action: 'generate-schedules',
      sectionId,
    }),
};

export const facultyApi = {
  getProfile: () => apiGet<{ faculty: Record<string, string>; schedules: Schedule[]; semester: { name: string } }>('/api/faculty'),
};

export const studentApi = {
  getProfile: () =>
    apiGet<{
      student: Record<string, string>;
      schedules: Schedule[];
      semester: { name: string };
    }>('/api/student'),
  searchSection: (code: string) =>
    apiGet<{ schedules: Schedule[]; sectionCode: string; semester: { name: string } }>(
      `/api/student?section=${encodeURIComponent(code)}`
    ),
};
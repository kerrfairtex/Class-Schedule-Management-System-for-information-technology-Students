import type { ConflictResult, Schedule, ScheduleInput, ScheduleStatus } from '@/lib/domain/types';

export async function apiPost<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export interface ScheduleOptions {
  sections: { id: number; code: string; program_id: number; year_level: number; capacity: number }[];
  subjects: { id: number; code: string; name: string }[];
  faculty: { id: number; employee_id: string; first_name: string; last_name: string }[];
  rooms: { id: number; code: string; name: string; capacity: number }[];
  timeSlots: { id: number; day_of_week: string; start_time: string; end_time: string }[];
  semester: { id: number; name: string } | null;
  semesterNumber: number;
  curriculum: { program_id: number; subject_id: number; year_level: number; semester_number: number }[];
  facultySubjects: { faculty_id: number; subject_id: number }[];
}

export const scheduleApi = {
  getOptions: () => apiGet<ScheduleOptions>('/api/admin?resource=schedule-options'),
  getSchedules: (sectionId?: number) =>
    apiGet<Schedule[]>(
      sectionId
        ? `/api/admin?resource=schedules&sectionId=${sectionId}`
        : '/api/admin?resource=schedules'
    ),
  create: (data: ScheduleInput) =>
    apiPost<Schedule & { warnings: string[] }>('/api/admin', { action: 'create-schedule', data }),
  check: (input: Omit<ScheduleInput, 'semester_id'>) =>
    apiGet<ConflictResult>(
      `/api/admin?resource=schedule-check&${new URLSearchParams(
        Object.entries(input).map(([k, v]) => [k, String(v)])
      )}`
    ),
  transition: (scheduleId: number, toStatus: ScheduleStatus) =>
    apiPost<{ ok: boolean }>('/api/admin', { action: 'transition-schedule', scheduleId, toStatus }),
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

import type { ClassComponent, ConflictResult, RoomType, Schedule, ScheduleStatus } from '@/lib/domain/types';

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
  sections: {
    id: number;
    code: string;
    program_id: number;
    year_level: number;
    capacity: number;
    adviser_name?: string | null;
    home_room_id?: number | null;
  }[];
  subjects: { id: number; code: string; name: string; lec_hours?: number | string; lab_hours?: number | string; credit_hours: number }[];
  faculty: { id: number; employee_id: string; first_name: string; last_name: string }[];
  rooms: { id: number; code: string; name: string; capacity: number; room_type?: RoomType }[];
  timeSlots: { id: number; day_of_week: string; start_time: string; end_time: string }[];
  semester: { id: number; name: string } | null;
  semesterNumber: number;
  curriculum: { program_id: number; subject_id: number; year_level: number; semester_number: number }[];
  facultySubjects: { faculty_id: number; subject_id: number }[];
}

export interface ClassDraft {
  section_id: number;
  subject_id: number;
  faculty_id: number;
  room_id: number;
  component: ClassComponent;
  days: string[];
  start_time: string;
  end_time: string;
}

export interface LoadRow {
  subject_id: number;
  subject_code: string;
  subject_name: string;
  component: ClassComponent;
  required_hours: number;
  scheduled_hours: number;
}

export const scheduleApi = {
  getOptions: () => apiGet<ScheduleOptions>('/api/admin?resource=schedule-options'),
  getSchedules: (sectionId?: number) =>
    apiGet<Schedule[]>(
      sectionId
        ? `/api/admin?resource=schedules&sectionId=${sectionId}`
        : '/api/admin?resource=schedules'
    ),
  sectionLoad: (sectionId: number) => apiGet<LoadRow[]>(`/api/admin?resource=section-load&sectionId=${sectionId}`),
  /** Conflict preview per chosen day. `exclude` skips the class being edited. */
  check: (draft: Omit<ClassDraft, 'days'> & { days: string[]; exclude?: number }) =>
    apiGet<{ days: Record<string, ConflictResult> }>(
      `/api/admin?resource=schedule-check&${new URLSearchParams({
        section_id: String(draft.section_id),
        subject_id: String(draft.subject_id),
        faculty_id: String(draft.faculty_id),
        room_id: String(draft.room_id),
        component: draft.component,
        days: draft.days.join(','),
        start_time: draft.start_time,
        end_time: draft.end_time,
        ...(draft.exclude ? { exclude: String(draft.exclude) } : {}),
      })}`
    ),
  createClass: (draft: ClassDraft) =>
    apiPost<{ ids: number[]; warnings: string[] }>('/api/admin', { action: 'create-class', ...draft }),
  update: (
    scheduleId: number,
    changes: Partial<Pick<ClassDraft, 'faculty_id' | 'room_id' | 'component' | 'start_time' | 'end_time'>> & { day_of_week?: string }
  ) => apiPost<Schedule & { warnings: string[] }>('/api/admin', { action: 'update-schedule', scheduleId, ...changes }),
  /** Move to any day and start time, keeping the class length. */
  moveTo: (scheduleId: number, day_of_week: string, start_time: string) =>
    apiPost<Schedule>('/api/admin', { action: 'move-schedule-time', scheduleId, day_of_week, start_time }),
  transition: (scheduleId: number, toStatus: ScheduleStatus) =>
    apiPost<{ ok: boolean }>('/api/admin', { action: 'transition-schedule', scheduleId, toStatus }),
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

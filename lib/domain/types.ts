export type RoleName = 'admin' | 'faculty' | 'student';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: RoleName;
  faculty_id: number | null;
  student_id: number | null;
  is_active: number;
  must_change_password: number;
}

export interface Department {
  id: number;
  code: string;
  name: string;
}

export interface Program {
  id: number;
  department_id: number;
  code: string;
  name: string;
}

export interface AcademicYear {
  id: number;
  label: string;
  start_date: string | null;
  end_date: string | null;
  is_active: number;
}

export interface Semester {
  id: number;
  academic_year_id: number;
  name: string;
  is_active: number;
}

export interface Building {
  id: number;
  code: string;
  name: string;
}

export interface Room {
  id: number;
  building_id: number;
  code: string;
  name: string;
  capacity: number;
  room_type?: RoomType;
  building_code?: string;
  building_name?: string;
}

/** Lecture room or laboratory. */
export type RoomType = 'LECTURE' | 'LAB';

/** The part of a subject a class meeting covers. */
export type ClassComponent = 'LEC' | 'LAB';

export interface Subject {
  id: number;
  code: string;
  name: string;
  credit_hours: number;
  program_id: number;
  /** Units and weekly contact hours, split into lecture and laboratory. */
  lec_units?: number;
  lab_units?: number;
  lec_hours?: number;
  lab_hours?: number;
}

export interface Curriculum {
  id: number;
  program_id: number;
  subject_id: number;
  year_level: number;
  semester_number: number;
  subject_code?: string;
  subject_name?: string;
}

export interface Section {
  id: number;
  code: string;
  program_id: number;
  year_level: number;
  semester_id: number;
}

export interface Faculty {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  department_id: number;
}

export interface Student {
  id: number;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  section_id: number;
  section_code?: string;
}

export interface TimeSlot {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

export interface FacultyAvailability {
  id: number;
  faculty_id: number;
  time_slot_id: number;
  is_available: number;
}

/** Schedule workflow states (spec §32–§34). */
export type ScheduleStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'CANCELLED'
  | 'ARCHIVED';

export interface Schedule {
  id: number;
  section_id: number;
  subject_id: number;
  faculty_id: number;
  room_id: number;
  /** The standard period it was placed in, if any; classes may have free times. */
  time_slot_id: number | null;
  semester_id: number;
  component?: ClassComponent;
  status?: ScheduleStatus;
  data_environment?: string;
  section_code?: string;
  year_level?: number;
  subject_code?: string;
  subject_name?: string;
  faculty_name?: string;
  room_code?: string;
  room_name?: string;
  day_of_week?: string;
  start_time?: string;
  end_time?: string;
}

/**
 * A class meeting to create or check. Give either `time_slot_id` (a standard
 * period) or `day_of_week` + `start_time` + `end_time` (any time, "HH:MM").
 */
export interface ScheduleInput {
  section_id: number;
  subject_id: number;
  faculty_id: number;
  room_id: number;
  semester_id: number;
  time_slot_id?: number | null;
  day_of_week?: string;
  start_time?: string;
  end_time?: string;
  component?: ClassComponent;
}

/**
 * Conflict categories per spec section 33.
 * - faculty     — one faculty assigned to two classes at the same time (BLOCKING)
 * - room        — one room assigned to two classes at the same time (BLOCKING)
 * - section     — one section assigned to two classes at the same time (BLOCKING)
 * - time        — overlapping schedule intervals (BLOCKING)
 * - capacity    — section capacity exceeds room capacity (BLOCKING)
 * - availability — assignment outside permitted faculty/room availability (NON-BLOCKING)
 */
export type ConflictKind = 'faculty' | 'room' | 'section' | 'time' | 'capacity' | 'availability' | 'room-type';

export interface Conflict {
  kind: ConflictKind;
  message: string;
  blocking: boolean;
  conflictingScheduleId?: number;
  /** The clashing class, e.g. "IT 101 (BSIT-1A), Monday 8:00–9:00 AM". */
  detail?: string;
}

export interface ConflictResult {
  hasConflict: boolean;
  blockingConflicts: Conflict[];
  nonBlockingConflicts: Conflict[];
  /** True iff any BLOCKING conflict exists. Per spec section 34, schedules
   *  with blocking conflicts cannot transition to PUBLISHED. */
  hasBlockingConflict: boolean;
}

export interface SessionUser {
  id: number;
  username: string;
  role: RoleName;
  facultyId?: number;
  studentId?: number;
  name: string;
  mustChangePassword?: boolean;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: string | null;
  created_at: string;
}

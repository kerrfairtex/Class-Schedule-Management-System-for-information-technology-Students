import { getDb } from '@/lib/persistence/db';
import type {
  AcademicYear,
  Building,
  Curriculum,
  Department,
  Faculty,
  Program,
  Room,
  Section,
  Semester,
  Student,
  Subject,
  TimeSlot,
} from '@/lib/domain/types';
import { DAYS, TIME_SLOTS } from '@/lib/domain/constants';
import { logAudit } from '@/lib/modules/mod-08-database-service/audit';

// Departments & Programs
export function getDepartments(): Department[] {
  return getDb().prepare('SELECT * FROM departments ORDER BY code').all() as Department[];
}

export function getPrograms(): Program[] {
  return getDb().prepare('SELECT * FROM programs ORDER BY code').all() as Program[];
}

// Academic Years & Semesters
export function getAcademicYears(): AcademicYear[] {
  return getDb().prepare('SELECT * FROM academic_years ORDER BY label DESC').all() as AcademicYear[];
}

export function getActiveAcademicYear(): AcademicYear | null {
  return (
    (getDb()
      .prepare('SELECT * FROM academic_years WHERE is_active = 1 LIMIT 1')
      .get() as AcademicYear) || null
  );
}

export function getSemesters(academicYearId?: number): Semester[] {
  const db = getDb();
  if (academicYearId) {
    return db
      .prepare('SELECT * FROM semesters WHERE academic_year_id = ? ORDER BY name')
      .all(academicYearId) as Semester[];
  }
  return db.prepare('SELECT * FROM semesters ORDER BY name').all() as Semester[];
}

export function getActiveSemester(): Semester | null {
  return (
    (getDb().prepare('SELECT * FROM semesters WHERE is_active = 1 LIMIT 1').get() as Semester) ||
    null
  );
}

// Buildings & Rooms
export function getBuildings(): Building[] {
  return getDb().prepare('SELECT * FROM buildings ORDER BY code').all() as Building[];
}

export function createBuilding(code: string, name: string, userId?: number) {
  const db = getDb();
  const result = db.prepare('INSERT INTO buildings (code, name) VALUES (?, ?)').run(code, name);
  logAudit(userId ?? null, 'CREATE', 'building', Number(result.lastInsertRowid));
}

export function getRooms(): Room[] {
  return getDb()
    .prepare(
      `SELECT r.*, b.code AS building_code, b.name AS building_name
       FROM rooms r JOIN buildings b ON b.id = r.building_id ORDER BY b.code, r.code`
    )
    .all() as Room[];
}

export function createRoom(
  buildingId: number,
  code: string,
  name: string,
  capacity: number,
  userId?: number
) {
  const db = getDb();
  const result = db
    .prepare('INSERT INTO rooms (building_id, code, name, capacity) VALUES (?, ?, ?, ?)')
    .run(buildingId, code, name, capacity);
  logAudit(userId ?? null, 'CREATE', 'room', Number(result.lastInsertRowid));
}

// Subjects & Curriculum
export function getSubjects(): Subject[] {
  return getDb().prepare('SELECT * FROM subjects ORDER BY code').all() as Subject[];
}

export function createSubject(
  code: string,
  name: string,
  creditHours: number,
  programId: number,
  userId?: number
) {
  const db = getDb();
  const result = db
    .prepare('INSERT INTO subjects (code, name, credit_hours, program_id) VALUES (?, ?, ?, ?)')
    .run(code, name, creditHours, programId);
  logAudit(userId ?? null, 'CREATE', 'subject', Number(result.lastInsertRowid));
}

export function getCurriculum(programId?: number): Curriculum[] {
  const db = getDb();
  const sql = `
    SELECT c.*, s.code AS subject_code, s.name AS subject_name
    FROM curriculum c JOIN subjects s ON s.id = c.subject_id
    ${programId ? 'WHERE c.program_id = ?' : ''}
    ORDER BY c.year_level, c.semester_number, s.code
  `;
  return (programId
    ? db.prepare(sql).all(programId)
    : db.prepare(sql).all()) as Curriculum[];
}

export function addCurriculumEntry(
  programId: number,
  subjectId: number,
  yearLevel: number,
  semesterNumber: number,
  userId?: number
) {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO curriculum (program_id, subject_id, year_level, semester_number)
       VALUES (?, ?, ?, ?)`
    )
    .run(programId, subjectId, yearLevel, semesterNumber);
  logAudit(userId ?? null, 'CREATE', 'curriculum', Number(result.lastInsertRowid));
}

// Sections
export function getSections(semesterId?: number): Section[] {
  const db = getDb();
  if (semesterId) {
    return db
      .prepare('SELECT * FROM sections WHERE semester_id = ? ORDER BY code')
      .all(semesterId) as Section[];
  }
  return db.prepare('SELECT * FROM sections ORDER BY code').all() as Section[];
}

export function createSection(
  code: string,
  programId: number,
  yearLevel: number,
  semesterId: number,
  userId?: number
) {
  const db = getDb();
  const result = db
    .prepare(
      'INSERT INTO sections (code, program_id, year_level, semester_id) VALUES (?, ?, ?, ?)'
    )
    .run(code, programId, yearLevel, semesterId);
  logAudit(userId ?? null, 'CREATE', 'section', Number(result.lastInsertRowid));
}

// Faculty
export function getFaculty(): Faculty[] {
  return getDb()
    .prepare('SELECT * FROM faculty ORDER BY last_name, first_name')
    .all() as Faculty[];
}

export function createFaculty(
  data: Omit<Faculty, 'id'>,
  subjectIds: number[],
  userId?: number
) {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO faculty (employee_id, first_name, last_name, email, phone, department_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.employee_id,
      data.first_name,
      data.last_name,
      data.email,
      data.phone,
      data.department_id
    );
  const facultyId = Number(result.lastInsertRowid);
  const insertSubject = db.prepare(
    'INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES (?, ?)'
  );
  for (const subjectId of subjectIds) {
    insertSubject.run(facultyId, subjectId);
  }
  logAudit(userId ?? null, 'CREATE', 'faculty', facultyId);
  return facultyId;
}

// Students
export function getStudents(): Student[] {
  return getDb()
    .prepare(
      `SELECT s.*, sec.code AS section_code
       FROM students s JOIN sections sec ON sec.id = s.section_id
       ORDER BY s.student_id`
    )
    .all() as Student[];
}

export function createStudent(
  data: Omit<Student, 'id' | 'section_code'>,
  userId?: number
) {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO students (student_id, first_name, last_name, email, section_id)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(data.student_id, data.first_name, data.last_name, data.email, data.section_id);
  logAudit(userId ?? null, 'CREATE', 'student', Number(result.lastInsertRowid));
  return Number(result.lastInsertRowid);
}

// Time Slots
export function getTimeSlots(): TimeSlot[] {
  return getDb()
    .prepare('SELECT * FROM time_slots ORDER BY day_of_week, start_time')
    .all() as TimeSlot[];
}

export function ensureTimeSlots() {
  const db = getDb();
  const count = (db.prepare('SELECT COUNT(*) as c FROM time_slots').get() as { c: number }).c;
  if (count > 0) return;

  const insert = db.prepare(
    'INSERT INTO time_slots (day_of_week, start_time, end_time) VALUES (?, ?, ?)'
  );
  for (const day of DAYS) {
    for (const slot of TIME_SLOTS) {
      insert.run(day, slot.start, slot.end);
    }
  }
}

export function getDashboardStats() {
  const db = getDb();
  return {
    faculty: (db.prepare('SELECT COUNT(*) as c FROM faculty').get() as { c: number }).c,
    students: (db.prepare('SELECT COUNT(*) as c FROM students').get() as { c: number }).c,
    subjects: (db.prepare('SELECT COUNT(*) as c FROM subjects').get() as { c: number }).c,
    sections: (db.prepare('SELECT COUNT(*) as c FROM sections').get() as { c: number }).c,
    rooms: (db.prepare('SELECT COUNT(*) as c FROM rooms').get() as { c: number }).c,
    schedules: (db.prepare('SELECT COUNT(*) as c FROM schedules').get() as { c: number }).c,
  };
}

import { getDb, withTransaction } from '@/lib/persistence/db';
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
  User,
} from '@/lib/domain/types';
import { DAYS, TIME_SLOTS } from '@/lib/domain/constants';
import { logAudit } from '@/lib/modules/mod-08-database-service/audit';

// Departments & Programs
export async function getDepartments(): Promise<Department[]> {
  const db = await getDb();
  return db.prepare('SELECT * FROM departments ORDER BY code').all() as Department[];
}

export async function getPrograms(): Promise<Program[]> {
  const db = await getDb();
  return db.prepare('SELECT * FROM programs ORDER BY code').all() as Program[];
}

// Academic Years & Semesters
export async function getAcademicYears(): Promise<AcademicYear[]> {
  const db = await getDb();
  return db.prepare('SELECT * FROM academic_years ORDER BY label DESC').all() as AcademicYear[];
}

export async function getActiveAcademicYear(): Promise<AcademicYear | null> {
  const db = await getDb();
  const ay = await db.prepare('SELECT * FROM academic_years WHERE is_active = 1 LIMIT 1').get() as AcademicYear | undefined;
  return ay ?? null;
}

export async function getSemesters(academicYearId?: number): Promise<Semester[]> {
  const db = await getDb();
  if (academicYearId) {
    return db
      .prepare('SELECT * FROM semesters WHERE academic_year_id = ? ORDER BY name')
      .all(academicYearId) as Semester[];
  }
  return db.prepare('SELECT * FROM semesters ORDER BY name').all() as Semester[];
}

export async function getActiveSemester(): Promise<Semester | null> {
  const db = await getDb();
  const sem = await db.prepare('SELECT * FROM semesters WHERE is_active = 1 LIMIT 1').get() as Semester | undefined;
  return sem ?? null;
}

// Buildings & Rooms
export async function getBuildings(): Promise<Building[]> {
  const db = await getDb();
  return db.prepare('SELECT * FROM buildings ORDER BY code').all() as Building[];
}

export async function createBuilding(code: string, name: string, userId?: number) {
  const db = await getDb();
  const result = await db.prepare('INSERT INTO buildings (code, name) VALUES (?, ?)').run(code, name);
  await logAudit(userId ?? null, 'CREATE', 'building', toInsertId(result));
  return toInsertId(result);
}

export async function getRooms(): Promise<Room[]> {
  const db = await getDb();
  return db
    .prepare(
      `SELECT r.*, b.code AS building_code, b.name AS building_name
       FROM rooms r JOIN buildings b ON b.id = r.building_id ORDER BY b.code, r.code`
    )
    .all() as Room[];
}

/**
 * Read the generated primary key from an INSERT result.
 *
 * better-sqlite3 exposes `lastInsertRowid`; the PostgreSQL facade exposes
 * `lastID` (and now also `lastInsertRowid`). Reading `lastInsertRowid` only
 * returned undefined on PostgreSQL, which became NaN and then failed against
 * int4 columns with 'invalid input syntax for type integer: "NaN"'.
 */
function toInsertId(result: any): number | null {
  if (!result) return null;
  const raw = result.lastInsertRowid ?? result.lastID;
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * True when a DELETE actually removed a row.
 * Both adapters report the affected row count in `changes`.
 */
function didDelete(result: any): boolean {
  if (!result) return false;
  const changes = Number(result.changes ?? 0);
  return Number.isFinite(changes) && changes > 0;
}

export async function createRoom(
  buildingId: number,
  code: string,
  name: string,
  capacity: number,
  userId?: number
) {
  const db = await getDb();
  const result = await db
    .prepare('INSERT INTO rooms (building_id, code, name, capacity) VALUES (?, ?, ?, ?)')
    .run(buildingId, code, name, capacity);
  const id = toInsertId(result);
  await logAudit(userId ?? null, 'CREATE', 'room', id);
  return id;
}

export async function updateRoom(
  id: number,
  buildingId: number,
  code: string,
  name: string,
  capacity: number,
  userId?: number
) {
  const db = await getDb();
  await db
    .prepare('UPDATE rooms SET building_id = ?, code = ?, name = ?, capacity = ? WHERE id = ?')
    .run(buildingId, code, name, capacity, id);
  await logAudit(userId ?? null, 'UPDATE', 'room', id);
  return id;
}

export async function deleteRoom(id: number, userId?: number): Promise<boolean> {
  const db = await getDb();
  // schedules.room_id references rooms.id.
  const scheduleCount = await db
    .prepare('SELECT COUNT(*) as c FROM schedules WHERE room_id = ?')
    .get(id) as { c: number };
  if ((scheduleCount?.c ?? 0) > 0) {
    throw new Error('Cannot delete a Room that still has schedules');
  }
  const result = await db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
  if (!didDelete(result)) return false;
  await logAudit(userId ?? null, 'DELETE', 'room', id);
  return true;
}

// Subjects & Curriculum
export async function getSubjects(): Promise<Subject[]> {
  const db = await getDb();
  return db.prepare('SELECT * FROM subjects ORDER BY code').all() as Subject[];
}

export async function createSubject(
  code: string,
  name: string,
  creditHours: number,
  programId: number,
  userId?: number
) {
  const db = await getDb();
  const result = await db
    .prepare('INSERT INTO subjects (code, name, credit_hours, program_id) VALUES (?, ?, ?, ?)')
    .run(code, name, creditHours, programId);
  const id = toInsertId(result);
  await logAudit(userId ?? null, 'CREATE', 'subject', id);
  return id;
}

export async function updateSubject(
  id: number,
  code: string,
  name: string,
  creditHours: number,
  programId: number,
  userId?: number
) {
  const db = await getDb();
  await db
    .prepare('UPDATE subjects SET code = ?, name = ?, credit_hours = ?, program_id = ? WHERE id = ?')
    .run(code, name, creditHours, programId, id);
  await logAudit(userId ?? null, 'UPDATE', 'subject', id);
  return id;
}

export async function deleteSubject(id: number, userId?: number): Promise<boolean> {
  const db = await getDb();
  // curriculum.subject_id and schedules.subject_id reference subjects.id.
  const scheduleCount = await db
    .prepare('SELECT COUNT(*) as c FROM schedules WHERE subject_id = ?')
    .get(id) as { c: number };
  if ((scheduleCount?.c ?? 0) > 0) {
    throw new Error('Cannot delete a Subject that still has schedules');
  }
  const result = await db.prepare('DELETE FROM subjects WHERE id = ?').run(id);
  if (!didDelete(result)) return false;
  await logAudit(userId ?? null, 'DELETE', 'subject', id);
  return true;
}

export async function getCurriculum(programId?: number): Promise<Curriculum[]> {
  const db = await getDb();
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

export async function addCurriculumEntry(
  programId: number,
  subjectId: number,
  yearLevel: number,
  semesterNumber: number,
  userId?: number
) {
  const db = await getDb();
  const result = await db
    .prepare(
      `INSERT INTO curriculum (program_id, subject_id, year_level, semester_number)
       VALUES (?, ?, ?, ?)`
    )
    .run(programId, subjectId, yearLevel, semesterNumber);
  const id = toInsertId(result);
  await logAudit(userId ?? null, 'CREATE', 'curriculum', id);
  return id;
}

// Sections
export async function getSections(semesterId?: number): Promise<Section[]> {
  const db = await getDb();
  if (semesterId) {
    return db
      .prepare('SELECT * FROM sections WHERE semester_id = ? ORDER BY code')
      .all(semesterId) as Section[];
  }
  return db.prepare('SELECT * FROM sections ORDER BY code').all() as Section[];
}

export async function createSection(
  code: string,
  programId: number,
  yearLevel: number,
  semesterId: number,
  userId?: number
) {
  const db = await getDb();
  const result = await db
    .prepare(
      'INSERT INTO sections (code, program_id, year_level, semester_id) VALUES (?, ?, ?, ?)'
    )
    .run(code, programId, yearLevel, semesterId);
  const id = toInsertId(result);
  await logAudit(userId ?? null, 'CREATE', 'section', id);
  return id;
}

export async function updateSection(
  id: number,
  code: string,
  programId: number,
  yearLevel: number,
  semesterId: number,
  userId?: number
) {
  const db = await getDb();
  await db
    .prepare(
      'UPDATE sections SET code = ?, program_id = ?, year_level = ?, semester_id = ? WHERE id = ?'
    )
    .run(code, programId, yearLevel, semesterId, id);
  await logAudit(userId ?? null, 'UPDATE', 'section', id);
  return id;
}

export async function deleteSection(id: number, userId?: number): Promise<boolean> {
  const db = await getDb();
  // students.section_id and schedules.section_id reference sections.id with
  // NO ACTION, so a referenced section cannot be removed.
  const studentCount = await db
    .prepare('SELECT COUNT(*) as c FROM students WHERE section_id = ?')
    .get(id) as { c: number };
  if ((studentCount?.c ?? 0) > 0) {
    throw new Error('Cannot delete a Section that still has students enrolled');
  }
  const scheduleCount = await db
    .prepare('SELECT COUNT(*) as c FROM schedules WHERE section_id = ?')
    .get(id) as { c: number };
  if ((scheduleCount?.c ?? 0) > 0) {
    throw new Error('Cannot delete a Section that still has schedules');
  }
  const result = await db.prepare('DELETE FROM sections WHERE id = ?').run(id);
  if (!didDelete(result)) return false;
  await logAudit(userId ?? null, 'DELETE', 'section', id);
  return true;
}

// Faculty
export async function getFaculty(): Promise<Faculty[]> {
  const db = await getDb();
  return db
    .prepare('SELECT * FROM faculty ORDER BY last_name, first_name')
    .all() as Faculty[];
}

export async function createFaculty(
  data: Omit<Faculty, 'id'>,
  subjectIds: number[],
  userId?: number
) {
  const db = await getDb();
  return withTransaction(async () => {
    const result = await db
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
    const facultyId = toInsertId(result);
    if (facultyId === null) {
      throw new Error('Faculty record was created but its ID could not be read');
    }
    const insertSubject = db.prepare(
      'INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES (?, ?)'
    );
    for (const subjectId of subjectIds) {
      await insertSubject.run(facultyId, subjectId);
    }
    await logAudit(userId ?? null, 'CREATE', 'faculty', facultyId);
    return facultyId;
  });
}

export async function updateFaculty(
  id: number,
  data: Omit<Faculty, 'id'>,
  subjectIds: number[],
  userId?: number
) {
  const db = await getDb();
  return withTransaction(async () => {
    await db
      .prepare(
        `UPDATE faculty SET employee_id = ?, first_name = ?, last_name = ?, email = ?, phone = ?, department_id = ?
         WHERE id = ?`
      )
      .run(
        data.employee_id,
        data.first_name,
        data.last_name,
        data.email,
        data.phone,
        data.department_id,
        id
      );
    await db.prepare('DELETE FROM faculty_subjects WHERE faculty_id = ?').run(id);
    const insertSubject = db.prepare(
      'INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES (?, ?)'
    );
    for (const subjectId of subjectIds) {
      await insertSubject.run(id, subjectId);
    }
    await logAudit(userId ?? null, 'UPDATE', 'faculty', id);
    return id;
  });
}

export async function deleteFaculty(id: number, userId?: number): Promise<boolean> {
  const db = await getDb();
  return withTransaction(async () => {
    // Delete referencing rows FIRST. users.faculty_id and
    // faculty_subjects.faculty_id have NO ACTION delete rules, so removing
    // the faculty row before them raises a foreign key violation.
    await db.prepare('DELETE FROM faculty_availability WHERE faculty_id = ?').run(id);
    await db.prepare('DELETE FROM faculty_subjects WHERE faculty_id = ?').run(id);
    await db.prepare('DELETE FROM users WHERE faculty_id = ?').run(id);
    const result = await db.prepare('DELETE FROM faculty WHERE id = ?').run(id);
    if (!didDelete(result)) return false;
    await logAudit(userId ?? null, 'DELETE', 'faculty', id);
    return true;
  });
}

// Students
export async function getStudents(): Promise<Student[]> {
  const db = await getDb();
  return db
    .prepare(
      `SELECT s.*, sec.code AS section_code
       FROM students s JOIN sections sec ON sec.id = s.section_id
       ORDER BY s.student_id`
    )
    .all() as Student[];
}

export async function createStudent(
  data: Omit<Student, 'id' | 'section_code'>,
  userId?: number
) {
  const db = await getDb();
  const result = await db
    .prepare(
      `INSERT INTO students (student_id, first_name, last_name, email, section_id)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(data.student_id, data.first_name, data.last_name, data.email, data.section_id);
  const id = toInsertId(result);
  await logAudit(userId ?? null, 'CREATE', 'student', id);
  return id;
}

export async function updateStudent(
  id: number,
  data: Omit<Student, 'id' | 'section_code'>,
  userId?: number
) {
  const db = await getDb();
  await db
    .prepare(
      `UPDATE students SET student_id = ?, first_name = ?, last_name = ?, email = ?, section_id = ?
       WHERE id = ?`
    )
    .run(data.student_id, data.first_name, data.last_name, data.email, data.section_id, id);
  await logAudit(userId ?? null, 'UPDATE', 'student', id);
  return id;
}

export async function deleteStudent(id: number, userId?: number): Promise<boolean> {
  const db = await getDb();
  return withTransaction(async () => {
    // users.student_id references students.id — remove the user first.
    await db.prepare('DELETE FROM users WHERE student_id = ?').run(id);
    const result = await db.prepare('DELETE FROM students WHERE id = ?').run(id);
    if (!didDelete(result)) return false;
    await logAudit(userId ?? null, 'DELETE', 'student', id);
    return true;
  });
}

// Users
export async function getUsers(): Promise<User[]> {
  const db = await getDb();
  return db
    .prepare(
      `SELECT u.id, u.username, u.role, u.is_active, u.must_change_password,
              u.faculty_id, u.student_id,
              CASE
                WHEN u.role = 'faculty' THEN (SELECT employee_id FROM faculty WHERE id = u.faculty_id)
                WHEN u.role = 'student' THEN (SELECT student_id FROM students WHERE id = u.student_id)
                ELSE NULL
              END AS external_id
       FROM users u
       ORDER BY u.role, u.username`
    )
    .all() as User[];
}

export async function updateUser(
  id: number,
  data: { role: string; is_active: number; must_change_password: number; faculty_id?: number | null; student_id?: number | null },
  userId?: number
) {
  const db = await getDb();
  await db
    .prepare(
      `UPDATE users SET role = ?, is_active = ?, must_change_password = ?, faculty_id = ?, student_id = ?
       WHERE id = ?`
    )
    .run(
      data.role,
      data.is_active,
      data.must_change_password,
      data.faculty_id ?? null,
      data.student_id ?? null,
      id
    );
  await logAudit(userId ?? null, 'UPDATE', 'user', id);
  return id;
}

export async function deleteUser(id: number, userId?: number): Promise<boolean> {
  const db = await getDb();
  const result = await db.prepare('DELETE FROM users WHERE id = ?').run(id);
  if (!didDelete(result)) return false;
  await logAudit(userId ?? null, 'DELETE', 'user', id);
  return true;
}

// Time Slots
export async function getTimeSlots(): Promise<TimeSlot[]> {
  const db = await getDb();
  return db
    .prepare('SELECT * FROM time_slots ORDER BY day_of_week, start_time')
    .all() as TimeSlot[];
}

export async function ensureTimeSlots() {
  const db = await getDb();
  const count = (db.prepare('SELECT COUNT(*) as c FROM time_slots').get() as { c: number }).c;
  if (count > 0) return;

  const insert = db.prepare(
    'INSERT INTO time_slots (day_of_week, start_time, end_time) VALUES (?, ?, ?)'
  );
  for (const day of DAYS) {
    for (const slot of TIME_SLOTS) {
      await insert.run(day, slot.start, slot.end);
    }
  }
}

export async function getDashboardStats() {
  const db = await getDb();
  const facultyRow = await db.prepare('SELECT COUNT(*) as c FROM faculty').get() as { c: number } | null;
  const studentsRow = await db.prepare('SELECT COUNT(*) as c FROM students').get() as { c: number } | null;
  const subjectsRow = await db.prepare('SELECT COUNT(*) as c FROM subjects').get() as { c: number } | null;
  const sectionsRow = await db.prepare('SELECT COUNT(*) as c FROM sections').get() as { c: number } | null;
  const roomsRow = await db.prepare('SELECT COUNT(*) as c FROM rooms').get() as { c: number } | null;
  const schedulesRow = await db.prepare('SELECT COUNT(*) as c FROM schedules').get() as { c: number } | null;
  return {
    faculty: facultyRow?.c ?? 0,
    students: studentsRow?.c ?? 0,
    subjects: subjectsRow?.c ?? 0,
    sections: sectionsRow?.c ?? 0,
    rooms: roomsRow?.c ?? 0,
    schedules: schedulesRow?.c ?? 0,
  };
}

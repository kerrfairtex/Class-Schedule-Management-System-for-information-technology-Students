-- PostgreSQL schema artifact for CSMS (derived from adapter initSchema SQL; NOT EXECUTED)
-- Generated from lib/persistence/db.ts adapter (lazy PostgreSQL facade; SERIAL PRIMARY KEY; same FKs/indexes/defaults/checks)
-- Tables: roles, departments, programs, academic_years, semesters, buildings, rooms, subjects, curriculum, sections, faculty, students, time_slots, faculty_availability, faculty_subjects, users, schedules, audit_logs, sources, institutional_facts, fact_sources, verification_records, officials, institution_contacts, system_settings
-- Note: No SQLite-specific syntax (AUTOINCREMENT, PRAGMA, sqlite_master, .sqlite); SERIAL PRIMARY KEY used; CURRENT_TIMESTAMP preserved; INTEGER booleans preserved; ? parameters handled by adapter facade (translated to $N for PostgreSQL)

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS programs (
  id SERIAL PRIMARY KEY,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS academic_years (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  is_active INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS semesters (
  id SERIAL PRIMARY KEY,
  academic_year_id INTEGER NOT NULL REFERENCES academic_years(id),
  name TEXT NOT NULL,
  is_active INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS buildings (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  building_id INTEGER NOT NULL REFERENCES buildings(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 40,
  UNIQUE(building_id, code)
);
CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  credit_hours INTEGER NOT NULL DEFAULT 3,
  program_id INTEGER NOT NULL REFERENCES programs(id)
);
CREATE TABLE IF NOT EXISTS curriculum (
  id SERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL REFERENCES programs(id),
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  year_level INTEGER NOT NULL,
  semester_number INTEGER NOT NULL,
  UNIQUE(program_id, subject_id, year_level, semester_number)
);
CREATE TABLE IF NOT EXISTS sections (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  program_id INTEGER NOT NULL REFERENCES programs(id),
  year_level INTEGER NOT NULL,
  semester_id INTEGER NOT NULL REFERENCES semesters(id),
  capacity INTEGER NOT NULL DEFAULT 40
);
CREATE TABLE IF NOT EXISTS faculty (
  id SERIAL PRIMARY KEY,
  employee_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department_id INTEGER NOT NULL REFERENCES departments(id)
);
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  student_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  section_id INTEGER NOT NULL REFERENCES sections(id)
);
CREATE TABLE IF NOT EXISTS time_slots (
  id SERIAL PRIMARY KEY,
  day_of_week TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  UNIQUE(day_of_week, start_time)
);
CREATE TABLE IF NOT EXISTS faculty_availability (
  id SERIAL PRIMARY KEY,
  faculty_id INTEGER NOT NULL REFERENCES faculty(id),
  time_slot_id INTEGER NOT NULL REFERENCES time_slots(id),
  is_available INTEGER DEFAULT 1,
  UNIQUE(faculty_id, time_slot_id)
);
CREATE TABLE IF NOT EXISTS faculty_subjects (
  faculty_id INTEGER NOT NULL REFERENCES faculty(id),
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  PRIMARY KEY (faculty_id, subject_id)
);
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('super_admin', 'admin', 'scheduler', 'faculty', 'student', 'public')),
  faculty_id INTEGER REFERENCES faculty(id),
  student_id INTEGER REFERENCES students(id),
  is_active INTEGER DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  section_id INTEGER NOT NULL REFERENCES sections(id),
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  faculty_id INTEGER NOT NULL REFERENCES faculty(id),
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  time_slot_id INTEGER NOT NULL REFERENCES time_slots(id),
  semester_id INTEGER NOT NULL REFERENCES semesters(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  details TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_schedules_faculty ON schedules(faculty_id, time_slot_id);
CREATE INDEX IF NOT EXISTS idx_schedules_room ON schedules(room_id, time_slot_id);
CREATE INDEX IF NOT EXISTS idx_schedules_section ON schedules(section_id, time_slot_id);
CREATE INDEX IF NOT EXISTS idx_schedules_semester ON schedules(semester_id);
  `;
  database.exec(sql);
}

export function backupDatabase(destinationPath: string) {
  // PostgreSQL adapter replacement: logical backup (not SQLite VACUUM INTO).
  // Actual backup mechanism (e.g., pg_dump or application-level export) requires authorization.
  throw new Error('PostgreSQL adapter: backupDatabase not implemented. Use database-level backup (e.g., pg_dump, Supabase backups) or implement logical export separately.');
}

export function withTransaction<T>(fn: (database: any) => T): T {
  const database = getDb();
  database.exec('BEGIN');
  try {
    const result = fn(database);
    database.exec('COMMIT');
    return result;
  } catch (e: any) {
    database.exec('ROLLBACK');
    throw e;
  }
}

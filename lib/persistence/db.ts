import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { ensureSeeded } from './seed';

const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'csms-data')
  : path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'csms.db');

let db: Database.Database | null = null;

export function setDb(database: Database.Database | null) {
  db = database;
}

export function resetDb() {
  db = null;
}

export function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_id INTEGER NOT NULL REFERENCES departments(id),
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS academic_years (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      is_active INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS semesters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      academic_year_id INTEGER NOT NULL REFERENCES academic_years(id),
      name TEXT NOT NULL,
      is_active INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS buildings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      building_id INTEGER NOT NULL REFERENCES buildings(id),
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 40,
      UNIQUE(building_id, code)
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      credit_hours INTEGER NOT NULL DEFAULT 3,
      program_id INTEGER NOT NULL REFERENCES programs(id)
    );

    CREATE TABLE IF NOT EXISTS curriculum (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL REFERENCES programs(id),
      subject_id INTEGER NOT NULL REFERENCES subjects(id),
      year_level INTEGER NOT NULL,
      semester_number INTEGER NOT NULL,
      UNIQUE(program_id, subject_id, year_level, semester_number)
    );

    CREATE TABLE IF NOT EXISTS sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      program_id INTEGER NOT NULL REFERENCES programs(id),
      year_level INTEGER NOT NULL,
      semester_id INTEGER NOT NULL REFERENCES semesters(id)
    );

    CREATE TABLE IF NOT EXISTS faculty (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      department_id INTEGER NOT NULL REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      section_id INTEGER NOT NULL REFERENCES sections(id)
    );

    CREATE TABLE IF NOT EXISTS time_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_of_week TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      UNIQUE(day_of_week, start_time)
    );

    CREATE TABLE IF NOT EXISTS faculty_availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'faculty', 'student')),
      faculty_id INTEGER REFERENCES faculty(id),
      student_id INTEGER REFERENCES students(id),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
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
  `);
}

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
    ensureSeeded();
  }
  return db;
}

export function getDbPath(): string {
  return DB_PATH;
}

export function withTransaction<T>(fn: (database: Database.Database) => T): T {
  const database = getDb();
  const run = database.transaction(fn);
  return run(database);
}

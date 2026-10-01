// Database adapter — supports both PostgreSQL (production) and SQLite (local development)
// Note: 'pg' package required for PostgreSQL; 'better-sqlite3' required for SQLite

import fs from 'fs';
import path from 'path';

function getDataDir(): string {
  if (process.env.CSMS_DATA_DIR) {
    return path.resolve(process.env.CSMS_DATA_DIR);
  }
  return path.join(process.cwd(), 'data');
}

let db: any = null;

export function setDb(database: any) {
  db = database;
}

export function resetDb() {
  db = null;
}

/**
 * Convert SQLite '?' placeholders to PostgreSQL '$1', '$2', ... ordinals.
 * A counter is required because String.replace's callback 2nd arg is the
 * match *index* (offset), not a sequential ordinal.
 */
function toPgSql(sql: string): string {
  let n = 0;
  return sql.replace(/\?/g, () => '$' + (++n));
}

// Lazy connect: DATABASE_URL read ONLY inside getDb(); not at import time.
export async function getDb(): Promise<any> {
  if (!db) {
    const url = process.env.DATABASE_URL; // Only use explicit DATABASE_URL, not SUPABASE_URL
    
    if (url && url.trim() !== '') {
      // PostgreSQL adapter (production)
      try {
        const pg = require('pg');
        const client = new pg.Client({ connectionString: url });
        await client.connect();
        
        // Ensure search_path is set to csms for all queries
        await client.query('SET search_path TO csms');
        
        const facade = {
          prepare: (sql: string) => ({
            get: async (...params: any[]) => {
              const pgSql = toPgSql(sql);

              const res = await client.query(pgSql, params);
              return res.rows[0] || null;
            },
            all: async (...params: any[]) => {
              const pgSql = toPgSql(sql);

              const res = await client.query(pgSql, params);
              return res.rows;
            },
            run: async (...params: any[]) => {
              const pgSql = toPgSql(sql);

              const res = await client.query(pgSql, params);
              return {
                lastID: res.rows?.[0]?.id || null,
                changes: res.rowCount || 0,
              };
            },
          }),
          exec: async (sql: string) => {
            await client.query(sql);
          },
          pragma: () => { /* PostgreSQL adapter: no PRAGMA; no-op */ },
        };
        db = facade;
      } catch (e: any) {
        throw new Error('PostgreSQL adapter initialization failed. Ensure DATABASE_URL is set and pg package is installed. Error: ' + e.message);
      }
    } else {
      // SQLite adapter (local development)
      try {
        const Database = require('better-sqlite3');
        const dataDir = getDataDir();
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        const dbPath = path.join(dataDir, 'csms.db');
        const sqliteDb = new Database(dbPath);
        sqliteDb.pragma('foreign_keys = ON');
        db = sqliteDb;
      } catch (e: any) {
        throw new Error('SQLite adapter initialization failed. Ensure better-sqlite3 package is installed. Error: ' + e.message);
      }
    }
  }
  return db;
}

export function getDbPath(): string {
  const url = process.env.DATABASE_URL;
  if (url && url.trim() !== '') return url;
  return path.join(getDataDir(), 'csms.db');
}

export function initSchema(database: any) {
  const isPostgres = typeof database.exec === 'function' && 
    typeof database.prepare === 'function' &&
    database.prepare.toString().includes('client.query');
  
  const sqliteSql = `
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  semester_id INTEGER NOT NULL REFERENCES semesters(id),
  capacity INTEGER NOT NULL DEFAULT 40
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
  role TEXT NOT NULL CHECK(role IN ('super_admin', 'admin', 'scheduler', 'faculty', 'student', 'public')),
  faculty_id INTEGER REFERENCES faculty(id),
  student_id INTEGER REFERENCES students(id),
  is_active INTEGER DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 0,
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

  const pgSql = `
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

  database.exec(isPostgres ? pgSql : sqliteSql);
}

export function backupDatabase(destinationPath: string) {
  const isPostgres = typeof (getDb() as any).exec === 'function' && 
    (getDb() as any).exec.toString().includes('client.query');
  if (isPostgres) {
    throw new Error('PostgreSQL adapter: backupDatabase not implemented. Use database-level backup (e.g., pg_dump, Supabase backups) or implement logical export separately.');
  }
  const dataDir = getDataDir();
  const sourcePath = path.join(dataDir, 'csms.db');
  fs.copyFileSync(sourcePath, destinationPath);
}

export async function withTransaction<T>(fn: (database: any) => Promise<T>): Promise<T> {
  const database = await getDb();
  const isPostgres = typeof database.exec === 'function' && 
    typeof database.prepare === 'function' &&
    database.prepare.toString().includes('client.query');
  
  if (isPostgres) {
    await database.exec('BEGIN');
    try {
      const result = await fn(database);
      await database.exec('COMMIT');
      return result;
    } catch (e: any) {
      await database.exec('ROLLBACK');
      throw e;
    }
  } else {
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
}

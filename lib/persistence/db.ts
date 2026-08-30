import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { ensureSeeded, ensureEvidenceSeeded } from './seed';

function getDataDir(): string {
  if (process.env.CSMS_DATA_DIR) {
    return path.resolve(process.env.CSMS_DATA_DIR);
  }

  if (process.env.VERCEL) {
    return path.join('/tmp', 'csms-data');
  }

  if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID) {
    return path.join('/data', 'csms-data');
  }

  return path.join(process.cwd(), 'data');
}

const DATA_DIR = getDataDir();
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

    -- ─────────────────────────────────────────────────────────────────────
    -- Source-of-Truth evidence layer (spec §16, §17, §18, §19, §53)
    -- Per spec §76: institutional facts must be traceable to authoritative
    -- sources, classified by status, and reviewed on a schedule.
    -- ─────────────────────────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      source_type TEXT NOT NULL CHECK(source_type IN (
        'LAW','OFFICIAL_WEBSITE','GOVERNMENT','ACADEMIC_RECORD','SECONDARY','SOCIAL'
      )),
      authority_level INTEGER NOT NULL CHECK(authority_level BETWEEN 1 AND 6),
      publisher TEXT NOT NULL,
      url TEXT,
      document_date TEXT,
      effective_date TEXT,
      accessed_at TEXT NOT NULL,
      content_hash TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','DEPRECATED')),
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS institutional_facts (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL DEFAULT 'TRAC',
      category TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      value_type TEXT NOT NULL DEFAULT 'string' CHECK(value_type IN ('string','date','enum','list','number')),
      status TEXT NOT NULL CHECK(status IN (
        'VERIFIED','OFFICIAL','GOVERNMENT_SUPPORTED','CORROBORATED',
        'PENDING_VERIFICATION','UNVERIFIED','CONFLICTING','DEPRECATED'
      )),
      confidence TEXT NOT NULL CHECK(confidence IN ('HIGH','MEDIUM','LOW','UNVERIFIED')),
      effective_from TEXT,
      effective_until TEXT,
      verified_at TEXT NOT NULL,
      verified_by TEXT,
      review_due_at TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_facts_status ON institutional_facts(status);
    CREATE INDEX IF NOT EXISTS idx_facts_category ON institutional_facts(category);
    CREATE INDEX IF NOT EXISTS idx_facts_review ON institutional_facts(review_due_at);

    CREATE TABLE IF NOT EXISTS fact_sources (
      fact_id TEXT NOT NULL REFERENCES institutional_facts(id),
      source_id TEXT NOT NULL REFERENCES sources(id),
      evidence_excerpt TEXT,
      page_reference TEXT,
      section_reference TEXT,
      supports INTEGER NOT NULL DEFAULT 1 CHECK(supports IN (0,1)),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (fact_id, source_id)
    );

    CREATE TABLE IF NOT EXISTS verification_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fact_id TEXT NOT NULL REFERENCES institutional_facts(id),
      verified_by TEXT NOT NULL,
      verified_at TEXT NOT NULL,
      verification_method TEXT,
      source_count INTEGER NOT NULL DEFAULT 1,
      authority_level INTEGER NOT NULL,
      review_notes TEXT,
      next_review_date TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_verification_fact ON verification_records(fact_id);

    -- Officials (spec §13, §53): college president, registrar, dean, etc.
    CREATE TABLE IF NOT EXISTS officials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      position TEXT NOT NULL,
      first_name TEXT NOT NULL,
      middle_name TEXT,
      last_name TEXT NOT NULL,
      suffix TEXT,
      title TEXT,
      office TEXT,
      effective_from TEXT,
      effective_until TEXT,
      source_id TEXT REFERENCES sources(id),
      status TEXT NOT NULL DEFAULT 'CURRENT' CHECK(status IN ('CURRENT','FORMER','PENDING_VERIFICATION')),
      data_environment TEXT NOT NULL DEFAULT 'DEMO' CHECK(data_environment IN ('DEMO','VERIFIED','PRODUCTION')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Institution contacts (spec §13, §53): office emails, phones.
    CREATE TABLE IF NOT EXISTS institution_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      office TEXT NOT NULL,
      contact_type TEXT NOT NULL CHECK(contact_type IN ('email','phone','mobile','fax','address')),
      value TEXT NOT NULL,
      label TEXT,
      is_primary INTEGER DEFAULT 0,
      source_id TEXT REFERENCES sources(id),
      verified_at TEXT,
      data_environment TEXT NOT NULL DEFAULT 'VERIFIED' CHECK(data_environment IN ('DEMO','VERIFIED','PRODUCTION')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- System settings (spec §64): data_environment, system_status
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT
    );
  `);

  // Migrations for previously-deployed databases (spec §55 Rule 6:
  // institutional facts cannot be deleted destructively; supersede instead).
  // We add data_environment columns with safe defaults.
  const alterStatements: Array<{ table: string; column: string; sql: string }> = [
    { table: 'faculty', column: 'data_environment', sql: "ALTER TABLE faculty ADD COLUMN data_environment TEXT NOT NULL DEFAULT 'DEMO'" },
    { table: 'students', column: 'data_environment', sql: "ALTER TABLE students ADD COLUMN data_environment TEXT NOT NULL DEFAULT 'DEMO'" },
    { table: 'rooms', column: 'data_environment', sql: "ALTER TABLE rooms ADD COLUMN data_environment TEXT NOT NULL DEFAULT 'DEMO'" },
    { table: 'subjects', column: 'data_environment', sql: "ALTER TABLE subjects ADD COLUMN data_environment TEXT NOT NULL DEFAULT 'DEMO'" },
    { table: 'sections', column: 'data_environment', sql: "ALTER TABLE sections ADD COLUMN data_environment TEXT NOT NULL DEFAULT 'DEMO'" },
    { table: 'sections', column: 'capacity', sql: "ALTER TABLE sections ADD COLUMN capacity INTEGER NOT NULL DEFAULT 40" },
    { table: 'schedules', column: 'data_environment', sql: "ALTER TABLE schedules ADD COLUMN data_environment TEXT NOT NULL DEFAULT 'DEMO'" },
    { table: 'schedules', column: 'status', sql: "ALTER TABLE schedules ADD COLUMN status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PENDING_REVIEW','APPROVED','PUBLISHED','CANCELLED','ARCHIVED'))" },
    { table: 'schedules', column: 'published_at', sql: "ALTER TABLE schedules ADD COLUMN published_at TEXT" },
    { table: 'schedules', column: 'approved_by', sql: "ALTER TABLE schedules ADD COLUMN approved_by TEXT" },
  ];
  for (const m of alterStatements) {
    const cols = database.prepare(`PRAGMA table_info(${m.table})`).all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === m.column)) {
      database.exec(m.sql);
    }
  }
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
    ensureEvidenceSeeded();
  }
  return db;
}

export function getDbPath(): string {
  return DB_PATH;
}

export function backupDatabase(destinationPath: string) {
  const database = getDb();
  const destinationDir = path.dirname(destinationPath);
  if (!fs.existsSync(destinationDir)) {
    fs.mkdirSync(destinationDir, { recursive: true });
  }

  database.prepare('VACUUM INTO ?').run(destinationPath);
}

export function withTransaction<T>(fn: (database: Database.Database) => T): T {
  const database = getDb();
  const run = database.transaction(fn);
  return run(database);
}

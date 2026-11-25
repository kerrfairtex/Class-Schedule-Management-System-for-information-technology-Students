// Database adapter — supports both PostgreSQL (production) and SQLite (local development)
// Note: 'pg' package required for PostgreSQL; 'better-sqlite3' required for SQLite

import fs from 'fs';
import path from 'path';

export function getDataDir(): string {
  if (process.env.CSMS_DATA_DIR) {
    return path.resolve(process.env.CSMS_DATA_DIR);
  }
  return path.join(process.cwd(), 'data');
}

/** True when the active adapter is the PostgreSQL facade. */
export function isPostgres(database: any): boolean {
  if (!database) return false;
  if (database.__isPostgres === true) return true;
  if (database.__isPostgres === false) return false;
  return (
    typeof database.prepare === 'function' &&
    database.prepare.toString().includes('client.query')
  );
}

/**
 * The only schema CSMS reads or writes. The database is shared with other
 * apps, so every connection is pinned here and never falls back to `public`.
 */
export const PG_SCHEMA = 'csms';

let db: any = null;
let pool: any = null;
let connecting: Promise<any> | null = null;

export function setDb(database: any) {
  db = database;
}

export function resetDb() {
  db = null;
  if (pool) {
    pool.end().catch(() => {});
    pool = null;
  }
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

type PgQuery = (sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }>;

/**
 * Wrap a query function in the better-sqlite3-style API the services use.
 * `query` is either the pool (one connection per statement) or a single
 * checked-out client (inside a transaction).
 */
function createPgFacade(query: PgQuery, transaction: <T>(fn: (database: any) => Promise<T>) => Promise<T>) {
  const facade = {
    __isPostgres: true,
    prepare: (sql: string) => ({
      get: async (...params: any[]) => {
        const res = await query(toPgSql(sql), params);
        return res.rows[0] || null;
      },
      all: async (...params: any[]) => {
        const res = await query(toPgSql(sql), params);
        return res.rows;
      },
      run: async (...params: any[]) => {
        // RETURNING * (not RETURNING id) so INSERTs expose the generated key as
        // `lastID` / `lastInsertRowid`, and tables without an `id` column
        // (e.g. faculty_subjects) do not raise "column id does not exist".
        const pgSql = toPgSql(sql);
        const withReturning = /^\s*insert\b/i.test(pgSql) ? `${pgSql} RETURNING *` : pgSql;
        const res = await query(withReturning, params);
        const insertedId = res.rows?.[0]?.id ?? null;
        return { lastID: insertedId, lastInsertRowid: insertedId, changes: res.rowCount || 0 };
      },
    }),
    exec: async (sql: string) => {
      await query(sql);
    },
    pragma: () => { /* PostgreSQL adapter: no PRAGMA; no-op */ },
    transaction,
  };
  return facade;
}

/**
 * Open a connection pool pinned to the csms schema.
 *
 * A pool (not one shared client) is required: with a single client every
 * concurrent request shared one session, so `withTransaction` wrapped other
 * users' statements in its BEGIN/ROLLBACK, and one dropped socket broke every
 * request until the service restarted.
 */
async function connectPostgres(url: string) {
  const pg = require('pg');
  const newPool = new pg.Pool({
    connectionString: url,
    max: Number(process.env.PG_POOL_MAX) || 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    // Let one-off scripts (seed, reset-passwords) exit once their work is done.
    allowExitOnIdle: true,
  });
  // Every new physical connection is pinned to csms before any query runs
  // (pg queues this ahead of the caller's statement).
  newPool.on('connect', (client: any) => {
    client.query(`SET search_path TO ${PG_SCHEMA}`).catch(() => {});
  });
  // An idle connection dropped by the pooler must not crash the process; the
  // pool replaces it on the next checkout.
  newPool.on('error', (err: Error) => {
    console.error('[db] idle PostgreSQL connection error:', err.message);
  });

  if (/:6543\b/.test(url)) {
    console.warn(
      '[db] DATABASE_URL uses the Supabase transaction pooler (6543); session settings such as ' +
        'search_path are not guaranteed there. Prefer the session pooler (5432).'
    );
  }

  try {
    // Fail closed: refuse to serve if csms is missing or not the active
    // schema, rather than read or write another app's tables.
    const res = await newPool.query('SELECT current_schema() AS schema');
    const schema = res.rows[0]?.schema;
    if (schema !== PG_SCHEMA) {
      throw new Error(`active schema is "${schema ?? 'none'}", expected "${PG_SCHEMA}" (does the schema exist?)`);
    }
  } catch (e) {
    await newPool.end().catch(() => {});
    throw e;
  }

  const transaction = async <T>(fn: (database: any) => Promise<T>): Promise<T> => {
    const client = await newPool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL search_path TO ${PG_SCHEMA}`);
      const txQuery: PgQuery = (sql, params) => client.query(sql, params);
      // Nested withTransaction calls join this transaction.
      const txFacade = createPgFacade(txQuery, (inner) => inner(txFacade));
      const result = await fn(txFacade);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  };

  pool = newPool;
  return createPgFacade((sql, params) => newPool.query(sql, params), transaction);
}

function openSqlite() {
  const Database = require('better-sqlite3');
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const sqliteDb = new Database(path.join(dataDir, 'csms.db'));
  sqliteDb.pragma('foreign_keys = ON');
  return sqliteDb;
}

// Lazy connect: DATABASE_URL read ONLY inside getDb(); not at import time.
export async function getDb(): Promise<any> {
  if (db) return db;
  // Concurrent first requests share one connection attempt instead of each
  // opening a pool. A failed attempt is cleared so the next request retries.
  if (!connecting) {
    const url = process.env.DATABASE_URL; // Only use explicit DATABASE_URL, not SUPABASE_URL
    connecting = (async () => {
      if (url && url.trim() !== '') {
        try {
          return await connectPostgres(url);
        } catch (e: any) {
          throw new Error('PostgreSQL adapter initialization failed: ' + e.message);
        }
      }
      try {
        return openSqlite();
      } catch (e: any) {
        throw new Error('SQLite adapter initialization failed. Ensure better-sqlite3 package is installed. Error: ' + e.message);
      }
    })()
      .then((database) => {
        db = database;
        return database;
      })
      .finally(() => {
        connecting = null;
      });
  }
  return connecting;
}

/**
 * Round-trip check for /api/health. Returns the active schema (PostgreSQL)
 * or 'main' (SQLite). Throws when the database is unreachable.
 */
export async function checkDatabase(): Promise<{ adapter: 'postgres' | 'sqlite'; schema: string }> {
  const database = await getDb();
  if (isPostgres(database)) {
    const row = await database.prepare('SELECT current_schema() AS schema').get();
    return { adapter: 'postgres', schema: row?.schema ?? '' };
  }
  database.prepare('SELECT 1').get();
  return { adapter: 'sqlite', schema: 'main' };
}

/**
 * Tables that belong to CSMS only: the csms schema on PostgreSQL (never
 * `public`, which other apps on the shared database use), or the SQLite file.
 */
export async function listAppTables(): Promise<string[]> {
  const database = await getDb();
  const rows = isPostgres(database)
    ? await database
        .prepare(
          `SELECT table_name AS name FROM information_schema.tables
           WHERE table_schema = ? AND table_type = 'BASE TABLE' ORDER BY table_name`
        )
        .all(PG_SCHEMA)
    : database
        .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)
        .all();
  return (rows as Array<{ name: string }>).map((r) => r.name);
}

export function getDbPath(): string {
  const url = process.env.DATABASE_URL;
  if (url && url.trim() !== '') return url;
  return path.join(getDataDir(), 'csms.db');
}

export function initSchema(database: any) {
  const usePostgres = isPostgres(database);
  
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
  data_environment TEXT NOT NULL DEFAULT 'DEMO',
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
  capacity INTEGER NOT NULL DEFAULT 40,
  data_environment TEXT NOT NULL DEFAULT 'DEMO'
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
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK(status IN ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'CANCELLED', 'ARCHIVED')),
  data_environment TEXT NOT NULL DEFAULT 'DEMO',
  published_at TEXT,
  approved_by TEXT,
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
CREATE INDEX IF NOT EXISTS idx_schedules_semester_status ON schedules(semester_id, status);
-- One active class per room, faculty member and section per slot. Cancelled
-- and archived rows no longer occupy the slot. Mirrors migration 002.
CREATE UNIQUE INDEX IF NOT EXISTS uq_schedules_room_slot
  ON schedules(semester_id, time_slot_id, room_id) WHERE status NOT IN ('CANCELLED', 'ARCHIVED');
CREATE UNIQUE INDEX IF NOT EXISTS uq_schedules_faculty_slot
  ON schedules(semester_id, time_slot_id, faculty_id) WHERE status NOT IN ('CANCELLED', 'ARCHIVED');
CREATE UNIQUE INDEX IF NOT EXISTS uq_schedules_section_slot
  ON schedules(semester_id, time_slot_id, section_id) WHERE status NOT IN ('CANCELLED', 'ARCHIVED');
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_by TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
-- Room bookings and announcements (mirrors migration 003).
CREATE TABLE IF NOT EXISTS room_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  kind TEXT NOT NULL CHECK (kind IN ('EXAM', 'EVENT', 'MEETING', 'MAINTENANCE')),
  booking_date TEXT NOT NULL CHECK (booking_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  start_time TEXT NOT NULL CHECK (start_time GLOB '[0-9][0-9]:[0-9][0-9]'),
  end_time TEXT NOT NULL CHECK (end_time GLOB '[0-9][0-9]:[0-9][0-9]'),
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  CHECK (start_time < end_time)
);
CREATE INDEX IF NOT EXISTS idx_room_bookings_room_date ON room_bookings (room_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_room_bookings_date ON room_bookings (booking_date);
CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  starts_on TEXT NOT NULL CHECK (starts_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  ends_on TEXT CHECK (ends_on IS NULL OR ends_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  CHECK (ends_on IS NULL OR ends_on >= starts_on)
);
CREATE INDEX IF NOT EXISTS idx_announcements_window ON announcements (starts_on, ends_on);
-- Evidence layer (spec §61; mirrors migration 003).
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, source_type TEXT, authority_level TEXT, publisher TEXT,
  url TEXT, document_date TEXT, accessed_at TEXT, status TEXT, notes TEXT
);
CREATE TABLE IF NOT EXISTS institutional_facts (
  id TEXT PRIMARY KEY, category TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, value_type TEXT,
  status TEXT, confidence TEXT, effective_from TEXT, verified_at TEXT, review_due_at TEXT, notes TEXT
);
CREATE TABLE IF NOT EXISTS fact_sources (
  fact_id TEXT NOT NULL REFERENCES institutional_facts(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  supports INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (fact_id, source_id)
);
CREATE TABLE IF NOT EXISTS verification_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT, fact_id TEXT NOT NULL REFERENCES institutional_facts(id) ON DELETE CASCADE, verified_by TEXT,
  verified_at TEXT, verification_method TEXT, source_count INTEGER, authority_level TEXT, next_review_date TEXT
);
CREATE TABLE IF NOT EXISTS institution_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, office TEXT NOT NULL, contact_type TEXT NOT NULL, value TEXT NOT NULL, label TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0, source_id TEXT, verified_at TEXT, data_environment TEXT NOT NULL DEFAULT 'DEMO'
);
CREATE TABLE IF NOT EXISTS officials (
  id INTEGER PRIMARY KEY AUTOINCREMENT, position TEXT NOT NULL, first_name TEXT, middle_name TEXT, last_name TEXT, title TEXT,
  source_id TEXT, status TEXT, data_environment TEXT NOT NULL DEFAULT 'DEMO'
);
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
  data_environment TEXT NOT NULL DEFAULT 'DEMO',
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
  capacity INTEGER NOT NULL DEFAULT 40,
  data_environment TEXT NOT NULL DEFAULT 'DEMO'
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
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK(status IN ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'CANCELLED', 'ARCHIVED')),
  data_environment TEXT NOT NULL DEFAULT 'DEMO',
  published_at TEXT,
  approved_by TEXT,
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
CREATE INDEX IF NOT EXISTS idx_schedules_semester_status ON schedules(semester_id, status);
-- One active class per room, faculty member and section per slot. Cancelled
-- and archived rows no longer occupy the slot. Mirrors migration 002.
CREATE UNIQUE INDEX IF NOT EXISTS uq_schedules_room_slot
  ON schedules(semester_id, time_slot_id, room_id) WHERE status NOT IN ('CANCELLED', 'ARCHIVED');
CREATE UNIQUE INDEX IF NOT EXISTS uq_schedules_faculty_slot
  ON schedules(semester_id, time_slot_id, faculty_id) WHERE status NOT IN ('CANCELLED', 'ARCHIVED');
CREATE UNIQUE INDEX IF NOT EXISTS uq_schedules_section_slot
  ON schedules(semester_id, time_slot_id, section_id) WHERE status NOT IN ('CANCELLED', 'ARCHIVED');
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_by TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
-- Room bookings and announcements (mirrors migration 003).
CREATE TABLE IF NOT EXISTS room_bookings (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  kind TEXT NOT NULL CHECK (kind IN ('EXAM', 'EVENT', 'MEETING', 'MAINTENANCE')),
  booking_date TEXT NOT NULL CHECK (booking_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  start_time TEXT NOT NULL CHECK (start_time ~ '^[0-9]{2}:[0-9]{2}$'),
  end_time TEXT NOT NULL CHECK (end_time ~ '^[0-9]{2}:[0-9]{2}$'),
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  CHECK (start_time < end_time)
);
CREATE INDEX IF NOT EXISTS idx_room_bookings_room_date ON room_bookings (room_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_room_bookings_date ON room_bookings (booking_date);
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  starts_on TEXT NOT NULL CHECK (starts_on ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  ends_on TEXT CHECK (ends_on IS NULL OR ends_on ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  CHECK (ends_on IS NULL OR ends_on >= starts_on)
);
CREATE INDEX IF NOT EXISTS idx_announcements_window ON announcements (starts_on, ends_on);
-- Evidence layer (spec §61; mirrors migration 003).
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, source_type TEXT, authority_level TEXT, publisher TEXT,
  url TEXT, document_date TEXT, accessed_at TEXT, status TEXT, notes TEXT
);
CREATE TABLE IF NOT EXISTS institutional_facts (
  id TEXT PRIMARY KEY, category TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, value_type TEXT,
  status TEXT, confidence TEXT, effective_from TEXT, verified_at TEXT, review_due_at TEXT, notes TEXT
);
CREATE TABLE IF NOT EXISTS fact_sources (
  fact_id TEXT NOT NULL REFERENCES institutional_facts(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  supports INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (fact_id, source_id)
);
CREATE TABLE IF NOT EXISTS verification_records (
  id SERIAL PRIMARY KEY, fact_id TEXT NOT NULL REFERENCES institutional_facts(id) ON DELETE CASCADE, verified_by TEXT,
  verified_at TEXT, verification_method TEXT, source_count INTEGER, authority_level TEXT, next_review_date TEXT
);
CREATE TABLE IF NOT EXISTS institution_contacts (
  id SERIAL PRIMARY KEY, office TEXT NOT NULL, contact_type TEXT NOT NULL, value TEXT NOT NULL, label TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0, source_id TEXT, verified_at TEXT, data_environment TEXT NOT NULL DEFAULT 'DEMO'
);
CREATE TABLE IF NOT EXISTS officials (
  id SERIAL PRIMARY KEY, position TEXT NOT NULL, first_name TEXT, middle_name TEXT, last_name TEXT, title TEXT,
  source_id TEXT, status TEXT, data_environment TEXT NOT NULL DEFAULT 'DEMO'
);
  `;

  database.exec(usePostgres ? pgSql : sqliteSql);
}

/**
 * Back up the open SQLite database to `destinationPath`.
 *
 * Uses better-sqlite3's online backup API on the live connection rather than
 * copying csms.db: a file copy of a database being written can be torn, and
 * it fails outright for an in-memory database.
 */
export async function backupDatabase(destinationPath: string): Promise<void> {
  const database = await getDb();
  if (isPostgres(database)) {
    throw new Error('PostgreSQL adapter: backupDatabase not implemented. Use database-level backup (e.g., pg_dump, Supabase backups) or implement logical export separately.');
  }
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  await database.backup(destinationPath);
}

export async function withTransaction<T>(fn: (database: any) => Promise<T>): Promise<T> {
  const database = await getDb();

  if (isPostgres(database)) {
    // Runs on a dedicated pooled connection so concurrent requests never
    // share (or roll back) this transaction.
    return database.transaction(fn);
  } else {
    database.exec('BEGIN');
    try {
      // NOTE: fn must be awaited before COMMIT. The previous version called
      // `fn(database)` without awaiting, so COMMIT ran before the async body
      // finished its statements.
      const result = await fn(database);
      database.exec('COMMIT');
      return result;
    } catch (e: any) {
      database.exec('ROLLBACK');
      throw e;
    }
  }
}

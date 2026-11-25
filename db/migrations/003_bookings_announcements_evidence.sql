-- 003_bookings_announcements_evidence.sql
-- New tables for room bookings and announcements, and repo definitions for the
-- evidence tables that until now existed only in production.
--
-- Properties:
--   * Additive and idempotent: CREATE ... IF NOT EXISTS only. Nothing is
--     altered or dropped. Safe to run more than once.
--   * Touches only the csms schema. The Supabase database is shared with other
--     apps; nothing here reads or changes any other schema.
--   * Evidence tables (sources, institutional_facts, fact_sources,
--     verification_records, institution_contacts, officials) already exist on
--     production, so those statements do nothing there; they let a fresh
--     database be built from the repo.
--   * New tables have row level security enabled (defence in depth on the
--     shared project: an API role that can reach csms sees no rows). The app
--     connects as the table owner, or as csms_app with the policy below.
--
-- Backup: Supabase dashboard backup, or pg_dump --schema=csms, before running.
-- Rollback: db/migrations/003_bookings_announcements_evidence.down.sql
-- Run as: postgres (Supabase SQL editor, or psql as the postgres user).
-- Order: run BEFORE deploying the code that uses these tables.

BEGIN;

DO $$
BEGIN
  IF to_regnamespace('csms') IS NULL THEN
    RAISE EXCEPTION 'schema csms does not exist; nothing to migrate';
  END IF;
END $$;

SET LOCAL search_path TO csms;

-- 1. Room bookings: one-off use of a room on a date (exams, events, meetings,
--    maintenance). Dates and times are text (YYYY-MM-DD, HH:MM) like the rest
--    of the schema; zero-padded, so they compare correctly as text.
CREATE TABLE IF NOT EXISTS room_bookings (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  kind TEXT NOT NULL CHECK (kind IN ('EXAM', 'EVENT', 'MEETING', 'MAINTENANCE')),
  booking_date TEXT NOT NULL CHECK (booking_date ~ '^\d{4}-\d{2}-\d{2}$'),
  start_time TEXT NOT NULL CHECK (start_time ~ '^\d{2}:\d{2}$'),
  end_time TEXT NOT NULL CHECK (end_time ~ '^\d{2}:\d{2}$'),
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  CHECK (start_time < end_time)
);
CREATE INDEX IF NOT EXISTS idx_room_bookings_room_date ON room_bookings (room_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_room_bookings_date ON room_bookings (booking_date);

-- 2. Announcements shown on the public site between starts_on and ends_on.
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  starts_on TEXT NOT NULL CHECK (starts_on ~ '^\d{4}-\d{2}-\d{2}$'),
  ends_on TEXT CHECK (ends_on IS NULL OR ends_on ~ '^\d{4}-\d{2}-\d{2}$'),
  pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  CHECK (ends_on IS NULL OR ends_on >= starts_on)
);
CREATE INDEX IF NOT EXISTS idx_announcements_window ON announcements (starts_on, ends_on);

-- 3. Evidence layer (spec §61). No-ops on production.
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source_type TEXT,
  authority_level TEXT,
  publisher TEXT,
  url TEXT,
  document_date TEXT,
  accessed_at TEXT,
  status TEXT,
  notes TEXT
);
CREATE TABLE IF NOT EXISTS institutional_facts (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  value_type TEXT,
  status TEXT,
  confidence TEXT,
  effective_from TEXT,
  verified_at TEXT,
  review_due_at TEXT,
  notes TEXT
);
CREATE TABLE IF NOT EXISTS fact_sources (
  fact_id TEXT NOT NULL REFERENCES institutional_facts(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  supports INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (fact_id, source_id)
);
CREATE TABLE IF NOT EXISTS verification_records (
  id SERIAL PRIMARY KEY,
  fact_id TEXT NOT NULL REFERENCES institutional_facts(id) ON DELETE CASCADE,
  verified_by TEXT,
  verified_at TEXT,
  verification_method TEXT,
  source_count INTEGER,
  authority_level TEXT,
  next_review_date TEXT
);
CREATE TABLE IF NOT EXISTS institution_contacts (
  id SERIAL PRIMARY KEY,
  office TEXT NOT NULL,
  contact_type TEXT NOT NULL,
  value TEXT NOT NULL,
  label TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  source_id TEXT,
  verified_at TEXT,
  data_environment TEXT NOT NULL DEFAULT 'DEMO'
);
CREATE TABLE IF NOT EXISTS officials (
  id SERIAL PRIMARY KEY,
  position TEXT NOT NULL,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  title TEXT,
  source_id TEXT,
  status TEXT,
  data_environment TEXT NOT NULL DEFAULT 'DEMO'
);

-- 4. Row level security on the new tables, with access for csms_app if that
--    role exists (migration 001). Owner connections are unaffected.
ALTER TABLE room_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE
  t TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'csms_app') THEN
    FOREACH t IN ARRAY ARRAY['room_bookings', 'announcements'] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'csms' AND tablename = t AND policyname = 'csms_app_all'
      ) THEN
        EXECUTE format('CREATE POLICY csms_app_all ON csms.%I FOR ALL TO csms_app USING (true) WITH CHECK (true)', t);
      END IF;
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON csms.%I TO csms_app', t);
      EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE csms.%I TO csms_app', t || '_id_seq');
    END LOOP;
  END IF;
END $$;

COMMIT;

-- Verify (read-only):
--   SELECT table_name FROM information_schema.tables
--    WHERE table_schema = 'csms' AND table_name IN ('room_bookings', 'announcements');
--   SELECT relname, relrowsecurity FROM pg_class
--    WHERE relnamespace = 'csms'::regnamespace AND relname IN ('room_bookings', 'announcements');

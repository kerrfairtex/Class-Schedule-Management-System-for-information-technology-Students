-- 002_schedule_publish_workflow.sql
-- Bring the schedules table in the repo in line with what the app uses.
--
-- The app reads and writes schedules.status, data_environment, published_at
-- and approved_by (draft → review → approve → publish workflow, spec §32–§35),
-- and sections/rooms.data_environment, but no file in this repo created them:
-- they were added to production by hand. A fresh database or a restore from
-- the repo would therefore break. This migration makes the repo the source
-- of truth.
--
-- Properties:
--   * Additive and idempotent: ADD COLUMN / CREATE ... IF NOT EXISTS only.
--     On production, where the columns already exist, those steps do nothing.
--   * Touches only the csms schema: schedules, sections, rooms, system_settings.
--   * Adds partial unique indexes so the DATABASE refuses a double-booked
--     room, faculty member or section, even if two admins save at once.
--     Cancelled and archived rows do not hold a slot.
--   * Refuses to run (and changes nothing) if existing active rows already
--     double-book a slot. The error lists what to fix first.
--
-- Backup: take a Supabase backup (or pg_dump -n csms) before running.
-- Rollback: db/migrations/002_schedule_publish_workflow.down.sql
-- Run as: postgres (Supabase SQL editor, or psql as the postgres user).

BEGIN;

DO $$
BEGIN
  IF to_regnamespace('csms') IS NULL THEN
    RAISE EXCEPTION 'schema csms does not exist; nothing to migrate';
  END IF;
END $$;

SET LOCAL search_path TO csms;

-- 1. Workflow columns.
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS data_environment TEXT NOT NULL DEFAULT 'DEMO';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS published_at TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE sections ADD COLUMN IF NOT EXISTS data_environment TEXT NOT NULL DEFAULT 'DEMO';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS data_environment TEXT NOT NULL DEFAULT 'DEMO';

-- 2. Only known statuses. NOT VALID: enforced for new and updated rows
--    without failing on any legacy value already stored.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'schedules_status_known' AND conrelid = 'csms.schedules'::regclass
  ) THEN
    ALTER TABLE schedules ADD CONSTRAINT schedules_status_known
      CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'CANCELLED', 'ARCHIVED'))
      NOT VALID;
  END IF;
END $$;

-- 3. Deployment settings (spec §64). Exists on production already.
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_by TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 4. Stop before adding the unique indexes if active rows already clash.
DO $$
DECLARE
  clashes TEXT;
BEGIN
  SELECT string_agg(format('%s %s: slot %s semester %s (%s rows)', kind, ref, time_slot_id, semester_id, n), E'\n')
    INTO clashes
  FROM (
    SELECT 'room' AS kind, room_id AS ref, time_slot_id, semester_id, count(*) AS n
      FROM schedules WHERE status NOT IN ('CANCELLED', 'ARCHIVED')
      GROUP BY room_id, time_slot_id, semester_id HAVING count(*) > 1
    UNION ALL
    SELECT 'faculty', faculty_id, time_slot_id, semester_id, count(*)
      FROM schedules WHERE status NOT IN ('CANCELLED', 'ARCHIVED')
      GROUP BY faculty_id, time_slot_id, semester_id HAVING count(*) > 1
    UNION ALL
    SELECT 'section', section_id, time_slot_id, semester_id, count(*)
      FROM schedules WHERE status NOT IN ('CANCELLED', 'ARCHIVED')
      GROUP BY section_id, time_slot_id, semester_id HAVING count(*) > 1
  ) c;
  IF clashes IS NOT NULL THEN
    RAISE EXCEPTION E'Resolve these double bookings first (see /admin/conflicts), then re-run:\n%', clashes;
  END IF;
END $$;

-- 5. Indexes.
CREATE INDEX IF NOT EXISTS idx_schedules_semester_status ON schedules (semester_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_schedules_room_slot
  ON schedules (semester_id, time_slot_id, room_id) WHERE status NOT IN ('CANCELLED', 'ARCHIVED');
CREATE UNIQUE INDEX IF NOT EXISTS uq_schedules_faculty_slot
  ON schedules (semester_id, time_slot_id, faculty_id) WHERE status NOT IN ('CANCELLED', 'ARCHIVED');
CREATE UNIQUE INDEX IF NOT EXISTS uq_schedules_section_slot
  ON schedules (semester_id, time_slot_id, section_id) WHERE status NOT IN ('CANCELLED', 'ARCHIVED');

COMMIT;

-- 004_flexible_class_times.sql
-- Classes of any length, lecture/lab parts, subject units and hours, room
-- types, and section advisers / home rooms.
--
-- What changes:
--   * schedules: own day_of_week / start_time / end_time and a component
--     (LEC or LAB). Existing classes are back-filled from their time slot, so
--     nothing moves. time_slot_id becomes optional: a class no longer has to
--     fit one fixed period (a 2-hour lecture, a 3-hour lab).
--   * subjects: lecture and lab units, and lecture and lab hours per week.
--     Existing subjects get lec_units = credit_hours and that many lecture
--     hours, which is what the old one-slot-per-unit model assumed.
--   * rooms: room_type (LECTURE or LAB).
--   * sections: adviser (a faculty member) and home room, both optional.
--
-- Properties:
--   * Additive and idempotent: ADD COLUMN IF NOT EXISTS, back-fills only touch
--     rows that are still empty, constraints/indexes are created if missing.
--     The only loosened constraint is schedules.time_slot_id NOT NULL.
--   * Touches only the csms schema (shared database).
--   * Refuses to finish if any class could not be back-filled.
--
-- Backup: pg_dump --schema=csms (or a Supabase backup) before running.
-- Rollback: 004_flexible_class_times.down.sql (read its header first).
-- Run as: postgres (Supabase SQL editor). Run BEFORE deploying the code.

BEGIN;

DO $$
BEGIN
  IF to_regnamespace('csms') IS NULL THEN
    RAISE EXCEPTION 'schema csms does not exist; nothing to migrate';
  END IF;
END $$;

SET LOCAL search_path TO csms;

-- 1. Subjects: units and weekly hours, split into lecture and lab.
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS lec_units INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS lab_units INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS lec_hours NUMERIC(4,1) NOT NULL DEFAULT 0;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS lab_hours NUMERIC(4,1) NOT NULL DEFAULT 0;
UPDATE subjects
   SET lec_units = credit_hours, lec_hours = credit_hours
 WHERE lec_units = 0 AND lab_units = 0 AND lec_hours = 0 AND lab_hours = 0;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subjects_units_hours_valid' AND conrelid = 'csms.subjects'::regclass) THEN
    ALTER TABLE subjects ADD CONSTRAINT subjects_units_hours_valid
      CHECK (lec_units BETWEEN 0 AND 12 AND lab_units BETWEEN 0 AND 12
             AND lec_hours BETWEEN 0 AND 40 AND lab_hours BETWEEN 0 AND 40);
  END IF;
END $$;

-- 2. Rooms: lecture room or laboratory.
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_type TEXT NOT NULL DEFAULT 'LECTURE';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rooms_room_type_known' AND conrelid = 'csms.rooms'::regclass) THEN
    ALTER TABLE rooms ADD CONSTRAINT rooms_room_type_known CHECK (room_type IN ('LECTURE', 'LAB'));
  END IF;
END $$;

-- 3. Sections: adviser and home room (both optional).
ALTER TABLE sections ADD COLUMN IF NOT EXISTS adviser_id INTEGER REFERENCES faculty(id) ON DELETE SET NULL;
ALTER TABLE sections ADD COLUMN IF NOT EXISTS home_room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL;

-- 4. Schedules: own times and a lecture/lab component.
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS component TEXT NOT NULL DEFAULT 'LEC';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS day_of_week TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS end_time TEXT;

UPDATE schedules s
   SET day_of_week = ts.day_of_week, start_time = ts.start_time, end_time = ts.end_time
  FROM time_slots ts
 WHERE ts.id = s.time_slot_id AND s.day_of_week IS NULL;

DO $$
DECLARE
  missing INTEGER;
BEGIN
  SELECT count(*) INTO missing FROM schedules WHERE day_of_week IS NULL OR start_time IS NULL OR end_time IS NULL;
  IF missing > 0 THEN
    RAISE EXCEPTION '% class(es) have no time and no time slot; fix them, then re-run. Nothing was changed.', missing;
  END IF;
END $$;

ALTER TABLE schedules ALTER COLUMN day_of_week SET NOT NULL;
ALTER TABLE schedules ALTER COLUMN start_time SET NOT NULL;
ALTER TABLE schedules ALTER COLUMN end_time SET NOT NULL;
ALTER TABLE schedules ALTER COLUMN time_slot_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedules_component_known' AND conrelid = 'csms.schedules'::regclass) THEN
    ALTER TABLE schedules ADD CONSTRAINT schedules_component_known CHECK (component IN ('LEC', 'LAB'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedules_time_valid' AND conrelid = 'csms.schedules'::regclass) THEN
    ALTER TABLE schedules ADD CONSTRAINT schedules_time_valid CHECK (
      day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
      AND start_time ~ '^\d{2}:\d{2}$' AND end_time ~ '^\d{2}:\d{2}$' AND start_time < end_time
    );
  END IF;
END $$;

-- Overlap checks look classes up by semester, day and room/faculty/section.
CREATE INDEX IF NOT EXISTS idx_schedules_room_day ON schedules (semester_id, day_of_week, room_id);
CREATE INDEX IF NOT EXISTS idx_schedules_faculty_day ON schedules (semester_id, day_of_week, faculty_id);
CREATE INDEX IF NOT EXISTS idx_schedules_section_day ON schedules (semester_id, day_of_week, section_id);

COMMIT;

-- Verify (read-only):
--   SELECT count(*) FROM csms.schedules WHERE day_of_week IS NULL;          -- 0
--   SELECT code, credit_hours, lec_units, lab_units, lec_hours, lab_hours FROM csms.subjects;

-- 004_flexible_class_times.down.sql
-- Roll back 004's constraints and indexes. Columns are kept on purpose.
--
-- Dropping the new columns would delete data entered since 004 (class
-- times, lecture/lab parts, units and hours, advisers, room types), and the
-- previous app version simply ignores them. So this file removes only the
-- constraints and indexes 004 added and restores time_slot_id NOT NULL.
--
-- time_slot_id NOT NULL can only be restored if every class still has a
-- time slot. Classes created with free times after 004 have none; the file
-- then stops and lists how many, and changes nothing. Re-time or delete
-- those classes first if a full rollback is needed.
--
-- Run as: postgres. Deploy the previous app version first.

BEGIN;

SET LOCAL search_path TO csms;

DO $$
DECLARE
  n INTEGER;
BEGIN
  SELECT count(*) INTO n FROM schedules WHERE time_slot_id IS NULL;
  IF n > 0 THEN
    RAISE EXCEPTION '% class(es) have free times and no time slot; time_slot_id NOT NULL cannot be restored. Nothing was changed.', n;
  END IF;
END $$;

DROP INDEX IF EXISTS idx_schedules_room_day;
DROP INDEX IF EXISTS idx_schedules_faculty_day;
DROP INDEX IF EXISTS idx_schedules_section_day;
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_component_known;
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_time_valid;
ALTER TABLE schedules ALTER COLUMN day_of_week DROP NOT NULL;
ALTER TABLE schedules ALTER COLUMN start_time DROP NOT NULL;
ALTER TABLE schedules ALTER COLUMN end_time DROP NOT NULL;
ALTER TABLE schedules ALTER COLUMN time_slot_id SET NOT NULL;
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_room_type_known;
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_units_hours_valid;

COMMIT;

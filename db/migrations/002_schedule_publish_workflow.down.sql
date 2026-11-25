-- 002_schedule_publish_workflow.down.sql
-- Roll back 002: removes only the indexes and the status check it added.
--
-- It deliberately does NOT drop the status / data_environment / published_at /
-- approved_by columns or system_settings: production had them before 002,
-- the app needs them, and dropping them would destroy workflow history.
--
-- Run as: postgres.

BEGIN;

SET LOCAL search_path TO csms;

DROP INDEX IF EXISTS uq_schedules_room_slot;
DROP INDEX IF EXISTS uq_schedules_faculty_slot;
DROP INDEX IF EXISTS uq_schedules_section_slot;
DROP INDEX IF EXISTS idx_schedules_semester_status;
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_status_known;

COMMIT;

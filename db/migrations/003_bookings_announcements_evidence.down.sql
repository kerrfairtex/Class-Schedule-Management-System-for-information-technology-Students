-- 003_bookings_announcements_evidence.down.sql
-- Roll back 003: drops ONLY the two tables 003 introduced.
--
-- DESTRUCTIVE: deletes every room booking and announcement. Take a backup
-- first (pg_dump --schema=csms --table=csms.room_bookings --table=csms.announcements).
--
-- The evidence tables are NOT dropped: production had them before 003 and
-- they hold verified institutional facts.
--
-- Run as: postgres.

BEGIN;

SET LOCAL search_path TO csms;

DROP TABLE IF EXISTS room_bookings;
DROP TABLE IF EXISTS announcements;

COMMIT;

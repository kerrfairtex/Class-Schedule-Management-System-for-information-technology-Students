-- 001_csms_app_role.sql
-- Dedicated, least-privilege login role for the CSMS app.
--
-- The Supabase database is shared with other apps. Today CSMS connects as
-- `postgres`, which can read, change or drop every app's tables. This role can
-- only read and write rows in the `csms` schema.
--
-- Properties:
--   * Additive and idempotent: safe to run more than once.
--   * Touches only: the new role csms_app, grants on schema csms and its
--     tables/sequences, and RLS policies named csms_app_all on csms tables.
--   * Never touches public, auth, storage or any other app's schema.
--   * Sets NO password. Set it yourself afterwards (see step 2 in README);
--     never commit it.
--
-- Rollback: db/migrations/001_csms_app_role.down.sql
-- Run as: postgres (Supabase SQL editor, or psql as the postgres user). Works
-- without superuser rights, as Supabase's postgres role has none.

BEGIN;

-- 0. Refuse to run if the csms schema is missing, rather than half-apply.
DO $$
BEGIN
  IF to_regnamespace('csms') IS NULL THEN
    RAISE EXCEPTION 'schema csms does not exist; nothing to grant';
  END IF;
END $$;

-- 1. The role: can log in, nothing else. No password yet (cannot log in until
--    one is set). Connection limit keeps it from exhausting the shared pool.
--
--    Supabase: the SQL editor runs as `postgres`, which is NOT a superuser, and
--    only a superuser may set SUPERUSER, REPLICATION or BYPASSRLS, even to
--    switch them off (Postgres 16+ applies the same rule to CREATEDB and
--    CREATEROLE). A new role has none of them by default, so only attributes
--    postgres may set appear here.
--    An existing csms_app with elevated attributes stops the migration.
DO $$
DECLARE
  r pg_roles%ROWTYPE;
BEGIN
  SELECT * INTO r FROM pg_roles WHERE rolname = 'csms_app';
  IF NOT FOUND THEN
    CREATE ROLE csms_app LOGIN NOINHERIT CONNECTION LIMIT 20;
  ELSIF r.rolsuper OR r.rolbypassrls OR r.rolreplication OR r.rolcreaterole OR r.rolcreatedb THEN
    -- Postgres 16+ lets only a role holding an attribute change it, and
    -- Supabase's postgres holds none of these, so it cannot reduce them.
    RAISE EXCEPTION
      'A role named csms_app already exists with elevated attributes (superuser=%, bypassrls=%, replication=%, createrole=%, createdb=%). Drop it (DROP ROLE csms_app, or ask Supabase support if that is refused), then re-run. Nothing was changed.',
      r.rolsuper, r.rolbypassrls, r.rolreplication, r.rolcreaterole, r.rolcreatedb;
  ELSE
    ALTER ROLE csms_app LOGIN NOINHERIT CONNECTION LIMIT 20;
  END IF;
END $$;

-- 2. Session defaults applied at every login, so they hold even behind a
--    pooler: queries resolve to csms only, and runaway queries are cut off.
ALTER ROLE csms_app SET search_path = csms;
ALTER ROLE csms_app SET statement_timeout = '30s';
ALTER ROLE csms_app SET idle_in_transaction_session_timeout = '60s';

-- 3. Row access inside csms only. No CREATE on the schema: the app does not
--    change table structure at runtime.
GRANT USAGE ON SCHEMA csms TO csms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA csms TO csms_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA csms TO csms_app;

-- Tables later created in csms by postgres get the same grants.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA csms
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO csms_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA csms
  GRANT USAGE, SELECT ON SEQUENCES TO csms_app;

-- 4. Where a csms table has row level security enabled, csms_app (which does
--    not bypass RLS) would see no rows. Give it full access on those tables
--    only. Policies apply to csms_app alone; other roles are unaffected.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.relname
      FROM pg_class c
     WHERE c.relnamespace = 'csms'::regnamespace
       AND c.relkind IN ('r', 'p')
       AND c.relrowsecurity
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
       WHERE schemaname = 'csms' AND tablename = t.relname AND policyname = 'csms_app_all'
    ) THEN
      EXECUTE format(
        'CREATE POLICY csms_app_all ON csms.%I FOR ALL TO csms_app USING (true) WITH CHECK (true)',
        t.relname
      );
    END IF;
  END LOOP;
END $$;

COMMIT;

-- Verify (read-only; run after the migration):
--   SELECT rolname, rolsuper, rolcreaterole, rolbypassrls, rolconnlimit, rolconfig
--     FROM pg_roles WHERE rolname = 'csms_app';
--   SELECT table_name, string_agg(privilege_type, ',' ORDER BY privilege_type)
--     FROM information_schema.role_table_grants
--    WHERE grantee = 'csms_app' GROUP BY table_name ORDER BY table_name;
--   -- Must return no rows (no access outside csms):
--   SELECT DISTINCT table_schema FROM information_schema.role_table_grants
--    WHERE grantee = 'csms_app' AND table_schema <> 'csms';

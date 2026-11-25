-- 001_csms_app_role.down.sql
-- Rollback for 001_csms_app_role.sql.
--
-- FIRST point DATABASE_URL back at the previous role and redeploy, or the app
-- loses its database connection when the role is dropped.
--
-- Removes only what 001 created: the csms_app_all policies, csms_app's grants
-- and default privileges in csms, and the csms_app role. No table, row or
-- other role is touched. Idempotent.

BEGIN;

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_policies
     WHERE schemaname = 'csms' AND policyname = 'csms_app_all'
  LOOP
    EXECUTE format('DROP POLICY csms_app_all ON csms.%I', t.tablename);
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'csms_app') THEN
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA csms
      REVOKE ALL ON TABLES FROM csms_app;
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA csms
      REVOKE ALL ON SEQUENCES FROM csms_app;
    REVOKE ALL ON ALL TABLES IN SCHEMA csms FROM csms_app;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA csms FROM csms_app;
    REVOKE ALL ON SCHEMA csms FROM csms_app;
    DROP ROLE csms_app;
  END IF;
END $$;

COMMIT;

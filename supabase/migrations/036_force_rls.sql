-- Enforce RLS on all tenant tables (even table owners). service_role bypasses RLS for
-- break-glass edge/cron paths documented in AGENTS.md.

DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('schema_migrations')
  LOOP
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

-- Narrow service_role: revoke blanket grants from 035, re-grant only break-glass tables.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM service_role;

GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.organizations,
  public.organization_members,
  public.invitations,
  public.teams,
  public.team_members,
  public.audit_logs,
  public.inbox_items,
  public.meeting_schedules,
  public.scorecard_metrics,
  public.scorecard_values,
  public.organization_sso_settings,
  public.organization_sso_role_mappings,
  public.organization_verified_domains
TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

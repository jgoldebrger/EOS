-- Recurring L10 meeting schedules and reminder tracking

CREATE TABLE public.meeting_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  time_local time NOT NULL,
  timezone text NOT NULL DEFAULT 'America/New_York',
  reminder_hours_before integer NOT NULL DEFAULT 24 CHECK (reminder_hours_before BETWEEN 1 AND 168),
  enabled boolean NOT NULL DEFAULT true,
  last_reminder_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (team_id)
);

CREATE INDEX meeting_schedules_organization_id_idx ON public.meeting_schedules (organization_id);
CREATE INDEX meeting_schedules_enabled_idx ON public.meeting_schedules (enabled) WHERE enabled = true;

CREATE TRIGGER meeting_schedules_set_updated_at
  BEFORE UPDATE ON public.meeting_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.meeting_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY meeting_schedules_select_member
  ON public.meeting_schedules
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY meeting_schedules_insert_contributor
  ON public.meeting_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = meeting_schedules.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
    AND (created_by IS NULL OR created_by = auth.uid())
  );

CREATE POLICY meeting_schedules_update_contributor
  ON public.meeting_schedules
  FOR UPDATE
  TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = meeting_schedules.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
  )
  WITH CHECK (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = meeting_schedules.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY meeting_schedules_delete_contributor
  ON public.meeting_schedules
  FOR DELETE
  TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = meeting_schedules.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_schedules TO authenticated;

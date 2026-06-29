-- Wave 3a: Quarterly rocks (goals)

-- ---------------------------------------------------------------------------
-- rocks
-- ---------------------------------------------------------------------------
CREATE TABLE public.rocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  title text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  quarter text NOT NULL,
  status text NOT NULL DEFAULT 'on_track' CHECK (
    status IN ('on_track', 'off_track', 'done', 'dropped')
  ),
  confidence int CHECK (confidence IS NULL OR (confidence >= 1 AND confidence <= 10)),
  due_date date,
  success_definition text,
  progress int NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  rock_type text NOT NULL DEFAULT 'team' CHECK (
    rock_type IN ('company', 'team', 'individual')
  ),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX rocks_organization_id_idx ON public.rocks (organization_id);
CREATE INDEX rocks_team_id_idx ON public.rocks (team_id);
CREATE INDEX rocks_owner_id_idx ON public.rocks (owner_id);
CREATE INDEX rocks_quarter_idx ON public.rocks (quarter);
CREATE INDEX rocks_status_idx ON public.rocks (status);
CREATE INDEX rocks_due_date_idx ON public.rocks (due_date);

CREATE TRIGGER rocks_set_updated_at
  BEFORE UPDATE ON public.rocks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.rocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY rocks_select_member
  ON public.rocks
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY rocks_insert_contributor
  ON public.rocks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = rocks.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
    AND (
      owner_id = auth.uid()
      OR public.can_manage_org(organization_id)
      OR (
        team_id IS NOT NULL
        AND public.can_manage_team(team_id)
      )
    )
    AND (created_by IS NULL OR created_by = auth.uid())
  );

CREATE POLICY rocks_update_contributor
  ON public.rocks
  FOR UPDATE
  TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = rocks.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
    AND (
      owner_id = auth.uid()
      OR public.can_manage_org(organization_id)
      OR (
        team_id IS NOT NULL
        AND public.can_manage_team(team_id)
      )
    )
  )
  WITH CHECK (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = rocks.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
    AND (
      owner_id = auth.uid()
      OR public.can_manage_org(organization_id)
      OR (
        team_id IS NOT NULL
        AND public.can_manage_team(team_id)
      )
    )
  );

CREATE POLICY rocks_delete_contributor
  ON public.rocks
  FOR DELETE
  TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = rocks.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
    AND (
      owner_id = auth.uid()
      OR public.can_manage_org(organization_id)
      OR (
        team_id IS NOT NULL
        AND public.can_manage_team(team_id)
      )
    )
  );

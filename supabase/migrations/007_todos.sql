-- Wave 3c: Accountable todos (7-day list)

-- ---------------------------------------------------------------------------
-- todos
-- ---------------------------------------------------------------------------
CREATE TABLE public.todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  title text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'done', 'cancelled')
  ),
  source_type text CHECK (
    source_type IS NULL OR source_type IN ('issue', 'rock', 'meeting', 'manual')
  ),
  source_id uuid,
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX todos_organization_id_idx ON public.todos (organization_id);
CREATE INDEX todos_team_id_idx ON public.todos (team_id);
CREATE INDEX todos_owner_id_idx ON public.todos (owner_id);
CREATE INDEX todos_due_date_idx ON public.todos (due_date);
CREATE INDEX todos_status_idx ON public.todos (status);
CREATE INDEX todos_source_idx ON public.todos (source_type, source_id);

CREATE TRIGGER todos_set_updated_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: org members SELECT; members+ mutate (owner or can manage); viewers read-only
-- ---------------------------------------------------------------------------
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY todos_select_member
  ON public.todos
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY todos_insert_contributor
  ON public.todos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = todos.organization_id
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

CREATE POLICY todos_update_contributor
  ON public.todos
  FOR UPDATE
  TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = todos.organization_id
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
      WHERE om.organization_id = todos.organization_id
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

CREATE POLICY todos_delete_contributor
  ON public.todos
  FOR DELETE
  TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = todos.organization_id
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

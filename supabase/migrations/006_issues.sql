-- Wave 3b: Issues (IDS workflow)

-- ---------------------------------------------------------------------------
-- issues
-- ---------------------------------------------------------------------------
CREATE TABLE public.issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  priority int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'discussing', 'solved', 'archived')
  ),
  ids_notes text,
  linked_metric_id uuid REFERENCES public.scorecard_metrics(id) ON DELETE SET NULL,
  linked_rock_id uuid REFERENCES public.rocks(id) ON DELETE SET NULL,
  linked_meeting_id uuid,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX issues_organization_id_idx ON public.issues (organization_id);
CREATE INDEX issues_team_id_idx ON public.issues (team_id);
CREATE INDEX issues_owner_id_idx ON public.issues (owner_id);
CREATE INDEX issues_status_idx ON public.issues (status);
CREATE INDEX issues_priority_idx ON public.issues (priority DESC);
CREATE INDEX issues_linked_metric_id_idx ON public.issues (linked_metric_id);
CREATE INDEX issues_linked_rock_id_idx ON public.issues (linked_rock_id);
CREATE INDEX issues_linked_meeting_id_idx ON public.issues (linked_meeting_id);

CREATE TRIGGER issues_set_updated_at
  BEFORE UPDATE ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: org members SELECT; members+ mutate (not viewers)
-- ---------------------------------------------------------------------------
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY issues_select_member
  ON public.issues
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY issues_insert_contributor
  ON public.issues
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = issues.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
    AND (created_by IS NULL OR created_by = auth.uid())
  );

CREATE POLICY issues_update_contributor
  ON public.issues
  FOR UPDATE
  TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = issues.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
  )
  WITH CHECK (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = issues.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY issues_delete_contributor
  ON public.issues
  FOR DELETE
  TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = issues.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
  );

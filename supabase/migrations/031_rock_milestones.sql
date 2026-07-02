-- Rock milestones for quarterly goal breakdown

CREATE TABLE public.rock_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rock_id uuid NOT NULL REFERENCES public.rocks(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_date date,
  completed_at timestamptz,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX rock_milestones_rock_id_idx ON public.rock_milestones (rock_id);
CREATE INDEX rock_milestones_organization_id_idx ON public.rock_milestones (organization_id);
CREATE INDEX rock_milestones_due_date_idx ON public.rock_milestones (due_date);

CREATE TRIGGER rock_milestones_set_updated_at
  BEFORE UPDATE ON public.rock_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.rock_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY rock_milestones_select_member
  ON public.rock_milestones
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY rock_milestones_insert_contributor
  ON public.rock_milestones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = rock_milestones.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
    AND EXISTS (
      SELECT 1
      FROM public.rocks r
      WHERE r.id = rock_milestones.rock_id
        AND r.organization_id = rock_milestones.organization_id
        AND (
          r.owner_id = auth.uid()
          OR public.can_manage_org(r.organization_id)
          OR (
            r.team_id IS NOT NULL
            AND public.can_manage_team(r.team_id)
          )
        )
    )
  );

CREATE POLICY rock_milestones_update_contributor
  ON public.rock_milestones
  FOR UPDATE
  TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = rock_milestones.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
    AND EXISTS (
      SELECT 1
      FROM public.rocks r
      WHERE r.id = rock_milestones.rock_id
        AND r.organization_id = rock_milestones.organization_id
        AND (
          r.owner_id = auth.uid()
          OR public.can_manage_org(r.organization_id)
          OR (
            r.team_id IS NOT NULL
            AND public.can_manage_team(r.team_id)
          )
        )
    )
  )
  WITH CHECK (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.rocks r
      WHERE r.id = rock_milestones.rock_id
        AND r.organization_id = rock_milestones.organization_id
    )
  );

CREATE POLICY rock_milestones_delete_contributor
  ON public.rock_milestones
  FOR DELETE
  TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = rock_milestones.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
    AND EXISTS (
      SELECT 1
      FROM public.rocks r
      WHERE r.id = rock_milestones.rock_id
        AND r.organization_id = rock_milestones.organization_id
        AND (
          r.owner_id = auth.uid()
          OR public.can_manage_org(r.organization_id)
          OR (
            r.team_id IS NOT NULL
            AND public.can_manage_team(r.team_id)
          )
        )
    )
  );

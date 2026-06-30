-- Headlines and Process documentation

CREATE TABLE public.headlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text DEFAULT '',
  headline_type text NOT NULL DEFAULT 'customer'
    CHECK (headline_type IN ('customer', 'employee')),
  meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  archived_at timestamptz
);

CREATE INDEX headlines_organization_id_idx ON public.headlines (organization_id);
CREATE INDEX headlines_team_id_idx ON public.headlines (team_id);

CREATE TRIGGER headlines_set_updated_at
  BEFORE UPDATE ON public.headlines
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.process_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.process_pages(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX process_pages_organization_id_idx ON public.process_pages (organization_id);
CREATE INDEX process_pages_team_id_idx ON public.process_pages (team_id);
CREATE INDEX process_pages_parent_id_idx ON public.process_pages (parent_id);

CREATE TRIGGER process_pages_set_updated_at
  BEFORE UPDATE ON public.process_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.headlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY headlines_select ON public.headlines
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY headlines_mutate ON public.headlines
  FOR ALL TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND public.can_view_org(organization_id)
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = headlines.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
  )
  WITH CHECK (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = headlines.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY process_pages_select ON public.process_pages
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY process_pages_mutate ON public.process_pages
  FOR ALL TO authenticated
  USING (
    public.can_manage_org(organization_id)
    OR (team_id IS NOT NULL AND public.can_manage_team(team_id))
  )
  WITH CHECK (
    public.can_manage_org(organization_id)
    OR (team_id IS NOT NULL AND public.can_manage_team(team_id))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.headlines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_pages TO authenticated;

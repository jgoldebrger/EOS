-- Inbox, Projects

CREATE TABLE public.inbox_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assignee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  source_type text,
  source_id uuid,
  action_url text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX inbox_items_assignee_id_idx ON public.inbox_items (assignee_id);
CREATE INDEX inbox_items_organization_id_idx ON public.inbox_items (organization_id);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'on_hold', 'completed', 'cancelled')),
  due_date date,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  archived_at timestamptz
);

CREATE INDEX projects_organization_id_idx ON public.projects (organization_id);
CREATE INDEX projects_team_id_idx ON public.projects (team_id);
CREATE INDEX projects_owner_id_idx ON public.projects (owner_id);

CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.inbox_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY inbox_items_select ON public.inbox_items
  FOR SELECT TO authenticated
  USING (assignee_id = auth.uid() AND public.is_org_member(organization_id));

CREATE POLICY inbox_items_update ON public.inbox_items
  FOR UPDATE TO authenticated
  USING (assignee_id = auth.uid())
  WITH CHECK (assignee_id = auth.uid());

CREATE POLICY inbox_items_insert ON public.inbox_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY projects_select ON public.projects
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY projects_mutate ON public.projects
  FOR ALL TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = projects.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
  )
  WITH CHECK (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = projects.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbox_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;

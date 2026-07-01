-- Saved project views (list / kanban filters)

CREATE TABLE public.project_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_type text NOT NULL DEFAULT 'list' CHECK (display_type IN ('list', 'kanban', 'triage')),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX project_views_project_id_idx ON public.project_views (project_id);

CREATE TRIGGER project_views_set_updated_at
  BEFORE UPDATE ON public.project_views
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.project_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_views_select ON public.project_views
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY project_views_mutate ON public.project_views
  FOR ALL TO authenticated
  USING (public.can_mutate_project_resource(organization_id))
  WITH CHECK (public.can_mutate_project_resource(organization_id));

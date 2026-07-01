-- Project cycles (sprints)

CREATE TABLE public.project_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'current', 'upcoming', 'completed')
  ),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX project_cycles_project_id_idx ON public.project_cycles (project_id);
CREATE INDEX project_cycles_status_idx ON public.project_cycles (status);

CREATE TRIGGER project_cycles_set_updated_at
  BEFORE UPDATE ON public.project_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.project_work_items
  ADD CONSTRAINT project_work_items_cycle_id_fkey
  FOREIGN KEY (cycle_id) REFERENCES public.project_cycles(id) ON DELETE SET NULL;

ALTER TABLE public.project_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_cycles_select ON public.project_cycles
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY project_cycles_mutate ON public.project_cycles
  FOR ALL TO authenticated
  USING (public.can_mutate_project_resource(organization_id))
  WITH CHECK (public.can_mutate_project_resource(organization_id));

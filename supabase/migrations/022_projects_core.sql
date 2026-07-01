-- Projects core: extend projects, work items, modules, labels

-- ---------------------------------------------------------------------------
-- Extend projects
-- ---------------------------------------------------------------------------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS identifier_prefix text,
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS target_date date,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS display_order int NOT NULL DEFAULT 0;

UPDATE public.projects
SET slug = lower(regexp_replace(trim(title), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

UPDATE public.projects SET identifier_prefix = 'PROJ' WHERE identifier_prefix IS NULL;

ALTER TABLE public.projects
  ALTER COLUMN slug SET NOT NULL,
  ALTER COLUMN identifier_prefix SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS projects_organization_slug_idx
  ON public.projects (organization_id, slug);

CREATE INDEX IF NOT EXISTS projects_lead_id_idx ON public.projects (lead_id);

-- ---------------------------------------------------------------------------
-- project_modules
-- ---------------------------------------------------------------------------
CREATE TABLE public.project_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX project_modules_project_id_idx ON public.project_modules (project_id);

CREATE TRIGGER project_modules_set_updated_at
  BEFORE UPDATE ON public.project_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- project_work_items
-- ---------------------------------------------------------------------------
CREATE TABLE public.project_work_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.project_work_items(id) ON DELETE SET NULL,
  module_id uuid REFERENCES public.project_modules(id) ON DELETE SET NULL,
  cycle_id uuid,
  title text NOT NULL,
  description text,
  state text NOT NULL DEFAULT 'backlog' CHECK (
    state IN ('triage', 'backlog', 'unstarted', 'started', 'completed', 'cancelled')
  ),
  priority text NOT NULL DEFAULT 'none' CHECK (
    priority IN ('urgent', 'high', 'medium', 'low', 'none')
  ),
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sequence_number int NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  due_date date,
  estimate_points numeric,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX project_work_items_project_sequence_idx
  ON public.project_work_items (project_id, sequence_number);

CREATE INDEX project_work_items_project_id_idx ON public.project_work_items (project_id);
CREATE INDEX project_work_items_assignee_id_idx ON public.project_work_items (assignee_id);
CREATE INDEX project_work_items_state_idx ON public.project_work_items (state);
CREATE INDEX project_work_items_cycle_id_idx ON public.project_work_items (cycle_id);
CREATE INDEX project_work_items_module_id_idx ON public.project_work_items (module_id);

CREATE TRIGGER project_work_items_set_updated_at
  BEFORE UPDATE ON public.project_work_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- project_labels
-- ---------------------------------------------------------------------------
CREATE TABLE public.project_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX project_labels_project_name_idx
  ON public.project_labels (project_id, name);

CREATE TABLE public.project_work_item_labels (
  work_item_id uuid NOT NULL REFERENCES public.project_work_items(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.project_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (work_item_id, label_id)
);

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_mutate_project_resource(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = auth.uid()
      AND om.org_role IN ('owner', 'admin', 'member')
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS: project_modules
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_modules_select ON public.project_modules
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY project_modules_mutate ON public.project_modules
  FOR ALL TO authenticated
  USING (public.can_mutate_project_resource(organization_id))
  WITH CHECK (public.can_mutate_project_resource(organization_id));

-- ---------------------------------------------------------------------------
-- RLS: project_work_items
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_work_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_work_items_select ON public.project_work_items
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY project_work_items_mutate ON public.project_work_items
  FOR ALL TO authenticated
  USING (public.can_mutate_project_resource(organization_id))
  WITH CHECK (public.can_mutate_project_resource(organization_id));

-- ---------------------------------------------------------------------------
-- RLS: project_labels
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_labels_select ON public.project_labels
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY project_labels_mutate ON public.project_labels
  FOR ALL TO authenticated
  USING (public.can_mutate_project_resource(organization_id))
  WITH CHECK (public.can_mutate_project_resource(organization_id));

ALTER TABLE public.project_work_item_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_work_item_labels_select ON public.project_work_item_labels
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_work_items wi
      WHERE wi.id = work_item_id
        AND public.is_org_member(wi.organization_id)
    )
  );

CREATE POLICY project_work_item_labels_mutate ON public.project_work_item_labels
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_work_items wi
      WHERE wi.id = work_item_id
        AND public.can_mutate_project_resource(wi.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_work_items wi
      WHERE wi.id = work_item_id
        AND public.can_mutate_project_resource(wi.organization_id)
    )
  );

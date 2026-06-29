-- Wave 5b: Vision/Traction Organizer (V/TO) sections and version snapshots

-- ---------------------------------------------------------------------------
-- vto_sections
-- ---------------------------------------------------------------------------
CREATE TABLE public.vto_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  display_order int NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT vto_sections_org_key_unique UNIQUE (organization_id, section_key)
);

CREATE INDEX vto_sections_organization_id_idx
  ON public.vto_sections (organization_id);
CREATE INDEX vto_sections_display_order_idx
  ON public.vto_sections (organization_id, display_order);

CREATE TRIGGER vto_sections_set_updated_at
  BEFORE UPDATE ON public.vto_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- vto_snapshots (version history)
-- ---------------------------------------------------------------------------
CREATE TABLE public.vto_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  snapshot_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX vto_snapshots_organization_id_idx
  ON public.vto_snapshots (organization_id);
CREATE INDEX vto_snapshots_created_at_idx
  ON public.vto_snapshots (organization_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS: org members SELECT sections; can_manage_org mutates sections & snapshots
-- ---------------------------------------------------------------------------
ALTER TABLE public.vto_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY vto_sections_select_member
  ON public.vto_sections
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY vto_sections_insert_admin
  ON public.vto_sections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_org(organization_id)
    AND (created_by IS NULL OR created_by = auth.uid())
  );

CREATE POLICY vto_sections_update_admin
  ON public.vto_sections
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_org(organization_id))
  WITH CHECK (public.can_manage_org(organization_id));

CREATE POLICY vto_sections_delete_admin
  ON public.vto_sections
  FOR DELETE
  TO authenticated
  USING (public.can_manage_org(organization_id));

ALTER TABLE public.vto_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY vto_snapshots_select_member
  ON public.vto_snapshots
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY vto_snapshots_insert_admin
  ON public.vto_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_org(organization_id)
    AND (created_by IS NULL OR created_by = auth.uid())
  );

CREATE POLICY vto_snapshots_delete_admin
  ON public.vto_snapshots
  FOR DELETE
  TO authenticated
  USING (public.can_manage_org(organization_id));

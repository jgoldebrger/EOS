-- Wave 5a: Accountability chart seats (org hierarchy)

-- ---------------------------------------------------------------------------
-- accountability_seats
-- ---------------------------------------------------------------------------
CREATE TABLE public.accountability_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  parent_id uuid REFERENCES public.accountability_seats(id) ON DELETE SET NULL,
  responsibilities text,
  assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT accountability_seats_no_self_parent CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE INDEX accountability_seats_organization_id_idx
  ON public.accountability_seats (organization_id);
CREATE INDEX accountability_seats_parent_id_idx
  ON public.accountability_seats (parent_id);
CREATE INDEX accountability_seats_assigned_user_id_idx
  ON public.accountability_seats (assigned_user_id);

CREATE TRIGGER accountability_seats_set_updated_at
  BEFORE UPDATE ON public.accountability_seats
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: org members SELECT; admins (can_manage_org) mutate
-- ---------------------------------------------------------------------------
ALTER TABLE public.accountability_seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY accountability_seats_select_member
  ON public.accountability_seats
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY accountability_seats_insert_admin
  ON public.accountability_seats
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_org(organization_id)
    AND (created_by IS NULL OR created_by = auth.uid())
  );

CREATE POLICY accountability_seats_update_admin
  ON public.accountability_seats
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_org(organization_id))
  WITH CHECK (public.can_manage_org(organization_id));

CREATE POLICY accountability_seats_delete_admin
  ON public.accountability_seats
  FOR DELETE
  TO authenticated
  USING (public.can_manage_org(organization_id));

-- Cascade deliveries: headlines and L10 messages to downstream teams

CREATE TABLE public.cascade_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('headline', 'meeting_message')),
  source_id uuid,
  source_label text NOT NULL,
  target_team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged')),
  delivered_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX cascade_deliveries_organization_id_idx ON public.cascade_deliveries (organization_id);
CREATE INDEX cascade_deliveries_target_team_id_idx ON public.cascade_deliveries (target_team_id);
CREATE INDEX cascade_deliveries_status_idx ON public.cascade_deliveries (organization_id, status);

ALTER TABLE public.cascade_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY cascade_deliveries_select ON public.cascade_deliveries
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY cascade_deliveries_insert ON public.cascade_deliveries
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = cascade_deliveries.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY cascade_deliveries_update ON public.cascade_deliveries
  FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

GRANT SELECT, INSERT, UPDATE ON public.cascade_deliveries TO authenticated;

-- Wave 2b: Scorecard metrics and weekly values

-- ---------------------------------------------------------------------------
-- scorecard_metrics
-- ---------------------------------------------------------------------------
CREATE TABLE public.scorecard_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  name text NOT NULL,
  unit text,
  description text,
  target_rule text NOT NULL CHECK (
    target_rule IN (
      'higher_is_better',
      'lower_is_better',
      'range',
      'exact',
      'boolean'
    )
  ),
  target_value numeric,
  target_min numeric,
  target_max numeric,
  tolerance_percent numeric NOT NULL DEFAULT 10,
  display_order integer NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT scorecard_metrics_range_bounds_check CHECK (
    target_rule <> 'range'
    OR (target_min IS NOT NULL AND target_max IS NOT NULL AND target_min <= target_max)
  )
);

CREATE INDEX scorecard_metrics_organization_id_idx
  ON public.scorecard_metrics (organization_id);
CREATE INDEX scorecard_metrics_team_id_idx
  ON public.scorecard_metrics (team_id);
CREATE INDEX scorecard_metrics_owner_id_idx
  ON public.scorecard_metrics (owner_id);
CREATE INDEX scorecard_metrics_display_order_idx
  ON public.scorecard_metrics (organization_id, display_order);

CREATE TRIGGER scorecard_metrics_set_updated_at
  BEFORE UPDATE ON public.scorecard_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- scorecard_values
-- ---------------------------------------------------------------------------
CREATE TABLE public.scorecard_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  metric_id uuid NOT NULL REFERENCES public.scorecard_metrics(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  actual numeric,
  target_snapshot numeric,
  status_override text CHECK (status_override IN ('green', 'yellow', 'red', 'na')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (metric_id, period_start)
);

CREATE INDEX scorecard_values_organization_id_idx
  ON public.scorecard_values (organization_id);
CREATE INDEX scorecard_values_metric_id_idx
  ON public.scorecard_values (metric_id);
CREATE INDEX scorecard_values_period_start_idx
  ON public.scorecard_values (period_start);

CREATE TRIGGER scorecard_values_set_updated_at
  BEFORE UPDATE ON public.scorecard_values
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.scorecard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scorecard_values ENABLE ROW LEVEL SECURITY;

-- scorecard_metrics: org members read; admins and team leaders manage
CREATE POLICY scorecard_metrics_select_member
  ON public.scorecard_metrics
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY scorecard_metrics_insert_manage
  ON public.scorecard_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND (
      public.can_manage_org(organization_id)
      OR (
        team_id IS NOT NULL
        AND public.can_manage_team(team_id)
      )
    )
    AND (created_by IS NULL OR created_by = auth.uid())
  );

CREATE POLICY scorecard_metrics_update_manage
  ON public.scorecard_metrics
  FOR UPDATE
  TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND (
      public.can_manage_org(organization_id)
      OR (
        team_id IS NOT NULL
        AND public.can_manage_team(team_id)
      )
    )
  )
  WITH CHECK (
    public.is_org_member(organization_id)
    AND (
      public.can_manage_org(organization_id)
      OR (
        team_id IS NOT NULL
        AND public.can_manage_team(team_id)
      )
    )
  );

CREATE POLICY scorecard_metrics_delete_manage
  ON public.scorecard_metrics
  FOR DELETE
  TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND (
      public.can_manage_org(organization_id)
      OR (
        team_id IS NOT NULL
        AND public.can_manage_team(team_id)
      )
    )
  );

-- scorecard_values: org members read; contributors who own metric or manage team write
CREATE POLICY scorecard_values_select_member
  ON public.scorecard_values
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY scorecard_values_insert_contributor
  ON public.scorecard_values
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = scorecard_values.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
    AND EXISTS (
      SELECT 1
      FROM public.scorecard_metrics m
      WHERE m.id = scorecard_values.metric_id
        AND m.organization_id = scorecard_values.organization_id
        AND (
          m.owner_id = auth.uid()
          OR public.can_manage_org(m.organization_id)
          OR (
            m.team_id IS NOT NULL
            AND public.can_manage_team(m.team_id)
          )
        )
    )
    AND (created_by IS NULL OR created_by = auth.uid())
  );

CREATE POLICY scorecard_values_update_contributor
  ON public.scorecard_values
  FOR UPDATE
  TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = scorecard_values.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
    AND EXISTS (
      SELECT 1
      FROM public.scorecard_metrics m
      WHERE m.id = scorecard_values.metric_id
        AND m.organization_id = scorecard_values.organization_id
        AND (
          m.owner_id = auth.uid()
          OR public.can_manage_org(m.organization_id)
          OR (
            m.team_id IS NOT NULL
            AND public.can_manage_team(m.team_id)
          )
        )
    )
  )
  WITH CHECK (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = scorecard_values.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
    AND EXISTS (
      SELECT 1
      FROM public.scorecard_metrics m
      WHERE m.id = scorecard_values.metric_id
        AND m.organization_id = scorecard_values.organization_id
        AND (
          m.owner_id = auth.uid()
          OR public.can_manage_org(m.organization_id)
          OR (
            m.team_id IS NOT NULL
            AND public.can_manage_team(m.team_id)
          )
        )
    )
  );

CREATE POLICY scorecard_values_delete_contributor
  ON public.scorecard_values
  FOR DELETE
  TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = scorecard_values.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
    AND EXISTS (
      SELECT 1
      FROM public.scorecard_metrics m
      WHERE m.id = scorecard_values.metric_id
        AND m.organization_id = scorecard_values.organization_id
        AND (
          m.owner_id = auth.uid()
          OR public.can_manage_org(m.organization_id)
          OR (
            m.team_id IS NOT NULL
            AND public.can_manage_team(m.team_id)
          )
        )
    )
  );

-- L10 scorecard: allow org members on a team to create and reassign measurables

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_org_contributor(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = org_id
      AND om.user_id = auth.uid()
      AND om.org_role IN ('owner', 'admin', 'member')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_mutate_scorecard_metric(
  org_id uuid,
  team_id uuid,
  owner_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_org_contributor(org_id)
    AND (
      public.can_manage_org(org_id)
      OR (team_id IS NOT NULL AND public.is_team_member(team_id))
      OR team_id IS NULL
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_formula_metric(
  org_id uuid,
  team_id uuid,
  tokens jsonb
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_mutate_scorecard_metric(org_id, team_id)
    AND public.formula_tokens_org_accessible(tokens);
$$;

GRANT EXECUTE ON FUNCTION public.is_org_contributor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_mutate_scorecard_metric(uuid, uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- scorecard_metrics
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS scorecard_metrics_insert_manage ON public.scorecard_metrics;
CREATE POLICY scorecard_metrics_insert_manage
  ON public.scorecard_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      datasource = 'manual'
      AND public.can_mutate_scorecard_metric(organization_id, team_id, owner_id)
    )
    OR (
      datasource = 'formula'
      AND public.can_manage_formula_metric(organization_id, team_id, formula_tokens)
    )
    AND (created_by IS NULL OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS scorecard_metrics_update_manage ON public.scorecard_metrics;
CREATE POLICY scorecard_metrics_update_manage
  ON public.scorecard_metrics
  FOR UPDATE
  TO authenticated
  USING (
    public.can_mutate_scorecard_metric(organization_id, team_id, owner_id)
  )
  WITH CHECK (
    (
      datasource = 'manual'
      AND public.can_mutate_scorecard_metric(organization_id, team_id, owner_id)
    )
    OR (
      datasource = 'formula'
      AND public.can_manage_formula_metric(organization_id, team_id, formula_tokens)
    )
  );

DROP POLICY IF EXISTS scorecard_metrics_delete_manage ON public.scorecard_metrics;
CREATE POLICY scorecard_metrics_delete_manage
  ON public.scorecard_metrics
  FOR DELETE
  TO authenticated
  USING (
    public.can_mutate_scorecard_metric(organization_id, team_id, owner_id)
  );

-- ---------------------------------------------------------------------------
-- scorecard_categories
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS scorecard_categories_insert ON public.scorecard_categories;
CREATE POLICY scorecard_categories_insert
  ON public.scorecard_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_org(organization_id)
    OR (team_id IS NOT NULL AND public.is_team_member(team_id) AND public.is_org_contributor(organization_id))
    OR (team_id IS NULL AND public.is_org_contributor(organization_id))
  );

DROP POLICY IF EXISTS scorecard_categories_update ON public.scorecard_categories;
CREATE POLICY scorecard_categories_update
  ON public.scorecard_categories
  FOR UPDATE TO authenticated
  USING (
    public.can_manage_org(organization_id)
    OR (team_id IS NOT NULL AND public.is_team_member(team_id) AND public.is_org_contributor(organization_id))
    OR (team_id IS NULL AND public.is_org_contributor(organization_id))
  );

DROP POLICY IF EXISTS scorecard_categories_delete ON public.scorecard_categories;
CREATE POLICY scorecard_categories_delete
  ON public.scorecard_categories
  FOR DELETE TO authenticated
  USING (
    public.can_manage_org(organization_id)
    OR (team_id IS NOT NULL AND public.is_team_member(team_id) AND public.is_org_contributor(organization_id))
    OR (team_id IS NULL AND public.is_org_contributor(organization_id))
  );

-- ---------------------------------------------------------------------------
-- tags + scorecard_metric_tags
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS tags_insert ON public.tags;
CREATE POLICY tags_insert ON public.tags
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_contributor(organization_id));

DROP POLICY IF EXISTS tags_update ON public.tags;
CREATE POLICY tags_update ON public.tags
  FOR UPDATE TO authenticated
  USING (public.is_org_contributor(organization_id));

DROP POLICY IF EXISTS tags_delete ON public.tags;
CREATE POLICY tags_delete ON public.tags
  FOR DELETE TO authenticated
  USING (
    public.can_manage_org(organization_id)
    OR EXISTS (
      SELECT 1
      FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      WHERE tm.user_id = auth.uid()
        AND tm.team_role = 'leader'
        AND t.organization_id = tags.organization_id
    )
  );

DROP POLICY IF EXISTS scorecard_metric_tags_insert ON public.scorecard_metric_tags;
CREATE POLICY scorecard_metric_tags_insert ON public.scorecard_metric_tags
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.scorecard_metrics m
      JOIN public.tags t ON t.id = scorecard_metric_tags.tag_id
      WHERE m.id = scorecard_metric_tags.metric_id
        AND t.organization_id = m.organization_id
        AND public.can_mutate_scorecard_metric(m.organization_id, m.team_id, m.owner_id)
    )
  );

DROP POLICY IF EXISTS scorecard_metric_tags_delete ON public.scorecard_metric_tags;
CREATE POLICY scorecard_metric_tags_delete ON public.scorecard_metric_tags
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.scorecard_metrics m
      WHERE m.id = scorecard_metric_tags.metric_id
        AND public.can_mutate_scorecard_metric(m.organization_id, m.team_id, m.owner_id)
    )
  );

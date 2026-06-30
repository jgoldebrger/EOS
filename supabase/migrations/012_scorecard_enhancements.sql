-- Strety parity: scorecard categories, multi-period, saved views

-- ---------------------------------------------------------------------------
-- scorecard_categories
-- ---------------------------------------------------------------------------
CREATE TABLE public.scorecard_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#6366f1',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX scorecard_categories_organization_id_idx
  ON public.scorecard_categories (organization_id);
CREATE INDEX scorecard_categories_team_id_idx
  ON public.scorecard_categories (team_id);

CREATE TRIGGER scorecard_categories_set_updated_at
  BEFORE UPDATE ON public.scorecard_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- scorecard_metrics enhancements
-- ---------------------------------------------------------------------------
ALTER TABLE public.scorecard_metrics
  ADD COLUMN period_type text NOT NULL DEFAULT 'weekly'
    CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'annual')),
  ADD COLUMN category_id uuid REFERENCES public.scorecard_categories(id) ON DELETE SET NULL,
  ADD COLUMN display_target text;

CREATE INDEX scorecard_metrics_category_id_idx
  ON public.scorecard_metrics (category_id);
CREATE INDEX scorecard_metrics_period_type_idx
  ON public.scorecard_metrics (period_type);

-- ---------------------------------------------------------------------------
-- scorecard_values: period_type for multi-period uniqueness
-- ---------------------------------------------------------------------------
ALTER TABLE public.scorecard_values
  ADD COLUMN period_type text NOT NULL DEFAULT 'weekly'
    CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'annual'));

ALTER TABLE public.scorecard_values
  DROP CONSTRAINT IF EXISTS scorecard_values_metric_id_period_start_key;

ALTER TABLE public.scorecard_values
  ADD CONSTRAINT scorecard_values_metric_period_unique
  UNIQUE (metric_id, period_start, period_type);

-- ---------------------------------------------------------------------------
-- saved_scorecard_views
-- ---------------------------------------------------------------------------
CREATE TABLE public.saved_scorecard_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}',
  is_bookmarked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX saved_scorecard_views_organization_id_idx
  ON public.saved_scorecard_views (organization_id);
CREATE INDEX saved_scorecard_views_user_id_idx
  ON public.saved_scorecard_views (user_id);

CREATE TRIGGER saved_scorecard_views_set_updated_at
  BEFORE UPDATE ON public.saved_scorecard_views
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.scorecard_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_scorecard_views ENABLE ROW LEVEL SECURITY;

-- scorecard_categories
CREATE POLICY scorecard_categories_select ON public.scorecard_categories
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY scorecard_categories_insert ON public.scorecard_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_org(organization_id)
    OR (team_id IS NOT NULL AND public.can_manage_team(team_id))
  );

CREATE POLICY scorecard_categories_update ON public.scorecard_categories
  FOR UPDATE TO authenticated
  USING (
    public.can_manage_org(organization_id)
    OR (team_id IS NOT NULL AND public.can_manage_team(team_id))
  );

CREATE POLICY scorecard_categories_delete ON public.scorecard_categories
  FOR DELETE TO authenticated
  USING (
    public.can_manage_org(organization_id)
    OR (team_id IS NOT NULL AND public.can_manage_team(team_id))
  );

-- saved_scorecard_views: users manage own views in org
CREATE POLICY saved_scorecard_views_select ON public.saved_scorecard_views
  FOR SELECT TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND user_id = auth.uid()
  );

CREATE POLICY saved_scorecard_views_insert ON public.saved_scorecard_views
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND user_id = auth.uid()
  );

CREATE POLICY saved_scorecard_views_update ON public.saved_scorecard_views
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY saved_scorecard_views_delete ON public.saved_scorecard_views
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scorecard_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_scorecard_views TO authenticated;

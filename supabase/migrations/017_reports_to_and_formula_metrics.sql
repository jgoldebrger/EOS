-- Reports-to hierarchy + Strety-style formula measurables

-- ---------------------------------------------------------------------------
-- organization_members.reports_to_user_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.organization_members
  ADD COLUMN reports_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX organization_members_reports_to_idx
  ON public.organization_members (organization_id, reports_to_user_id);

CREATE OR REPLACE FUNCTION public.validate_organization_member_reports_to()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_id uuid;
  depth int := 0;
BEGIN
  IF NEW.reports_to_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.reports_to_user_id = NEW.user_id THEN
    RAISE EXCEPTION 'Cannot report to self';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = NEW.organization_id
      AND om.user_id = NEW.reports_to_user_id
  ) THEN
    RAISE EXCEPTION 'Manager must be a member of the same organization';
  END IF;

  current_id := NEW.reports_to_user_id;
  WHILE current_id IS NOT NULL AND depth < 100 LOOP
    IF current_id = NEW.user_id THEN
      RAISE EXCEPTION 'Reports-to cycle detected';
    END IF;

    SELECT om.reports_to_user_id INTO current_id
    FROM public.organization_members om
    WHERE om.organization_id = NEW.organization_id
      AND om.user_id = current_id;

    depth := depth + 1;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER organization_members_validate_reports_to
  BEFORE INSERT OR UPDATE OF reports_to_user_id ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_organization_member_reports_to();

-- ---------------------------------------------------------------------------
-- scorecard_metrics: datasource + formula
-- ---------------------------------------------------------------------------
ALTER TABLE public.scorecard_metrics
  ADD COLUMN datasource text NOT NULL DEFAULT 'manual'
    CHECK (datasource IN ('manual', 'formula')),
  ADD COLUMN formula text,
  ADD COLUMN formula_tokens jsonb;

CREATE INDEX scorecard_metrics_datasource_idx
  ON public.scorecard_metrics (datasource)
  WHERE datasource = 'formula';

ALTER TABLE public.scorecard_metrics
  ADD CONSTRAINT scorecard_metrics_formula_fields_check CHECK (
    (datasource = 'manual')
    OR (
      datasource = 'formula'
      AND formula IS NOT NULL
      AND btrim(formula) <> ''
      AND formula_tokens IS NOT NULL
      AND jsonb_typeof(formula_tokens) = 'array'
      AND jsonb_array_length(formula_tokens) > 0
    )
  );

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.formula_tokens_org_accessible(tokens jsonb)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tokens IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(tokens) AS elem
      WHERE elem->>'type' = 'metric'
        AND NOT public.is_org_member((elem->>'organizationId')::uuid)
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
  SELECT public.is_org_member(org_id)
    AND (
      public.can_manage_org(org_id)
      OR (team_id IS NOT NULL AND public.can_manage_team(team_id))
    )
    AND public.formula_tokens_org_accessible(tokens);
$$;

-- Extend scorecard_metrics write policies for formula datasource
DROP POLICY IF EXISTS scorecard_metrics_insert_manage ON public.scorecard_metrics;
CREATE POLICY scorecard_metrics_insert_manage
  ON public.scorecard_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      datasource = 'manual'
      AND public.is_org_member(organization_id)
      AND (
        public.can_manage_org(organization_id)
        OR (team_id IS NOT NULL AND public.can_manage_team(team_id))
      )
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
    public.is_org_member(organization_id)
    AND (
      public.can_manage_org(organization_id)
      OR (team_id IS NOT NULL AND public.can_manage_team(team_id))
    )
  )
  WITH CHECK (
    (
      datasource = 'manual'
      AND public.is_org_member(organization_id)
      AND (
        public.can_manage_org(organization_id)
        OR (team_id IS NOT NULL AND public.can_manage_team(team_id))
      )
    )
    OR (
      datasource = 'formula'
      AND public.can_manage_formula_metric(organization_id, team_id, formula_tokens)
    )
  );

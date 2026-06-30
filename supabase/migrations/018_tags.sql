-- Scorecard tags: org-level labels for measurables

-- ---------------------------------------------------------------------------
-- tags
-- ---------------------------------------------------------------------------
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT tags_organization_name_unique UNIQUE (organization_id, name)
);

CREATE INDEX tags_organization_id_idx ON public.tags (organization_id);

-- ---------------------------------------------------------------------------
-- scorecard_metric_tags
-- ---------------------------------------------------------------------------
CREATE TABLE public.scorecard_metric_tags (
  metric_id uuid NOT NULL REFERENCES public.scorecard_metrics(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (metric_id, tag_id)
);

CREATE INDEX scorecard_metric_tags_tag_id_idx
  ON public.scorecard_metric_tags (tag_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scorecard_metric_tags ENABLE ROW LEVEL SECURITY;

-- tags: org members read; admins and team leaders manage
CREATE POLICY tags_select ON public.tags
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY tags_insert ON public.tags
  FOR INSERT TO authenticated
  WITH CHECK (
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

CREATE POLICY tags_update ON public.tags
  FOR UPDATE TO authenticated
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

-- scorecard_metric_tags: org members read; metric managers write
CREATE POLICY scorecard_metric_tags_select ON public.scorecard_metric_tags
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.scorecard_metrics m
      WHERE m.id = scorecard_metric_tags.metric_id
        AND public.is_org_member(m.organization_id)
    )
  );

CREATE POLICY scorecard_metric_tags_insert ON public.scorecard_metric_tags
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.scorecard_metrics m
      JOIN public.tags t ON t.id = scorecard_metric_tags.tag_id
      WHERE m.id = scorecard_metric_tags.metric_id
        AND t.organization_id = m.organization_id
        AND public.is_org_member(m.organization_id)
        AND (
          public.can_manage_org(m.organization_id)
          OR (
            m.team_id IS NOT NULL
            AND public.can_manage_team(m.team_id)
          )
        )
    )
  );

CREATE POLICY scorecard_metric_tags_delete ON public.scorecard_metric_tags
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.scorecard_metrics m
      WHERE m.id = scorecard_metric_tags.metric_id
        AND public.is_org_member(m.organization_id)
        AND (
          public.can_manage_org(m.organization_id)
          OR (
            m.team_id IS NOT NULL
            AND public.can_manage_team(m.team_id)
          )
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.scorecard_metric_tags TO authenticated;

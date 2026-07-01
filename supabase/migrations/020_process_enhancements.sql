-- Process pages: categories, archiving, version history, and tags

ALTER TABLE public.process_pages
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS process_pages_category_idx
  ON public.process_pages (organization_id, category);

CREATE INDEX IF NOT EXISTS process_pages_archived_at_idx
  ON public.process_pages (organization_id, archived_at);

-- ---------------------------------------------------------------------------
-- process_page_versions
-- ---------------------------------------------------------------------------
CREATE TABLE public.process_page_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_page_id uuid NOT NULL REFERENCES public.process_pages(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sop_document jsonb,
  content text NOT NULL DEFAULT '',
  version_number integer NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT process_page_versions_page_version_unique
    UNIQUE (process_page_id, version_number)
);

CREATE INDEX process_page_versions_process_page_id_idx
  ON public.process_page_versions (process_page_id);

CREATE INDEX process_page_versions_organization_id_idx
  ON public.process_page_versions (organization_id);

CREATE INDEX process_page_versions_page_version_idx
  ON public.process_page_versions (process_page_id, version_number DESC);

CREATE INDEX process_page_versions_created_at_idx
  ON public.process_page_versions (process_page_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- process_page_tags
-- ---------------------------------------------------------------------------
CREATE TABLE public.process_page_tags (
  process_page_id uuid NOT NULL REFERENCES public.process_pages(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (process_page_id, tag_id)
);

CREATE INDEX process_page_tags_tag_id_idx
  ON public.process_page_tags (tag_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.process_page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_page_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY process_page_versions_select ON public.process_page_versions
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY process_page_versions_mutate ON public.process_page_versions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.process_pages pp
      WHERE pp.id = process_page_versions.process_page_id
        AND pp.organization_id = process_page_versions.organization_id
        AND (
          public.can_manage_org(pp.organization_id)
          OR (pp.team_id IS NOT NULL AND public.can_manage_team(pp.team_id))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.process_pages pp
      WHERE pp.id = process_page_versions.process_page_id
        AND pp.organization_id = process_page_versions.organization_id
        AND (
          public.can_manage_org(pp.organization_id)
          OR (pp.team_id IS NOT NULL AND public.can_manage_team(pp.team_id))
        )
    )
  );

CREATE POLICY process_page_tags_select ON public.process_page_tags
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.process_pages pp
      WHERE pp.id = process_page_tags.process_page_id
        AND public.is_org_member(pp.organization_id)
    )
  );

CREATE POLICY process_page_tags_mutate ON public.process_page_tags
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.process_pages pp
      WHERE pp.id = process_page_tags.process_page_id
        AND (
          public.can_manage_org(pp.organization_id)
          OR (pp.team_id IS NOT NULL AND public.can_manage_team(pp.team_id))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.process_pages pp
      JOIN public.tags t ON t.id = process_page_tags.tag_id
      WHERE pp.id = process_page_tags.process_page_id
        AND t.organization_id = pp.organization_id
        AND (
          public.can_manage_org(pp.organization_id)
          OR (pp.team_id IS NOT NULL AND public.can_manage_team(pp.team_id))
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_page_versions TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.process_page_tags TO authenticated;

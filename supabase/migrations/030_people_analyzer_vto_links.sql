-- People Analyzer core values + V/TO entity links + inbox archive

ALTER TABLE public.people_reviews
  ADD COLUMN IF NOT EXISTS core_values_scores jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE public.vto_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('rock', 'issue', 'metric')),
  entity_id uuid NOT NULL,
  section_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (organization_id, entity_type, entity_id, section_key)
);

CREATE INDEX vto_links_organization_id_idx ON public.vto_links (organization_id);
CREATE INDEX vto_links_entity_idx ON public.vto_links (entity_type, entity_id);

ALTER TABLE public.vto_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY vto_links_select ON public.vto_links
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY vto_links_mutate ON public.vto_links
  FOR ALL TO authenticated
  USING (public.can_manage_org(organization_id))
  WITH CHECK (public.can_manage_org(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vto_links TO authenticated;

ALTER TABLE public.inbox_items
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX inbox_items_archived_at_idx ON public.inbox_items (assignee_id, archived_at);

ALTER TABLE public.process_pages
  ADD COLUMN IF NOT EXISTS accountability_seat_id uuid REFERENCES public.accountability_seats(id) ON DELETE SET NULL;

CREATE INDEX process_pages_accountability_seat_id_idx ON public.process_pages (accountability_seat_id);

ALTER TABLE public.headlines
  ADD COLUMN IF NOT EXISTS is_cascading boolean NOT NULL DEFAULT false;

-- Project pages and EOS entity links

CREATE TABLE public.project_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.project_pages(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  content_format text NOT NULL DEFAULT 'text' CHECK (content_format IN ('text', 'markdown')),
  display_order int NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX project_pages_project_id_idx ON public.project_pages (project_id);

CREATE TRIGGER project_pages_set_updated_at
  BEFORE UPDATE ON public.project_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.project_issue_links (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (project_id, issue_id)
);

CREATE TABLE public.project_rock_links (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  rock_id uuid NOT NULL REFERENCES public.rocks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (project_id, rock_id)
);

CREATE TABLE public.project_todo_links (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  todo_id uuid NOT NULL REFERENCES public.todos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (project_id, todo_id)
);

ALTER TABLE public.project_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_issue_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_rock_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_todo_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_pages_select ON public.project_pages
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY project_pages_mutate ON public.project_pages
  FOR ALL TO authenticated
  USING (public.can_mutate_project_resource(organization_id))
  WITH CHECK (public.can_mutate_project_resource(organization_id));

CREATE POLICY project_issue_links_select ON public.project_issue_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND public.is_org_member(p.organization_id)
    )
  );

CREATE POLICY project_issue_links_mutate ON public.project_issue_links
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND public.can_mutate_project_resource(p.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND public.can_mutate_project_resource(p.organization_id)
    )
  );

CREATE POLICY project_rock_links_select ON public.project_rock_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND public.is_org_member(p.organization_id)
    )
  );

CREATE POLICY project_rock_links_mutate ON public.project_rock_links
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND public.can_mutate_project_resource(p.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND public.can_mutate_project_resource(p.organization_id)
    )
  );

CREATE POLICY project_todo_links_select ON public.project_todo_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND public.is_org_member(p.organization_id)
    )
  );

CREATE POLICY project_todo_links_mutate ON public.project_todo_links
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND public.can_mutate_project_resource(p.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND public.can_mutate_project_resource(p.organization_id)
    )
  );

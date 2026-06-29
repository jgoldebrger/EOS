-- Wave 4: L10 meetings, notes, and decisions

-- ---------------------------------------------------------------------------
-- meetings
-- ---------------------------------------------------------------------------
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'L10 Meeting',
  meeting_type text NOT NULL DEFAULT 'l10' CHECK (
    meeting_type IN ('l10', 'other')
  ),
  status text NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'in_progress', 'completed', 'cancelled')
  ),
  started_at timestamptz,
  ended_at timestamptz,
  agenda_template jsonb NOT NULL DEFAULT '[]'::jsonb,
  active_section_key text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX meetings_organization_id_idx ON public.meetings (organization_id);
CREATE INDEX meetings_team_id_idx ON public.meetings (team_id);
CREATE INDEX meetings_status_idx ON public.meetings (status);

CREATE TRIGGER meetings_set_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- meeting_notes
-- ---------------------------------------------------------------------------
CREATE TABLE public.meeting_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (meeting_id, section_key)
);

CREATE INDEX meeting_notes_organization_id_idx ON public.meeting_notes (organization_id);
CREATE INDEX meeting_notes_meeting_id_idx ON public.meeting_notes (meeting_id);

CREATE TRIGGER meeting_notes_set_updated_at
  BEFORE UPDATE ON public.meeting_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- decisions
-- ---------------------------------------------------------------------------
CREATE TABLE public.decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX decisions_organization_id_idx ON public.decisions (organization_id);
CREATE INDEX decisions_meeting_id_idx ON public.decisions (meeting_id);

CREATE TRIGGER decisions_set_updated_at
  BEFORE UPDATE ON public.decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- issues.linked_meeting_id FK (deferred from migration 006)
-- ---------------------------------------------------------------------------
ALTER TABLE public.issues
  ADD CONSTRAINT issues_linked_meeting_id_fkey
  FOREIGN KEY (linked_meeting_id)
  REFERENCES public.meetings(id)
  ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- RLS: org members SELECT; members+ mutate (not viewers)
-- ---------------------------------------------------------------------------
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY meetings_select_member
  ON public.meetings
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY meetings_insert_contributor
  ON public.meetings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = meetings.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
    AND (created_by IS NULL OR created_by = auth.uid())
  );

CREATE POLICY meetings_update_contributor
  ON public.meetings
  FOR UPDATE
  TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = meetings.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
  )
  WITH CHECK (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = meetings.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY meetings_delete_contributor
  ON public.meetings
  FOR DELETE
  TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = meetings.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
  );

ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY meeting_notes_select_member
  ON public.meeting_notes
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY meeting_notes_insert_contributor
  ON public.meeting_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = meeting_notes.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
    AND (created_by IS NULL OR created_by = auth.uid())
  );

CREATE POLICY meeting_notes_update_contributor
  ON public.meeting_notes
  FOR UPDATE
  TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = meeting_notes.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
  )
  WITH CHECK (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = meeting_notes.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY meeting_notes_delete_contributor
  ON public.meeting_notes
  FOR DELETE
  TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = meeting_notes.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
  );

ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY decisions_select_member
  ON public.decisions
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY decisions_insert_contributor
  ON public.decisions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = decisions.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY decisions_update_contributor
  ON public.decisions
  FOR UPDATE
  TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = decisions.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
  )
  WITH CHECK (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = decisions.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY decisions_delete_contributor
  ON public.decisions
  FOR DELETE
  TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = decisions.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime: broadcast active_section_key changes to live meeting clients
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;

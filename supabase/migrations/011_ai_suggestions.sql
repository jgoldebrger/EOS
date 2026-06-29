-- Wave 6: AI suggestions (human-approved workflow)

-- ---------------------------------------------------------------------------
-- ai_suggestions
-- ---------------------------------------------------------------------------
CREATE TABLE public.ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ai_run_id uuid NOT NULL REFERENCES public.ai_runs(id) ON DELETE CASCADE,
  suggestion_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT ai_suggestions_type_check CHECK (
    suggestion_type IN (
      'todo',
      'issue_merge',
      'meeting_summary',
      'scorecard_insight',
      'agenda_focus'
    )
  ),
  CONSTRAINT ai_suggestions_status_check CHECK (
    status IN ('pending', 'approved', 'dismissed')
  )
);

CREATE INDEX ai_suggestions_organization_id_idx
  ON public.ai_suggestions (organization_id);
CREATE INDEX ai_suggestions_ai_run_id_idx
  ON public.ai_suggestions (ai_run_id);
CREATE INDEX ai_suggestions_status_idx
  ON public.ai_suggestions (organization_id, status);

-- ---------------------------------------------------------------------------
-- RLS: org members SELECT; actor updates own pending suggestions
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_suggestions_select_org_member
  ON public.ai_suggestions
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY ai_suggestions_insert_contributor
  ON public.ai_suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.ai_runs ar
      JOIN public.organization_members om
        ON om.organization_id = ar.organization_id
      WHERE ar.id = ai_suggestions.ai_run_id
        AND ar.organization_id = ai_suggestions.organization_id
        AND ar.actor_id = auth.uid()
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY ai_suggestions_update_actor_pending
  ON public.ai_suggestions
  FOR UPDATE
  TO authenticated
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1
      FROM public.ai_runs ar
      WHERE ar.id = ai_suggestions.ai_run_id
        AND ar.actor_id = auth.uid()
    )
  )
  WITH CHECK (
    status IN ('approved', 'dismissed')
    AND (resolved_by IS NULL OR resolved_by = auth.uid())
  );

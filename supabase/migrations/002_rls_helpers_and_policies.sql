-- Wave 1a: RLS helper functions and policies

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND org_role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND org_role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    INNER JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.team_id = is_team_member.team_id
      AND tm.user_id = auth.uid()
      AND public.is_org_member(t.organization_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_leader(team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    INNER JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.team_id = is_team_leader.team_id
      AND tm.user_id = auth.uid()
      AND tm.team_role = 'leader'
      AND public.is_org_member(t.organization_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_org(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_org_member(org_id);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_org(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_org_admin(org_id);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_team(team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_team_leader(team_id)
    OR public.is_org_admin((
      SELECT t.organization_id
      FROM public.teams t
      WHERE t.id = team_id
    ));
$$;

GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_leader(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_team(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
CREATE POLICY organizations_select_member
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (public.can_view_org(id));

CREATE POLICY organizations_insert_authenticated
  ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (created_by IS NULL OR created_by = auth.uid())
  );

CREATE POLICY organizations_update_admin
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_org(id))
  WITH CHECK (public.can_manage_org(id));

CREATE POLICY organizations_delete_owner
  ON public.organizations
  FOR DELETE
  TO authenticated
  USING (public.is_org_owner(id));

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------
CREATE POLICY organization_members_select_same_org
  ON public.organization_members
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY organization_members_insert_manage_or_bootstrap_owner
  ON public.organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_org(organization_id)
    OR (
      user_id = auth.uid()
      AND org_role = 'owner'
      AND NOT EXISTS (
        SELECT 1
        FROM public.organization_members existing
        WHERE existing.organization_id = organization_members.organization_id
      )
    )
  );

CREATE POLICY organization_members_update_admin_or_owner_role_change
  ON public.organization_members
  FOR UPDATE
  TO authenticated
  USING (
    public.can_manage_org(organization_id)
    AND (
      public.is_org_owner(organization_id)
      OR (
        org_role <> 'owner'
        AND (
          SELECT om.org_role
          FROM public.organization_members om
          WHERE om.id = organization_members.id
        ) <> 'owner'
      )
    )
  )
  WITH CHECK (
    public.can_manage_org(organization_id)
    AND (
      public.is_org_owner(organization_id)
      OR org_role <> 'owner'
    )
  );

CREATE POLICY organization_members_delete_admin_not_owner
  ON public.organization_members
  FOR DELETE
  TO authenticated
  USING (
    public.can_manage_org(organization_id)
    AND (
      public.is_org_owner(organization_id)
      OR org_role <> 'owner'
    )
  );

-- ---------------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------------
CREATE POLICY teams_select_org_member
  ON public.teams
  FOR SELECT
  TO authenticated
  USING (public.can_view_org(organization_id));

CREATE POLICY teams_insert_org_admin
  ON public.teams
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_org(organization_id));

CREATE POLICY teams_update_manage
  ON public.teams
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_org(organization_id))
  WITH CHECK (public.can_manage_org(organization_id));

CREATE POLICY teams_delete_org_admin
  ON public.teams
  FOR DELETE
  TO authenticated
  USING (public.can_manage_org(organization_id));

-- ---------------------------------------------------------------------------
-- team_members
-- ---------------------------------------------------------------------------
CREATE POLICY team_members_select_org_member
  ON public.team_members
  FOR SELECT
  TO authenticated
  USING (
    public.is_org_member((
      SELECT t.organization_id
      FROM public.teams t
      WHERE t.id = team_id
    ))
  );

CREATE POLICY team_members_insert_manage
  ON public.team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_team(team_id));

CREATE POLICY team_members_update_manage
  ON public.team_members
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_team(team_id))
  WITH CHECK (public.can_manage_team(team_id));

CREATE POLICY team_members_delete_manage
  ON public.team_members
  FOR DELETE
  TO authenticated
  USING (public.can_manage_team(team_id));

-- ---------------------------------------------------------------------------
-- invitations (admins only — tokens not exposed to regular members)
-- ---------------------------------------------------------------------------
CREATE POLICY invitations_select_admin
  ON public.invitations
  FOR SELECT
  TO authenticated
  USING (public.can_manage_org(organization_id));

CREATE POLICY invitations_insert_admin
  ON public.invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_org(organization_id)
    AND (invited_by IS NULL OR invited_by = auth.uid())
  );

CREATE POLICY invitations_update_admin
  ON public.invitations
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_org(organization_id))
  WITH CHECK (public.can_manage_org(organization_id));

CREATE POLICY invitations_delete_admin
  ON public.invitations
  FOR DELETE
  TO authenticated
  USING (public.can_manage_org(organization_id));

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
CREATE POLICY audit_logs_select_org_member
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY audit_logs_insert_org_member
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND (actor_id IS NULL OR actor_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- ai_runs
-- ---------------------------------------------------------------------------
CREATE POLICY ai_runs_select_org_member
  ON public.ai_runs
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY ai_runs_insert_contributor
  ON public.ai_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = ai_runs.organization_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('owner', 'admin', 'member')
    )
    AND actor_id = auth.uid()
  );

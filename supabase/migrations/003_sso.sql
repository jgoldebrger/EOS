-- Wave 1c: enterprise SSO tables, indexes, and RLS

-- ---------------------------------------------------------------------------
-- organization_sso_settings
-- ---------------------------------------------------------------------------
CREATE TABLE public.organization_sso_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider_type text NOT NULL CHECK (provider_type IN ('oauth', 'saml')),
  provider_name text NOT NULL,
  domain text NOT NULL,
  enforced boolean NOT NULL DEFAULT false,
  allow_email_password_login boolean NOT NULL DEFAULT true,
  auto_join_enabled boolean NOT NULL DEFAULT false,
  default_org_role text NOT NULL DEFAULT 'member'
    CHECK (default_org_role IN ('admin', 'member', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (organization_id)
);

CREATE INDEX organization_sso_settings_organization_id_idx
  ON public.organization_sso_settings (organization_id);
CREATE INDEX organization_sso_settings_domain_idx
  ON public.organization_sso_settings (domain);

CREATE TRIGGER organization_sso_settings_set_updated_at
  BEFORE UPDATE ON public.organization_sso_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- organization_sso_role_mappings
-- ---------------------------------------------------------------------------
CREATE TABLE public.organization_sso_role_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider_group text NOT NULL,
  org_role text NOT NULL CHECK (org_role IN ('admin', 'member', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (organization_id, provider_group)
);

CREATE INDEX organization_sso_role_mappings_organization_id_idx
  ON public.organization_sso_role_mappings (organization_id);

CREATE TRIGGER organization_sso_role_mappings_set_updated_at
  BEFORE UPDATE ON public.organization_sso_role_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- organization_verified_domains
-- ---------------------------------------------------------------------------
CREATE TABLE public.organization_verified_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  verification_method text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (organization_id, domain)
);

CREATE INDEX organization_verified_domains_organization_id_idx
  ON public.organization_verified_domains (organization_id);
CREATE INDEX organization_verified_domains_domain_idx
  ON public.organization_verified_domains (domain);

CREATE TRIGGER organization_verified_domains_set_updated_at
  BEFORE UPDATE ON public.organization_verified_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.organization_sso_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_sso_role_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_verified_domains ENABLE ROW LEVEL SECURITY;

-- organization_sso_settings: admins and owners may view; owners manage
CREATE POLICY organization_sso_settings_select_admin
  ON public.organization_sso_settings
  FOR SELECT
  TO authenticated
  USING (public.is_org_admin(organization_id));

CREATE POLICY organization_sso_settings_insert_owner
  ON public.organization_sso_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_owner(organization_id));

CREATE POLICY organization_sso_settings_update_owner
  ON public.organization_sso_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_org_owner(organization_id))
  WITH CHECK (public.is_org_owner(organization_id));

CREATE POLICY organization_sso_settings_delete_owner
  ON public.organization_sso_settings
  FOR DELETE
  TO authenticated
  USING (public.is_org_owner(organization_id));

-- organization_sso_role_mappings: admins and owners may view; owners manage
CREATE POLICY organization_sso_role_mappings_select_admin
  ON public.organization_sso_role_mappings
  FOR SELECT
  TO authenticated
  USING (public.is_org_admin(organization_id));

CREATE POLICY organization_sso_role_mappings_insert_owner
  ON public.organization_sso_role_mappings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_owner(organization_id));

CREATE POLICY organization_sso_role_mappings_update_owner
  ON public.organization_sso_role_mappings
  FOR UPDATE
  TO authenticated
  USING (public.is_org_owner(organization_id))
  WITH CHECK (public.is_org_owner(organization_id));

CREATE POLICY organization_sso_role_mappings_delete_owner
  ON public.organization_sso_role_mappings
  FOR DELETE
  TO authenticated
  USING (public.is_org_owner(organization_id));

-- organization_verified_domains: admins and owners may view; owners manage
CREATE POLICY organization_verified_domains_select_admin
  ON public.organization_verified_domains
  FOR SELECT
  TO authenticated
  USING (public.is_org_admin(organization_id));

CREATE POLICY organization_verified_domains_insert_owner
  ON public.organization_verified_domains
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_owner(organization_id));

CREATE POLICY organization_verified_domains_update_owner
  ON public.organization_verified_domains
  FOR UPDATE
  TO authenticated
  USING (public.is_org_owner(organization_id))
  WITH CHECK (public.is_org_owner(organization_id));

CREATE POLICY organization_verified_domains_delete_owner
  ON public.organization_verified_domains
  FOR DELETE
  TO authenticated
  USING (public.is_org_owner(organization_id));

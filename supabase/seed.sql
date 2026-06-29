-- E2E and local dev seed data (applied on `supabase db reset`)
-- Test credentials:
--   admin@demo.local  / E2eTestPassword1!  (owner of "demo")
--   viewer@demo.local / E2eTestPassword1!  (viewer of "demo-viewer")

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Auth users
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@demo.local',
    crypt('E2eTestPassword1!', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Demo Admin"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    '',
    '',
    '',
    ''
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'viewer@demo.local',
    crypt('E2eTestPassword1!', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Demo Viewer"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    '',
    '',
    '',
    ''
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin@demo.local"}'::jsonb,
    'email',
    '11111111-1111-1111-1111-111111111111',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '44444444-4444-4444-4444-444444444444',
    '{"sub":"44444444-4444-4444-4444-444444444444","email":"viewer@demo.local"}'::jsonb,
    'email',
    '44444444-4444-4444-4444-444444444444',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Organizations
-- ---------------------------------------------------------------------------
INSERT INTO public.organizations (id, name, slug, created_by) VALUES
  (
    '22222222-2222-2222-2222-222222222222',
    'Demo Company',
    'demo',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Demo Viewer Org',
    'demo-viewer',
    '11111111-1111-1111-1111-111111111111'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organization_members (organization_id, user_id, org_role, created_by) VALUES
  (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'owner',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    'viewer',
    '11111111-1111-1111-1111-111111111111'
  )
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Team + sample traction data (demo org)
-- ---------------------------------------------------------------------------
INSERT INTO public.teams (id, organization_id, name, slug, created_by) VALUES
  (
    '66666666-6666-6666-6666-666666666666',
    '22222222-2222-2222-2222-222222222222',
    'Leadership',
    'leadership',
    '11111111-1111-1111-1111-111111111111'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.team_members (team_id, user_id, team_role, created_by) VALUES
  (
    '66666666-6666-6666-6666-666666666666',
    '11111111-1111-1111-1111-111111111111',
    'leader',
    '11111111-1111-1111-1111-111111111111'
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.scorecard_metrics (
  id,
  organization_id,
  team_id,
  name,
  owner_id,
  unit,
  target_rule,
  target_value,
  created_by
) VALUES
  (
    '77777777-7777-7777-7777-777777777777',
    '22222222-2222-2222-2222-222222222222',
    '66666666-6666-6666-6666-666666666666',
    'Weekly revenue',
    '11111111-1111-1111-1111-111111111111',
    'currency',
    'higher_is_better',
    100000,
    '11111111-1111-1111-1111-111111111111'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.meetings (
  id,
  organization_id,
  team_id,
  title,
  meeting_type,
  status,
  started_at,
  active_section_key,
  created_by
) VALUES
  (
    '55555555-5555-5555-5555-555555555555',
    '22222222-2222-2222-2222-222222222222',
    '66666666-6666-6666-6666-666666666666',
    'Weekly L10',
    'l10',
    'in_progress',
    timezone('utc', now()),
    'issues',
    '11111111-1111-1111-1111-111111111111'
  )
ON CONFLICT (id) DO NOTHING;

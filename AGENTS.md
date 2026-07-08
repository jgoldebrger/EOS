<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Security architecture

- **User-facing DB access:** `createClient()` in `lib/supabase/server.ts` uses the signed-in user's JWT. PostgreSQL RLS is the enforcement layer.
- **Session lookup:** Use `getServerSessionUser()` in server components/actions — not `supabase.auth.getUser()` directly.
- **Privileged mutations:** SSO settings, invites, and account creation call `requirePrivilegedSession()` (MFA step-up when TOTP is enrolled).
- **Break-glass admin access:** `createAdminClient()` / `createServiceClient()` in `lib/supabase/admin.ts` and `lib/supabase/server.ts`. Use only for:
  - Auth Admin API (invite user, resolve email, delete user)
  - `lib/people/accept-invitations.ts` (pending invite acceptance)
  - Supabase Edge Functions (cron, SSO validation, discovery)
- **Never** use `createAdminClient()` for routine reads/writes that should respect org membership.

## Invite-only access

- Public sign-up is disabled in production (`lib/auth/platform-access.ts`).
- Local dev opt-in: `ALLOW_PUBLIC_SIGNUP=true`, `ALLOW_SELF_SERVICE_ORG=true`.
- Supabase Cloud: disable email sign-up in Dashboard → Authentication → Providers.
- Enable TOTP MFA in Supabase Dashboard → Authentication → MFA (local: `supabase/config.toml`).

## Database hardening

- Migrations **036–039**: FORCE RLS, narrowed `service_role` grants, `authenticated` table grants, `anon` lockdown.
- After deploy: `node scripts/verify-jwt-rls.mjs` and `supabase migration list` against cloud.

## Secrets rotation (ops)

After security deploys, rotate in order:

1. `SUPABASE_SECRET_KEY` (Supabase Dashboard → API)
2. `NOTIFICATIONS_CRON_SECRET`, `L10_CRON_SECRET`, `SCORECARD_CRON_SECRET` (GitHub + Supabase Edge secrets)
3. `RESEND_API_KEY`
4. Update GitHub repository secrets: `SUPABASE_URL`, `SUPABASE_PROJECT_REF`, scoped cron secrets

## JWT / JWKS

Set `SUPABASE_JWKS_URL` in production and CI (`scripts/ci-e2e.sh`). Run `node scripts/verify-jwt-rls.mjs` after deploy to confirm user JWT + RLS.

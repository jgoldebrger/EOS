# EOS Platform

Business Operating System for EOS practitioners — scorecards, rocks, issues, todos, L10 meetings, accountability charts, V/TO, AI suggestions, and enterprise SSO.

## Prerequisites

- **Node.js 20+**
- **[Supabase CLI](https://supabase.com/docs/guides/cli)** — local Postgres, Auth, and Edge Functions
- **Docker Desktop** — required for `supabase start` and `supabase db reset` (local database)
- **Playwright browsers** — installed via `npx playwright install chromium` (E2E tests)

> **Note:** On corporate networks, `npx shadcn@latest add` may fail due to SSL inspection. Install UI primitives manually or use a trusted network.

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Environment
cp .env.local.example .env.local

# 3. Start local Supabase (requires Docker)
supabase start
# Copy the anon key and service role key printed by `supabase start` into .env.local

# 4. Apply migrations (first run or after schema changes)
supabase db reset

# 5. Deploy edge functions (AI + SSO helpers)
supabase functions deploy analyze-scorecard
supabase functions deploy dedupe-issues
supabase functions deploy extract-todos
supabase functions deploy summarize-meeting
supabase functions deploy discover-sso-provider
supabase functions deploy validate-sso-membership

# 6. Playwright (one-time)
npx playwright install chromium

# 7. Run the app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in values from `supabase start`.

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase API URL (local: `http://127.0.0.1:54321`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key — safe in browser with RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Service role key — never expose to client |
| `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED` | No | Set `true` to show Google OAuth on `/auth` |
| `NEXT_PUBLIC_AUTH_MICROSOFT_ENABLED` | No | Set `true` to show Microsoft OAuth on `/auth` |

Configure Google/Microsoft providers in the [Supabase Auth dashboard](https://supabase.com/docs/guides/auth/social-login) when enabling OAuth.

### E2E testing (optional)

| Variable | Description |
|----------|-------------|
| `E2E_SUPABASE_ENABLED` | Set to `1` to run authenticated Playwright flows |
| `E2E_ORG_SLUG` | Seeded org slug for admin/owner tests (default: `demo`) |
| `E2E_VIEWER_ORG_SLUG` | Seeded viewer-only org (default: `demo-viewer`) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E tests (Playwright) |
| `npm run test:e2e:ci` | E2E with retries (CI-friendly) |

## Architecture

See [BUILD_CONTRACT.md](./BUILD_CONTRACT.md) for route prefixes, role enums, migration ledger, and wave assignments.

### Route map

All org features live under `/org/[orgSlug]/`:

- `dashboard` — org home
- `scorecard`, `rocks`, `issues`, `todos` — traction tools
- `meetings` — L10 and meeting runner
- `accountability` — accountability chart
- `vto` — Vision/Traction Organizer
- `settings/security` — security overview
- `settings/security/sso` — SSO configuration (owner only)

Public routes: `/`, `/auth`, `/auth/callback`, `/onboarding`.

Unauthenticated requests to `/org/*` are redirected to `/auth` via middleware.

## Wave status

All waves (0–7) are **complete**. See BUILD_CONTRACT.md for the full matrix.

## Known limitations

- **Docker required** for local `supabase db reset` and `supabase start`.
- **Next.js 16 middleware** — root `middleware.ts` uses the current session pattern; watch for framework deprecation notices in Next.js release notes.
- **Corporate SSL** — shadcn CLI downloads may fail behind SSL-inspecting proxies.
- **E2E authenticated flows** — require `E2E_SUPABASE_ENABLED` and seeded test data; smoke tests run without Supabase.

# Production deployment checklist

Use this checklist before rolling out the EOS Platform to your leadership team.

## 1. Supabase (database + auth)

- [ ] Cloud project provisioned with migrations **001–040** applied (`supabase db push` or `scripts/push-cloud-db.ps1`)
- [ ] `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `SUPABASE_JWKS_URL` set on Vercel (server)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set on Vercel (browser)
- [ ] Row Level Security enabled (default from migrations)
- [ ] Supabase Realtime enabled for L10 live meeting sync

## 2. Authentication

- [ ] Google and/or Microsoft OAuth configured in Supabase Auth dashboard (if using social login)
- [ ] Enterprise SSO configured at `/org/[slug]/settings/security/sso` (if using SAML/OIDC)
- [ ] TOTP MFA enabled in Supabase Dashboard → Authentication → MFA
- [ ] Email sign-up disabled in Supabase Dashboard → Authentication → Providers
- [ ] Redirect URLs include production domain (`https://your-domain.com/auth/callback`)
- [ ] All owners/admins enrolled in MFA at `/org/[slug]/settings/security/mfa`
- [ ] Optional: org-wide MFA policy enabled in **Settings → Security**
- [ ] Optional: hCaptcha enabled (see `docs/secret-rotation-runbook.md` and `.env.local.example`)

## 3. Email notifications (optional but recommended)

- [ ] Resend API key pushed to Supabase Edge Function secrets (`scripts/push-resend-secrets.ps1`)
- [ ] Sending domain verified in Resend (`scripts/setup-resend-domain.ps1`)
- [ ] `NOTIFICATION_FROM_EMAIL` uses verified domain (not sandbox-only sender)
- [ ] Vercel has `SUPABASE_SECRET_KEY` so server actions can call notification edge functions
- [ ] Admin smoke test passes at **Settings → Notifications → Send test email**

## 4. Edge functions

Deploy all functions after schema changes:

```bash
supabase functions deploy analyze-scorecard
supabase functions deploy dedupe-issues
supabase functions deploy extract-todos
supabase functions deploy summarize-meeting
supabase functions deploy discover-sso-provider
supabase functions deploy validate-sso-membership
supabase functions deploy l10-schedule-reminders
supabase functions deploy scorecard-off-track-digest
```

Or run `scripts/deploy-edge-functions.ps1`.

- [ ] All edge functions deployed to production Supabase project
- [ ] GitHub Actions **Deploy Edge Functions** workflow run after deploys (manual trigger)

## 5. L10 recurring reminders

- [ ] `SUPABASE_URL` and `SUPABASE_SECRET_KEY` added to GitHub repository secrets
- [ ] Cron secrets rotated (`scripts/rotate-cron-secrets.ps1`) — see [Secret rotation runbook](./secret-rotation-runbook.md)
- [ ] `.github/workflows/l10-schedule-reminders.yml` runs hourly (check Actions tab)
- [ ] `.github/workflows/scorecard-off-track-digest.yml` runs weekly on Mondays (check Actions tab)
- [ ] Team recurring schedules configured on each team L10 hub

## 6. Member onboarding

- [ ] Admins can invite members at **People → Invite person** or **Settings → Members**
- [ ] Invite emails send successfully (or share `/auth/invite?token=...` for manual onboarding)
- [ ] New users land in the correct org after accepting invite

## 7. Verification scripts

Run locally against production env vars (never commit secrets):

```powershell
.\scripts\verify-production-env.ps1
.\scripts\verify-security-ops.ps1
node scripts/verify-jwt-rls.mjs
```

## 8. Post-deploy smoke test

- [ ] Sign in as admin (with MFA if enrolled)
- [ ] Open home dashboard, inbox, and a team L10 hub
- [ ] Start and end a test L10 meeting
- [ ] Enter a scorecard value
- [ ] Invite a test user and confirm they join the org

## 9. Security operations

- [ ] Distributed rate limiting configured (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) or accepted as per-instance
- [ ] WAF / bot protection enabled on production domain — see [Security monitoring](./security-monitoring.md)
- [ ] Alerting configured for auth failures and 429 spikes
- [ ] Pentest scheduled — see [Security assurance](./security-assurance.md)

## Troubleshooting

| Issue | Check |
|-------|-------|
| Auth redirect loop | Callback URL in Supabase Auth settings |
| MFA required redirect loop | Enroll at `/org/[slug]/settings/security/mfa` |
| No email | Resend domain, `SUPABASE_SECRET_KEY` on Vercel |
| L10 not syncing | Supabase Realtime, browser network tab |
| Invites not working | Admin client keys, invitation expiry (7 days) |

See also [Notifications](./notifications.md), [Settings & Security](./settings-and-security.md), [Secret rotation runbook](./secret-rotation-runbook.md).

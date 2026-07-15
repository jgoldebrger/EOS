# Secret rotation runbook

Rotate credentials after security incidents, staff changes, or on a quarterly schedule.

## Order of rotation

1. `SUPABASE_SECRET_KEY` (Supabase Dashboard → Settings → API)
2. `RESEND_API_KEY`

Cron edge functions (`l10-schedule-reminders`, `scorecard-off-track-digest`, `send-notifications`) authenticate with **`SUPABASE_SECRET_KEY`** via `@supabase/server` `auth: 'secret'`. GitHub Actions cron workflows send this key in the `apikey` and `Authorization` headers — no separate `L10_CRON_SECRET` / `SCORECARD_CRON_SECRET` / `NOTIFICATIONS_CRON_SECRET` is required.

## Supabase secret key

1. Create a new secret key in Supabase Dashboard.
2. Update `SUPABASE_SECRET_KEY` on Vercel and in GitHub repository secrets.
3. Redeploy the Next.js app and cron edge functions (`scripts/deploy-cron-functions.ps1` or **Deploy Edge Functions** workflow).
4. Revoke the previous key after smoke tests pass.

## Resend API key

1. Create a new key at https://resend.com/api-keys
2. Run `.\scripts\push-resend-secrets.ps1`
3. Revoke the old key in Resend.

## Verification

```powershell
.\scripts\verify-security-ops.ps1
.\scripts\verify-cron-deploy.ps1
node scripts/verify-jwt-rls.mjs
```

Sign in as admin, run notification smoke test, and confirm cron workflows succeed in GitHub Actions.

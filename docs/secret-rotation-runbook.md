# Secret rotation runbook

Rotate credentials after security incidents, staff changes, or on a quarterly schedule.

## Order of rotation

1. `SUPABASE_SECRET_KEY` (Supabase Dashboard → Settings → API)
2. `NOTIFICATIONS_CRON_SECRET`, `L10_CRON_SECRET`, `SCORECARD_CRON_SECRET`
3. `RESEND_API_KEY`

## Generate new cron secrets

```powershell
.\scripts\rotate-cron-secrets.ps1
```

Update values in:

- GitHub repository secrets (Actions workflows)
- Supabase Edge Function secrets (`supabase secrets set ...`)
- Vercel environment variables where referenced

## Supabase service key

1. Create a new secret key in Supabase Dashboard.
2. Update `SUPABASE_SECRET_KEY` on Vercel and in GitHub secrets.
3. Redeploy the Next.js app.
4. Revoke the previous key after smoke tests pass.

## Resend API key

1. Create a new key at https://resend.com/api-keys
2. Run `.\scripts\push-resend-secrets.ps1`
3. Revoke the old key in Resend.

## Verification

```powershell
.\scripts\verify-security-ops.ps1
node scripts/verify-jwt-rls.mjs
```

Sign in as admin, run notification smoke test, and confirm cron workflows succeed in GitHub Actions.

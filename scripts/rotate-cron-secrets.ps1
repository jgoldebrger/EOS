# Deprecated: cron functions now use SUPABASE_SECRET_KEY (see docs/secret-rotation-runbook.md).
# This script remains for teams still rotating legacy scoped secrets during migration.

Write-Warning @"
Cron edge functions now authenticate with SUPABASE_SECRET_KEY only.
Rotate SUPABASE_SECRET_KEY in Supabase Dashboard, then update:
  - Vercel SUPABASE_SECRET_KEY
  - GitHub secret SUPABASE_SECRET_KEY
Redeploy with: .\scripts\deploy-cron-functions.ps1

See docs/secret-rotation-runbook.md
"@

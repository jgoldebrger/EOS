# Deploy cron/notification edge functions after auth migrations.
# Requires: supabase login (or SUPABASE_ACCESS_TOKEN) and SUPABASE_PROJECT_REF.

param(
  [string]$ProjectRef = $env:SUPABASE_PROJECT_REF
)

Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not $ProjectRef) {
  Write-Error "Set SUPABASE_PROJECT_REF or pass -ProjectRef."
  exit 1
}

$npx = if (Get-Command npx.cmd -ErrorAction SilentlyContinue) { "npx.cmd" } else { "npx" }

$functions = @(
  "send-notifications",
  "l10-schedule-reminders",
  "scorecard-off-track-digest"
)

Write-Host "Deploying cron edge functions to $ProjectRef ..." -ForegroundColor Cyan

foreach ($name in $functions) {
  Write-Host "  -> $name" -ForegroundColor Gray
  & $npx supabase functions deploy $name --project-ref $ProjectRef --use-api --yes
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Deploy failed for $name"
    exit $LASTEXITCODE
  }
}

Write-Host "Done. Run .\scripts\verify-cron-deploy.ps1 to smoke-test." -ForegroundColor Green

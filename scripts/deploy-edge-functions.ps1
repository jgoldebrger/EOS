# Deploy all Supabase Edge Functions to the cloud project.
# Usage (PowerShell):
#
# Option A — browser login (may fail on corporate networks):
#   npx.cmd supabase login
#
# Option B — access token (recommended if browser login times out):
#   1. https://supabase.com/dashboard/account/tokens → Generate new token
#   2. npx.cmd supabase login --token sbp_YOUR_TOKEN
#   Or: $env:SUPABASE_ACCESS_TOKEN = "sbp_YOUR_TOKEN"
#
# Then:
#   .\scripts\deploy-edge-functions.ps1

param(
  [string]$ProjectRef = "intfblfzreghhshcztuw"
)

Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  $tokenPath = Join-Path $env:USERPROFILE ".supabase\access-token"
  if (-not (Test-Path $tokenPath)) {
    Write-Error @"
Not logged in. Use one of:
  npx.cmd supabase login --token sbp_YOUR_TOKEN
  (create token at https://supabase.com/dashboard/account/tokens)
"@
    exit 1
  }
}

Write-Host "Deploying all edge functions to project $ProjectRef ..." -ForegroundColor Cyan

# Use npx.cmd on Windows when PowerShell blocks npx.ps1 (execution policy).
$npx = if (Get-Command npx.cmd -ErrorAction SilentlyContinue) { "npx.cmd" } else { "npx" }

& $npx supabase functions deploy `
  --project-ref $ProjectRef `
  --use-api `
  --yes

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host "Done. Functions:" -ForegroundColor Green
Get-ChildItem "supabase\functions" -Directory |
  Where-Object { $_.Name -ne "_shared" } |
  ForEach-Object { Write-Host "  - $($_.Name)" }

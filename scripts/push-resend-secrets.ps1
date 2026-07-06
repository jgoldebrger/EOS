# Push Resend secrets to Supabase Edge Functions (production email delivery).
# Usage (PowerShell):
#   Add to .env.local:
#     RESEND_API_KEY=re_...
#     NOTIFICATION_FROM_EMAIL=EOS onboarding@resend.dev
#   .\scripts\push-resend-secrets.ps1
#
# If local CLI fails (TransportError), use GitHub Actions:
#   gh secret set RESEND_API_KEY
#   gh secret set NOTIFICATION_FROM_EMAIL
#   gh workflow run "Set Resend Secrets"

param(
  [string]$ProjectRef = "intfblfzreghhshcztuw",
  [string]$EnvFile = ".env.local"
)

Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Test-Path $EnvFile)) {
  Write-Error "Missing $EnvFile"
  exit 1
}

$resendKey = $null
$fromEmail = $null

Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*RESEND_API_KEY=(.*)$') {
    $resendKey = $matches[1].Trim().Trim('"').Trim("'")
  }
  if ($_ -match '^\s*NOTIFICATION_FROM_EMAIL=(.*)$') {
    $fromEmail = $matches[1].Trim().Trim('"').Trim("'")
  }
}

if (-not $resendKey) {
  Write-Error "RESEND_API_KEY not set in $EnvFile"
  exit 1
}

if (-not $fromEmail) {
  Write-Error "NOTIFICATION_FROM_EMAIL not set in $EnvFile"
  exit 1
}

Write-Host "Setting Resend secrets on project $ProjectRef..."
npx supabase secrets set `
  "RESEND_API_KEY=$resendKey" `
  "NOTIFICATION_FROM_EMAIL=$fromEmail" `
  --project-ref $ProjectRef

if ($LASTEXITCODE -ne 0) {
  Write-Error "supabase secrets set failed"
  exit 1
}

Write-Host "Done. Production email is enabled for send-notifications."

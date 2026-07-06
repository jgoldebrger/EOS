# Smoke-test the send-notifications edge function end-to-end.
# Usage:
#   .\scripts\smoke-test-notification.ps1
#   .\scripts\smoke-test-notification.ps1 -To you@example.com

param(
  [string]$To = "",
  [string]$EnvFile = ".env.local",
  [string]$ProjectRef = "intfblfzreghhshcztuw"
)

Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Test-Path $EnvFile)) {
  Write-Error "Missing $EnvFile"
  exit 1
}

$supabaseUrl = $null
$secretKey = $null
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*NEXT_PUBLIC_SUPABASE_URL=(.*)$') {
    $supabaseUrl = $matches[1].Trim().Trim('"').Trim("'")
  }
  if ($_ -match '^\s*SUPABASE_SECRET_KEY=(.*)$') {
    $secretKey = $matches[1].Trim().Trim('"').Trim("'")
  }
}

if (-not $supabaseUrl) {
  $supabaseUrl = "https://$ProjectRef.supabase.co"
}

if (-not $secretKey) {
  Write-Error "SUPABASE_SECRET_KEY not set in $EnvFile (required - same var Vercel needs for notifications)."
  exit 1
}

if (-not $To) {
  Write-Host "Enter recipient email (must be your Resend account email while using onboarding@resend.dev):"
  $To = Read-Host
}

if (-not $To) {
  Write-Error "Recipient email required."
  exit 1
}

$body = @{
  to      = $To
  subject = "EOS notification smoke test"
  body    = "If you received this, the production notification path is working."
  type    = "assignment"
} | ConvertTo-Json

Write-Host "Calling send-notifications at $supabaseUrl ..."

try {
  $response = Invoke-RestMethod -Method POST `
    -Uri "$supabaseUrl/functions/v1/send-notifications" `
    -Headers @{
      Authorization = "Bearer $secretKey"
      "Content-Type" = "application/json"
    } `
    -Body $body

  Write-Host "Response: $($response | ConvertTo-Json -Compress)"
  if ($response.sent -eq $true) {
    Write-Host "SUCCESS - email sent via Resend."
    exit 0
  }
  Write-Host "WARN - function returned sent=false (check Resend secrets / domain / logs)."
  exit 1
} catch {
  Write-Error "Request failed: $($_.Exception.Message)"
  exit 1
}

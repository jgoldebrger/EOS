# Smoke-test cron edge functions and list related GitHub workflows.
# Requires: SUPABASE_URL, SUPABASE_SECRET_KEY (or SUPABASE_PROJECT_REF to derive URL).

param(
  [string]$ProjectRef = $env:SUPABASE_PROJECT_REF
)

Set-Location (Split-Path $PSScriptRoot -Parent)

$supabaseUrl = $env:SUPABASE_URL
if (-not $supabaseUrl -and $ProjectRef) {
  $supabaseUrl = "https://$ProjectRef.supabase.co"
}

$secret = $env:SUPABASE_SECRET_KEY
if (-not $supabaseUrl -or -not $secret) {
  Write-Error "Set SUPABASE_URL (or SUPABASE_PROJECT_REF) and SUPABASE_SECRET_KEY."
  exit 1
}

$functions = @(
  "send-notifications",
  "l10-schedule-reminders",
  "scorecard-off-track-digest"
)

$headers = @{
  apikey         = $secret
  Authorization  = "Bearer $secret"
  "Content-Type" = "application/json"
}

Write-Host "=== Cron edge function smoke test ===" -ForegroundColor Cyan

foreach ($name in $functions) {
  $url = "$supabaseUrl/functions/v1/$name"
  try {
    if ($name -eq "send-notifications") {
      $body = @{
        to      = "smoke-test@example.com"
        subject = "Smoke test"
        body    = "Cron deploy verification"
        type    = "assignment"
      } | ConvertTo-Json
    } else {
      $body = "{}"
    }

    $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $body -UseBasicParsing
    Write-Host "[OK] $name -> $($response.StatusCode)" -ForegroundColor Green
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    Write-Host "[FAIL] $name -> $status $($_.Exception.Message)" -ForegroundColor Red
    exit 1
  }
}

Write-Host ""
Write-Host "GitHub cron workflows (trigger manually or wait for schedule):" -ForegroundColor Cyan
Write-Host "  - .github/workflows/l10-schedule-reminders.yml (hourly)"
Write-Host "  - .github/workflows/scorecard-off-track-digest.yml (Mondays 14:00 UTC)"

if (Get-Command gh -ErrorAction SilentlyContinue) {
  Write-Host ""
  gh workflow list 2>$null | Select-String -Pattern "L10 Schedule|Scorecard Off-Track|Deploy Edge"
}

Write-Host ""
Write-Host "All smoke tests passed." -ForegroundColor Green

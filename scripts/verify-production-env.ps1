# Verify required production environment variables are set.
# Usage: load .env.local (or Vercel env) then run:
#   .\scripts\verify-production-env.ps1

$required = @(
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_JWKS_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
)

$recommended = @(
  "RESEND_API_KEY",
  "NOTIFICATION_FROM_EMAIL"
)

$missing = @()
foreach ($name in $required) {
  if (-not [string]::IsNullOrWhiteSpace((Get-Item -Path "Env:$name" -ErrorAction SilentlyContinue).Value)) {
    Write-Host "[ok] $name" -ForegroundColor Green
  } else {
    Write-Host "[missing] $name" -ForegroundColor Red
    $missing += $name
  }
}

Write-Host ""
Write-Host "Recommended (email notifications):" -ForegroundColor Cyan
foreach ($name in $recommended) {
  if (-not [string]::IsNullOrWhiteSpace((Get-Item -Path "Env:$name" -ErrorAction SilentlyContinue).Value)) {
    Write-Host "[ok] $name" -ForegroundColor Green
  } else {
    Write-Host "[optional] $name not set" -ForegroundColor Yellow
  }
}

Write-Host ""
if ($missing.Count -gt 0) {
  Write-Host "Missing $($missing.Count) required variable(s). See docs/production-checklist.md" -ForegroundColor Red
  exit 1
}

Write-Host "All required production variables are set." -ForegroundColor Green
exit 0

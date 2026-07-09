# Verify security ops configuration (local config + env + optional live checks).
# Usage: load production env vars, then run:
#   .\scripts\verify-security-ops.ps1

$ErrorActionPreference = "Stop"
$failures = @()

function Test-ConfigValue {
  param(
    [string]$File,
    [string]$Pattern,
    [string]$Label
  )

  if (-not (Test-Path $File)) {
    Write-Host "[missing] $Label ($File not found)" -ForegroundColor Red
    $script:failures += $Label
    return
  }

  $content = Get-Content $File -Raw
  if ($content -match $Pattern) {
    Write-Host "[ok] $Label" -ForegroundColor Green
  } else {
    Write-Host "[fail] $Label" -ForegroundColor Red
    $script:failures += $Label
  }
}

Write-Host "=== Security ops verification ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Local Supabase auth config:" -ForegroundColor Cyan
Test-ConfigValue -File "supabase/config.toml" -Pattern "enable_signup\s*=\s*false" -Label "Email sign-up disabled (config.toml)"
Test-ConfigValue -File "supabase/config.toml" -Pattern "\[auth\.mfa\.totp\]" -Label "TOTP MFA section present (config.toml)"
Test-ConfigValue -File "supabase/config.toml" -Pattern "enroll_enabled\s*=\s*true" -Label "TOTP enrollment enabled (config.toml)"

Write-Host ""
Write-Host "Production environment variables:" -ForegroundColor Cyan
& "$PSScriptRoot\verify-production-env.ps1"
if ($LASTEXITCODE -ne 0) {
  $failures += "production-env-vars"
}

Write-Host ""
Write-Host "JWT + RLS smoke (requires credentials):" -ForegroundColor Cyan
if (
  -not [string]::IsNullOrWhiteSpace($env:SUPABASE_URL) -and
  -not [string]::IsNullOrWhiteSpace($env:SUPABASE_PUBLISHABLE_KEY)
) {
  node "$PSScriptRoot\verify-jwt-rls.mjs"
  if ($LASTEXITCODE -ne 0) {
    $failures += "jwt-rls-verification"
  }
} else {
  Write-Host "[skip] JWT/RLS verification (set SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Manual dashboard checks (cannot verify from repo):" -ForegroundColor Cyan
Write-Host "  - Supabase Dashboard -> Authentication -> Providers: disable email sign-up"
Write-Host "  - Supabase Dashboard -> Authentication -> MFA: enable TOTP"
Write-Host "  - Rotate SUPABASE_SECRET_KEY, cron secrets, RESEND_API_KEY (see docs/secret-rotation-runbook.md)"
Write-Host "  - Enroll owner/admin accounts at /org/[slug]/settings/security/mfa"
Write-Host "  - Enable WAF on production domain (see docs/security-monitoring.md)"

Write-Host ""
if ($failures.Count -gt 0) {
  Write-Host "Security ops verification failed: $($failures -join ', ')" -ForegroundColor Red
  exit 1
}

Write-Host "Automated security ops checks passed." -ForegroundColor Green
exit 0

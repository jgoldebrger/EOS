# Generate new cron/notification secrets for rotation.
# Does not push secrets automatically — follow docs/secret-rotation-runbook.md.

function New-RandomSecret {
  param([int]$Bytes = 32)
  $bytes = New-Object byte[] $Bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return [Convert]::ToBase64String($bytes)
}

Write-Host "=== Generated rotation secrets ===" -ForegroundColor Cyan
Write-Host ""
$notifications = New-RandomSecret
$l10 = New-RandomSecret
$scorecard = New-RandomSecret

Write-Host "NOTIFICATIONS_CRON_SECRET=$notifications"
Write-Host "L10_CRON_SECRET=$l10"
Write-Host "SCORECARD_CRON_SECRET=$scorecard"
Write-Host ""
Write-Host "Update these in:" -ForegroundColor Yellow
Write-Host "  1. GitHub repository secrets"
Write-Host "  2. Supabase Edge Function secrets (supabase secrets set ...)"
Write-Host "  3. Redeploy edge functions that validate cron secrets"
Write-Host ""
Write-Host "See docs/secret-rotation-runbook.md for the full procedure."

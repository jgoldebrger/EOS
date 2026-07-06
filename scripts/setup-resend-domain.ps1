# Register or check a Resend sending domain and print DNS records.
# When verified, updates NOTIFICATION_FROM_EMAIL in .env.local and GitHub secrets.
#
# Usage:
#   .\scripts\setup-resend-domain.ps1
#   .\scripts\setup-resend-domain.ps1 -Domain fabuwood.com -FromAddress "EOS <notifications@fabuwood.com>"
#   .\scripts\setup-resend-domain.ps1 -CheckOnly

param(
  [string]$Domain = "fabuwood.com",
  [string]$FromAddress = "EOS <notifications@fabuwood.com>",
  [string]$EnvFile = ".env.local",
  [switch]$CheckOnly
)

Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Test-Path $EnvFile)) {
  Write-Error "Missing $EnvFile - set RESEND_API_KEY first."
  exit 1
}

$resendKey = $null
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*RESEND_API_KEY=(.*)$') {
    $resendKey = $matches[1].Trim().Trim('"').Trim("'")
  }
}

if (-not $resendKey) {
  Write-Error "RESEND_API_KEY not set in $EnvFile"
  exit 1
}

$headers = @{
  Authorization = "Bearer $resendKey"
  "Content-Type" = "application/json"
}

function Get-DomainEntry {
  param([string]$Name)
  try {
    $list = Invoke-RestMethod -Uri "https://api.resend.com/domains" -Headers $headers
    return $list.data | Where-Object { $_.name -eq $Name } | Select-Object -First 1
  } catch {
    if ($_.ErrorDetails.Message -match "restricted_api_key") {
      Write-Warning "RESEND_API_KEY is send-only. Use a full-access key in Resend dashboard to manage domains via API."
      Write-Host "Add DNS for fabuwood.com manually at https://resend.com/domains"
      return $null
    }
    throw
  }
}

$entry = Get-DomainEntry -Name $Domain

if (-not $entry) {
  try {
    Write-Host "Adding domain $Domain to Resend..."
    $entry = Invoke-RestMethod -Method POST -Uri "https://api.resend.com/domains" -Headers $headers -Body (@{ name = $Domain } | ConvertTo-Json)
  } catch {
    if ($_.ErrorDetails.Message -match "restricted_api_key") {
      Write-Host "Domain $Domain must be verified in Resend dashboard (send-only API key cannot manage domains)."
      Write-Host "After verification, set NOTIFICATION_FROM_EMAIL and run .\scripts\push-resend-secrets.ps1"
      exit 0
    }
    throw
  }
}

Write-Host ""
Write-Host "Domain: $($entry.name)"
Write-Host "Status: $($entry.status)"
Write-Host ""
Write-Host "Add these DNS records at your DNS provider:"
Write-Host "------------------------------------------------"

foreach ($record in $entry.records) {
  Write-Host "[$($record.record)] $($record.type) $($record.name) -> $($record.value) (status: $($record.status))"
}

Write-Host "------------------------------------------------"
Write-Host ""

if ($entry.status -ne "verified") {
  Write-Host "Domain is not verified yet. After DNS propagates, re-run with -CheckOnly or without flags."
  if ($CheckOnly) { exit 0 }
  exit 0
}

Write-Host "Domain verified. Updating NOTIFICATION_FROM_EMAIL to: $FromAddress"

$lines = Get-Content $EnvFile
$found = $false
$updated = $lines | ForEach-Object {
  if ($_ -match '^\s*NOTIFICATION_FROM_EMAIL=') {
    $found = $true
    "NOTIFICATION_FROM_EMAIL=$FromAddress"
  } else {
    $_
  }
}
if (-not $found) {
  $updated += "NOTIFICATION_FROM_EMAIL=$FromAddress"
}
$updated | Set-Content $EnvFile -Encoding utf8

if (Get-Command gh -ErrorAction SilentlyContinue) {
  gh secret set NOTIFICATION_FROM_EMAIL --body $FromAddress
  Write-Host "GitHub secret NOTIFICATION_FROM_EMAIL updated."
  gh workflow run "Set Resend Secrets"
  Write-Host "Triggered Set Resend Secrets workflow."
} else {
  Write-Host "Install GitHub CLI to sync secrets, or run .\scripts\push-resend-secrets.ps1"
}

Write-Host "Done."

# Create a new Resend API key, update .env.local, GitHub secrets, and Supabase edge secrets.
# Revokes the previous key if -RevokeOldKeyId is provided.
#
# Usage:
#   .\scripts\rotate-resend-key.ps1
#   .\scripts\rotate-resend-key.ps1 -KeyName "eos-production-2026-07" -RevokeOldKeyId "<uuid>"

param(
  [string]$KeyName = "eos-production-rotated",
  [string]$RevokeOldKeyId = "",
  [string]$EnvFile = ".env.local",
  [string]$ProjectRef = "intfblfzreghhshcztuw"
)

Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Test-Path $EnvFile)) {
  Write-Error "Missing $EnvFile"
  exit 1
}

$oldKey = $null
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*RESEND_API_KEY=(.*)$') {
    $oldKey = $matches[1].Trim().Trim('"').Trim("'")
  }
}

if (-not $oldKey) {
  Write-Error "RESEND_API_KEY not set in $EnvFile"
  exit 1
}

$headers = @{
  Authorization = "Bearer $oldKey"
  "Content-Type" = "application/json"
}

Write-Host "Creating new Resend API key: $KeyName ..."
$created = Invoke-RestMethod -Method POST -Uri "https://api.resend.com/api-keys" -Headers $headers -Body (@{ name = $KeyName } | ConvertTo-Json)
$newKey = $created.token

if (-not $newKey) {
  Write-Error "Resend did not return a new API key."
  exit 1
}

$lines = Get-Content $EnvFile
$updated = $lines | ForEach-Object {
  if ($_ -match '^\s*RESEND_API_KEY=') {
    "RESEND_API_KEY=$newKey"
  } else {
    $_
  }
}
$updated | Set-Content $EnvFile -Encoding utf8
Write-Host "Updated RESEND_API_KEY in $EnvFile"

if (Get-Command gh -ErrorAction SilentlyContinue) {
  gh secret set RESEND_API_KEY --body $newKey
  Write-Host "GitHub secret RESEND_API_KEY updated."
  gh workflow run "Set Resend Secrets"
  Write-Host "Triggered Set Resend Secrets workflow."
} else {
  Write-Host "Run: npx supabase secrets set RESEND_API_KEY=... --project-ref $ProjectRef"
}

if ($RevokeOldKeyId) {
  Write-Host "Revoking old key $RevokeOldKeyId ..."
  try {
    Invoke-RestMethod -Method DELETE -Uri "https://api.resend.com/api-keys/$RevokeOldKeyId" -Headers $headers | Out-Null
    Write-Host "Old key revoked."
  } catch {
    Write-Warning "Could not revoke old key - delete it manually in Resend dashboard."
  }
} else {
  Write-Host "Tip: list keys at https://resend.com/api-keys and revoke the exposed key."
}

Write-Host "Rotation complete."

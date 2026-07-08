# Push all Supabase migrations to your cloud project.
# Usage (PowerShell):
#   $env:SUPABASE_DB_PASSWORD = "your-database-password"
#   .\scripts\push-cloud-db.ps1
#
# Find password: Supabase Dashboard → Project Settings → Database → Database password

param(
  [string]$ProjectRef = "intfblfzreghhshcztuw",
  [string]$Password = $env:SUPABASE_DB_PASSWORD
)

if (-not $Password) {
  Write-Error "Set SUPABASE_DB_PASSWORD or pass -Password"
  exit 1
}

# Direct host (db.*.supabase.co) is IPv6-only — fails on many corporate networks.
# Use session-mode shared pooler (IPv4). New projects may land on aws-1, not aws-0.
$Region = "us-east-2"
$PoolerCluster = "aws-1"
$encoded = [uri]::EscapeDataString($Password)
$dbUrl = "postgresql://postgres.${ProjectRef}:${encoded}@${PoolerCluster}-${Region}.pooler.supabase.com:5432/postgres"

Set-Location (Split-Path $PSScriptRoot -Parent)

# Supabase CLI fails on UTF-8 BOM in .env.local — temporarily hide it during push.
$envLocal = Join-Path (Get-Location) ".env.local"
$envBackup = Join-Path (Get-Location) ".env.local.bak-push"
$renamedEnv = $false
if (Test-Path $envLocal) {
  Rename-Item $envLocal $envBackup
  $renamedEnv = $true
}

try {
  npx supabase db push --db-url $dbUrl --yes
} finally {
  if ($renamedEnv -and (Test-Path $envBackup)) {
    Rename-Item $envBackup $envLocal
  }
}

param(
  [string]$OutputDirectory = "backups"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$targetDirectory = Join-Path $projectRoot $OutputDirectory
New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $targetDirectory "vms_$timestamp.sql"
$envValues = @{}
Get-Content -LiteralPath ".env" | Where-Object { $_ -match "^[^#][^=]*=" } | ForEach-Object {
  $parts = $_ -split "=", 2
  $envValues[$parts[0].Trim()] = $parts[1].Trim()
}
$dbUser = if ($envValues["POSTGRES_USER"]) { $envValues["POSTGRES_USER"] } else { "vms" }
$dbName = if ($envValues["POSTGRES_DB"]) { $envValues["POSTGRES_DB"] } else { "vms" }

docker compose exec -T db pg_dump -U $dbUser -d $dbName --clean --if-exists | Out-File -FilePath $backupFile -Encoding utf8
if ($LASTEXITCODE -ne 0) { throw "Database backup failed" }

$photosTarget = Join-Path $targetDirectory "photos_$timestamp"
if (Test-Path -LiteralPath "data\uploads") {
  Copy-Item -LiteralPath "data\uploads" -Destination $photosTarget -Recurse
}
Write-Host "Backup created: $backupFile"
Write-Host "Photo backup: $photosTarget"

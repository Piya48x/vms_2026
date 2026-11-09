param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$resolvedBackup = (Resolve-Path -LiteralPath $BackupFile).Path
$envValues = @{}
Get-Content -LiteralPath ".env" | Where-Object { $_ -match "^[^#][^=]*=" } | ForEach-Object {
  $parts = $_ -split "=", 2
  $envValues[$parts[0].Trim()] = $parts[1].Trim()
}
$dbUser = if ($envValues["POSTGRES_USER"]) { $envValues["POSTGRES_USER"] } else { "vms" }
$dbName = if ($envValues["POSTGRES_DB"]) { $envValues["POSTGRES_DB"] } else { "vms" }

$confirmation = Read-Host "Restore will replace current database objects. Type RESTORE to continue"
if ($confirmation -ne "RESTORE") { throw "Restore cancelled" }

Get-Content -LiteralPath $resolvedBackup -Raw | docker compose exec -T db psql -v ON_ERROR_STOP=1 -U $dbUser -d $dbName
if ($LASTEXITCODE -ne 0) { throw "Database restore failed" }
Write-Host "Database restored from $resolvedBackup"

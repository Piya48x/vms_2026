$ErrorActionPreference = "Continue"

$projectDirectory = Split-Path -Parent $PSScriptRoot
$logDirectory = Join-Path $projectDirectory "logs"
$logFile = Join-Path $logDirectory "cloud-sync.log"
$nodeExecutable = Join-Path $env:ProgramFiles "nodejs\node.exe"
$syncScript = Join-Path $PSScriptRoot "sync-supabase.mjs"

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
Set-Location -LiteralPath $projectDirectory

while ($true) {
  try {
    "[$(Get-Date -Format o)] Starting Supabase to PostgreSQL sync" | Out-File -FilePath $logFile -Append -Encoding utf8
    & $nodeExecutable $syncScript --watch *>> $logFile
  } catch {
    "[$(Get-Date -Format o)] Sync process stopped: $($_.Exception.Message)" | Out-File -FilePath $logFile -Append -Encoding utf8
  }

  Start-Sleep -Seconds 10
}

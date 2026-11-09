$ErrorActionPreference = "Stop"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker was not found. Install Docker Desktop and restart Windows first."
}

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

if (-not (Test-Path -LiteralPath ".env")) {
  throw "Missing .env. Run: Copy-Item .env.example .env, then set passwords first."
}
$settings = Get-Content -LiteralPath ".env" -Raw
foreach ($required in @("POSTGRES_PASSWORD", "ADMIN_PASSWORD", "SESSION_SECRET")) {
  if ($settings -notmatch "(?m)^$required=.+$") {
    throw "Missing $required in .env. Copy .env.example and configure it first."
  }
}
if ($settings -match "change-this|change_this") {
  throw "Replace all example passwords/secrets in .env before starting."
}

docker compose up -d --build
docker compose ps
Write-Host "VMS is starting at http://localhost:3000"

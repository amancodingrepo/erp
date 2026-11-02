$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$ComposeFile = Join-Path $ProjectRoot "docker-compose.lab.yml"
$EnvFile = Join-Path $ProjectRoot ".env.lab"
if (-not (Test-Path $EnvFile)) {
  Write-Host "No .env.lab was found; there is no configured lab to stop."
  exit 0
}
Push-Location $ProjectRoot
try {
  & docker compose --env-file $EnvFile -f $ComposeFile down
  if ($LASTEXITCODE -ne 0) { throw "Could not stop lab containers." }
  Write-Host "Lab containers stopped. The isolated lab database volume was preserved; no data volume was deleted." -ForegroundColor Green
} finally { Pop-Location }

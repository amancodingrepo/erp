$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$RepoRoot = (Resolve-Path (Join-Path $ProjectRoot "..")).Path
$ComposeFile = Join-Path $ProjectRoot "docker-compose.lab.yml"
$EnvFile = Join-Path $ProjectRoot ".env.lab"
$EnvExample = Join-Path $ProjectRoot ".env.lab.example"

$branch = (& git -C $RepoRoot branch --show-current 2>$null | Select-Object -First 1)
if ($LASTEXITCODE -ne 0) { throw "Cannot identify the Git repository. Open PowerShell inside your school-world checkout." }
if ($branch.Trim() -ne "test/school-world-fee-flow-verified") {
  throw "Safety stop: expected branch 'test/school-world-fee-flow-verified', found '$branch'. The lab will not switch branches automatically."
}
Write-Host "Repository: $RepoRoot" -ForegroundColor Cyan
Write-Host "Branch: $branch" -ForegroundColor Cyan
$changes = & git -C $RepoRoot status --short
if ($changes) {
  Write-Host "Local working-tree changes detected; they will be tested as-is and will not be reset or discarded:" -ForegroundColor Yellow
  $changes | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Docker Desktop not found; falling back to native Windows lab mode using your installed PostgreSQL." -ForegroundColor Yellow
  & (Join-Path $PSScriptRoot "start-native-lab.ps1")
  return
}
try { & docker info *> $null } catch { throw "Docker Desktop is not running. Start Docker Desktop, wait for it to be ready, then retry." }
if ($LASTEXITCODE -ne 0) { throw "Docker Desktop is not ready. Start Docker Desktop, wait for it to be ready, then retry." }

if (-not (Test-Path $EnvFile)) {
  Copy-Item $EnvExample $EnvFile
  $raw = Get-Content $EnvFile -Raw
  $raw = $raw.Replace("LAB_POSTGRES_PASSWORD=CHANGE_ME_LAB_DB_PASSWORD", "LAB_POSTGRES_PASSWORD=LABDB$([guid]::NewGuid().ToString('N'))")
  $raw = $raw.Replace("LAB_JWT_SECRET=CHANGE_ME_LAB_JWT_SECRET", "LAB_JWT_SECRET=LABJWT$([guid]::NewGuid().ToString('N'))$([guid]::NewGuid().ToString('N'))")
  Set-Content -Path $EnvFile -Value $raw -Encoding ascii
  Write-Host "Created ignored .env.lab with random local-only credentials." -ForegroundColor Green
}

New-Item -ItemType Directory -Force -Path (Join-Path $ProjectRoot "test-results/installment-dialog-lab") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ProjectRoot "test-results/ai-prototype-lab") | Out-Null
Push-Location $ProjectRoot
try {
  & docker compose --env-file $EnvFile -f $ComposeFile up -d --build lab-db lab-api lab-web
  if ($LASTEXITCODE -ne 0) { throw "Docker Compose failed to build/start the isolated lab." }

  $apiPort = 3002
  $webPort = 5174
  $ready = $false
  for ($attempt = 1; $attempt -le 180; $attempt++) {
    try {
      $health = Invoke-RestMethod -Uri "http://127.0.0.1:$apiPort/api/health" -TimeoutSec 3
      $web = Invoke-WebRequest -Uri "http://127.0.0.1:$webPort/tests/fee-installment-dialog.html" -TimeoutSec 3 -UseBasicParsing
      if ($health.ok -eq $true -and $health.database -eq "connected" -and $web.StatusCode -eq 200) {
        $ready = $true
        break
      }
    } catch { }
    Start-Sleep -Seconds 2
  }
  if (-not $ready) {
    & docker compose --env-file $EnvFile -f $ComposeFile logs --tail 100 lab-db lab-api lab-web
    throw "Lab did not become healthy. Review the logs above; no production or staging environment was touched."
  }

  Write-Host ""
  Write-Host "ISOLATED LAB READY" -ForegroundColor Green
  Write-Host "Frontend:      http://127.0.0.1:$webPort/"
  Write-Host "Dialog tests:  http://127.0.0.1:$webPort/tests/fee-installment-dialog.html"
  Write-Host "AI sandbox:    http://127.0.0.1:$webPort/lab/ai-innovation/index.html"
  Write-Host "Lab API:       http://127.0.0.1:$apiPort/api/health"
  Write-Host "Lab database:  127.0.0.1:5433 (isolated Docker volume; not AWS)"
  Write-Host "The app on :5173 and API on :3001 are not used by this lab." -ForegroundColor Cyan
  Write-Host "Run .\scripts\lab\run-tests.ps1 to execute Chromium tests and save screenshots."
} finally {
  Pop-Location
}

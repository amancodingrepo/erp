$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$RepoRoot = (Resolve-Path (Join-Path $ProjectRoot "..")).Path
$ComposeFile = Join-Path $ProjectRoot "docker-compose.lab.yml"
$EnvFile = Join-Path $ProjectRoot ".env.lab"
$RuntimeDir = Join-Path $ProjectRoot ".lab-runtime"

$branch = (& git -C $RepoRoot branch --show-current 2>$null | Select-Object -First 1)
if ($branch.Trim() -ne "test/school-world-fee-flow-verified") {
  throw "Safety stop: tests must run from test/school-world-fee-flow-verified; current branch is '$branch'."
}
$env:LAB_GIT_BRANCH = $branch.Trim()
$env:LAB_GIT_SHA = (& git -C $RepoRoot rev-parse HEAD).Trim()
New-Item -ItemType Directory -Force -Path (Join-Path $ProjectRoot "test-results/installment-dialog-lab") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ProjectRoot "test-results/ai-prototype-lab") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ProjectRoot "test-results/performance-report-lab") | Out-Null

$dockerReady = $false
if (Get-Command docker -ErrorAction SilentlyContinue) {
  & docker info *> $null
  if ($LASTEXITCODE -eq 0) { $dockerReady = $true }
}

if ($dockerReady) {
  if (-not (Test-Path $EnvFile)) { & (Join-Path $PSScriptRoot "start-lab.ps1") }
  Push-Location $ProjectRoot
  try {
    & docker compose --env-file $EnvFile -f $ComposeFile up -d --build lab-db lab-api lab-web
    if ($LASTEXITCODE -ne 0) { throw "Lab services failed to start." }
    $health = $null
    for ($attempt = 1; $attempt -le 120; $attempt++) {
      try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:3002/api/health" -TimeoutSec 3
        if ($health.ok -eq $true -and $health.database -eq "connected") { break }
      } catch { }
      Start-Sleep -Seconds 2
    }
    if (-not $health -or $health.ok -ne $true -or $health.database -ne "connected") {
      & docker compose --env-file $EnvFile -f $ComposeFile logs --tail 100 lab-db lab-api lab-web
      throw "API/PostgreSQL health check failed. Browser tests were not started."
    }

    & docker compose --env-file $EnvFile -f $ComposeFile --profile test run --build --rm lab-tests
    $testExitCode = $LASTEXITCODE
    Write-Host ""
    Write-Host "Test screenshots/reports: $ProjectRoot\test-results" -ForegroundColor Cyan
    if ($testExitCode -ne 0) {
      & docker compose --env-file $EnvFile -f $ComposeFile logs --tail 120 lab-db lab-api lab-web
      throw "Lab tests failed with exit code $testExitCode. No production code was deployed."
    }
    Write-Host "PASS: Docker lab API + PostgreSQL + dialog + AI browser tests." -ForegroundColor Green
  } finally { Pop-Location }
  return
}

Write-Host "Docker Desktop is not running/installed. Running the native Windows lab against a separate local PostgreSQL database." -ForegroundColor Yellow
$health = $null
try {
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:3002/api/health" -TimeoutSec 3
} catch { }
if (-not $health -or $health.ok -ne $true -or $health.database -ne "connected") {
  & (Join-Path $PSScriptRoot "start-native-lab.ps1")
}

$pythonLauncher = Get-Command python -ErrorAction SilentlyContinue
$pyLauncher = Get-Command py -ErrorAction SilentlyContinue
$venvPython = Join-Path $RuntimeDir "venv\Scripts\python.exe"
New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null
if (-not (Test-Path $venvPython)) {
  if ($pythonLauncher) { & python -m venv (Join-Path $RuntimeDir "venv") }
  elseif ($pyLauncher) { & py -3 -m venv (Join-Path $RuntimeDir "venv") }
  else { throw "Python 3 is required for local Chromium tests. Install Python 3.12, then re-run this script. Your lab API is still isolated." }
  if ($LASTEXITCODE -ne 0) { throw "Could not create the lab's private Python virtual environment." }
}
& $venvPython -c "import playwright" *> $null
if ($LASTEXITCODE -ne 0) {
  & $venvPython -m pip install --upgrade pip playwright
  if ($LASTEXITCODE -ne 0) { throw "Could not install Playwright into the lab-only virtual environment." }
  & $venvPython -m playwright install chromium
  if ($LASTEXITCODE -ne 0) { throw "Could not install Chromium for Playwright." }
}

$oldWeb = [Environment]::GetEnvironmentVariable("LAB_WEB_URL", "Process")
$oldApi = [Environment]::GetEnvironmentVariable("LAB_API_URL", "Process")
$oldAi = [Environment]::GetEnvironmentVariable("LAB_AI_URL", "Process")
$oldPerformance = [Environment]::GetEnvironmentVariable("LAB_PERFORMANCE_REPORT_URL", "Process")
try {
  $env:LAB_WEB_URL = "http://127.0.0.1:5174"
  $env:LAB_API_URL = "http://127.0.0.1:3002"
  $env:LAB_AI_URL = "http://127.0.0.1:5174/lab/ai-innovation/index.html"
  $env:LAB_PERFORMANCE_REPORT_URL = "http://127.0.0.1:5174/lab/performance-report/index.html"
  Push-Location $ProjectRoot
  try {
    & $venvPython tests/full_stack_lab_smoke.py
    if ($LASTEXITCODE -ne 0) { throw "Backend/PostgreSQL smoke test failed." }
    & $venvPython tests/fee_installment_dialog_browser_lab.py
    if ($LASTEXITCODE -ne 0) { throw "Installment dialog browser test failed." }
    & $venvPython tests/ai_prototype_lab_test.py
    if ($LASTEXITCODE -ne 0) { throw "AI prototype browser test failed." }
    & $venvPython tests/performance_report_lab_test.py
    if ($LASTEXITCODE -ne 0) { throw "Performance Report browser test failed." }
  } finally { Pop-Location }
  Write-Host ""
  Write-Host "PASS: native API + PostgreSQL + Chromium dialog + AI + Performance Report tests." -ForegroundColor Green
  Write-Host "Reports/screenshots: $ProjectRoot\test-results" -ForegroundColor Cyan
} finally {
  [Environment]::SetEnvironmentVariable("LAB_WEB_URL", $oldWeb, "Process")
  [Environment]::SetEnvironmentVariable("LAB_API_URL", $oldApi, "Process")
  [Environment]::SetEnvironmentVariable("LAB_AI_URL", $oldAi, "Process")
  [Environment]::SetEnvironmentVariable("LAB_PERFORMANCE_REPORT_URL", $oldPerformance, "Process")
}

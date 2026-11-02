[CmdletBinding()]
param([switch]$SkipAdminCheck)
$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$RepoRoot = (Resolve-Path (Join-Path $ProjectRoot "..")).Path
$EnvFile = Join-Path $ProjectRoot ".env.lab"
$EnvExample = Join-Path $ProjectRoot ".env.lab.example"
$RuntimeDir = Join-Path $ProjectRoot ".lab-runtime"
$ResultsDir = Join-Path $ProjectRoot "test-results"

$branch = (& git -C $RepoRoot branch --show-current 2>$null | Select-Object -First 1)
if ($LASTEXITCODE -ne 0) { throw "Cannot identify the Git repository." }
if ($branch.Trim() -ne "test/school-world-fee-flow-verified") {
  throw "Safety stop: expected test/school-world-fee-flow-verified, found '$branch'. The script will not switch branches."
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js is required for native lab mode." }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw "npm is required for native lab mode." }
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw "PostgreSQL command-line tools (psql, createdb, pg_dump, pg_restore) were not found in PATH. Add your installed PostgreSQL bin folder, or install Docker Desktop and use start-lab.ps1."
}

if (-not (Test-Path $EnvFile)) {
  Copy-Item $EnvExample $EnvFile
  $raw = Get-Content $EnvFile -Raw
  $raw = $raw.Replace("LAB_POSTGRES_PASSWORD=CHANGE_ME_LAB_DB_PASSWORD", "LAB_POSTGRES_PASSWORD=LABDB$([guid]::NewGuid().ToString('N'))")
  $raw = $raw.Replace("LAB_JWT_SECRET=CHANGE_ME_LAB_JWT_SECRET", "LAB_JWT_SECRET=LABJWT$([guid]::NewGuid().ToString('N'))$([guid]::NewGuid().ToString('N'))")
  Set-Content -Path $EnvFile -Value $raw -Encoding ascii
}
function Read-LabValue([string]$name) {
  $line = Get-Content $EnvFile | Where-Object { $_ -match ("^" + [regex]::Escape($name) + "=") } | Select-Object -Last 1
  if (-not $line) { throw "Missing $name in .env.lab." }
  return $line.Substring($name.Length + 1).Trim()
}
$dbName = Read-LabValue "LAB_POSTGRES_DB"
$dbUser = Read-LabValue "LAB_POSTGRES_USER"
$dbPassword = Read-LabValue "LAB_POSTGRES_PASSWORD"
$jwtSecret = Read-LabValue "LAB_JWT_SECRET"
$autoMigrate = Read-LabValue "LAB_AUTO_MIGRATE"
$seedDemo = Read-LabValue "LAB_SEED_DEMO_DATA"
if ($dbName -notmatch '^[A-Za-z_][A-Za-z0-9_]*$' -or $dbUser -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
  throw "Lab DB name/user must contain only letters, digits and underscores."
}
if (-not (Test-Path (Join-Path $ProjectRoot "node_modules/vite/bin/vite.js"))) {
  Push-Location $ProjectRoot
  try {
    & npm install --package-lock=false --no-save --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "npm dependency installation failed." }
  } finally { Pop-Location }
}

New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ResultsDir "installment-dialog-lab") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ResultsDir "ai-prototype-lab") | Out-Null

$oldPgPassword = [Environment]::GetEnvironmentVariable("PGPASSWORD", "Process")
if ($SkipAdminCheck) {
  $env:PGPASSWORD = $dbPassword
  try {
    & psql -h 127.0.0.1 -p 5432 -U $dbUser -d $dbName -tAc "SELECT 1"
    if ($LASTEXITCODE -ne 0) {
      throw "SkipAdminCheck requires the dedicated lab role/database to exist and accept its .env.lab password."
    }
  } finally {
    if ($null -eq $oldPgPassword) { Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue }
    else { $env:PGPASSWORD = $oldPgPassword }
  }
} else {
  $pgAdmin = Read-Host "Local PostgreSQL admin role (usually postgres; this is your local server at 127.0.0.1:5432)"
  if ([string]::IsNullOrWhiteSpace($pgAdmin)) { $pgAdmin = "postgres" }
  $secureAdminPassword = Read-Host "Local PostgreSQL admin password (hidden input)" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureAdminPassword)
  try { $adminPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
  $env:PGPASSWORD = $adminPassword
  try {
    & psql -h 127.0.0.1 -p 5432 -U $pgAdmin -d postgres -tAc "SELECT 1"
    if ($LASTEXITCODE -ne 0) { throw "Could not connect to local PostgreSQL. Check that the service is running and the password is correct." }

    $roleExists = (& psql -h 127.0.0.1 -p 5432 -U $pgAdmin -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$dbUser'").Trim()
    $owner = (& psql -h 127.0.0.1 -p 5432 -U $pgAdmin -d postgres -tAc "SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname='$dbName'").Trim()
    if ($roleExists -and $owner -and $owner -ne $dbUser) {
      throw "Safety stop: local database '$dbName' exists but is owned by '$owner', not '$dbUser'. I will not modify it."
    }
    if ($roleExists -and -not $owner) {
      throw "Safety stop: role '$dbUser' already exists but the dedicated lab database does not. I will not alter an existing role."
    }
    if (-not $roleExists) {
      & psql -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 -U $pgAdmin -d postgres -c "CREATE ROLE $dbUser LOGIN PASSWORD '$dbPassword'"
      if ($LASTEXITCODE -ne 0) { throw "Could not create the dedicated lab role." }
    }
    if (-not $owner) {
      & createdb -h 127.0.0.1 -p 5432 -U $pgAdmin -O $dbUser $dbName
      if ($LASTEXITCODE -ne 0) { throw "Could not create the separate local lab database." }
    }
  } finally {
    if ($null -eq $oldPgPassword) { Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue }
    else { $env:PGPASSWORD = $oldPgPassword }
    $adminPassword = $null
  }
}

foreach ($name in @("api","web")) {
  $pidFile = Join-Path $RuntimeDir "$name.pid"
  if (Test-Path $pidFile) {
    $oldPid = 0
    [void][int]::TryParse((Get-Content $pidFile -Raw).Trim(), [ref]$oldPid)
    if ($oldPid -gt 0) {
      $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$oldPid" -ErrorAction SilentlyContinue
      if ($proc -and $proc.CommandLine -and $proc.CommandLine.Contains($ProjectRoot)) {
        Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue
      }
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  }
}

$oldEnv = @{}
$envNames = @("PORT","DATABASE_URL","JWT_SECRET","COOKIE_SECURE","NODE_ENV","AUTO_MIGRATE","LAB_AUTO_MIGRATE","LAB_MODE","LAB_SEED_DEMO_DATA","SEED_DEMO_DATA","DEFAULT_SCHOOL_NAME","DEFAULT_SCHOOL_CODE","DEFAULT_ADMIN_EMAIL","DEFAULT_ADMIN_PASSWORD","DEFAULT_SUPERADMIN_EMAIL","DEFAULT_SUPERADMIN_PASSWORD","PGPOOL_MAX","MAX_JSON_SIZE","VITE_LAB_API_TARGET")
foreach ($key in $envNames) { $oldEnv[$key] = [Environment]::GetEnvironmentVariable($key, "Process") }

try {
  $env:PORT = "3002"
  $env:DATABASE_URL = "postgresql://$($dbUser):$($dbPassword)@127.0.0.1:5432/$($dbName)"
  $env:JWT_SECRET = $jwtSecret
  $env:COOKIE_SECURE = "false"
  $env:NODE_ENV = "development"
  $env:LAB_MODE = "true"
  $env:LAB_AUTO_MIGRATE = $autoMigrate
  if ($autoMigrate -ne "false") {
    Write-Host "Applying approved schema migrations to the separate school_world_lab database only..." -ForegroundColor Cyan
    & node.exe (Join-Path $ProjectRoot "server/lab-migrate.js")
    if ($LASTEXITCODE -ne 0) { throw "Lab-only migration bootstrap failed. The API was not started." }
  }
  $env:AUTO_MIGRATE = "false"
  $env:LAB_SEED_DEMO_DATA = $seedDemo
  if ($seedDemo -ne "false") {
    Write-Host "Loading sample records into the isolated school_world_lab database..." -ForegroundColor Cyan
    & node.exe (Join-Path $ProjectRoot "server/lab-seed.js")
    if ($LASTEXITCODE -ne 0) { throw "Lab-only seed failed. The API was not started." }
  }
  $env:SEED_DEMO_DATA = "false"
  $env:DEFAULT_SCHOOL_NAME = "Sanford School Lab"
  $env:DEFAULT_SCHOOL_CODE = "SANFORD_LAB"
  $env:DEFAULT_ADMIN_EMAIL = "admin@sanford-lab.local"
  $env:DEFAULT_ADMIN_PASSWORD = "LabOnly-ChangeMe-123!"
  $env:DEFAULT_SUPERADMIN_EMAIL = "superadmin@schoolworld-lab.local"
  $env:DEFAULT_SUPERADMIN_PASSWORD = "LabOnly-SuperAdmin-123!"
  $env:PGPOOL_MAX = "5"
  $env:MAX_JSON_SIZE = "12mb"
  $env:VITE_LAB_API_TARGET = "http://127.0.0.1:3002"

  $apiOut = Join-Path $ResultsDir "native-lab-api.log"
  $apiErr = Join-Path $ResultsDir "native-lab-api-error.log"
  $api = Start-Process -FilePath "node.exe" -ArgumentList @((Join-Path $ProjectRoot "server/index.js")) -WorkingDirectory $ProjectRoot -RedirectStandardOutput $apiOut -RedirectStandardError $apiErr -PassThru
  Set-Content -Path (Join-Path $RuntimeDir "api.pid") -Value $api.Id -Encoding ascii

  $viteOut = Join-Path $ResultsDir "native-lab-web.log"
  $viteErr = Join-Path $ResultsDir "native-lab-web-error.log"
  $web = Start-Process -FilePath "node.exe" -ArgumentList @((Join-Path $ProjectRoot "node_modules/vite/bin/vite.js"),"--config",(Join-Path $ProjectRoot "vite.lab.config.js"),"--host","127.0.0.1","--port","5174","--strictPort") -WorkingDirectory $ProjectRoot -RedirectStandardOutput $viteOut -RedirectStandardError $viteErr -PassThru
  Set-Content -Path (Join-Path $RuntimeDir "web.pid") -Value $web.Id -Encoding ascii
} finally {
  foreach ($key in $envNames) { [Environment]::SetEnvironmentVariable($key, $oldEnv[$key], "Process") }
}

$ready = $false
for ($attempt = 1; $attempt -le 120; $attempt++) {
  try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:3002/api/health" -TimeoutSec 3
    $webResponse = Invoke-WebRequest -Uri "http://127.0.0.1:5174/tests/fee-installment-dialog.html" -TimeoutSec 3 -UseBasicParsing
    if ($health.ok -eq $true -and $health.database -eq "connected" -and $webResponse.StatusCode -eq 200) {
      $ready = $true
      break
    }
  } catch { }
  Start-Sleep -Seconds 2
}
if (-not $ready) {
  Write-Host "Native lab failed to become healthy. API logs:" -ForegroundColor Red
  if (Test-Path (Join-Path $ResultsDir "native-lab-api-error.log")) { Get-Content (Join-Path $ResultsDir "native-lab-api-error.log") -Tail 100 }
  if (Test-Path (Join-Path $ResultsDir "native-lab-web-error.log")) { Get-Content (Join-Path $ResultsDir "native-lab-web-error.log") -Tail 50 }
  throw "Native lab failed. The regular app ports 5173/3001 were not used."
}
Write-Host "NATIVE ISOLATED LAB READY" -ForegroundColor Green
Write-Host "Frontend:      http://127.0.0.1:5174/"
Write-Host "Dialog tests:  http://127.0.0.1:5174/tests/fee-installment-dialog.html"
Write-Host "AI sandbox:    http://127.0.0.1:5174/lab/ai-innovation/index.html"
Write-Host "Lab API:       http://127.0.0.1:3002/api/health"
Write-Host "Lab database:  local PostgreSQL database '$dbName' owned by '$dbUser' on port 5432."
Write-Host "Run .\scripts\lab\run-tests.ps1. Stop with .\scripts\lab\stop-native-lab.ps1."

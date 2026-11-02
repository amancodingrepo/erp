[CmdletBinding()]
param(
  [string]$PgClientImage = "postgres:16-alpine",
  [switch]$UseLocalPostgresTools
)
$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$ComposeFile = Join-Path $ProjectRoot "docker-compose.lab.yml"
$EnvFile = Join-Path $ProjectRoot ".env.lab"
$RuntimeDir = Join-Path $ProjectRoot ".lab-runtime"
if (-not (Test-Path $EnvFile)) {
  Write-Host "Creating/starting the lab first; this does not contact AWS." -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot "start-lab.ps1")
}

$dockerReady = $false
if (-not $UseLocalPostgresTools -and (Get-Command docker -ErrorAction SilentlyContinue)) {
  & docker info *> $null
  if ($LASTEXITCODE -eq 0) { $dockerReady = $true }
}
$mode = if ($UseLocalPostgresTools -or -not $dockerReady) { "native" } else { "docker" }
if ($mode -eq "native") {
  foreach ($command in @("psql","pg_dump","pg_restore")) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
      throw "Native snapshot mode requires '$command' in PATH. Install PostgreSQL client tools or use Docker mode."
    }
  }
}

function Read-LabValue([string]$name) {
  $line = Get-Content $EnvFile | Where-Object { $_ -match ("^" + [regex]::Escape($name) + "=") } | Select-Object -Last 1
  if (-not $line) { throw "Missing $name in .env.lab." }
  return $line.Substring($name.Length + 1).Trim()
}
$dbName = Read-LabValue "LAB_POSTGRES_DB"
$dbUser = Read-LabValue "LAB_POSTGRES_USER"
$dbPassword = Read-LabValue "LAB_POSTGRES_PASSWORD"
$dumpDir = Join-Path $env:TEMP ("school-world-lab-snapshot-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $dumpDir | Out-Null
$dumpPath = Join-Path $dumpDir "aws-test.dump"
$backupDump = Join-Path $dumpDir "local-lab-before-import.dump"
$dbContainer = $null
$applicationStopped = $false
$success = $false
$sourceUrl = $null
$oldPgEnvironment = @{}
$pgNames = @("PGHOST","PGPORT","PGDATABASE","PGUSER","PGPASSWORD","PGSSLMODE")
foreach ($name in $pgNames) { $oldPgEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, "Process") }

try {
  Write-Host "SAFETY: the source will be read only; the destination is the isolated local lab DB." -ForegroundColor Yellow
  Write-Host "Allowed source endpoint: school-world-test-db.<identifier>.rds.amazonaws.com"
  Write-Host "The local lab DB will be replaced with this snapshot after a backup. Student data may be sensitive."
  if ((Read-Host "Type READ-ONLY-TEST-DB to continue") -cne "READ-ONLY-TEST-DB") {
    throw "Cancelled; nothing was imported."
  }
  $secure = Read-Host "Paste the AWS TEST PostgreSQL URL (hidden input; include sslmode=require)" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { $sourceUrl = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }

  try { $parsed = [uri]$sourceUrl } catch { throw "The database URL could not be parsed. No connection was attempted." }
  if ($parsed.Scheme -notin @("postgres", "postgresql")) { throw "Only postgres:// or postgresql:// URLs are accepted." }
  $hostName = $parsed.DnsSafeHost.ToLowerInvariant()
  if ($hostName -notmatch '^school-world-test-db\..*\.rds\.amazonaws\.com$') {
    throw "Safety stop: source host does not match school-world-test-db.*.rds.amazonaws.com. No dump was taken."
  }
  if ($hostName -match 'prod|production|main') {
    throw "Safety stop: production-like source host detected. No dump was taken."
  }

  # Never print the connection URL. The native option maps components to libpq environment variables.
  $userinfo = $parsed.UserInfo.Split(":",2)
  if ($userinfo.Count -ne 2) { throw "The URL must include a username and password." }
  $sourceUser = [uri]::UnescapeDataString($userinfo[0])
  $sourcePassword = [uri]::UnescapeDataString($userinfo[1])
  $sourceDb = [uri]::UnescapeDataString($parsed.AbsolutePath.TrimStart("/"))
  if (-not $sourceDb) { throw "The URL must include the source database name." }

  if ($mode -eq "docker") {
    Push-Location $ProjectRoot
    try {
      & docker compose --env-file $EnvFile -f $ComposeFile up -d lab-db lab-api lab-web
      if ($LASTEXITCODE -ne 0) { throw "Could not start isolated Docker lab services." }
      $ready = $false
      for ($attempt=1; $attempt -le 120; $attempt++) {
        try {
          $health=Invoke-RestMethod -Uri "http://127.0.0.1:3002/api/health" -TimeoutSec 3
          if ($health.ok -eq $true -and $health.database -eq "connected") { $ready=$true; break }
        } catch { }
        Start-Sleep -Seconds 2
      }
      if (-not $ready) { throw "Isolated Docker lab did not become healthy; source database was not touched." }

      $dbContainer = (& docker compose --env-file $EnvFile -f $ComposeFile ps -q lab-db | Select-Object -First 1).Trim()
      if (-not $dbContainer) { throw "Isolated lab database container was not found." }

      # Create a rollback copy in a temporary directory outside the Git checkout.
      & docker compose --env-file $EnvFile -f $ComposeFile exec -T lab-db pg_dump -U $dbUser -d $dbName -Fc --no-owner --no-privileges -f /tmp/lab-before-import.dump
      if ($LASTEXITCODE -ne 0) { throw "Could not back up the current lab DB; import aborted." }
      & docker cp "$($dbContainer):/tmp/lab-before-import.dump" $backupDump | Out-Null
      if ($LASTEXITCODE -ne 0 -or -not (Test-Path $backupDump)) { throw "Could not retrieve lab rollback copy; import aborted." }

      $env:LAB_AWS_SOURCE_DATABASE_URL = $sourceUrl
      Write-Host "Taking a read-only pg_dump from the verified RDS test endpoint..." -ForegroundColor Cyan
      & docker run --rm --env LAB_AWS_SOURCE_DATABASE_URL --mount "type=bind,source=$dumpDir,target=/out" $PgClientImage sh -lc 'pg_dump --no-owner --no-privileges --format=custom --file=/out/aws-test.dump "$LAB_AWS_SOURCE_DATABASE_URL"'
      Remove-Item Env:\LAB_AWS_SOURCE_DATABASE_URL -ErrorAction SilentlyContinue
      if ($LASTEXITCODE -ne 0 -or -not (Test-Path $dumpPath)) { throw "Source dump failed. The lab DB was not replaced." }

      & docker compose --env-file $EnvFile -f $ComposeFile stop lab-api
      if ($LASTEXITCODE -ne 0) { throw "Could not stop the isolated lab API." }
      $applicationStopped = $true
      & docker cp $dumpPath "$($dbContainer):/tmp/aws-test.dump"
      if ($LASTEXITCODE -ne 0) { throw "Could not copy snapshot to the local lab database container." }
      & docker exec $dbContainer pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error -U $dbUser -d $dbName /tmp/aws-test.dump
      if ($LASTEXITCODE -ne 0) {
        Write-Host "Import failed; attempting to restore the previous local lab DB." -ForegroundColor Yellow
        & docker cp $backupDump "$($dbContainer):/tmp/lab-before-import.dump" | Out-Null
        & docker exec $dbContainer pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error -U $dbUser -d $dbName /tmp/lab-before-import.dump
        throw "AWS TEST snapshot import failed. Rollback was attempted. AWS was never written to."
      }
    } finally { Pop-Location }
  } else {
    # Ensure a native isolated lab DB is running before the snapshot process starts.
    try {
      $health = Invoke-RestMethod -Uri "http://127.0.0.1:3002/api/health" -TimeoutSec 3
    } catch { $health = $null }
    if (-not $health -or $health.ok -ne $true) {
      & (Join-Path $PSScriptRoot "start-native-lab.ps1")
    }

    # Backup the local lab DB before any restore operation.
    $env:PGHOST = "127.0.0.1"; $env:PGPORT = "5432"; $env:PGDATABASE = $dbName
    $env:PGUSER = $dbUser; $env:PGPASSWORD = $dbPassword; $env:PGSSLMODE = "disable"
    & pg_dump --no-owner --no-privileges --format=custom --file=$backupDump
    if ($LASTEXITCODE -ne 0) { throw "Could not back up the current native lab DB; import aborted." }

    # Dump the AWS source using environment variables so the password is not put in the pg_dump command line.
    $env:PGHOST = $parsed.DnsSafeHost
    $env:PGPORT = if ($parsed.IsDefaultPort) { "5432" } else { [string]$parsed.Port }
    $env:PGDATABASE = $sourceDb
    $env:PGUSER = $sourceUser
    $env:PGPASSWORD = $sourcePassword
    $env:PGSSLMODE = "require"
    Write-Host "Taking a read-only pg_dump from the verified RDS test endpoint..." -ForegroundColor Cyan
    & pg_dump --no-owner --no-privileges --format=custom --file=$dumpPath
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $dumpPath)) { throw "Source dump failed. The local lab DB was not replaced." }

    & (Join-Path $PSScriptRoot "stop-native-lab.ps1")
    $applicationStopped = $true

    # Restore into the lab DB only; never point PGHOST/PGDATABASE back to AWS for a restore.
    $env:PGHOST = "127.0.0.1"; $env:PGPORT = "5432"; $env:PGDATABASE = $dbName
    $env:PGUSER = $dbUser; $env:PGPASSWORD = $dbPassword; $env:PGSSLMODE = "disable"
    & pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error --dbname=$dbName $dumpPath
    if ($LASTEXITCODE -ne 0) {
      Write-Host "Import failed; attempting to restore the prior local lab DB." -ForegroundColor Yellow
      & pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error --dbname=$dbName $backupDump
      throw "AWS TEST snapshot import failed. Rollback was attempted. AWS was never written to."
    }
  }

  # Keep the copied schema unchanged on future lab restarts.
  $envText = Get-Content $EnvFile -Raw
  $envText = [regex]::Replace($envText, '(?m)^LAB_AUTO_MIGRATE=.*$', 'LAB_AUTO_MIGRATE=false')
  $envText = [regex]::Replace($envText, '(?m)^LAB_SEED_DEMO_DATA=.*$', 'LAB_SEED_DEMO_DATA=false')
  Set-Content -Path $EnvFile -Value $envText -Encoding ascii

  if ($mode -eq "docker") {
    Push-Location $ProjectRoot
    try {
      & docker compose --env-file $EnvFile -f $ComposeFile up -d lab-api
      if ($LASTEXITCODE -ne 0) { throw "Snapshot imported, but lab API restart failed; inspect lab logs." }
    } finally { Pop-Location }
  } else {
    & (Join-Path $PSScriptRoot "start-native-lab.ps1") -SkipAdminCheck
    if ($LASTEXITCODE -ne 0) { throw "Snapshot imported, but native lab restart failed." }
  }

  $success = $true
  Write-Host "Imported AWS RDS test snapshot into local isolated lab DB. The AWS source was read-only." -ForegroundColor Green
  Write-Host "IMPORTANT: copied data may contain personal information. Keep it local; do not commit the dump or upload screenshots with real student data." -ForegroundColor Yellow
  Write-Host "The dump was stored outside the Git checkout. The imported local DB remains on the laptop."
} finally {
  Remove-Item Env:\LAB_AWS_SOURCE_DATABASE_URL -ErrorAction SilentlyContinue
  foreach ($name in $pgNames) { [Environment]::SetEnvironmentVariable($name, $oldPgEnvironment[$name], "Process") }
  $sourceUrl = $null
  $sourcePassword = $null
  if ($applicationStopped -and -not $success) {
    Write-Host "Attempting to bring the lab app back after a failed import." -ForegroundColor Yellow
    try {
      if ($mode -eq "docker") {
        Push-Location $ProjectRoot
        & docker compose --env-file $EnvFile -f $ComposeFile up -d lab-api
        Pop-Location
      } else {
        & (Join-Path $PSScriptRoot "start-native-lab.ps1") -SkipAdminCheck
      }
    } catch { Write-Host "Lab app could not be restarted automatically; inspect test-results and run start-lab.ps1." -ForegroundColor Red }
  }
  if ($success -and (Test-Path $dumpDir)) {
    Remove-Item $dumpDir -Recurse -Force -ErrorAction SilentlyContinue
  } elseif (Test-Path $dumpDir) {
    Write-Host "Temporary dump/rollback directory retained for recovery: $dumpDir" -ForegroundColor Yellow
  }
}

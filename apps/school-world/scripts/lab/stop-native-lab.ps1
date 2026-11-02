$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$RuntimeDir = Join-Path $ProjectRoot ".lab-runtime"
foreach ($name in @("api","web")) {
  $pidFile = Join-Path $RuntimeDir "$name.pid"
  if (-not (Test-Path $pidFile)) { continue }
  $labPid = 0
  [void][int]::TryParse((Get-Content $pidFile -Raw).Trim(), [ref]$labPid)
  if ($labPid -gt 0) {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$labPid" -ErrorAction SilentlyContinue
    if ($proc -and $proc.CommandLine -and $proc.CommandLine.Contains($ProjectRoot)) {
      Stop-Process -Id $labPid -Force -ErrorAction SilentlyContinue
      Write-Host "Stopped lab $name process ($labPid)."
    }
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}
Write-Host "Native lab app processes stopped. Your normal frontend/API and database files were not stopped or deleted." -ForegroundColor Green

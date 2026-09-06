# Read-only crawl of authenticated ERP pages. Extracts AJAX/API-like URLs.
# Skips logout. Does not POST mutations. Does not store credentials.

$ErrorActionPreference = "Continue"
$base = "https://demoerp.mponline.gov.in"
$cookie = "$env:TEMP\erp-cookies.txt"
$root = "C:\Users\Asus\Desktop\indore"
$outDir = Join-Path $root "erp-crawl"
$htmlDir = Join-Path $outDir "html"
$jsonl = Join-Path $outDir "pages.jsonl"
$log = Join-Path $outDir "crawl.log"
$doneFile = Join-Path $outDir "done.txt"
$failFile = Join-Path $outDir "failed.txt"

New-Item -ItemType Directory -Force -Path $outDir, $htmlDir | Out-Null
if (-not (Test-Path $cookie)) { throw "Missing cookie file $cookie" }

$skipExact = @("/site/logout", "/admin/admin/backup")

$rows = Import-Csv (Join-Path $root "erp-routes.csv")
$paths = @($rows | ForEach-Object { $_.path } | Where-Object {
  $_ -and
  ($_ -notmatch '^/backend/') -and
  ($_ -notmatch '^/uploads/') -and
  ($skipExact -notcontains $_)
} | Sort-Object -Unique)

$already = @{}
if (Test-Path $doneFile) {
  Get-Content $doneFile | ForEach-Object { if ($_) { $already[$_] = $true } }
}

$todo = @($paths | Where-Object { -not $already.ContainsKey($_) })
$stamp = Get-Date -Format o
"$stamp total=$($paths.Count) already=$($already.Count) todo=$($todo.Count)" | Tee-Object -FilePath $log -Append

$globalHints = @(
  "/admin/currency/change_currency",
  "/admin/multibranch/branch/switchbranchlist",
  "/admin/multibranch/branch/switch",
  "/admin/multibranch/branch",
  "/admin/calendar/saveevent",
  "/admin/calendar/updateevent",
  "/admin/calendar/markcomplete/",
  "/admin/admin/search",
  "/admin/admin/activeSession",
  "/welcome/token",
  "/site/logout",
  "/admin/admin/dashboard"
)

function Normalize-Url([string]$u) {
  if ([string]::IsNullOrWhiteSpace($u)) { return $null }
  $u = $u.Trim()
  if ($u -match '^(javascript:|#|mailto:|data:)') { return $null }
  if ($u -match '\.(css|js|png|jpg|jpeg|gif|svg|woff2?|ttf|eot|ico|map)(\?|$)') { return $null }
  if ($u -match 'cdnjs\.cloudflare|fonts\.google|googleapis\.com|gstatic\.com|flag-icon') { return $null }
  if ($u.StartsWith("//")) { $u = "https:" + $u }
  if ($u.StartsWith("https://demoerp.mponline.gov.in")) {
    $u = $u.Substring("https://demoerp.mponline.gov.in".Length)
  }
  if ($u -match '^https?://') { return $null }
  if (-not $u.StartsWith("/")) { $u = "/" + $u.TrimStart("/") }
  $u = ($u.Split("#")[0])
  if ([string]::IsNullOrWhiteSpace($u) -or $u -eq "/") { return $null }
  return $u
}

function Extract-Endpoints([string]$html) {
  $found = New-Object 'System.Collections.Generic.HashSet[string]'
  $patterns = @(
    'url\s*:\s*[''"]([^''"]+)[''"]',
    'url\s*:\s*(?:baseurl|baseUrl|base_url|window\.baseUrl|basepath)\s*\+\s*[''"]([^''"]+)[''"]',
    '(?:baseurl|baseUrl|base_url|window\.baseUrl|basepath)\s*\+\s*[''"]([^''"]+)[''"]',
    'initDatatable(?:WithCsrf)?\s*\(\s*[''"][^''"]*[''"]\s*,\s*[''"]([^''"]+)[''"]',
    'action=["'']([^"'']+)["'']',
    '\.post\(\s*[''"]([^''"]+)[''"]',
    '\.get\(\s*[''"]([^''"]+)[''"]',
    'getJSON\(\s*[''"]([^''"]+)[''"]',
    'fetch\(\s*[''"]([^''"]+)[''"]'
  )
  foreach ($p in $patterns) {
    foreach ($m in [regex]::Matches($html, $p, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
      $n = Normalize-Url $m.Groups[1].Value
      if ($n) { [void]$found.Add($n) }
    }
  }
  return @($found)
}

$ok = 0
$fail = 0
$loggedOutHits = 0
$i = 0

foreach ($path in $todo) {
  $i++
  $safe = ($path.Trim("/") -replace '[^a-zA-Z0-9._-]', '_')
  if ([string]::IsNullOrWhiteSpace($safe)) { $safe = "root" }
  $htmlFile = Join-Path $htmlDir "$safe.html"
  $hdrFile = Join-Path $htmlDir "$safe.hdr"
  $url = $base + $path

  if (($i % 10) -eq 0) {
    curl.exe -sS -L --max-time 20 --max-redirs 3 -b $cookie -c $cookie -o NUL "$base/admin/admin/dashboard" | Out-Null
  }

  $meta = & curl.exe -sS -L --max-time 35 --max-redirs 5 -b $cookie -c $cookie -D $hdrFile -o $htmlFile -w "%{http_code}`t%{url_effective}`t%{size_download}" -H "Referer: $base/admin/admin/dashboard" $url 2>&1
  $code = 0
  $final = $url
  $size = 0
  if ("$meta" -match '^(\d+)\t([^\t]+)\t(\d+)$') {
    $code = [int]$Matches[1]
    $final = $Matches[2]
    $size = [int64]$Matches[3]
  }

  $html = ""
  if (Test-Path $htmlFile) {
    $html = [System.IO.File]::ReadAllText($htmlFile)
  }

  $looksLogin = ($html -match 'id="loginForm"' -and $html -match 'Staff Login')
  $loggedOut = $false
  if ($looksLogin) {
    $probe = Join-Path $htmlDir "_session_probe.html"
    curl.exe -sS -L --max-time 20 --max-redirs 3 -b $cookie -o $probe "$base/admin/admin/dashboard" | Out-Null
    $probeHtml = ""
    if (Test-Path $probe) { $probeHtml = [System.IO.File]::ReadAllText($probe) }
    $loggedOut = ($probeHtml -match 'id="loginForm"' -and $probeHtml -match 'Staff Login')
    if ($loggedOut) { $loggedOutHits++ } else {
      "$(Get-Date -Format HH:mm:ss) SKIP-NOACCESS $path (redirected to login, session still valid)" | Tee-Object -FilePath $log -Append
    }
  }

  $eps = @()
  if (-not $loggedOut -and $html.Length -gt 200) {
    $eps = Extract-Endpoints $html
  }
  $pageSpecific = @($eps | Where-Object { $globalHints -notcontains $_ } | Sort-Object -Unique)

  $rec = [ordered]@{
    path = $path
    status = $code
    final = $final
    size = $size
    loggedOut = $loggedOut
    endpointCount = $pageSpecific.Count
    endpoints = @($pageSpecific)
  }
  ($rec | ConvertTo-Json -Compress -Depth 5) | Add-Content -Path $jsonl -Encoding UTF8
  Add-Content -Path $doneFile -Value $path -Encoding UTF8

  if ($loggedOut -or $code -lt 200 -or $code -ge 400) {
    $fail++
    "$path`t$code`t$final`t$meta" | Add-Content $failFile
    "$(Get-Date -Format HH:mm:ss) FAIL $i/$($todo.Count) $code $path" | Tee-Object -FilePath $log -Append
    if ($loggedOutHits -ge 3) {
      "SESSION_DEAD" | Tee-Object -FilePath $log -Append
      throw "Session expired after $loggedOutHits login pages. Stopped at $path"
    }
  } else {
    $ok++
    if (($i % 25) -eq 0 -or $i -eq $todo.Count) {
      "$(Get-Date -Format HH:mm:ss) ok=$ok fail=$fail $i/$($todo.Count) last=$path eps=$($pageSpecific.Count)" | Tee-Object -FilePath $log -Append
    }
  }

  Start-Sleep -Milliseconds 150
}

"DONE ok=$ok fail=$fail crawled=$i" | Tee-Object -FilePath $log -Append
exit 0

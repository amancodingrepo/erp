@echo off
setlocal
cd /d "%~dp0"
where docker >nul 2>nul
if errorlevel 1 (
  echo Docker Desktop was not found. Install and start Docker Desktop, then run this file again.
  pause
  exit /b 1
)
if not exist .env (
  copy .env.example .env >nul
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=Get-Content '.env'; $jwt=[guid]::NewGuid().ToString('N')+[guid]::NewGuid().ToString('N'); $p=$p -replace '^JWT_SECRET=.*','JWT_SECRET='+$jwt; Set-Content -Path '.env' -Value $p -Encoding ascii"
  echo Created .env with a generated session secret.
  echo For real school use, edit .env and change the initial account passwords before exposing the service.
)
echo Starting School Diary and PostgreSQL. First startup downloads Docker images and builds the application.
docker compose up --build -d
if errorlevel 1 (
  echo Startup failed. Review the Docker output above and README_FULL_STACK.md.
  pause
  exit /b 1
)
echo Opening http://localhost:3001
start "" http://localhost:3001
echo Logs will remain visible below. Press Ctrl+C to stop watching logs; containers keep running.
docker compose logs -f app
endlocal

@echo off
title Automata Studio — Dev Server
color 0A

echo.
echo  =====================================================
echo    AUTOMATA STUDIO  ^|  AI-Powered Automaton Builder
echo  =====================================================
echo.

REM ── Check Node.js ────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    color 0C
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo  Download it from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  Node.js  : %NODE_VER%

for /f "tokens=*" %%v in ('npm -v') do set NPM_VER=%%v
echo  npm      : v%NPM_VER%
echo.

REM ── Install dependencies if node_modules is missing ──
if not exist "node_modules\" (
    echo  [INFO] node_modules not found. Installing dependencies...
    echo  This may take a minute on first run.
    echo.
    call npm install
    if errorlevel 1 (
        color 0C
        echo.
        echo  [ERROR] npm install failed. Check your internet connection.
        pause
        exit /b 1
    )
    echo.
    echo  [OK] Dependencies installed.
    echo.
)

REM ── Check .env file ───────────────────────────────────
if not exist ".env" (
    color 0E
    echo  [WARN] .env file not found.
    echo  Copy .env.example to .env and add your API keys.
    echo  Quick examples still work without API keys.
    color 0A
    echo.
)

REM ── Start the dev server ──────────────────────────────
echo  Starting Automata Studio on http://localhost:5174
echo  Press Ctrl+C to stop the server.
echo.
echo  ─────────────────────────────────────────────────
echo.

REM Open browser after a short delay (background)
start "" cmd /c "timeout /t 2 >nul && start http://localhost:5174"

REM Start Vite dev server
call npm run dev -- --port 5174

echo.
echo  Server stopped.
pause

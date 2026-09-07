@echo off
REM DataMind Enterprise - Windows Startup Script
REM Usage: Double-click or run: start.bat

title DataMind Enterprise v3.0

echo.
echo ╔══════════════════════════════════════════════╗
echo ║     DataMind Enterprise v3.0 - Startup      ║
echo ╚══════════════════════════════════════════════╝
echo.

REM ── Check Python ──────────────────────────────────────────────
echo [1/4] Checking Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Install from https://python.org
    pause
    exit /b 1
)
echo OK - Python found

REM ── Check Node ────────────────────────────────────────────────
echo [2/4] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)
echo OK - Node.js found

REM ── Backend Setup ─────────────────────────────────────────────
echo [3/4] Setting up Backend...
cd /d "%~dp0backend"

if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat

echo Installing Python dependencies...
pip install -r requirements.txt -q

echo Starting Backend server...
start "DataMind Backend" /min cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && uvicorn main:app --reload --port 8000"

timeout /t 2 /nobreak >nul

REM ── Frontend Setup ────────────────────────────────────────────
echo [4/4] Setting up Frontend...
cd /d "%~dp0frontend"

if not exist node_modules (
    echo Installing npm packages...
    npm install
)

echo Starting Frontend...
start "DataMind Frontend" /min cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo ══════════════════════════════════════════════
echo   DataMind Enterprise is running!
echo.
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:8000
echo   API Docs:  http://localhost:8000/docs
echo.
echo   IMPORTANT: Also start Ollama manually:
echo   1. Open a new terminal
echo   2. Run: ollama serve
echo   3. Run: ollama pull llama3.2
echo ══════════════════════════════════════════════
echo.
echo Opening browser...
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo Press any key to exit (services continue running in background)
pause >nul

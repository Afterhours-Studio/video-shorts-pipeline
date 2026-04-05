@echo off
setlocal
set "VENV_DIR=.venv"

:: ── Step 1: Create venv if missing ────────────────────
if not exist "%VENV_DIR%\Scripts\python.exe" (
    echo [SETUP] Creating virtual environment...
    python -m venv %VENV_DIR%
    if errorlevel 1 (
        echo [ERROR] Failed to create venv. Make sure Python 3.10+ is installed.
        pause
        exit /b 1
    )
)

:: ── Step 2: Install Python deps if needed ─────────────
if not exist "%VENV_DIR%\.deps_installed" (
    echo [SETUP] Installing Python dependencies (first time only)...
    call %VENV_DIR%\Scripts\activate.bat
    pip install -r requirements.txt --extra-index-url https://pnnbao97.github.io/llama-cpp-python-v0.3.16/cpu/ -q
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
    echo done > "%VENV_DIR%\.deps_installed"
    echo [SETUP] Dependencies installed successfully.
) else (
    call %VENV_DIR%\Scripts\activate.bat
)

:: ── Step 3: Install frontend deps if needed ───────────
if not exist "dashboard\node_modules" (
    echo [SETUP] Installing frontend dependencies...
    cd dashboard
    call npm install -q
    cd ..
    echo [SETUP] Frontend dependencies installed.
)

:: ── Step 4: Start backend ─────────────────────────────
echo [START] Backend API on http://localhost:8000
start "Verticals API" cmd /c "call %VENV_DIR%\Scripts\activate.bat && python -m verticals api"

:: ── Step 5: Start frontend ────────────────────────────
echo [START] Frontend on http://localhost:5173
cd dashboard
call npm run dev
pause

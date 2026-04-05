#!/bin/bash
set -e

VENV_DIR=".venv"

# ── Step 1: Create venv if missing ────────────────────
if [ ! -f "$VENV_DIR/bin/python" ]; then
    echo "[SETUP] Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

# ── Step 2: Install Python deps if needed ─────────────
if [ ! -f "$VENV_DIR/.deps_installed" ]; then
    echo "[SETUP] Installing Python dependencies (first time only)..."
    source "$VENV_DIR/bin/activate"
    pip install -r requirements.txt -q
    touch "$VENV_DIR/.deps_installed"
    echo "[SETUP] Dependencies installed successfully."
else
    source "$VENV_DIR/bin/activate"
fi

# ── Step 3: Install frontend deps if needed ───────────
if [ ! -d "dashboard/node_modules" ]; then
    echo "[SETUP] Installing frontend dependencies..."
    cd dashboard && npm install -q && cd ..
fi

# ── Step 4: Start backend ─────────────────────────────
echo "[START] Backend API on http://localhost:8000"
python -m verticals api &

# ── Step 5: Start frontend ────────────────────────────
echo "[START] Frontend on http://localhost:5173"
cd dashboard && npm run dev

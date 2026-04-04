"""SQLite database manager using aiosqlite."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

import aiosqlite

DB_DIR = Path.home() / ".verticals"
DB_PATH = DB_DIR / "verticals.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    niche TEXT DEFAULT 'general',
    title TEXT,
    caption TEXT,
    hashtags TEXT,
    script TEXT,
    broll_prompts TEXT,
    video_path TEXT,
    thumbnail_path TEXT,
    draft_path TEXT,
    duration REAL,
    file_size INTEGER,
    tiktok_url TEXT,
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT (datetime('now')),
    uploaded_at TEXT
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT REFERENCES videos(id),
    stage TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    started_at TEXT,
    finished_at TEXT,
    error TEXT,
    artifacts TEXT
);

CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cron_expr TEXT NOT NULL,
    niche TEXT DEFAULT 'tech',
    action TEXT DEFAULT 'full',
    is_active INTEGER DEFAULT 1,
    last_run_at TEXT,
    next_run_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
"""


async def init_db() -> None:
    """Create the database directory and tables, configure pragmas."""
    DB_DIR.mkdir(parents=True, exist_ok=True)

    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute("PRAGMA journal_mode=WAL;")
        await db.execute("PRAGMA busy_timeout=5000;")
        await db.execute("PRAGMA foreign_keys=ON;")
        await db.executescript(_SCHEMA)
        await db.commit()


@asynccontextmanager
async def get_db() -> AsyncIterator[aiosqlite.Connection]:
    """Yield an aiosqlite connection with recommended pragmas enabled."""
    db = await aiosqlite.connect(str(DB_PATH))
    try:
        await db.execute("PRAGMA foreign_keys=ON;")
        db.row_factory = aiosqlite.Row
        yield db
    finally:
        await db.close()

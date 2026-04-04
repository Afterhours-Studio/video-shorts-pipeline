"""Sync SQLite helpers for CLI — shares the same DB as the API server."""

import json
import sqlite3
from pathlib import Path

DB_PATH = Path.home() / ".verticals" / "verticals.db"


def _ensure_db():
    """Create DB and tables if they don't exist (matches api/database.py schema)."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(DB_PATH))
    con.executescript("""
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
    """)
    con.close()


def register_video(draft: dict, video_path: Path, thumbnail_path: Path | None = None):
    """Register a CLI-produced video in the shared DB so the dashboard can see it.

    Uses INSERT OR REPLACE so re-running produce on the same job_id updates the record.
    """
    _ensure_db()

    job_id = draft["job_id"]

    # Get duration via ffprobe
    duration = None
    try:
        import subprocess
        r = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "csv=p=0", str(video_path)],
            capture_output=True, text=True,
        )
        if r.returncode == 0 and r.stdout.strip():
            duration = float(r.stdout.strip())
    except Exception:
        pass

    file_size = None
    try:
        file_size = video_path.stat().st_size
    except Exception:
        pass

    con = sqlite3.connect(str(DB_PATH))
    con.execute(
        "INSERT OR REPLACE INTO videos "
        "(id, topic, niche, title, caption, hashtags, script, broll_prompts, "
        "video_path, thumbnail_path, draft_path, duration, file_size, status, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'done', datetime('now'))",
        [
            job_id,
            draft.get("news", draft.get("topic", "")),
            draft.get("niche", "general"),
            draft.get("title"),
            draft.get("caption"),
            draft.get("hashtags"),
            draft.get("script"),
            json.dumps(draft.get("broll_prompts", [])),
            str(video_path),
            str(thumbnail_path) if thumbnail_path else None,
            str(Path.home() / ".verticals" / "drafts" / f"{job_id}.json"),
            duration,
            file_size,
        ],
    )
    con.commit()
    con.close()


def scan_and_register_drafts():
    """Scan all draft JSON files on disk and register any finished videos not yet in DB.

    Returns the number of newly registered videos.
    """
    _ensure_db()
    drafts_dir = Path.home() / ".verticals" / "drafts"
    if not drafts_dir.exists():
        return 0

    con = sqlite3.connect(str(DB_PATH))
    registered = 0

    for draft_file in drafts_dir.glob("*.json"):
        try:
            draft = json.loads(draft_file.read_text(encoding="utf-8"))
        except Exception:
            continue

        job_id = draft.get("job_id")
        if not job_id:
            continue

        # Skip if already in DB
        row = con.execute("SELECT id FROM videos WHERE id = ?", [job_id]).fetchone()
        if row:
            continue

        # Check if video was actually produced
        ps = draft.get("_pipeline_state", {})
        assemble = ps.get("assemble", {})
        if assemble.get("status") != "done":
            continue

        video_path_str = assemble.get("artifacts", {}).get("video_path")
        if not video_path_str or not Path(video_path_str).is_file():
            continue

        # Get duration
        duration = None
        try:
            import subprocess
            r = subprocess.run(
                ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
                 "-of", "csv=p=0", video_path_str],
                capture_output=True, text=True,
            )
            if r.returncode == 0 and r.stdout.strip():
                duration = float(r.stdout.strip())
        except Exception:
            pass

        file_size = None
        try:
            file_size = Path(video_path_str).stat().st_size
        except Exception:
            pass

        con.execute(
            "INSERT INTO videos "
            "(id, topic, niche, title, caption, hashtags, script, broll_prompts, "
            "video_path, draft_path, duration, file_size, status, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'done', datetime('now'))",
            [
                job_id,
                draft.get("news", draft.get("topic", "")),
                draft.get("niche", "general"),
                draft.get("title"),
                draft.get("caption"),
                draft.get("hashtags"),
                draft.get("script"),
                json.dumps(draft.get("broll_prompts", [])),
                video_path_str,
                str(draft_file),
                duration,
                file_size,
            ],
        )
        registered += 1

    con.commit()
    con.close()
    return registered

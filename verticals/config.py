"""Key resolution, paths, constants, and setup wizard."""

import json
import os
import subprocess
import sys
from pathlib import Path

# ─────────────────────────────────────────────────────
# Skill home directory — all data lives here
# ─────────────────────────────────────────────────────
SKILL_DIR = Path.home() / ".verticals"
DRAFTS_DIR = SKILL_DIR / "drafts"
MEDIA_DIR = SKILL_DIR / "media"
LOGS_DIR = SKILL_DIR / "logs"
CONFIG_FILE = SKILL_DIR / "config.json"

# ─────────────────────────────────────────────────────
# Video constants
# ─────────────────────────────────────────────────────
VIDEO_WIDTH = 1080
VIDEO_HEIGHT = 1920

STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
    "with", "from", "by", "is", "are", "was", "were", "be", "been", "has", "have",
    "had", "will", "would", "could", "should", "may", "might", "that", "this",
    "these", "those", "it", "its", "new", "ahead", "as", "into", "up", "out",
    "over", "after",
}


# ─────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────
def write_secret_file(path: Path, content: str):
    """Write a file with 0600 permissions (owner read/write only).

    Uses os.open() with explicit mode to avoid a TOCTOU race where the file
    briefly exists with default (world-readable) permissions.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(str(path), os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        f.write(content)


def run_cmd(cmd, check=True, capture=False, **kwargs):
    if capture:
        r = subprocess.run(cmd, capture_output=True, text=True, **kwargs)
        if check and r.returncode != 0:
            raise RuntimeError(r.stderr)
        return r
    subprocess.run(cmd, check=check, **kwargs)


def extract_keywords(text: str) -> str:
    words = [w.strip(".,!?\"'()[]").lower() for w in text.split()]
    return " ".join([w for w in words if w and w not in STOPWORDS and len(w) > 2][:4])


# ─────────────────────────────────────────────────────
# API key resolution — env → config.json
# ─────────────────────────────────────────────────────
def _get_key(name: str) -> str:
    """Resolve an API key: environment variable first, then config.json."""
    val = os.environ.get(name)
    if val:
        return val
    if CONFIG_FILE.exists():
        try:
            cfg = json.loads(CONFIG_FILE.read_text())
            val = cfg.get(name)
            if val:
                return val
        except Exception:
            pass
    return ""


def get_newsapi_key() -> str:
    return _get_key("NEWSAPI_KEY")


# ─────────────────────────────────────────────────────
# Niche → default topic source configuration
# ─────────────────────────────────────────────────────
NICHE_TO_SUBREDDITS: dict[str, list[str]] = {
    "gaming":  ["gaming", "pcgaming"],
    "finance": ["personalfinance", "investing"],
    "fitness": ["fitness", "bodyweightfitness"],
    "tech":    ["technology", "artificial"],
    "beauty":  ["beauty", "SkincareAddiction"],
    "food":    ["food", "recipes"],
    "travel":  ["travel", "solotravel"],
    "general": ["worldnews", "todayilearned"],
}

# ─────────────────────────────────────────────────────
# Platform scaffold — dimensions + script length hints
# All platforms share 9:16 portrait for now; expand here in future.
# ─────────────────────────────────────────────────────
PLATFORM_CONFIGS: dict[str, dict] = {
    "tiktok": {"width": 1080, "height": 1920, "max_script_words": 150, "label": "TikTok"},
}


def get_gnews_key() -> str:
    return _get_key("GNEWS_API_KEY")


def get_elevenlabs_key() -> str:
    return _get_key("ELEVENLABS_API_KEY")


def get_gemini_key() -> str:
    return _get_key("GEMINI_API_KEY")


def load_config() -> dict:
    """Load the full config.json, including topic_sources."""
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text())
        except Exception:
            pass
    return {}


def save_config(config: dict):
    """Save config.json with restricted permissions."""
    SKILL_DIR.mkdir(parents=True, exist_ok=True)
    write_secret_file(CONFIG_FILE, json.dumps(config, indent=2))


# ─────────────────────────────────────────────────────
# First-run interactive setup
# ─────────────────────────────────────────────────────
def run_setup():
    """Interactive first-run setup — saves config.json."""
    print("\n" + "=" * 60)
    print("  Verticals v4 — First-Run Setup")
    print("=" * 60)
    print("\nThis wizard will configure your API keys.")
    print("Keys are saved to ~/.verticals/config.json\n")

    SKILL_DIR.mkdir(parents=True, exist_ok=True)

    config = {}

    print("1. Google Gemini API key (required — used for script generation and b-roll)")
    print("   Get yours at: https://aistudio.google.com/apikey")
    key = input("   GEMINI_API_KEY: ").strip()
    if key:
        config["GEMINI_API_KEY"] = key

    print("\n2. ElevenLabs API key (optional — for TTS voice generation)")
    print("   https://elevenlabs.io/settings/api-keys")
    key = input("   ELEVENLABS_API_KEY (press Enter to skip): ").strip()
    if key:
        config["ELEVENLABS_API_KEY"] = key

    save_config(config)
    print(f"\n  Config saved to {CONFIG_FILE}")

    print("\n  Setup complete! Re-run your pipeline command to continue.\n")
    sys.exit(0)

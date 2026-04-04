"""Application settings endpoints — read/write ~/.verticals/config.json."""

from __future__ import annotations

from fastapi import APIRouter

from ...config import SKILL_DIR, load_config, save_config

router = APIRouter(prefix="/api/settings", tags=["settings"])

# Keys that contain secrets and should be masked in responses.
_SECRET_SUFFIXES = ("_KEY", "_SECRET", "_TOKEN", "_PASSWORD")


def _mask_config(config: dict) -> dict:
    """Return a copy with API-key values partially masked."""
    masked = {}
    for key, value in config.items():
        if (
            isinstance(value, str)
            and any(key.upper().endswith(s) for s in _SECRET_SUFFIXES)
            and len(value) > 4
        ):
            masked[key] = value[:4] + "\u2022" * 8
        else:
            masked[key] = value
    return masked


@router.get("/")
async def get_settings():
    """Read config.json and return with masked secrets."""
    config = load_config()
    return {
        "config": _mask_config(config),
        "config_dir": str(SKILL_DIR),
    }


@router.put("/")
async def update_settings(body: dict):
    """Merge incoming values into config.json and return the updated (masked) config.

    Values set to ``None`` or empty string are removed from the config.
    Masked placeholder values (containing consecutive bullets) are ignored so a
    client can round-trip a GET without overwriting real secrets.
    """
    current = load_config()

    for key, value in body.items():
        # Skip masked placeholder values that came from a round-tripped GET
        if isinstance(value, str) and "\u2022\u2022" in value:
            continue

        if value is None or value == "":
            current.pop(key, None)
        else:
            current[key] = value

    save_config(current)

    return {
        "config": _mask_config(current),
        "config_dir": str(SKILL_DIR),
    }

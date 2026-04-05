"""Background music — track selection + volume ducking."""

import random
from pathlib import Path

from .log import log

# Music directory ships with the package
MUSIC_DIR = Path(__file__).resolve().parent.parent / "music"


def _find_tracks() -> list[Path]:
    """Find all MP3 tracks in the music/ directory."""
    if not MUSIC_DIR.exists():
        return []
    return sorted(MUSIC_DIR.glob("*.mp3"))


def _words_to_speech_regions(words: list[dict]) -> list[tuple[float, float]]:
    """Merge word timestamps into speech regions (gap < 0.5s = same region)."""
    if not words:
        return []
    regions = []
    region_start = words[0]["start"]
    region_end = words[0]["end"]

    for w in words[1:]:
        if w["start"] - region_end < 0.5:
            region_end = w["end"]
        else:
            regions.append((region_start, region_end))
            region_start = w["start"]
            region_end = w["end"]
    regions.append((region_start, region_end))
    return regions


def _get_speech_regions(audio_path: Path, cached_words: list[dict] | None = None) -> list[tuple[float, float]]:
    """Extract speech regions from Whisper word timestamps.

    If cached_words is provided (from captions stage), skip Whisper entirely.
    Falls back to treating the entire audio as one speech region.
    """
    if cached_words:
        return _words_to_speech_regions(cached_words)

    try:
        from .captions import _whisper_word_timestamps
        words = _whisper_word_timestamps(audio_path)
        if words:
            return _words_to_speech_regions(words)
    except Exception:
        pass

    # Fallback: get total duration and treat as one speech region
    try:
        from .assemble import get_audio_duration
        dur = get_audio_duration(audio_path)
        return [(0.0, dur)]
    except Exception:
        return [(0.0, 60.0)]


def build_duck_filter(speech_regions: list[tuple[float, float]], buffer: float = 0.3, vol_speech: float = 0.12, vol_gap: float = 0.25) -> str:
    """Build ffmpeg volume filter expression for ducking during speech.

    During speech: volume = vol_speech (default 0.12)
    During gaps: volume = vol_gap (default 0.25)
    Transitions smoothed by ±buffer seconds.
    """
    if not speech_regions:
        return f"volume={vol_gap}"

    # Build between() conditions for speech regions
    conditions = []
    for start, end in speech_regions:
        s = max(0, start - buffer)
        e = end + buffer
        conditions.append(f"between(t,{s:.2f},{e:.2f})")

    condition_expr = "+".join(conditions)
    return f"volume='if({condition_expr}, {vol_speech}, {vol_gap})':eval=frame"


def select_and_prepare_music(
    voiceover_path: Path,
    work_dir: Path,
    duck_speech: float = 0.12,
    duck_gap: float = 0.25,
    cached_words: list[dict] | None = None,
) -> dict:
    """Select a random track, build duck filter from speech regions.

    Args:
        cached_words: Word timestamps from captions stage to avoid re-running Whisper.

    Returns dict with track_path and duck_filter for use by assemble.py.
    """
    tracks = _find_tracks()
    if not tracks:
        log("No music tracks found in music/ — skipping background music")
        return {}

    track = random.choice(tracks)
    log(f"Selected music track: {track.name}")

    # Get speech regions for ducking (reuse captions words if available)
    speech_regions = _get_speech_regions(voiceover_path, cached_words=cached_words)
    duck_filter = build_duck_filter(speech_regions, vol_speech=duck_speech, vol_gap=duck_gap)
    log(f"Built duck filter with {len(speech_regions)} speech regions")

    return {
        "track_path": str(track),
        "duck_filter": duck_filter,
    }

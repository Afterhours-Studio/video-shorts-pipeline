"""Whisper word-level timestamps + ASS subtitle generation + Pillow fallback."""

from pathlib import Path

from .log import log


def _has_ass_filter() -> bool:
    """Check if ffmpeg has libass (for ASS subtitle burn-in)."""
    import subprocess
    try:
        r = subprocess.run(
            ["ffmpeg", "-filters"],
            capture_output=True, text=True, timeout=5,
        )
        return "ass" in r.stdout
    except Exception:
        return False


def _whisper_word_timestamps(audio_path: Path, lang: str = "en") -> list[dict]:
    """Get word-level timestamps from Whisper.

    Returns list of {"word": str, "start": float, "end": float}.
    """
    try:
        import whisper
    except ImportError:
        log("Whisper not installed — skipping word timestamps")
        return []

    log("Running Whisper for word-level timestamps...")
    try:
        model = whisper.load_model("base")
        result = model.transcribe(
            str(audio_path),
            language=lang[:2],
            word_timestamps=True,
        )
    except FileNotFoundError:
        log("Whisper failed: ffmpeg not found — install ffmpeg and restart the server")
        return []
    except Exception as e:
        log(f"Whisper transcription failed: {e}")
        return []

    words = []
    for segment in result.get("segments", []):
        for w in segment.get("words", []):
            words.append({
                "word": w["word"].strip(),
                "start": w["start"],
                "end": w["end"],
            })

    log(f"Got {len(words)} word timestamps.")
    return words


def _group_words(words: list[dict], group_size: int = 4) -> list[list[dict]]:
    groups = []
    for i in range(0, len(words), group_size):
        groups.append(words[i:i + group_size])
    return groups


# Punctuation that signals end of a phrase/sentence
_PHRASE_BREAKS = set(".,!?;:…")


def _group_words_smart(words: list[dict], max_words: int = 8) -> list[list[dict]]:
    """Group words by punctuation boundaries (smart split for Vietnamese).

    Splits at sentence-ending punctuation (. ! ? ; :) or when max_words is reached.
    Produces more natural subtitle lines that don't cut mid-phrase.
    """
    if not words:
        return []

    groups = []
    current: list[dict] = []

    for w in words:
        current.append(w)
        text = w["word"].rstrip()

        # Check if word ends with phrase-breaking punctuation
        ends_phrase = text and text[-1] in _PHRASE_BREAKS
        at_limit = len(current) >= max_words

        if ends_phrase or at_limit:
            groups.append(current)
            current = []

    # Don't leave orphan words — append remaining
    if current:
        if groups and len(current) <= 2:
            # Merge very short tail into last group
            groups[-1].extend(current)
        else:
            groups.append(current)

    return groups


def _format_ass_time(seconds: float) -> str:
    """Format seconds to ASS timestamp: H:MM:SS.cc (centiseconds)."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    cs = int((seconds % 1) * 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def _generate_ass(words: list[dict], output_path: Path, video_width: int = 1080, video_height: int = 1920, highlight_color: str = "#FFFF00", groups: list[list[dict]] | None = None, group_size: int = 4):
    """Generate ASS subtitle file with word-by-word color highlighting.

    White text for inactive words, yellow for current word.
    Semi-transparent background, positioned at lower third (~70% down).
    """
    # ASS header
    margin_v = int(video_height * 0.25)  # ~75% down from top = 25% from bottom
    header = f"""[Script Info]
Title: Pipeline Captions
ScriptType: v4.00+
PlayResX: {video_width}
PlayResY: {video_height}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,72,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,3,3,0,2,40,40,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    # Convert hex color to ASS BGR format (e.g. #00FF88 -> 88FF00)
    hc = highlight_color.lstrip("#")
    if len(hc) == 6:
        ass_highlight = f"&H00{hc[4:6]}{hc[2:4]}{hc[0:2]}&"
    else:
        ass_highlight = "&H0000FFFF&"  # fallback yellow

    if groups is None:
        groups = _group_words(words, group_size=group_size)
    events = []

    for group in groups:
        if not group:
            continue

        group_start = group[0]["start"]
        group_end = group[-1]["end"]

        # For each word in the group being active, emit one dialogue line
        for active_idx, active_word in enumerate(group):
            start = active_word["start"]
            end = active_word["end"]

            # Build text with override tags: highlight color for active, white for rest
            parts = []
            for j, w in enumerate(group):
                if j == active_idx:
                    parts.append(f"{{\\c{ass_highlight}\\b1\\fs80}}{w['word']}{{\\r}}")
                else:
                    parts.append(w["word"])

            text = " ".join(parts)
            events.append(
                f"Dialogue: 0,{_format_ass_time(start)},{_format_ass_time(end)},Default,,0,0,0,,{text}"
            )

    output_path.write_text(header + "\n".join(events), encoding="utf-8")
    log(f"ASS captions saved: {output_path.name}")
    return output_path


def _generate_srt(words: list[dict], output_path: Path, groups: list[list[dict]] | None = None, group_size: int = 4) -> Path:
    """Generate standard SRT file from word timestamps."""
    if groups is None:
        groups = _group_words(words, group_size=group_size)
    lines = []

    for i, group in enumerate(groups, 1):
        if not group:
            continue
        start = group[0]["start"]
        end = group[-1]["end"]
        text = " ".join(w["word"] for w in group)

        start_ts = _srt_time(start)
        end_ts = _srt_time(end)
        lines.append(f"{i}\n{start_ts} --> {end_ts}\n{text}\n")

    output_path.write_text("\n".join(lines), encoding="utf-8")
    log(f"SRT captions saved: {output_path.name}")
    return output_path


def _srt_time(seconds: float) -> str:
    """Format seconds to SRT timestamp: HH:MM:SS,mmm."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _align_script_to_timestamps(script: str, whisper_words: list[dict]) -> list[dict]:
    """Replace Whisper's garbled text with the original script words.

    Whisper timestamps are generally accurate even when the transcribed text
    is wrong (especially for Vietnamese). This function maps script words
    to Whisper's timing, preserving accurate timestamps with correct text.
    """
    import re
    # Split script into words (handle Vietnamese punctuation attached to words)
    script_tokens = re.findall(r'\S+', script)

    if not script_tokens or not whisper_words:
        return whisper_words

    aligned = []
    n_whisper = len(whisper_words)
    n_script = len(script_tokens)

    if n_script <= n_whisper:
        # More whisper words than script words — distribute timestamps evenly
        ratio = n_whisper / n_script
        for i, token in enumerate(script_tokens):
            wi = min(int(i * ratio), n_whisper - 1)
            wi_end = min(int((i + 1) * ratio) - 1, n_whisper - 1)
            aligned.append({
                "word": token,
                "start": whisper_words[wi]["start"],
                "end": whisper_words[wi_end]["end"],
            })
    else:
        # More script words than whisper words — interpolate timestamps
        if n_whisper == 0:
            return whisper_words
        total_start = whisper_words[0]["start"]
        total_end = whisper_words[-1]["end"]
        total_dur = total_end - total_start
        per_word = total_dur / n_script if n_script > 0 else 0
        for i, token in enumerate(script_tokens):
            aligned.append({
                "word": token,
                "start": round(total_start + i * per_word, 3),
                "end": round(total_start + (i + 1) * per_word, 3),
            })

    return aligned


def _parse_edge_tts_metadata(metadata_path: Path, script: str = "") -> list[dict]:
    """Parse edge-tts metadata into word timestamps.

    Edge TTS v7+ emits SentenceBoundary (not WordBoundary). We split the
    sentence text into words and distribute timing evenly across them.
    If a script is provided, we use it instead of the metadata text.
    """
    import json as _json
    import re

    sentences = []
    for line in metadata_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        meta = _json.loads(line)
        if meta.get("type") == "SentenceBoundary":
            sentences.append({
                "text": meta["text"],
                "start": meta["offset"] / 10_000_000,
                "duration": meta["duration"] / 10_000_000,
            })
        elif meta.get("type") == "WordBoundary":
            # Edge TTS v6 format — use directly if available
            return _parse_word_boundaries(metadata_path)

    if not sentences:
        return []

    # Use the original script if provided (correct text)
    if script:
        all_words = re.findall(r'\S+', script)
    else:
        all_words = []
        for s in sentences:
            all_words.extend(re.findall(r'\S+', s["text"]))

    # Distribute word timings across sentences proportionally
    words = []
    word_idx = 0
    for sent in sentences:
        sent_words = re.findall(r'\S+', sent["text"])
        n = len(sent_words)
        if n == 0:
            continue
        per_word = sent["duration"] / n
        for i in range(n):
            # Use script word if available, otherwise sentence word
            w = all_words[word_idx] if word_idx < len(all_words) else sent_words[i]
            words.append({
                "word": w,
                "start": round(sent["start"] + i * per_word, 3),
                "end": round(sent["start"] + (i + 1) * per_word, 3),
            })
            word_idx += 1

    return words


def _parse_word_boundaries(metadata_path: Path) -> list[dict]:
    """Parse edge-tts v6 WordBoundary events (legacy format)."""
    import json as _json
    words = []
    for line in metadata_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        meta = _json.loads(line)
        if meta.get("type") == "WordBoundary":
            offset_sec = meta["offset"] / 10_000_000
            duration_sec = meta["duration"] / 10_000_000
            words.append({
                "word": meta["text"],
                "start": round(offset_sec, 3),
                "end": round(offset_sec + duration_sec, 3),
            })
    return words


def generate_captions(
    audio_path: Path,
    work_dir: Path,
    lang: str = "en",
    highlight_color: str = "#FFFF00",
    words_per_group: int = 4,
    split_mode: str = "smart",
    script: str = "",
) -> dict:
    """Generate captions: ASS (for burn-in) + SRT (for YouTube upload).

    Uses Edge TTS word timestamps when available (perfect sync),
    falls back to Whisper transcription otherwise.

    Returns dict with keys: srt_path, ass_path, words (for music ducking).
    """
    # Priority 1: Edge TTS metadata (word timestamps from TTS engine)
    metadata_path = audio_path.with_suffix(".metadata.json")
    if metadata_path.exists():
        log("Using Edge TTS metadata for subtitle timing...")
        words = _parse_edge_tts_metadata(metadata_path, script=script)
        log(f"Got {len(words)} word timestamps from Edge TTS metadata.")
    else:
        # Priority 2: Whisper transcription (fallback for VieNeu or other TTS)
        words = _whisper_word_timestamps(audio_path, lang)
        # Replace Whisper's garbled text with original script (keeps timestamps)
        if script and words:
            log("Aligning original script to Whisper timestamps...")
            words = _align_script_to_timestamps(script, words)

    result = {"words": words}

    if not words:
        log("No word timestamps — skipping caption generation")
        # Fallback: run whisper CLI for SRT only
        try:
            from .config import run_cmd
            run_cmd([
                "whisper", str(audio_path),
                "--model", "base",
                "--language", lang[:2],
                "--output_format", "srt",
                "--output_dir", str(work_dir),
            ], capture=True)
            candidates = list(work_dir.glob("*.srt"))
            if candidates:
                srt = candidates[0]
                final = audio_path.with_suffix(".srt")
                srt.rename(final)
                result["srt_path"] = str(final)
        except Exception as e:
            log(f"Whisper CLI fallback failed: {e}")
        return result

    # Group words based on split mode
    if split_mode == "smart":
        groups = _group_words_smart(words, max_words=words_per_group)
        log(f"Smart split: {len(groups)} subtitle groups (max {words_per_group} words)")
    else:
        groups = _group_words(words, group_size=words_per_group)
        log(f"Fixed split: {len(groups)} subtitle groups ({words_per_group} words each)")

    # Generate SRT
    srt_path = work_dir / f"captions_{lang}.srt"
    _generate_srt(words, srt_path, groups=groups)
    result["srt_path"] = str(srt_path)

    # Generate ASS for burn-in (niche-aware highlight color)
    ass_path = work_dir / f"captions_{lang}.ass"
    _generate_ass(words, ass_path, highlight_color=highlight_color, groups=groups)
    result["ass_path"] = str(ass_path)

    return result

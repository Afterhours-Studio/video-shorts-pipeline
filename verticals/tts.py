"""Multi-provider TTS — Edge TTS, VieNeu (local Vietnamese), macOS say.

Edge TTS is the recommended default: free, cross-platform, 300+ voices, no API key.
VieNeu-TTS: free, offline, Vietnamese-native, voice cloning, runs on CPU.
macOS say is the last-resort fallback.
"""

import os
from pathlib import Path

from .config import run_cmd
from .log import log
from .retry import with_retry


# ─────────────────────────────────────────────────────
# Edge TTS — free, cross-platform, 300+ voices
# ─────────────────────────────────────────────────────

# Default Edge TTS voice — Vietnamese only (Verticals v4)
EDGE_VOICE_DEFAULT = "vi-VN-NamMinhNeural"


async def _edge_tts_generate(text: str, voice: str, output_path: Path):
    """Generate audio via edge-tts (async), with word-level metadata."""
    import edge_tts
    communicate = edge_tts.Communicate(text, voice)
    # Save metadata sidecar with word timestamps (offset/duration per word)
    metadata_path = output_path.with_suffix(".metadata.json")
    await communicate.save(str(output_path), str(metadata_path))


def _generate_edge_tts(script: str, out_dir: Path, voice_override: str = "") -> Path:
    """Generate voiceover via Edge TTS (free Microsoft voices)."""
    import asyncio

    voice = voice_override or EDGE_VOICE_DEFAULT
    out_path = out_dir / "voiceover_vi.mp3"

    log(f"Generating vi voiceover via Edge TTS (voice: {voice})...")

    try:
        # Always create a fresh event loop in a new thread to avoid
        # deadlocks with FastAPI's running loop
        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(_edge_tts_generate(script, voice, out_path))
        finally:
            loop.close()

        log(f"Edge TTS voiceover saved: {out_path.name}")
        return out_path
    except Exception as e:
        raise RuntimeError(f"Edge TTS failed: {e}")


# ─────────────────────────────────────────────────────
# VieNeu-TTS — free, offline, Vietnamese-native
# ─────────────────────────────────────────────────────

# Singleton to avoid reloading model on every call
_vieneu_instance = None


def _get_vieneu():
    """Get or create VieNeu TTS instance (cached singleton)."""
    global _vieneu_instance
    if _vieneu_instance is None:
        from vieneu import Vieneu
        log("Loading VieNeu-TTS model (first time may download ~500MB)...")
        _vieneu_instance = Vieneu()
        log("VieNeu-TTS model loaded.")
    return _vieneu_instance


def _generate_vieneu(script: str, out_dir: Path, voice_id: str = "") -> Path:
    """Generate voiceover via VieNeu-TTS (local Vietnamese TTS)."""
    tts = _get_vieneu()

    # Resolve voice: explicit arg > config > empty (default)
    if not voice_id:
        from .config import load_config
        voice_id = load_config().get("VIENEU_VOICE_ID", "")

    voice_data = None
    if voice_id:
        try:
            voice_data = tts.get_preset_voice(voice_id)
            log(f"Generating vi voiceover via VieNeu (voice: {voice_id})...")
        except Exception:
            log(f"VieNeu voice '{voice_id}' not found, using default...")

    if voice_data is None:
        log("Generating vi voiceover via VieNeu (default voice)...")

    audio = tts.infer(text=script, voice=voice_data)

    # VieNeu outputs WAV — convert to MP3 via ffmpeg
    wav_path = out_dir / "voiceover_vieneu.wav"
    mp3_path = out_dir / "voiceover_vi.mp3"
    tts.save(audio, str(wav_path))

    run_cmd([
        "ffmpeg", "-i", str(wav_path), "-acodec", "libmp3lame",
        "-q:a", "2", str(mp3_path), "-y", "-loglevel", "quiet",
    ])
    wav_path.unlink(missing_ok=True)

    log(f"VieNeu voiceover saved: {mp3_path.name}")
    return mp3_path


# ─────────────────────────────────────────────────────
# macOS say — last resort fallback
# ─────────────────────────────────────────────────────

def _generate_say(script: str, out_dir: Path) -> Path:
    """macOS 'say' fallback TTS."""
    out_path = out_dir / "voiceover_say.aiff"
    mp3_path = out_dir / "voiceover_say.mp3"
    run_cmd(["say", "-o", str(out_path), script])
    run_cmd([
        "ffmpeg", "-i", str(out_path), "-acodec", "libmp3lame",
        str(mp3_path), "-y", "-loglevel", "quiet",
    ])
    return mp3_path


# ─────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────

def get_tts_provider(name: str | None = None) -> str:
    """Resolve which TTS provider to use.

    Priority: explicit name > TTS_PROVIDER env > auto-detect.
    Auto-detect tries: edge_tts > vieneu > say.
    """
    if name and name != "auto":
        return name.lower()

    from_env = os.environ.get("TTS_PROVIDER", "").lower()
    if from_env:
        return from_env

    from .config import load_config
    from_cfg = load_config().get("TTS_PROVIDER", "").lower()
    if from_cfg:
        return from_cfg

    # Auto-detect: Edge TTS first (free, cross-platform)
    try:
        import edge_tts  # noqa: F401
        return "edge"
    except ImportError:
        pass

    # VieNeu-TTS (local Vietnamese)
    try:
        import vieneu  # noqa: F401
        return "vieneu"
    except ImportError:
        pass

    # macOS say as last resort
    import shutil
    if shutil.which("say"):
        return "say"

    raise RuntimeError(
        "No TTS provider available. Install one:\n"
        "  pip install edge-tts  (free, recommended)\n"
        "  pip install vieneu    (free, offline Vietnamese)\n"
        "  Or use macOS (has built-in 'say')"
    )


def generate_voiceover(
    script: str,
    out_dir: Path,
    lang: str = "vi",
    provider: str | None = None,
    voice_config: dict | None = None,
) -> Path:
    """Generate voiceover via the configured TTS provider.

    Args:
        script: The voiceover text.
        out_dir: Directory to save the audio file.
        lang: Ignored in v4 (always Vietnamese).
        provider: TTS provider name (edge, vieneu, say).
        voice_config: Optional voice config from niche profile.

    Returns:
        Path to the generated audio file.
    """
    provider = get_tts_provider(provider)
    voice_config = voice_config or {}

    if provider == "edge":
        voice_override = voice_config.get("voice_id", "")
        try:
            return _generate_edge_tts(script, out_dir, voice_override)
        except Exception as e:
            log(f"Edge TTS failed: {e}")
            # Fall through to VieNeu
            try:
                log("Falling back to VieNeu...")
                return _generate_vieneu(
                    script, out_dir,
                    voice_id=voice_config.get("voice_id", ""),
                )
            except Exception:
                log("VieNeu also failed, falling back to macOS say...")
                return _generate_say(script, out_dir)

    if provider == "vieneu":
        try:
            return _generate_vieneu(
                script, out_dir,
                voice_id=voice_config.get("voice_id", ""),
            )
        except Exception as e:
            log(f"VieNeu failed: {e}")
            log("Falling back to Edge TTS...")
            try:
                return _generate_edge_tts(script, out_dir)
            except Exception:
                log("Edge TTS also failed, falling back to macOS say...")
                return _generate_say(script, out_dir)

    if provider == "say":
        return _generate_say(script, out_dir)

    raise ValueError(f"Unknown TTS provider: {provider}")

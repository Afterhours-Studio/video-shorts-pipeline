"""Multi-provider LLM abstraction.

Supports: gemini (Google), ollama (local).
Provider selection: --provider flag or LLM_PROVIDER env var or config.json.
"""

import json
import os

from .config import get_gemini_key
from .log import log
from .retry import with_retry


def get_provider(name: str | None = None) -> str:
    """Resolve which LLM provider to use.

    Priority: explicit name > LLM_PROVIDER env > config.json > auto-detect.
    """
    if name and name != "auto":
        return name.lower()

    from_env = os.environ.get("LLM_PROVIDER", "").lower()
    if from_env:
        return from_env

    from .config import load_config
    cfg = load_config()
    from_cfg = cfg.get("LLM_PROVIDER", "").lower()
    if from_cfg:
        return from_cfg

    # Auto-detect: try providers in preference order
    if get_gemini_key():
        return "gemini"
    if _ollama_available():
        return "ollama"

    raise RuntimeError(
        "No LLM provider found. Set one of:\n"
        "  GEMINI_API_KEY\n"
        "  Or install Ollama with a model pulled"
    )


def _ollama_available() -> bool:
    """Check if Ollama is running locally."""
    try:
        import requests
        r = requests.get("http://localhost:11434/api/tags", timeout=2)
        return r.status_code == 200
    except Exception:
        return False


@with_retry(max_retries=2, base_delay=3.0)
def call_llm(prompt: str, provider: str | None = None, max_tokens: int = 4096) -> str:
    """Call any supported LLM provider with the given prompt.

    Args:
        prompt: The full prompt text.
        provider: Provider name (gemini, ollama).
        max_tokens: Maximum response tokens.

    Returns:
        The LLM response text.
    """
    provider = get_provider(provider)
    log(f"Calling LLM via {provider}...")

    if provider == "gemini":
        return _call_gemini(prompt, max_tokens)
    elif provider == "ollama":
        return _call_ollama(prompt)
    else:
        raise ValueError(f"Unknown LLM provider: {provider}. Supported: gemini, ollama")


def _call_gemini(prompt: str, max_tokens: int) -> str:
    """Call Gemini via Google AI API."""
    import requests

    api_key = get_gemini_key()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")

    url = (
        "https://generativelanguage.googleapis.com/v1beta"
        "/models/gemini-2.5-flash:generateContent"
    )
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "maxOutputTokens": max_tokens,
            "temperature": 0.7,
            "responseMimeType": "application/json",
        },
    }
    r = requests.post(
        url, json=body, timeout=60,
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
    )
    if r.status_code != 200:
        raise RuntimeError(f"Gemini API {r.status_code}: {r.text[:300]}")

    data = r.json()
    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])

    # With responseMimeType="application/json", text may already be a parsed object
    raw_parts = []
    for p in parts:
        val = p.get("text", "")
        if isinstance(val, dict):
            raw_parts.append(json.dumps(val))
        elif isinstance(val, str):
            raw_parts.append(val)
        else:
            raw_parts.append(str(val))
    text = " ".join(raw_parts).strip()
    if not text:
        raise RuntimeError("Empty response from Gemini")

    # Strip markdown code fences that Gemini sometimes wraps around JSON
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[-1].strip() == "```":
            lines = lines[1:-1]
        else:
            lines = lines[1:]
        text = "\n".join(lines).strip()

    return text


def _call_ollama(prompt: str) -> str:
    """Call Ollama locally (no API key needed).

    Tries models in preference order: llama3.1:8b, mistral, gemma2.
    """
    import requests

    # Find available models
    try:
        tags = requests.get("http://localhost:11434/api/tags", timeout=5).json()
        available = [m["name"] for m in tags.get("models", [])]
    except Exception:
        raise RuntimeError("Ollama not running. Start with: ollama serve")

    if not available:
        raise RuntimeError("No Ollama models found. Pull one: ollama pull llama3.1:8b")

    # Pick best available model
    preferred = ["llama3.1:8b", "llama3:8b", "mistral", "gemma2", "qwen2.5:7b"]
    model = None
    for pref in preferred:
        for avail in available:
            if pref in avail:
                model = avail
                break
        if model:
            break
    if not model:
        model = available[0]

    log(f"Using Ollama model: {model}")

    r = requests.post(
        "http://localhost:11434/api/generate",
        json={"model": model, "prompt": prompt, "stream": False},
        timeout=120,
    )
    if r.status_code != 200:
        raise RuntimeError(f"Ollama {r.status_code}: {r.text[:300]}")

    return r.json().get("response", "").strip()

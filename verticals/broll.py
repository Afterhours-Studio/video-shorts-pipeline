"""Gemini Imagen b-roll generation + Ken Burns animation."""

import base64
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFont

from .config import VIDEO_WIDTH, VIDEO_HEIGHT, get_gemini_key, run_cmd
from .log import log
from .retry import with_retry


def _generate_image_pollinations(prompt: str, output_path: Path):
    """Generate image via Pollinations.ai (free, no API key, Flux model)."""
    import urllib.parse
    import time
    encoded = urllib.parse.quote(prompt[:200])
    # Request 9:16 portrait — Flux handles 768x1344 well, avoids excessive upscale
    url = f"https://image.pollinations.ai/prompt/{encoded}?width=768&height=1344&nologo=true&seed={int(time.time())}"
    r = requests.get(url, timeout=120)
    if r.status_code != 200 or len(r.content) < 10000:
        raise RuntimeError(f"Pollinations failed: HTTP {r.status_code}")
    output_path.write_bytes(r.content)


@with_retry(max_retries=3, base_delay=2.0)
def _generate_image_gemini(prompt: str, output_path: Path, api_key: str):
    """Generate image via Gemini native image generation (fallback)."""
    url = (
        "https://generativelanguage.googleapis.com/v1beta"
        "/models/gemini-2.5-flash-image:generateContent"
    )
    body = {
        "contents": [{"parts": [{"text": f"Generate an image: {prompt}"}]}],
        "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]},
    }
    r = requests.post(
        url, json=body, timeout=90,
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
    )
    if r.status_code != 200:
        try:
            detail = r.json().get("error", {}).get("message", r.text[:200])
        except Exception:
            detail = r.text[:200]
        raise RuntimeError(f"Gemini API {r.status_code}: {detail}")
    data = r.json()
    for part in data.get("candidates", [{}])[0].get("content", {}).get("parts", []):
        if "inlineData" in part:
            img_b64 = part["inlineData"]["data"]
            output_path.write_bytes(base64.b64decode(img_b64))
            return
    raise RuntimeError("No image in Gemini response")


def _fetch_stock_image(query: str, output_path: Path) -> bool:
    """Fetch a relevant image via DuckDuckGo image search (no API key needed)."""
    try:
        import urllib.parse
        headers = {"User-Agent": "Mozilla/5.0"}
        # Step 1: get vqd token
        ddg_url = f"https://duckduckgo.com/?q={urllib.parse.quote(query)}&iax=images&ia=images"
        token_r = requests.get(ddg_url, headers=headers, timeout=10)
        import re
        vqd_match = re.search(r'vqd=["\']([^"\']+)', token_r.text)
        if not vqd_match:
            return False
        vqd = vqd_match.group(1)
        # Step 2: search images
        api_url = "https://duckduckgo.com/i.js"
        params = {"l": "us-en", "o": "json", "q": query, "vqd": vqd, "f": ",,,,,", "p": "1"}
        img_r = requests.get(api_url, params=params, headers=headers, timeout=10)
        if img_r.status_code != 200:
            return False
        results = img_r.json().get("results", [])
        # Pick first large-enough image
        for result in results[:5]:
            img_url = result.get("image", "")
            if not img_url:
                continue
            try:
                dl = requests.get(img_url, headers=headers, timeout=15)
                if dl.status_code == 200 and len(dl.content) > 10000:
                    output_path.write_bytes(dl.content)
                    log(f"Stock image downloaded for: {query[:50]}")
                    return True
            except Exception:
                continue
        return False
    except Exception as e:
        log(f"Stock image fetch failed: {e}")
        return False


def _fallback_frame(i: int, out_dir: Path, prompt: str = "") -> Path:
    """Gradient background with topic text overlay as fallback when Gemini fails."""
    # Dark gradient colour pairs (top, bottom) for visual variety
    gradients = [
        ((15, 10, 50), (60, 20, 80)),
        ((10, 30, 50), (50, 15, 60)),
        ((20, 15, 45), (70, 25, 55)),
    ]
    top_color, bot_color = gradients[i % len(gradients)]

    img = Image.new("RGB", (VIDEO_WIDTH, VIDEO_HEIGHT))
    draw = ImageDraw.Draw(img)

    # Draw vertical gradient
    for y in range(VIDEO_HEIGHT):
        ratio = y / VIDEO_HEIGHT
        r = int(top_color[0] + (bot_color[0] - top_color[0]) * ratio)
        g = int(top_color[1] + (bot_color[1] - top_color[1]) * ratio)
        b = int(top_color[2] + (bot_color[2] - top_color[2]) * ratio)
        draw.line([(0, y), (VIDEO_WIDTH, y)], fill=(r, g, b))

    # Overlay prompt text in the centre
    if prompt:
        # Try to load a system font, fall back to Pillow default
        font = None
        for font_name in ("arial.ttf", "Arial.ttf", "DejaVuSans.ttf", "LiberationSans-Regular.ttf"):
            try:
                font = ImageFont.truetype(font_name, size=48)
                break
            except OSError:
                continue
        if font is None:
            font = ImageFont.load_default()

        # Word-wrap the prompt to fit the frame width with margins
        margin = 60
        max_text_width = VIDEO_WIDTH - margin * 2
        words = prompt.split()
        lines: list[str] = []
        current_line = ""
        for word in words:
            test = f"{current_line} {word}".strip()
            bbox = draw.textbbox((0, 0), test, font=font)
            if bbox[2] - bbox[0] <= max_text_width:
                current_line = test
            else:
                if current_line:
                    lines.append(current_line)
                current_line = word
        if current_line:
            lines.append(current_line)

        # Limit to a few lines so text stays readable
        lines = lines[:5]
        wrapped = "\n".join(lines)

        bbox = draw.textbbox((0, 0), wrapped, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        x = (VIDEO_WIDTH - text_w) // 2
        y = (VIDEO_HEIGHT - text_h) // 2

        # Draw subtle shadow then white text
        draw.multiline_text((x + 2, y + 2), wrapped, font=font, fill=(0, 0, 0, 180), align="center")
        draw.multiline_text((x, y), wrapped, font=font, fill=(255, 255, 255), align="center")

    path = out_dir / f"broll_{i}.png"
    img.save(path)
    return path


def _resize_crop_portrait(img_path: Path):
    """Resize and crop an image to 9:16 portrait (1080x1920).

    Uses ffmpeg for high-quality upscaling (lanczos) when available,
    falls back to Pillow LANCZOS.
    """
    img = Image.open(img_path).convert("RGB")
    target_w, target_h = VIDEO_WIDTH, VIDEO_HEIGHT
    orig_w, orig_h = img.size

    # Calculate scale to cover target while maintaining aspect ratio
    scale = max(target_w / orig_w, target_h / orig_h)
    new_w, new_h = int(orig_w * scale), int(orig_h * scale)

    # Use ffmpeg for better upscale quality if scaling up significantly
    if scale > 1.3:
        import shutil
        if shutil.which("ffmpeg"):
            tmp_out = img_path.with_suffix(".upscaled.png")
            try:
                run_cmd([
                    "ffmpeg", "-i", str(img_path),
                    "-vf", f"scale={new_w}:{new_h}:flags=lanczos,crop={target_w}:{target_h}",
                    str(tmp_out), "-y", "-loglevel", "quiet",
                ])
                tmp_out.replace(img_path)
                return
            except Exception:
                tmp_out.unlink(missing_ok=True)

    # Pillow fallback
    img = img.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - target_w) // 2
    top = (new_h - target_h) // 2
    img = img.crop((left, top, left + target_w, top + target_h))
    img.save(img_path)


def generate_broll(prompts: list, out_dir: Path) -> list[Path]:
    """Generate 3 b-roll frames. Tries: Pollinations → Gemini → DuckDuckGo stock → gradient."""
    api_key = get_gemini_key()
    frames = []

    for i, prompt in enumerate(prompts):
        out_path = out_dir / f"broll_{i}.png"
        clean_query = prompt.split(".")[0].strip()[:80]

        # ── Try 1: Pollinations.ai (free, no key) ────────
        try:
            log(f"Generating b-roll frame {i+1}/3 via Pollinations...")
            _generate_image_pollinations(prompt, out_path)
            _resize_crop_portrait(out_path)
            frames.append(out_path)
            continue
        except Exception as e:
            log(f"Frame {i+1} Pollinations failed: {e}")

        # ── Try 2: Gemini Imagen ──────────────────────────
        try:
            log(f"Frame {i+1} trying Gemini Imagen...")
            _generate_image_gemini(prompt, out_path, api_key)
            _resize_crop_portrait(out_path)
            frames.append(out_path)
            continue
        except Exception as e:
            log(f"Frame {i+1} Gemini failed: {e}")

        # ── Try 3: DuckDuckGo stock image ─────────────────
        stock_path = out_dir / f"broll_{i}_stock.png"
        if _fetch_stock_image(clean_query, stock_path):
            _resize_crop_portrait(stock_path)
            stock_path.rename(out_path)
            frames.append(out_path)
        else:
            # ── Try 4: gradient fallback ──────────────────
            log(f"Frame {i+1} all sources failed — using gradient fallback")
            frames.append(_fallback_frame(i, out_dir, prompt=clean_query))

    return frames


def animate_frame(img_path: Path, out_path: Path, duration: float, effect: str = "zoom_in"):
    """Ken Burns animation on a single frame — smooth zoom/pan effects."""
    fps = 60  # Higher fps for smoother motion
    frames = int(duration * fps)
    w, h = VIDEO_WIDTH, VIDEO_HEIGHT

    # Pre-scale image larger so zoompan has room to work without upscaling
    sw, sh = int(w * 1.2), int(h * 1.2)

    if effect == "zoom_in":
        # Smooth zoom from 1.0 to 1.15, centered
        vf = (
            f"scale={sw}:{sh},"
            f"zoompan=z='1.0+0.15*on/{frames}'"
            f":x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
            f":d={frames}:s={w}x{h}:fps={fps}"
        )
    elif effect == "pan_right":
        # Smooth pan from left to right, slight zoom, Y centered
        vf = (
            f"scale={sw}:{sh},"
            f"zoompan=z=1.1"
            f":x='(iw/zoom-{w})*on/{frames}':y='(ih/zoom-{h})/2'"
            f":d={frames}:s={w}x{h}:fps={fps}"
        )
    else:  # zoom_out
        # Smooth zoom from 1.15 to 1.0, centered
        vf = (
            f"scale={sw}:{sh},"
            f"zoompan=z='1.15-0.15*on/{frames}'"
            f":x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
            f":d={frames}:s={w}x{h}:fps={fps}"
        )

    run_cmd([
        "ffmpeg", "-loop", "1", "-i", str(img_path),
        "-vf", vf, "-t", str(duration), "-r", "30",
        "-pix_fmt", "yuv420p", str(out_path), "-y", "-loglevel", "warning",
    ])

# Phase 1: Cleanup — Loại bỏ code không cần thiết

## Mục tiêu

Loại bỏ hoàn toàn: Anthropic API, OpenAI API, YouTube upload, Gradio UI, và tất cả ngôn ngữ trừ tiếng Việt.
Giảm complexity, dependencies, và kích thước codebase trước khi xây tính năng mới.

---

## 1. Loại bỏ Anthropic API

### Dependencies cần xóa

| File | Nội dung xóa |
|---|---|
| `requirements.txt` | `anthropic>=0.39.0,<1.0` |
| `pyproject.toml` | `"anthropic>=0.39.0,<1.0"` trong `[project.dependencies]` |

### Code cần xóa

#### `verticals/config.py`
- Xóa function `get_anthropic_key()` 
- Xóa function `get_anthropic_client()`
- Xóa constant `CLAUDE_CREDENTIALS`
- Xóa function `has_claude_cli()`
- Xóa function `_has_claude_max_credentials()`
- Xóa function `call_claude_cli()`
- Xóa function `get_claude_backend()`
- Xóa phần Anthropic key trong setup wizard

#### `verticals/llm.py`
- Xóa imports: `get_anthropic_client`, `get_anthropic_key`, `get_claude_backend`, `call_claude_cli`
- Xóa function `_call_claude()`
- Xóa provider `"claude"` và `"claude_cli"` trong `get_provider()` và `call_llm()`
- Update error message trong `get_provider()` — bỏ mention `ANTHROPIC_API_KEY`

#### `verticals/topics/engine.py`
- Xóa imports liên quan Claude
- Update `auto_pick()` — bỏ Claude backend, dùng `call_llm()` trực tiếp

#### `verticals/__main__.py`
- Xóa `"claude"` khỏi `--provider` help text

---

## 2. Loại bỏ OpenAI API

### Dependencies cần xóa

| File | Nội dung xóa |
|---|---|
| `requirements.txt` | `openai` (nếu có) |
| `pyproject.toml` | `openai` dependency (nếu có) |

### Code cần xóa

#### `verticals/llm.py`
- Xóa function `_call_openai()`
- Xóa provider `"openai"` trong `get_provider()` và `call_llm()`
- Xóa import `openai` 

#### `verticals/config.py`
- Xóa `get_openai_key()` (nếu có)
- Xóa `OPENAI_API_KEY` khỏi setup wizard

#### `verticals/__main__.py`
- Xóa `"openai"` khỏi `--provider` help text

> **Lưu ý**: `openai-whisper` (speech-to-text) KHÔNG phải OpenAI API — giữ nguyên.

---

## 3. Loại bỏ YouTube Upload

### Dependencies cần xóa

| File | Nội dung xóa |
|---|---|
| `requirements.txt` | `google-api-python-client`, `google-auth`, `google-auth-oauthlib` |
| `pyproject.toml` | 3 dòng Google API dependencies |

### Files cần xóa hoàn toàn

| File | Lý do |
|---|---|
| `verticals/upload.py` | Toàn bộ là `upload_to_youtube()` |
| `scripts/setup_youtube_oauth.py` | OAuth setup cho YouTube |

### Code cần sửa

#### `verticals/__main__.py`
- Xóa `from .upload import upload_to_youtube`
- Xóa/thay thế function `cmd_upload()` — sẽ viết lại cho TikTok ở Phase 2
- Update `cmd_run()` — bỏ bước upload YouTube

#### `verticals/draft.py`
- Đổi tên fields trong JSON output prompt:
  - `youtube_title` → `title`
  - `youtube_description` → `description`  
  - `youtube_tags` → `hashtags`
- Giữ `tiktok_caption` (đổi thành `caption`)
- Bỏ `instagram_caption`

#### `verticals/config.py`
- Xóa `get_youtube_token_path()`
- Xóa phần YouTube OAuth trong setup wizard

#### `verticals/thumbnail.py`
- Update docstring, đổi mention "YouTube thumbnail" → "Video thumbnail"
- Đổi `draft.get("youtube_title")` → `draft.get("title")`

### Test files cần update

| File | Thay đổi |
|---|---|
| `tests/conftest.py` | Đổi `youtube_title/description/tags` → `title/description/hashtags` |
| `tests/test_draft.py` | Cùng thay đổi field names |

### Migration: Draft JSON cũ

Drafts v3 có fields `youtube_title`, `youtube_description`, `youtube_tags`, `instagram_caption`.
Drafts v4 đổi thành `title`, `description`, `hashtags`, `caption`.

Script migration cho drafts cũ:

```python
# scripts/migrate_drafts.py
import json
from pathlib import Path

DRAFTS_DIR = Path.home() / ".verticals" / "drafts"
FIELD_MAP = {
    "youtube_title": "title",
    "youtube_description": "description",
    "youtube_tags": "hashtags",
    "tiktok_caption": "caption",
    "instagram_caption": None,  # xóa
}

for f in DRAFTS_DIR.glob("*.json"):
    draft = json.loads(f.read_text())
    for old, new in FIELD_MAP.items():
        if old in draft:
            if new:
                draft[new] = draft.pop(old)
            else:
                del draft[old]
    f.write_text(json.dumps(draft, ensure_ascii=False, indent=2))
    print(f"Migrated: {f.name}")
```

---

## 4. Loại bỏ ngôn ngữ khác (giữ Việt)

Chi tiết xem file `02-vietnamese-only.md`.

---

## 5. Loại bỏ Gradio UI + Cleanup khác

### Files xóa hoàn toàn

| File | Lý do |
|---|---|
| `verticals/ui.py` | Xóa luôn — thay bằng React dashboard |
| `verticals/voiceover.py` | Legacy wrapper, chỉ 232 bytes, import từ tts.py |
| `verticals/topics/twitter.py` | Stub chưa implement |
| `verticals/topics/tiktok.py` | Stub chưa implement (sẽ viết lại nếu cần) |

### Dependencies cần xóa

| File | Nội dung xóa |
|---|---|
| `requirements.txt` | `gradio>=4.0.0`, `python-multipart` |
| `pyproject.toml` | Gradio dependency (nếu có) |

### Code cần sửa

#### `verticals/__main__.py`
- Xóa command `ui` và function `start_ui()`
- Xóa import `from .ui import ...`

### Config constants cần update

| Constant | Hiện tại | Sau cleanup |
|---|---|---|
| `PLATFORM_CONFIGS` | shorts, reels, tiktok | Chỉ giữ tiktok |
| `VOICE_ID_EN` | ElevenLabs English | Xóa |
| `VOICE_ID_HI` | ElevenLabs Hindi | Xóa |

---

## Checklist sau cleanup

- [ ] `pip install -e .` không còn cài `anthropic`, `openai`, `google-api-python-client`, `google-auth`, `google-auth-oauthlib`, `gradio`
- [ ] `python -m verticals draft --help` không hiện `claude` hoặc `openai` trong provider choices
- [ ] `python -m verticals draft --help` chỉ hiện `--lang vi` (không có choices khác)
- [ ] `python -m verticals upload --help` hiện TikTok thay vì YouTube (hoặc tạm bỏ upload command)
- [ ] `python -m verticals ui` không còn tồn tại
- [ ] Tất cả tests pass
- [ ] Không có import nào reference `anthropic`, `openai` (trừ whisper), `google.oauth2`, hoặc `gradio`

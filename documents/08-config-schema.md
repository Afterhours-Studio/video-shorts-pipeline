# Config Schema Reference — Verticals v4

## Mục tiêu

Định nghĩa schema thống nhất cho `config.json` v4 — cấu hình duy nhất cho toàn bộ pipeline.
Loại bỏ các key không còn dùng (Anthropic, OpenAI, YouTube), thêm key mới (GNews, TikTok API, Ollama), giữ cấu trúc gọn và rõ ràng.

---

## Config file location

```
~/.verticals/config.json
```

Trên Windows: `%USERPROFILE%\.verticals\config.json`
Trên Linux/macOS: `$HOME/.verticals/config.json`

Pipeline tự tạo thư mục `~/.verticals/` nếu chưa tồn tại khi chạy lần đầu.

---

## Key resolution order

Mỗi config key được resolve theo thứ tự ưu tiên:

```
1. Environment variable   (ưu tiên cao nhất)
2. config.json            (persistent config)
3. Default value          (hardcoded trong code)
```

Ví dụ: nếu cả `GEMINI_API_KEY` env var và `config.json` đều có giá trị, env var sẽ được dùng.

**Lý do:** Cho phép override tạm thời khi dev/test mà không cần sửa config file. Đồng thời hỗ trợ CI/CD và OpenClaw truyền secrets qua env vars.

---

## Complete v4 schema

```json
{
  "_comment": "Verticals v4 — Vietnamese TikTok Pipeline Config",

  "GEMINI_API_KEY": "AIza...",
  "GNEWS_API_KEY": "abc123...",
  "ELEVENLABS_API_KEY": "",

  "TIKTOK_CLIENT_KEY": "",
  "TIKTOK_CLIENT_SECRET": "",
  "TIKTOK_ACCESS_TOKEN": "",
  "TIKTOK_REFRESH_TOKEN": "",

  "LLM_PROVIDER": "gemini",
  "OLLAMA_MODEL": "llama3.1",

  "TTS_PROVIDER": "edge",
  "EDGE_VOICE": "vi-VN-NamMinhNeural",

  "topic_sources": {
    "reddit": {
      "enabled": true,
      "subreddits": ["technology", "VietNam", "games"]
    },
    "rss": {
      "enabled": true,
      "feeds": [
        "https://vnexpress.net/rss/tin-noi-bat.rss",
        "https://tuoitre.vn/rss/tin-moi-nhat.rss",
        "https://thanhnien.vn/rss/trang-chu.rss",
        "https://zingnews.vn/tin-moi.rss"
      ]
    },
    "gnews": {
      "enabled": true,
      "language": "vi",
      "country": "vn",
      "max_results": 10
    },
    "google_trends": {
      "enabled": true,
      "geo": "VN"
    }
  },

  "TIKTOK_DEFAULT_PRIVACY": "SELF_ONLY",

  "WHISPER_MODEL": "medium",
  "VIDEO_WIDTH": 1080,
  "VIDEO_HEIGHT": 1920
}
```

---

## Schema table

### API Keys

| Key | Type | Required | Default | Mô tả |
|---|---|---|---|---|
| `GEMINI_API_KEY` | `string` | **Bắt buộc** | — | API key cho Gemini Flash 2.5 (LLM chính + Imagen) |
| `GNEWS_API_KEY` | `string` | **Bắt buộc** (cho topic discovery) | — | API key cho GNews.io — free tier 100 req/ngày |
| `ELEVENLABS_API_KEY` | `string` | Không | `""` | API key cho ElevenLabs TTS — chỉ cần nếu `TTS_PROVIDER=elevenlabs` |
| `TIKTOK_CLIENT_KEY` | `string` | Không | `""` | TikTok API client key — cho upload tự động (phase sau) |
| `TIKTOK_CLIENT_SECRET` | `string` | Không | `""` | TikTok API client secret |
| `TIKTOK_ACCESS_TOKEN` | `string` | Không | `""` | OAuth access token — tự refresh khi hết hạn |
| `TIKTOK_REFRESH_TOKEN` | `string` | Không | `""` | OAuth refresh token — dùng để lấy access token mới |

### LLM

| Key | Type | Required | Default | Mô tả |
|---|---|---|---|---|
| `LLM_PROVIDER` | `string` | Không | `"gemini"` | LLM provider: `"gemini"` hoặc `"ollama"` |
| `OLLAMA_MODEL` | `string` | Không | `"llama3.1"` | Model name cho Ollama — chỉ dùng khi `LLM_PROVIDER=ollama` |

### TTS

| Key | Type | Required | Default | Mô tả |
|---|---|---|---|---|
| `TTS_PROVIDER` | `string` | Không | `"edge"` | TTS engine: `"edge"` (miễn phí) hoặc `"elevenlabs"` |
| `EDGE_VOICE` | `string` | Không | `"vi-VN-NamMinhNeural"` | Edge TTS voice ID — chỉ voice tiếng Việt |

**Voice tiếng Việt có sẵn trong Edge TTS:**

| Voice ID | Giới tính | Ghi chú |
|---|---|---|
| `vi-VN-NamMinhNeural` | Nam | Default — giọng nam trẻ, rõ ràng |
| `vi-VN-HoaiMyNeural` | Nữ | Giọng nữ, phù hợp lifestyle/beauty |

### Topic Sources

| Key | Type | Required | Default | Mô tả |
|---|---|---|---|---|
| `topic_sources.reddit.enabled` | `bool` | Không | `true` | Bật/tắt Reddit source |
| `topic_sources.reddit.subreddits` | `string[]` | Không | `[]` | Danh sách subreddits để theo dõi — niche YAML override |
| `topic_sources.rss.enabled` | `bool` | Không | `true` | Bật/tắt RSS source |
| `topic_sources.rss.feeds` | `string[]` | Không | `[]` | Danh sách RSS feed URLs — niche YAML có thể bổ sung |
| `topic_sources.gnews.enabled` | `bool` | Không | `true` | Bật/tắt GNews source |
| `topic_sources.gnews.language` | `string` | Không | `"vi"` | Ngôn ngữ GNews — luôn `"vi"` trong v4 |
| `topic_sources.gnews.country` | `string` | Không | `"vn"` | Quốc gia GNews — luôn `"vn"` trong v4 |
| `topic_sources.gnews.max_results` | `int` | Không | `10` | Số bài tối đa mỗi request (max 10 free tier) |
| `topic_sources.google_trends.enabled` | `bool` | Không | `true` | Bật/tắt Google Trends source |
| `topic_sources.google_trends.geo` | `string` | Không | `"VN"` | Geo code — luôn `"VN"` trong v4 |

### Upload

| Key | Type | Required | Default | Mô tả |
|---|---|---|---|---|
| `TIKTOK_DEFAULT_PRIVACY` | `string` | Không | `"SELF_ONLY"` | Privacy mặc định khi upload: `"SELF_ONLY"`, `"MUTUAL_FOLLOW_FRIENDS"`, `"FOLLOWER_OF_CREATOR"`, `"PUBLIC_TO_EVERYONE"` |
| `TIKTOK_TOKEN_EXPIRES_AT` | `number` | Không | `0` | Unix timestamp khi access token hết hạn |
| `TIKTOK_REFRESH_TOKEN` | `string` | Không | `""` | Refresh token (365 ngày) |

### Pipeline

| Key | Type | Required | Default | Mô tả |
|---|---|---|---|---|
| `WHISPER_MODEL` | `string` | Không | `"medium"` | Whisper model size: `"tiny"`, `"base"`, `"small"`, `"medium"`, `"large"` |
| `VIDEO_WIDTH` | `int` | Không | `1080` | Chiều rộng video (px) — 1080 cho TikTok vertical |
| `VIDEO_HEIGHT` | `int` | Không | `1920` | Chiều cao video (px) — 1920 cho TikTok vertical (9:16) |

---

## API key encryption

API keys được mã hóa khi lưu vào `config.json` bằng **Fernet symmetric encryption** (từ thư viện `cryptography`).

### Cách hoạt động

1. **Machine secret**: Tạo key dựa trên thông tin máy (machine ID + username), hash bằng SHA-256, encode base64 thành Fernet key
2. **Encrypt**: Khi lưu API key, mã hóa bằng Fernet key trước khi ghi vào config
3. **Decrypt**: Khi đọc API key, giải mã tự động

```python
import hashlib
import base64
import platform
import getpass
from cryptography.fernet import Fernet

def _derive_key() -> bytes:
    """Tạo Fernet key từ machine-specific secret."""
    raw = f"{platform.node()}-{getpass.getuser()}-verticals-v4"
    digest = hashlib.sha256(raw.encode()).digest()
    return base64.urlsafe_b64encode(digest)

def encrypt_value(plaintext: str) -> str:
    """Mã hóa giá trị trước khi lưu vào config."""
    f = Fernet(_derive_key())
    return f.encrypt(plaintext.encode()).decode()

def decrypt_value(token: str) -> str:
    """Giải mã giá trị khi đọc từ config."""
    f = Fernet(_derive_key())
    return f.decrypt(token.encode()).decode()
```

### Lưu ý

- Key chỉ giải mã được trên cùng máy + cùng user → bảo vệ nếu config bị copy sang máy khác
- Env vars **không** mã hóa — chỉ config.json values mới mã hóa
- Các key được mã hóa: tất cả key có suffix `_KEY`, `_SECRET`, `_TOKEN`
- Config file lưu dạng `"ENC:gAAAAABk..."` — prefix `ENC:` để phân biệt với plaintext

---

## Migration từ v3

### Keys cần xóa

| Key v3 | Lý do |
|---|---|
| `ANTHROPIC_API_KEY` | Bỏ Anthropic hoàn toàn |
| `OPENAI_API_KEY` | Bỏ OpenAI hoàn toàn |
| `NEWSAPI_KEY` | Thay bằng `GNEWS_API_KEY` (NewsAPI vẫn hoạt động nếu giữ optional) |

### Keys cần thêm

| Key v4 | Từ đâu |
|---|---|
| `GNEWS_API_KEY` | Đăng ký tại gnews.io (miễn phí) |
| `OLLAMA_MODEL` | Mới — cấu hình model Ollama |
| `EDGE_VOICE` | Mới — chọn voice tiếng Việt |
| `TIKTOK_CLIENT_KEY` | Mới — cho upload tự động (phase sau) |
| `TIKTOK_CLIENT_SECRET` | Mới |
| `TIKTOK_ACCESS_TOKEN` | Mới |
| `TIKTOK_REFRESH_TOKEN` | Mới |
| `TIKTOK_DEFAULT_PRIVACY` | Mới |
| `topic_sources.gnews` | Mới — thay thế NewsAPI |
| `topic_sources.google_trends.geo` | Đổi từ `"US"` / `"IN"` sang `"VN"` |
| `VIDEO_WIDTH` / `VIDEO_HEIGHT` | Mới — explicit thay vì hardcoded |

### Keys thay đổi

| Key | v3 | v4 |
|---|---|---|
| `LLM_PROVIDER` | `"claude"`, `"gemini"`, `"openai"`, `"ollama"` | `"gemini"`, `"ollama"` (chỉ 2 options) |
| `TTS_PROVIDER` | `"edge"`, `"elevenlabs"`, `"openai"` | `"edge"`, `"elevenlabs"` (bỏ OpenAI TTS) |
| `topic_sources.newsapi` | Active | Deprecated — giữ optional, mặc định `enabled: false` |

### Migration script (pseudocode)

```python
def migrate_v3_to_v4(config_path: str = "~/.verticals/config.json"):
    """Migrate config.json từ v3 sang v4."""
    config = load_json(config_path)
    
    # 1. Backup
    backup_path = config_path + ".v3.bak"
    copy_file(config_path, backup_path)
    print(f"Backup: {backup_path}")
    
    # 2. Xóa keys không dùng
    removed = []
    for key in ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"]:
        if key in config:
            del config[key]
            removed.append(key)
    
    # 3. Rename NEWSAPI_KEY → giữ optional
    if "NEWSAPI_KEY" in config:
        # Giữ nhưng disable source
        config.setdefault("topic_sources", {})
        config["topic_sources"].setdefault("newsapi", {})
        config["topic_sources"]["newsapi"]["enabled"] = False
        print("NewsAPI: disabled, giữ key cho fallback")
    
    # 4. Set defaults cho keys mới
    config.setdefault("LLM_PROVIDER", "gemini")
    config.setdefault("OLLAMA_MODEL", "llama3.1")
    config.setdefault("TTS_PROVIDER", "edge")
    config.setdefault("EDGE_VOICE", "vi-VN-NamMinhNeural")
    config.setdefault("WHISPER_MODEL", "medium")
    config.setdefault("VIDEO_WIDTH", 1080)
    config.setdefault("VIDEO_HEIGHT", 1920)
    config.setdefault("TIKTOK_DEFAULT_PRIVACY", "SELF_ONLY")
    
    # 5. Setup GNews source
    sources = config.setdefault("topic_sources", {})
    sources.setdefault("gnews", {
        "enabled": True,
        "language": "vi",
        "country": "vn",
        "max_results": 10
    })
    
    # 6. Đổi Google Trends geo sang VN
    if "google_trends" in sources:
        sources["google_trends"]["geo"] = "VN"
    else:
        sources["google_trends"] = {"enabled": True, "geo": "VN"}
    
    # 7. Fix LLM_PROVIDER nếu đang dùng claude/openai
    if config.get("LLM_PROVIDER") in ("claude", "openai"):
        config["LLM_PROVIDER"] = "gemini"
        print(f"LLM_PROVIDER: đổi sang 'gemini'")
    
    # 8. Fix TTS_PROVIDER nếu đang dùng openai
    if config.get("TTS_PROVIDER") == "openai":
        config["TTS_PROVIDER"] = "edge"
        print(f"TTS_PROVIDER: đổi sang 'edge'")
    
    # 9. Lưu
    save_json(config_path, config)
    print(f"Migration hoàn tất. Removed: {removed}")
    print(f"Cần thêm thủ công: GNEWS_API_KEY (đăng ký tại gnews.io)")
```

Chạy migration:
```bash
python -m verticals config migrate
```

---

## Environment variables

Tất cả config keys đều có thể set qua env var cùng tên. Env var luôn override config.json.

### Danh sách env vars hỗ trợ

| Env Variable | Tương ứng config key | Ghi chú |
|---|---|---|
| `GEMINI_API_KEY` | `GEMINI_API_KEY` | **Bắt buộc** nếu chưa có trong config.json |
| `GNEWS_API_KEY` | `GNEWS_API_KEY` | **Bắt buộc** cho topic discovery |
| `ELEVENLABS_API_KEY` | `ELEVENLABS_API_KEY` | Optional |
| `TIKTOK_CLIENT_KEY` | `TIKTOK_CLIENT_KEY` | Optional |
| `TIKTOK_CLIENT_SECRET` | `TIKTOK_CLIENT_SECRET` | Optional |
| `TIKTOK_ACCESS_TOKEN` | `TIKTOK_ACCESS_TOKEN` | Optional |
| `TIKTOK_REFRESH_TOKEN` | `TIKTOK_REFRESH_TOKEN` | Optional |
| `LLM_PROVIDER` | `LLM_PROVIDER` | `"gemini"` hoặc `"ollama"` |
| `OLLAMA_MODEL` | `OLLAMA_MODEL` | Tên model Ollama |
| `TTS_PROVIDER` | `TTS_PROVIDER` | `"edge"` hoặc `"elevenlabs"` |
| `EDGE_VOICE` | `EDGE_VOICE` | Voice ID |
| `WHISPER_MODEL` | `WHISPER_MODEL` | `"tiny"` / `"base"` / `"small"` / `"medium"` / `"large"` |
| `VIDEO_WIDTH` | `VIDEO_WIDTH` | Số nguyên |
| `VIDEO_HEIGHT` | `VIDEO_HEIGHT` | Số nguyên |
| `TIKTOK_DEFAULT_PRIVACY` | `TIKTOK_DEFAULT_PRIVACY` | Privacy level |

### Ví dụ sử dụng

```bash
# Override tạm thời khi dev
GEMINI_API_KEY=AIza... python -m verticals run --niche tech

# Dùng Ollama local thay vì Gemini
LLM_PROVIDER=ollama OLLAMA_MODEL=llama3.1 python -m verticals run --niche tech

# OpenClaw automation — truyền secrets qua env
export GEMINI_API_KEY=AIza...
export GNEWS_API_KEY=abc123...
python -m verticals run --niche tech --auto
```

> **Lưu ý:** `topic_sources` object **không** hỗ trợ env var (quá phức tạp). Phải cấu hình trong config.json hoặc niche YAML.

---

## Checklist

- [ ] Schema mới hoạt động: `python -m verticals config show` hiện đúng tất cả keys
- [ ] Key resolution order đúng: env var > config.json > default
- [ ] Migration script chạy được: `python -m verticals config migrate` không lỗi
- [ ] Backup config v3 trước khi migrate
- [ ] API key encryption hoạt động: keys lưu dạng `ENC:...` trong config.json
- [ ] Decrypt đúng trên cùng máy, fail trên máy khác
- [ ] Keys đã xóa: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` không còn trong config
- [ ] Keys mới có default hợp lý: `LLM_PROVIDER=gemini`, `TTS_PROVIDER=edge`, `EDGE_VOICE=vi-VN-NamMinhNeural`
- [ ] `topic_sources.gnews` enabled mặc định với `lang=vi`, `country=vn`
- [ ] `topic_sources.google_trends.geo` đổi sang `"VN"`
- [ ] TikTok keys optional — không block pipeline nếu thiếu
- [ ] Env var override hoạt động cho tất cả scalar keys
- [ ] `--format json` cho `config show` output machine-readable (cho OpenClaw)

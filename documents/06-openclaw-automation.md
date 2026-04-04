# OpenClaw Automation — Bot tự động hóa

## Mục tiêu

Tích hợp OpenClaw làm bot tự động hóa pipeline. OpenClaw gọi CLI commands theo schedule để:
1. Tìm tin tức trending
2. Tạo video tự động
3. Upload lên TikTok

Toàn bộ quy trình chạy hands-free, user chỉ cần monitor qua dashboard.

---

## OpenClaw là gì

OpenClaw là một agent tự động hóa, đóng vai trò **thay thế con người** trong việc:
- **Tìm ý tưởng**: Discover trending topics, chọn topic phù hợp niche
- **Viết nội dung**: Trigger pipeline tạo script + video tự động  
- **Xuất bản**: Export video sẵn sàng upload (TikTok upload thủ công ban đầu)

OpenClaw hoạt động bằng cách gọi CLI commands theo schedule, parse output JSON, và quyết định bước tiếp theo. Nó không cần biết chi tiết bên trong pipeline — chỉ cần CLI interface rõ ràng.

---

## Workflow tự động

### Flow chính

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  OpenClaw    │────▶│  Discover    │────▶│  Generate    │────▶│  Upload      │
│  Trigger     │     │  Topics      │     │  Video       │     │  to TikTok   │
│  (schedule)  │     │  (CLI)       │     │  (CLI)       │     │  (CLI)       │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                          │                     │                     │
                          ▼                     ▼                     ▼
                    topic list            video .mp4            tiktok URL
```

### CLI commands mà OpenClaw gọi

#### Bước 1: Tìm topics trending

```bash
python -m verticals topics --niche tech --limit 5 --format json
```

Output:
```json
[
  {"title": "OpenAI ra mắt GPT-5", "source": "reddit", "score": 0.92},
  {"title": "Việt Nam cấm deepfake", "source": "newsapi", "score": 0.85}
]
```

#### Bước 2: Chọn topic và tạo video

```bash
# Auto-pick topic tốt nhất và chạy full pipeline
python -m verticals run --niche tech --discover --auto-pick

# Hoặc chỉ định topic cụ thể
python -m verticals run --topic "OpenAI ra mắt GPT-5" --niche tech
```

#### Bước 3: Upload (nếu chưa auto-upload)

```bash
python -m verticals upload --draft ~/.verticals/drafts/<job_id>.json
```

### One-liner cho OpenClaw

```bash
# Full pipeline: discover → pick → generate (upload thủ công sau)
python -m verticals run --niche tech --discover --auto-pick --format json --quiet

# Khi có TikTok API (phase sau):
# python -m verticals run --niche tech --discover --auto-pick --auto-upload
```

---

## Schedule configurations

### Ví dụ schedules

| Schedule | Cron | Niche | Mô tả |
|---|---|---|---|
| Tech sáng | `0 8 * * *` | tech | Tin tech mỗi sáng 8h |
| Tech chiều | `0 14 * * *` | tech | Tin tech mỗi chiều 14h |
| Finance ngày | `0 9 * * 1-5` | finance | Tin tài chính ngày làm việc |
| Gaming tối | `0 20 * * *` | gaming | Tin gaming mỗi tối |

### Config file cho OpenClaw

```yaml
# openclaw-config.yaml
name: verticals-bot
description: Tự động tạo video TikTok từ tin tức trending

schedules:
  - name: tech-morning
    cron: "0 8 * * *"
    command: python -m verticals run --niche tech --discover --auto-pick --auto-upload
    on_failure: retry 2
    notify: log

  - name: tech-afternoon  
    cron: "0 14 * * *"
    command: python -m verticals run --niche tech --discover --auto-pick --auto-upload
    on_failure: retry 2
    notify: log

  - name: finance-weekday
    cron: "0 9 * * 1-5"
    command: python -m verticals run --niche finance --discover --auto-pick --auto-upload
    on_failure: skip
    notify: log
```

---

## CLI enhancements cần thiết

### Thêm flags mới cho automation

```bash
python -m verticals run \
  --niche tech \
  --discover \           # Tự tìm topic
  --auto-pick \          # LLM chọn topic tốt nhất
  --auto-upload \        # Upload sau khi tạo xong
  --format json \        # Output JSON cho machine parsing
  --quiet                # Không interactive prompts
```

### Output format cho machine parsing

```bash
# --format json flag
python -m verticals run --niche tech --discover --auto-pick --format json
```

Output:
```json
{
  "status": "success",
  "video_id": "1775201671",
  "topic": "OpenAI ra mắt GPT-5",
  "video_path": "/home/user/.verticals/media/verticals_1775201671.mp4",
  "tiktok_url": "https://tiktok.com/@user/video/123",
  "duration": 73.15,
  "stages": {
    "research": {"status": "done", "duration": 3.2},
    "draft": {"status": "done", "duration": 8.1},
    "broll": {"status": "done", "duration": 45.0},
    "voiceover": {"status": "done", "duration": 12.0},
    "captions": {"status": "done", "duration": 30.0},
    "music": {"status": "done", "duration": 2.5},
    "assemble": {"status": "done", "duration": 15.0},
    "thumbnail": {"status": "done", "duration": 3.0}
  }
}
```

### Error output

```json
{
  "status": "failed",
  "video_id": "1775201671",
  "error": "Edge TTS failed: 403",
  "failed_stage": "voiceover",
  "stages": {
    "research": {"status": "done"},
    "draft": {"status": "done"},
    "broll": {"status": "done"},
    "voiceover": {"status": "failed", "error": "Edge TTS failed: 403"}
  }
}
```

---

## Integration với Dashboard

### API endpoint cho schedule management

Dashboard gọi FastAPI backend để CRUD schedules:
- Tạo schedule → backend lưu vào SQLite + báo OpenClaw
- OpenClaw đọc schedule từ DB hoặc config file
- Kết quả mỗi lần chạy ghi vào `pipeline_runs` table
- Dashboard hiển thị history + status

### Notification khi hoàn thành

OpenClaw có thể gửi notification qua:
1. **Dashboard WebSocket** — Push event "video ready" → hiện trong Video Gallery
2. **Log file** — Ghi vào `~/.verticals/logs/`
3. **Telegram bot** (optional) — Gửi tin nhắn kèm video path + caption để user upload thủ công

### API endpoints mà OpenClaw sử dụng

| Endpoint | Mục đích |
|---|---|
| `POST /api/pipeline/run` | Trigger pipeline mới (nếu gọi qua API thay CLI) |
| `GET /api/pipeline/status/{id}` | Kiểm tra tiến trình |
| `GET /api/videos` | Liệt kê videos đã tạo |
| `POST /api/schedules` | Đăng ký schedule mới |

> **Lưu ý**: OpenClaw chủ yếu gọi CLI trực tiếp. API endpoints dùng khi tích hợp sâu hơn với dashboard.

---

## Conflict handling

### Khi 2 jobs chạy cùng lúc

```
Job A: tech 8:00 → đang chạy broll (45s)
Job B: finance 8:01 → trigger

Giải pháp: Queue
- Job B chờ Job A xong
- Hoặc chạy song song nếu đủ resource (khác work_dir)
```

### Lock mechanism

Dùng thư viện `filelock` (cross-platform, atomic, không race condition):

```python
from filelock import FileLock, Timeout

LOCK_FILE = SKILL_DIR / ".pipeline.lock"
lock = FileLock(LOCK_FILE, timeout=5)  # chờ 5s trước khi fail

def run_pipeline_with_lock(**kwargs):
    try:
        with lock:
            run_pipeline(**kwargs)
    except Timeout:
        raise RuntimeError("Pipeline khác đang chạy. Chờ hoặc dùng --force")
```

Thêm `filelock>=3.16.0` vào dependencies.

---

## Checklist

- [ ] `--auto-upload` flag hoạt động trong CLI (phase sau, khi có TikTok API)
- [ ] `--format json` output machine-readable JSON
- [ ] `--quiet` không có interactive prompts
- [ ] OpenClaw config file (`openclaw-config.yaml`) đã tạo
- [ ] One-liner `run --discover --auto-pick --auto-upload` chạy end-to-end
- [ ] File lock ngăn 2 pipeline chạy cùng lúc
- [ ] Dashboard hiển thị schedule history
- [ ] Error retry hoạt động (2 lần)

# FastAPI Backend — API Specification

## Mục tiêu

Xây dựng API layer giữa React dashboard và Python pipeline.
Cung cấp REST endpoints + WebSocket cho real-time updates.

---

## Tech Stack

| Component | Technology |
|---|---|
| Framework | FastAPI |
| ASGI server | Uvicorn |
| Database | SQLite WAL mode (via aiosqlite) |
| WebSocket | FastAPI WebSocket |
| CORS | FastAPI CORSMiddleware |
| Background tasks | FastAPI BackgroundTasks hoặc asyncio |

### Dependencies mới

```
fastapi>=0.115.0
uvicorn[standard]>=0.34.0
aiosqlite>=0.20.0
python-multipart
cryptography>=44.0.0          # Encrypt API keys at rest
```

---

## Database Schema (SQLite)

### Bảng `videos`

```sql
CREATE TABLE videos (
    id          TEXT PRIMARY KEY,    -- job_id (timestamp)
    topic       TEXT NOT NULL,
    niche       TEXT DEFAULT 'general',
    title       TEXT,
    caption     TEXT,
    hashtags    TEXT,
    script      TEXT,
    broll_prompts TEXT,             -- JSON array
    video_path  TEXT,
    thumbnail_path TEXT,
    draft_path  TEXT,
    duration    REAL,               -- seconds
    file_size   INTEGER,            -- bytes
    tiktok_url  TEXT,               -- URL sau khi upload
    status      TEXT DEFAULT 'draft', -- draft | producing | ready | uploaded | failed
    created_at  TEXT DEFAULT (datetime('now')),
    uploaded_at TEXT
);
```

### Bảng `pipeline_runs`

```sql
CREATE TABLE pipeline_runs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id    TEXT REFERENCES videos(id),
    stage       TEXT NOT NULL,       -- research, draft, broll, voiceover, captions, music, assemble, thumbnail
    status      TEXT DEFAULT 'pending', -- pending | running | done | failed
    started_at  TEXT,
    finished_at TEXT,
    error       TEXT,
    artifacts   TEXT                 -- JSON dict
);
```

### Bảng `schedules`

```sql
CREATE TABLE schedules (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    cron_expr   TEXT NOT NULL,       -- "0 8,14 * * *"
    niche       TEXT DEFAULT 'tech',
    action      TEXT DEFAULT 'full', -- full (discover+gen+upload) | draft_only
    is_active   INTEGER DEFAULT 1,
    last_run_at TEXT,
    next_run_at TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
);
```

### SQLite Configuration

```python
# Bật WAL mode để hỗ trợ concurrent reads + single writer
# Quan trọng khi API server + OpenClaw có thể write cùng lúc
async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA busy_timeout=5000")  # 5s retry khi locked
        await db.execute("PRAGMA foreign_keys=ON")
        await db.executescript(SCHEMA)
```

### API Key Storage

API keys lưu trong `~/.verticals/config.json` được encrypt bằng Fernet (symmetric encryption).
Key encryption sinh từ machine-specific secret (hostname + username hash).

```python
# Khi đọc settings qua API: mask keys
# "AIzaSy..." → "AIza••••••••"
# Chỉ hiện full key khi user click "Show" (yêu cầu confirm)
```

---

## REST API Endpoints

### Videos

```
GET    /api/videos                  → List videos (pagination, filter)
GET    /api/videos/{id}             → Video detail + metadata
GET    /api/videos/{id}/file        → Serve video file (.mp4)
GET    /api/videos/{id}/thumbnail   → Serve thumbnail (.png)
DELETE /api/videos/{id}             → Delete video + files
```

#### `GET /api/videos`

Query params:
- `niche` (optional): Filter theo niche
- `status` (optional): Filter theo status
- `limit` (default 20): Số lượng
- `offset` (default 0): Pagination

Response:
```json
{
  "videos": [
    {
      "id": "1775201671",
      "topic": "AI thay thế lập trình viên",
      "niche": "tech",
      "title": "AI Agents Đang Thay Thế Dev Junior",
      "status": "uploaded",
      "duration": 73.15,
      "file_size": 11252847,
      "tiktok_url": "https://tiktok.com/@user/video/123",
      "created_at": "2026-04-03T14:34:00"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

#### `GET /api/videos/{id}`

Response: Full video object bao gồm script, caption, hashtags, broll_prompts.

#### `GET /api/videos/{id}/file`

Response: `FileResponse` — stream file .mp4 cho video player.

---

### Pipeline

```
POST   /api/pipeline/run            → Bắt đầu pipeline mới
POST   /api/pipeline/upload/{id}    → Upload video lên TikTok
GET    /api/pipeline/status/{id}    → Status hiện tại
POST   /api/pipeline/cancel/{id}    → Cancel pipeline đang chạy
```

#### `POST /api/pipeline/run`

Request:
```json
{
  "topic": "AI thay thế lập trình viên năm 2026",
  "niche": "tech",
  "provider": "gemini",
  "auto_upload": false
}
```

Response:
```json
{
  "video_id": "1775201671",
  "status": "started",
  "message": "Pipeline đã bắt đầu. Theo dõi qua WebSocket."
}
```

Pipeline chạy trong background task. Progress gửi qua WebSocket.

---

### Topics

```
GET    /api/topics/discover         → Tìm trending topics
```

#### `GET /api/topics/discover`

Query params:
- `niche` (default "tech")
- `limit` (default 10)

Response:
```json
{
  "topics": [
    {
      "title": "OpenAI ra mắt GPT-5",
      "source": "reddit",
      "trending_score": 0.92,
      "summary": "...",
      "url": "https://..."
    }
  ]
}
```

### Media Assets

> **Lưu ý**: B-roll (Gemini Imagen), music (local MP3), và thumbnail (Gemini Imagen + Pillow) 
> được xử lý bên trong pipeline stages, không expose qua API riêng.
> Dashboard xem kết quả qua `GET /api/videos/{id}` (thumbnail_path, video_path).

---

### Schedule

```
GET    /api/schedules               → List schedules
POST   /api/schedules               → Tạo schedule mới
PUT    /api/schedules/{id}          → Update schedule
DELETE /api/schedules/{id}          → Xóa schedule
POST   /api/schedules/{id}/toggle   → Bật/tắt schedule
```

---

### Settings

```
GET    /api/settings                → Đọc config (mask API keys — "AIza••••")
PUT    /api/settings                → Update config (encrypt keys trước khi lưu)
```

---

## WebSocket

### Endpoint: `ws://localhost:8000/ws/pipeline/{video_id}`

Client connect khi pipeline bắt đầu, nhận events:

```json
{"event": "stage_start", "stage": "research", "timestamp": "..."}
{"event": "stage_done",  "stage": "research", "duration": 3.2}
{"event": "stage_start", "stage": "draft"}
{"event": "stage_done",  "stage": "draft", "duration": 8.1}
{"event": "stage_start", "stage": "broll", "progress": "1/3"}
{"event": "stage_progress", "stage": "broll", "progress": "2/3"}
{"event": "stage_done",  "stage": "broll", "duration": 45.0}
{"event": "stage_start", "stage": "voiceover"}
{"event": "stage_done",  "stage": "voiceover", "duration": 12.0}
{"event": "stage_start", "stage": "captions"}
{"event": "stage_done",  "stage": "captions", "duration": 30.0}
{"event": "stage_start", "stage": "music"}
{"event": "stage_done",  "stage": "music", "duration": 2.5}
{"event": "stage_start", "stage": "assemble"}
{"event": "stage_done",  "stage": "assemble", "duration": 15.0}
{"event": "stage_start", "stage": "thumbnail"}
{"event": "stage_done",  "stage": "thumbnail", "duration": 3.0}
{"event": "pipeline_done", "video_id": "1775201671", "video_path": "..."}
{"event": "pipeline_error", "stage": "voiceover", "error": "Edge TTS failed"}
```

## Pipeline Integration

### Kết nối FastAPI ↔ Pipeline

Pipeline stages emit events thông qua callback function:

```python
# verticals/api/routers/pipeline.py
async def run_pipeline_with_events(video_id: str, ws_manager: WebSocketManager, **kwargs):
    """Chạy pipeline với WebSocket event emission."""
    
    def on_stage_change(stage: str, status: str, **extra):
        event = {"event": f"stage_{status}", "stage": stage, **extra}
        asyncio.run_coroutine_threadsafe(
            ws_manager.broadcast(video_id, event),
            loop
        )
    
    # Pipeline chạy trong thread riêng (blocking I/O)
    await asyncio.to_thread(
        run_full_pipeline,
        on_stage_change=on_stage_change,
        **kwargs
    )
```

### State sync

- Mỗi stage complete → update `pipeline_runs` table + emit WebSocket event
- Pipeline fail → update video status to "failed" + emit `pipeline_error`
- Pipeline done → update video status to "ready" + emit `pipeline_done`

---

## Error Handling

### HTTP Error Response Format

Tất cả endpoints trả về error dưới dạng JSON thống nhất:

```json
{
  "error": true,
  "code": "PIPELINE_RUNNING",
  "message": "Pipeline đang chạy. Chờ hoàn thành hoặc cancel trước.",
  "details": {}
}
```

### HTTP Status Codes

| Code | Ý nghĩa | Ví dụ |
|---|---|---|
| 200 | Success | GET /api/videos |
| 201 | Created | POST /api/pipeline/run |
| 400 | Bad request | Thiếu required field |
| 404 | Not found | Video ID không tồn tại |
| 409 | Conflict | Pipeline đang chạy (locked) |
| 422 | Validation error | FastAPI auto-validation |
| 500 | Internal error | Pipeline crash, LLM timeout |
| 503 | Service unavailable | Gemini API down, rate limit exceeded |

### Retry Strategy

Pipeline stages sử dụng `@with_retry` decorator (exponential backoff):
- Lần 1: chờ 2s
- Lần 2: chờ 4s  
- Lần 3: chờ 8s
- Sau 3 lần: fail stage, emit `pipeline_error` event

API endpoints KHÔNG retry — client (dashboard/OpenClaw) tự quyết định retry.

---

## Project Structure

```
verticals/
├── api/
│   ├── __init__.py
│   ├── main.py             # FastAPI app, CORS, lifespan
│   ├── database.py         # SQLite connection, migrations
│   ├── models.py           # Pydantic models (request/response)
│   ├── routers/
│   │   ├── videos.py       # /api/videos
│   │   ├── pipeline.py     # /api/pipeline
│   │   ├── topics.py       # /api/topics
│   │   ├── schedules.py    # /api/schedules
│   │   └── settings.py     # /api/settings
│   └── websocket.py        # WebSocket manager
```

### Chạy server

```bash
# Development
python -m verticals api --port 8000

# Hoặc trực tiếp
uvicorn verticals.api.main:app --reload --port 8000
```

---

## CORS Config

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Checklist

- [ ] FastAPI app khởi động, health check `/api/health` trả 200
- [ ] SQLite database tự tạo tables khi startup
- [ ] `GET /api/videos` trả list videos từ DB
- [ ] `GET /api/videos/{id}/file` stream video cho player
- [ ] `POST /api/pipeline/run` trigger pipeline trong background
- [ ] WebSocket gửi progress events real-time
- [ ] `GET /api/topics/discover` trả trending topics
- [ ] Schedule CRUD hoạt động
- [ ] CORS cho phép React dev server connect

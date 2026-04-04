# Deployment & Setup Guide — Verticals v4

## Muc tieu

Huong dan cai dat va chay toan bo he thong Verticals v4 — tu CLI pipeline, FastAPI backend, React dashboard den OpenClaw bot tu dong hoa. Sau khi hoan thanh guide nay, ban se co mot he thong hoan chinh de tao video TikTok tieng Viet tu dong.

---

## Prerequisites

### Yeu cau he thong

| Component | Version | Ly do |
|---|---|---|
| Python | 3.11+ | asyncio improvements, Whisper compatibility |
| Node.js | 20+ | React 19, Vite 6 |
| ffmpeg + ffprobe | 6.0+ | Video assembly, audio processing |
| Whisper | openai-whisper | Caption generation (can Python 3.11) |
| SQLite | 3.35+ | WAL mode, RETURNING clause |
| Git | 2.30+ | Clone repo, version control |

### Cai dat prerequisites

#### Python 3.11+

```bash
# Windows (winget)
winget install Python.Python.3.11

# macOS (Homebrew)
brew install python@3.11

# Linux (Ubuntu/Debian)
sudo apt update && sudo apt install python3.11 python3.11-venv python3.11-dev
```

Kiem tra:
```bash
python --version
# Python 3.11.x hoac cao hon
```

#### Node.js 20+

```bash
# Windows (winget)
winget install OpenJS.NodeJS.LTS

# macOS (Homebrew)
brew install node@20

# Linux (nvm — khuyen dung)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install 20
nvm use 20
```

Kiem tra:
```bash
node --version
# v20.x.x hoac cao hon

npm --version
# 10.x.x
```

#### ffmpeg + ffprobe

```bash
# Windows (winget)
winget install Gyan.FFmpeg

# Windows (choco)
choco install ffmpeg

# macOS
brew install ffmpeg

# Linux (Ubuntu/Debian)
sudo apt install ffmpeg
```

Kiem tra:
```bash
ffmpeg -version
ffprobe -version
```

> **Luu y:** Ca hai lenh `ffmpeg` va `ffprobe` deu phai co trong PATH. Tren Windows, neu cai tu winget, restart terminal sau khi cai.

#### Whisper (openai-whisper)

Whisper duoc cai cung voi pipeline dependencies (xem phan tiep theo). Neu muon cai rieng:

```bash
pip install openai-whisper
```

> **Luu y:** Lan chay dau tien, Whisper se tai model (~1.5GB cho `base`). Dam bao co ket noi internet va du dung luong o dia.

#### SQLite

SQLite thuong co san trong Python va he dieu hanh. Kiem tra version:

```bash
python -c "import sqlite3; print(sqlite3.sqlite_version)"
# 3.35.0 hoac cao hon
```

Neu version thap hon 3.35, cap nhat Python len 3.11+ (da bao gom SQLite moi).

---

## Cai dat Pipeline (Python)

### Buoc 1: Clone repository

```bash
git clone https://github.com/h1dr0n/video-shorts-pipeline.git
cd video-shorts-pipeline
```

### Buoc 2: Tao virtual environment

```bash
# Tao venv
python -m venv .venv

# Kich hoat venv
# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# Windows (cmd)
.venv\Scripts\activate.bat

# Windows (Git Bash)
source .venv/Scripts/activate

# macOS/Linux
source .venv/bin/activate
```

### Buoc 3: Cai dat dependencies

```bash
pip install -e .
```

Hoac cai tu requirements.txt:

```bash
pip install -r requirements.txt
```

### Buoc 4: Verify cai dat

```bash
# Kiem tra pipeline co chay duoc khong
python -m verticals --help

# Kiem tra ffmpeg
ffmpeg -version

# Kiem tra ffprobe
ffprobe -version

# Kiem tra Whisper
python -c "import whisper; print('Whisper OK')"
```

---

## Cau hinh

### Tao config.json

Config file nam tai `~/.verticals/config.json`. Tao thu cong hoac de pipeline tu tao khi chay lan dau.

```bash
# Tao thu muc config
# Windows
mkdir %USERPROFILE%\.verticals

# macOS/Linux
mkdir -p ~/.verticals
```

### Config toi thieu

Tao file `~/.verticals/config.json` voi noi dung:

```json
{
  "_comment": "Verticals v4 — Vietnamese TikTok Pipeline Config",

  "GEMINI_API_KEY": "AIza...",
  "GNEWS_API_KEY": "",

  "LLM_PROVIDER": "gemini",

  "TTS_PROVIDER": "edge",
  "EDGE_VOICE": "vi-VN-NamMinhNeural"
}
```

### API keys can thiet

| Key | Bat buoc | Cach lay |
|---|---|---|
| `GEMINI_API_KEY` | Co | [Google AI Studio](https://aistudio.google.com/apikey) |
| `GNEWS_API_KEY` | Khong (nhung nen co) | [GNews.io](https://gnews.io/) — free tier 100 req/ngay |
| `ELEVENLABS_API_KEY` | Khong | [ElevenLabs](https://elevenlabs.io/) — chi khi dung ElevenLabs TTS |
| `TIKTOK_CLIENT_KEY` | Khong (cho upload) | [TikTok Developer Portal](https://developers.tiktok.com/) |

### Override bang environment variables

Moi key trong config.json deu co the override bang env var:

```bash
# Windows (PowerShell)
$env:GEMINI_API_KEY = "AIza..."

# macOS/Linux
export GEMINI_API_KEY="AIza..."
```

Thu tu uu tien: **Environment variable > config.json > Default value**

> Xem chi tiet tai [08-config-schema.md](08-config-schema.md) de biet day du cac key va giai thich.

---

## Chay CLI

### Cac lenh co ban

```bash
# Tim topics trending
python -m verticals topics --niche tech --limit 5

# Tao draft (script) tu topic
python -m verticals draft --topic "AI thay doi giao duc tai Viet Nam" --niche tech

# Tao video hoan chinh tu draft
python -m verticals produce --draft output/drafts/latest.json

# Chay full pipeline (discover topic + tao video)
python -m verticals run --niche tech --discover --auto-pick
```

### Output

Video va assets duoc luu tai:

```
output/
  drafts/         # JSON draft files
  videos/         # MP4 video files
  thumbnails/     # PNG thumbnail files
  audio/          # TTS audio files
```

---

## Cai dat FastAPI Backend

### Buoc 1: Cai dat dependencies bo sung

```bash
# Trong venv da kich hoat
pip install fastapi uvicorn[standard] aiosqlite python-multipart cryptography
```

Hoac neu project co extras:

```bash
pip install -e ".[api]"
```

### Buoc 2: Khoi tao database

Database SQLite duoc tu dong tao khi FastAPI khoi dong lan dau:

```bash
# File database se nam tai
# ~/.verticals/verticals.db
```

Neu muon khoi tao thu cong:

```bash
python -m verticals.api.db init
```

### Buoc 3: Khoi dong server

```bash
# Development (co auto-reload)
uvicorn verticals.api.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn verticals.api.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Buoc 4: Kiem tra

```bash
# Health check
curl http://localhost:8000/health

# API docs (tu dong tu FastAPI)
# Mo browser: http://localhost:8000/docs
```

---

## Cai dat React Dashboard

### Buoc 1: Cai dat dependencies

```bash
cd dashboard
npm install
```

### Buoc 2: Cau hinh ket noi backend

Tao file `dashboard/.env.local`:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```

### Buoc 3: Chay dev server

```bash
npm run dev
```

Dashboard se chay tai `http://localhost:5173`

### Buoc 4: Build cho production

```bash
npm run build
# Output: dashboard/dist/
```

> **Luu y:** Trong production, co the serve static files tu FastAPI hoac dung Nginx/Caddy reverse proxy.

---

## Chay toan bo he thong

### Thu tu khoi dong

```
┌──────────────────────────────────────────────────────────────┐
│                     Startup Sequence                          │
│                                                              │
│  Step 1: FastAPI Backend (port 8000)                         │
│  ┌─────────────────────────────────────┐                     │
│  │ uvicorn verticals.api.main:app      │                     │
│  │ --reload --port 8000                │                     │
│  └──────────────┬──────────────────────┘                     │
│                 │ SQLite DB auto-init                         │
│                 ▼                                             │
│  Step 2: React Dashboard (port 5173)                         │
│  ┌─────────────────────────────────────┐                     │
│  │ cd dashboard && npm run dev         │                     │
│  │ Connects to :8000 via HTTP/WS      │─────┐               │
│  └─────────────────────────────────────┘     │               │
│                                              │ HTTP/WS       │
│  Step 3: OpenClaw Bot (optional)             ▼               │
│  ┌─────────────────────────────────────┐  ┌──────────┐      │
│  │ openclaw start                      │  │ FastAPI  │      │
│  │ Reads schedule, calls CLI commands  │─▶│ Backend  │      │
│  └─────────────────────────────────────┘  └──────────┘      │
│                                              │               │
│                                              ▼               │
│                                        ┌──────────┐         │
│                                        │ SQLite   │         │
│                                        │ Database │         │
│                                        └──────────┘         │
└──────────────────────────────────────────────────────────────┘
```

### Cach ket noi giua cac component

| Tu | Den | Giao thuc | Muc dich |
|---|---|---|---|
| React Dashboard | FastAPI | HTTP REST | CRUD videos, drafts, settings |
| React Dashboard | FastAPI | WebSocket | Pipeline progress real-time |
| OpenClaw Bot | CLI Pipeline | subprocess | Goi `python -m verticals` commands |
| FastAPI | CLI Pipeline | Python import | Goi pipeline functions truc tiep |
| FastAPI | SQLite | aiosqlite | Luu tru du lieu |

### Script khoi dong nhanh

Tao file `start-dev.sh` (macOS/Linux):

```bash
#!/bin/bash
# Terminal 1: FastAPI
uvicorn verticals.api.main:app --reload --port 8000 &
FASTAPI_PID=$!

# Doi FastAPI khoi dong
sleep 2

# Terminal 2: React Dashboard
cd dashboard && npm run dev &
REACT_PID=$!

echo "FastAPI: http://localhost:8000"
echo "Dashboard: http://localhost:5173"
echo "API Docs: http://localhost:8000/docs"

# Cleanup on exit
trap "kill $FASTAPI_PID $REACT_PID" EXIT
wait
```

Tren Windows (PowerShell):

```powershell
# Terminal 1
Start-Process -NoNewWindow powershell -ArgumentList "uvicorn verticals.api.main:app --reload --port 8000"

# Terminal 2
Start-Process -NoNewWindow powershell -ArgumentList "cd dashboard; npm run dev"
```

---

## Database Initialization

### Tu dong tao

SQLite database duoc tu dong tao khi FastAPI khoi dong lan dau. File database:

```
~/.verticals/verticals.db
```

### WAL Mode

Database su dung WAL (Write-Ahead Logging) mode de:
- Cho phep doc va ghi dong thoi (concurrent reads + writes)
- Hieu suat tot hon voi nhieu ket noi (FastAPI async)

WAL mode duoc bat tu dong khi init database:

```sql
PRAGMA journal_mode=WAL;
PRAGMA busy_timeout=5000;
```

### Reset database

Neu can xoa va tao lai database:

```bash
# Xoa file database
rm ~/.verticals/verticals.db

# Khoi dong lai FastAPI — database se tu dong tao lai
uvicorn verticals.api.main:app --reload --port 8000
```

---

## OpenClaw Bot Setup

### Buoc 1: Tao config file

Tao file `openclaw-config.yaml`:

```yaml
name: verticals-bot
schedule:
  discover: "0 8,14,20 * * *"     # Tim topics luc 8h, 14h, 20h
  generate: "30 8,14,20 * * *"    # Tao video 30 phut sau discover

niche: tech
videos_per_run: 2

commands:
  discover: "python -m verticals topics --niche {niche} --limit 5 --format json"
  generate: "python -m verticals run --niche {niche} --discover --auto-pick"

working_directory: "/path/to/video-shorts-pipeline"

environment:
  GEMINI_API_KEY: "${GEMINI_API_KEY}"
  GNEWS_API_KEY: "${GNEWS_API_KEY}"
```

### Buoc 2: Test voi mot lenh don

```bash
# Test discover topics
openclaw run --config openclaw-config.yaml --command discover --once

# Test full pipeline (1 video)
openclaw run --config openclaw-config.yaml --command generate --once
```

### Buoc 3: Chay bot theo schedule

```bash
# Chay bot (daemon mode)
openclaw start --config openclaw-config.yaml

# Kiem tra status
openclaw status
```

---

## Health Checks

### Kiem tra tung component

#### 1. CLI Pipeline

```bash
python -m verticals --help
# Neu in ra danh sach commands → OK
```

#### 2. FastAPI Backend

```bash
curl http://localhost:8000/health
# Expected: {"status": "ok", "version": "4.0.0"}

# Hoac mo browser:
# http://localhost:8000/docs → Swagger UI
```

#### 3. React Dashboard

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
# Expected: 200
```

Mo browser tai `http://localhost:5173` — nen thay dashboard voi sidebar navigation.

#### 4. WebSocket connection

Mo browser DevTools (F12) → Console:

```javascript
const ws = new WebSocket("ws://localhost:8000/ws");
ws.onopen = () => console.log("WebSocket connected!");
ws.onmessage = (e) => console.log("Message:", e.data);
```

#### 5. Database

```bash
python -c "
import sqlite3
conn = sqlite3.connect('$HOME/.verticals/verticals.db')
print('Tables:', [r[0] for r in conn.execute(\"SELECT name FROM sqlite_master WHERE type='table'\").fetchall()])
print('WAL mode:', conn.execute('PRAGMA journal_mode').fetchone()[0])
conn.close()
"
```

#### 6. OpenClaw Bot

```bash
openclaw status
# Hoac kiem tra log file
tail -f ~/.openclaw/logs/verticals-bot.log
```

---

## Development Workflow

### Hot reload

| Component | Hot reload | Lenh |
|---|---|---|
| React Dashboard | Co (Vite HMR) | `npm run dev` — tu dong reload khi save file |
| FastAPI Backend | Co (--reload flag) | `uvicorn ... --reload` — tu dong restart khi save .py file |
| CLI Pipeline | Khong | Chay lai lenh sau khi thay doi code |
| OpenClaw Bot | Khong | Restart bot sau khi thay doi config |

### Chay tests

```bash
# Chay tat ca tests
python -m pytest

# Chay test cu the
python -m pytest tests/test_draft.py -v

# Chay test voi coverage
python -m pytest --cov=verticals --cov-report=html
```

### Code formatting

```bash
# Format code
ruff format .

# Lint
ruff check .

# Fix tu dong
ruff check --fix .
```

### Cau truc du an

```
video-shorts-pipeline/
  verticals/           # Python pipeline package
    __main__.py        # CLI entry point
    draft.py           # Draft generation
    broll.py           # B-roll sourcing
    tts.py             # Text-to-speech
    assemble.py        # Video assembly (ffmpeg)
    thumbnail.py       # Thumbnail generation
    llm.py             # LLM abstraction
    state.py           # Pipeline state management
    api/               # FastAPI backend
      main.py
      routes/
      db.py
  dashboard/           # React frontend
    src/
    package.json
    vite.config.ts
  output/              # Generated videos
  documents/           # Design docs
  config.json          # -> ~/.verticals/config.json
  pyproject.toml
  requirements.txt
```

---

## Troubleshooting

### 1. ffmpeg not found

**Trieu chung:**
```
FileNotFoundError: [Errno 2] No such file or directory: 'ffmpeg'
```

**Giai phap:**
```bash
# Kiem tra ffmpeg co trong PATH khong
which ffmpeg    # macOS/Linux
where ffmpeg    # Windows

# Neu khong co, cai lai va restart terminal
# Windows: them vao PATH thu cong neu can
# System Properties → Environment Variables → Path → Add ffmpeg/bin directory
```

### 2. Whisper model download that bai

**Trieu chung:**
```
ConnectionError: Failed to download model 'base'
```

**Giai phap:**
```bash
# Thu tai thu cong
python -c "import whisper; whisper.load_model('base')"

# Neu bi firewall chan, tai model file thu cong va dat vao:
# ~/.cache/whisper/

# Su dung model nho hon neu may yeu
# tiny (39MB) < base (74MB) < small (244MB) < medium (769MB) < large (1.5GB)
```

### 3. Port bi chiem (Address already in use)

**Trieu chung:**
```
ERROR: [Errno 98] Address already in use
```

**Giai phap:**
```bash
# Tim process dang dung port
# macOS/Linux
lsof -i :8000
kill -9 <PID>

# Windows (PowerShell)
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Hoac dung port khac
uvicorn verticals.api.main:app --port 8001
```

### 4. CORS errors tu React dashboard

**Trieu chung:**
```
Access to fetch at 'http://localhost:8000' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

**Giai phap:**

Kiem tra FastAPI da cau hinh CORSMiddleware:

```python
# verticals/api/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 5. SQLite version qua cu

**Trieu chung:**
```
OperationalError: near "RETURNING": syntax error
```

**Giai phap:**
```bash
# Kiem tra version
python -c "import sqlite3; print(sqlite3.sqlite_version)"

# Can 3.35+ cho RETURNING clause
# Cap nhat Python len 3.11+ (bao gom SQLite 3.39+)
```

### 6. Node.js version khong tuong thich

**Trieu chung:**
```
Error: React 19 requires Node.js 18.x or later
```

**Giai phap:**
```bash
# Kiem tra version
node --version

# Cap nhat voi nvm
nvm install 20
nvm use 20
```

### 7. Whisper chay cham (khong co GPU)

**Trieu chung:** Caption generation mat qua lau (>5 phut cho 1 video).

**Giai phap:**
```bash
# Su dung model nho hon
# Trong config.json:
# "WHISPER_MODEL": "tiny"   (nhanh nhat, do chinh xac thap hon)
# "WHISPER_MODEL": "base"   (can bang giua toc do va do chinh xac)

# Hoac cai dat CUDA support (neu co NVIDIA GPU)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

### 8. Gemini API rate limit

**Trieu chung:**
```
429 Too Many Requests: Resource has been exhausted
```

**Giai phap:**
- Doi vai phut va thu lai
- Kiem tra quota tai [Google AI Studio](https://aistudio.google.com/)
- Chuyen sang Ollama cho local development:
  ```json
  {
    "LLM_PROVIDER": "ollama",
    "OLLAMA_MODEL": "llama3.1"
  }
  ```

---

## Checklist xac nhan cai dat

Su dung checklist nay de dam bao moi thu da san sang:

### Prerequisites

- [ ] Python 3.11+ da cai (`python --version`)
- [ ] Node.js 20+ da cai (`node --version`)
- [ ] ffmpeg co trong PATH (`ffmpeg -version`)
- [ ] ffprobe co trong PATH (`ffprobe -version`)
- [ ] Git da cai (`git --version`)

### Pipeline

- [ ] Repository da clone
- [ ] Virtual environment da tao va kich hoat
- [ ] Dependencies da cai (`pip install -e .`)
- [ ] `python -m verticals --help` chay thanh cong
- [ ] Whisper import thanh cong (`python -c "import whisper"`)

### Cau hinh

- [ ] `~/.verticals/config.json` da tao
- [ ] `GEMINI_API_KEY` da set (hoac `OLLAMA_MODEL` neu dung Ollama)
- [ ] Test: `python -m verticals topics --niche tech --limit 3`

### FastAPI Backend

- [ ] FastAPI dependencies da cai
- [ ] Server khoi dong thanh cong (`uvicorn ... --port 8000`)
- [ ] Health check tra ve OK (`curl http://localhost:8000/health`)
- [ ] API docs truy cap duoc (`http://localhost:8000/docs`)
- [ ] Database da duoc tao tai `~/.verticals/verticals.db`

### React Dashboard

- [ ] `npm install` thanh cong trong `dashboard/`
- [ ] `.env.local` da cau hinh API URL
- [ ] `npm run dev` chay thanh cong
- [ ] Dashboard hien thi tai `http://localhost:5173`
- [ ] Ket noi WebSocket thanh cong (kiem tra trong DevTools)

### OpenClaw Bot (tuy chon)

- [ ] `openclaw-config.yaml` da tao
- [ ] Test discover: `openclaw run --command discover --once`
- [ ] Test generate: `openclaw run --command generate --once`

### Toan bo he thong

- [ ] FastAPI dang chay (port 8000)
- [ ] React Dashboard dang chay (port 5173)
- [ ] Dashboard hien thi du lieu tu backend
- [ ] Pipeline co the chay tu dashboard
- [ ] Video output xuat hien trong gallery

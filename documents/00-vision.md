# Verticals v4 — Vision & Architecture

## Mục tiêu

Verticals v4 chuyển từ một CLI tool đa ngôn ngữ, đa nền tảng sang một **hệ thống tự động hóa video ngắn tiếng Việt**, tập trung vào TikTok, với dashboard quản lý và bot tự động (OpenClaw).

## Thay đổi lớn so với v3

| v3 | v4 |
|---|---|
| 9 ngôn ngữ | Chỉ tiếng Việt |
| YouTube Shorts (chính) + TikTok/Reels (planned) | TikTok (chính) |
| Gradio web UI | React dashboard |
| 4 LLM providers (Claude, Gemini, GPT, Ollama) | Gemini Flash 2.5 + Ollama (bỏ Anthropic + OpenAI) |
| Chạy thủ công qua CLI | OpenClaw bot tự động hóa theo lịch |
| Tool cho cá nhân | Hệ thống production với monitoring |

## Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────┐
│                   React Dashboard                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ Video    │ │ Pipeline │ │ Schedule │ │ Settings   │ │
│  │ Gallery  │ │ Monitor  │ │ Manager  │ │            │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/WebSocket
┌────────────────────▼────────────────────────────────────┐
│                 FastAPI Backend                           │
│  /api/drafts  /api/videos  /api/pipeline  /api/schedule │
│  WebSocket: pipeline progress, logs streaming            │
└────────────────────┬────────────────────────────────────┘
                     │ Python calls
┌────────────────────▼────────────────────────────────────┐
│              Verticals Pipeline (Python)                  │
│  research → draft → broll → voiceover → captions →       │
│  music → assemble → thumbnail                            │
│                              ↓                           │
│                   TikTok Upload (thủ công)                │
└─────────────────────────────────────────────────────────┘
                     ▲
                     │ CLI calls
┌────────────────────┴────────────────────────────────────┐
│                    OpenClaw Bot                           │
│  Scheduled: discover topics → gen video → upload         │
│  Trigger: cron schedule hoặc webhook                     │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TailwindCSS |
| API | FastAPI + WebSocket |
| Pipeline | Python (giữ nguyên core) |
| TTS | Edge TTS (vi-VN-NamMinhNeural mặc định, chọn voice trong dashboard) |
| LLM | Gemini Flash 2.5 (chính), Ollama (local fallback) |
| Image Gen | Gemini Imagen (b-roll + thumbnail base images) |
| Music | Local MP3 library (music/ folder) + ffmpeg audio ducking |
| Captions | Whisper |
| Video | ffmpeg |
| Upload | TikTok (thủ công trước, API sau) |
| Automation | OpenClaw (CLI orchestration — discover ideas + generate content) |
| Database | SQLite WAL mode (video metadata, schedule history) |
| Topic Discovery | Reddit, RSS (VnExpress, Tuổi Trẻ), GNews API, pytrends (geo=VN) |

## Nguyên tắc thiết kế

1. **Vietnamese-first**: Mọi output (script, captions, metadata) đều tiếng Việt, không cần fallback ngôn ngữ khác
2. **TikTok-native**: Metadata, format, hashtags tối ưu cho TikTok, không cần hỗ trợ YouTube/Reels
3. **Automation-ready**: Pipeline có thể chạy hoàn toàn headless qua CLI, OpenClaw trigger theo schedule
4. **Dashboard = monitoring**: React dashboard để xem/quản lý, không phải để thay CLI
5. **Minimal dependencies**: Bỏ Anthropic SDK, OpenAI SDK, Google Auth (YouTube), giữ stack gọn

## Phân pha triển khai

| Phase | Nội dung | Ưu tiên |
|---|---|---|
| 1 | Cleanup: bỏ Anthropic, OpenAI, YouTube, ngôn ngữ khác, Gradio UI | Cao |
| 2 | Topic Engine nâng cấp: GNews, Vietnamese RSS, pytrends VN | Cao |
| 3 | FastAPI backend + React dashboard | Cao |
| 4 | OpenClaw automation (discover ideas → generate content → export) | Cao |
| 5 | TikTok upload tự động (API) | Thấp — upload thủ công trước |

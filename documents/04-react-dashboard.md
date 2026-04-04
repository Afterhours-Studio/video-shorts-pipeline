# React Dashboard — UI/UX Specification

## Mục tiêu

Thay thế Gradio UI bằng React dashboard chuyên nghiệp. Dashboard phục vụ 3 chức năng chính:
1. **Video Gallery** — Xem, quản lý video đã tạo + metadata
2. **Pipeline Monitor** — Theo dõi tiến trình tạo video real-time
3. **Schedule Manager** — Quản lý lịch chạy OpenClaw automation

---

## Tech Stack

| Component | Technology | Lý do |
|---|---|---|
| Framework | React 19 | Ecosystem lớn, component library phong phú |
| Build tool | Vite 6 | Nhanh, HMR tốt |
| Styling | TailwindCSS v4 | Utility-first, dễ customize |
| Routing | React Router v7 | Standard, loader/action pattern |
| Server state | TanStack Query (React Query) v5 | Cache, refetch, mutations cho API calls |
| Client state | Zustand | Nhẹ, đơn giản — cho UI state (sidebar, modals) |
| Video player | Vidstack | Modern, TypeScript-first, headless controls |
| HTTP client | ky (wrapper fetch) | Nhẹ hơn axios, retry built-in, TypeScript |
| WebSocket | native WebSocket | Nhận pipeline progress real-time |
| Icons | Lucide React | Nhẹ, đẹp, tree-shakeable |
| UI Components | shadcn/ui | Copy-paste components, không lock-in dependency |

---

## Layout

```
┌──────────────────────────────────────────────────────┐
│  Sidebar (fixed)          │  Main Content Area       │
│  ┌────────────────────┐   │                          │
│  │  Logo: Verticals   │   │  (thay đổi theo route)   │
│  │                    │   │                          │
│  │  📹 Videos         │   │                          │
│  │  ⚡ Pipeline       │   │                          │
│  │  📅 Schedule       │   │                          │
│  │  ⚙️ Settings       │   │                          │
│  │                    │   │                          │
│  │                    │   │                          │
│  │  ── Status ──      │   │                          │
│  │  Pipeline: Idle    │   │                          │
│  │  Videos: 42        │   │                          │
│  │  Next run: 14:00   │   │                          │
│  └────────────────────┘   │                          │
└──────────────────────────────────────────────────────┘
```

---

## Trang 1: Video Gallery (`/videos`)

### Chức năng
- Hiển thị grid các video đã tạo (thumbnail + metadata)
- Click vào video → xem chi tiết + player
- Filter theo niche, ngày tạo, trạng thái upload
- Search theo title/topic

### Video Card

```
┌──────────────────────────┐
│  ┌────────────────────┐  │
│  │                    │  │
│  │   Thumbnail        │  │
│  │   (click to play)  │  │
│  │                    │  │
│  │   ▶ 1:13           │  │
│  └────────────────────┘  │
│  AI thay thế lập trình... │
│  🏷 tech  📅 03/04/2026   │
│  📱 Uploaded ✓            │
└──────────────────────────┘
```

### Video Detail Modal/Page

```
┌─────────────────────────────────────────────┐
│  ┌──────────────────┐  Metadata             │
│  │                  │  Title: AI thay thế... │
│  │  Video Player    │  Niche: tech           │
│  │  (full controls) │  Tạo: 03/04/2026      │
│  │                  │  Duration: 1:13        │
│  │                  │  Size: 11 MB           │
│  └──────────────────┘  Status: Uploaded      │
│                        TikTok URL: ...       │
│  ┌──────────────────────────────────────┐   │
│  │ Script (full text, collapsible)      │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ Caption / Hashtags                   │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ B-roll Prompts                       │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  [Copy Caption]  [Delete]  [Open in TikTok]  │
└─────────────────────────────────────────────┘
```

---

## Trang 2: Pipeline (`/pipeline`)

### Chức năng
- Tạo video mới (nhập topic, chọn niche)
- Xem tiến trình real-time qua WebSocket
- History các pipeline runs

### Tạo video mới

```
┌─────────────────────────────────────────────┐
│  Tạo Video Mới                              │
│                                             │
│  Topic: [________________________________]  │
│  Niche: [tech ▼]                            │
│  LLM:   [gemini ▼]                          │
│                                             │
│  [🚀 Bắt đầu]   [🔍 Tìm topic trending]    │
└─────────────────────────────────────────────┘
```

### Pipeline Progress (WebSocket real-time)

```
┌─────────────────────────────────────────────┐
│  Pipeline: Đang chạy...                     │
│                                             │
│  ✅ Research        00:03                    │
│  ✅ Draft           00:08                    │
│  ✅ B-roll (3/3)    00:45                    │
│  ✅ Voiceover       00:12                    │
│  🔄 Captions        đang xử lý...           │
│  ⬜ Music                                    │
│  ⬜ Assembly                                 │
│  ⬜ Upload                                   │
│                                             │
│  ████████████░░░░░░░░ 62%                   │
│                                             │
│  [Cancel]                                   │
└─────────────────────────────────────────────┘
```

---

## Trang 3: Schedule (`/schedule`)

### Chức năng
- Xem lịch chạy OpenClaw
- Thêm/sửa/xóa schedule
- Xem history các lần chạy tự động

### Schedule List

```
┌─────────────────────────────────────────────┐
│  Lịch tự động                [+ Thêm mới]  │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ 🕐 Mỗi ngày 8:00 & 14:00          │    │
│  │    Niche: tech                      │    │
│  │    Action: discover → gen → upload  │    │
│  │    Status: Active ✅                │    │
│  │    Lần chạy gần nhất: 08:00 hôm nay│    │
│  │    [Edit] [Pause] [Delete]          │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ 🕐 Thứ 2-6, 12:00                  │    │
│  │    Niche: finance                   │    │
│  │    Action: discover → gen → upload  │    │
│  │    Status: Paused ⏸                 │    │
│  │    [Edit] [Resume] [Delete]         │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

---

## Trang 4: Settings (`/settings`)

### Cấu hình

```
┌─────────────────────────────────────────────┐
│  Cấu hình                                  │
│                                             │
│  ── API Keys ──                             │
│  Gemini API Key:     [••••••••••] [Show]    │
│  TikTok Client Key:  [••••••••••] [Show]    │
│  OpenAI API Key:     [          ] (optional)│
│                                             │
│  ── TTS ──                                  │
│  Voice: [vi-VN-NamMinhNeural ▼]             │
│                                             │
│  ── Upload ──                               │
│  Default privacy: [SELF_ONLY ▼]             │
│  Auto-upload: [✓]                           │
│                                             │
│  ── OpenClaw ──                             │
│  Bot status: Connected ✅                   │
│  CLI path: /path/to/verticals               │
│                                             │
│  [Lưu cấu hình]                            │
└─────────────────────────────────────────────┘
```

### Authentication

Dashboard v4 chạy **single-user, local only** (localhost). Không cần authentication.
- API keys được mask trên UI (`AIza••••••••`)
- Chỉ hiện full key khi user click "Show" 
- Nếu cần remote access sau này: thêm basic auth hoặc JWT token (post-MVP)

---

## Responsive Design

| Breakpoint | Layout |
|---|---|
| Desktop (>1024px) | Sidebar + main content |
| Tablet (768-1024px) | Collapsible sidebar |
| Mobile (<768px) | Bottom tab bar, full-width content |

---

## Project Structure

```
dashboard/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── package.json
├── tsconfig.json
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── lib/
    │   ├── api.ts              # ky HTTP client instance
    │   ├── websocket.ts        # WebSocket connection manager
    │   └── store.ts            # Zustand UI state (sidebar, theme)
    ├── api/
    │   ├── videos.ts           # TanStack Query: GET/DELETE /api/videos
    │   ├── pipeline.ts         # TanStack Query: POST /api/pipeline/run
    │   └── schedule.ts         # TanStack Query: CRUD /api/schedule
    ├── components/
    │   ├── ui/                 # shadcn/ui components (button, card, dialog, etc.)
    │   ├── Layout.tsx          # Sidebar + main
    │   ├── VideoCard.tsx       # Video thumbnail card
    │   ├── VideoPlayer.tsx     # Vidstack player modal
    │   ├── PipelineProgress.tsx # Real-time progress via WebSocket
    │   ├── ScheduleForm.tsx    # Add/edit schedule
    │   └── SettingsForm.tsx    # Config form
    ├── pages/
    │   ├── Videos.tsx
    │   ├── Pipeline.tsx
    │   ├── Schedule.tsx
    │   └── Settings.tsx
    ├── hooks/
    │   ├── useWebSocket.ts     # WebSocket hook with reconnect
    │   └── useCopyToClipboard.ts # Copy caption/hashtags
    └── styles/
        └── globals.css
```

---

## Checklist

- [ ] `npm create vite@latest dashboard -- --template react-ts` (React 19 + TypeScript)
- [ ] TailwindCSS configured
- [ ] 4 trang hoạt động với routing
- [ ] Video gallery hiển thị video từ API
- [ ] Video player phát được .mp4
- [ ] Pipeline progress cập nhật real-time qua WebSocket
- [ ] Schedule CRUD hoạt động
- [ ] Settings lưu được API keys
- [ ] Responsive trên desktop/tablet/mobile

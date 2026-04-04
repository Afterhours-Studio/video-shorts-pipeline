# TikTok Upload Integration

> **Ưu tiên: THẤP** — User upload thủ công trước. Phase này triển khai sau khi pipeline + dashboard hoàn thiện.

## Mục tiêu

Thay thế YouTube upload bằng TikTok upload. Video được publish trực tiếp lên TikTok từ pipeline.

---

## TikTok Content Posting API

### Overview

TikTok cung cấp **Content Posting API** cho phép upload video programmatically.

- Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
- Yêu cầu: TikTok Developer Account + App Review
- OAuth 2.0 flow (Authorization Code)
- Scopes cần thiết: `video.publish`, `video.upload`

### Flow upload (Direct Post)

```
1. Init + Publish  POST /v2/post/publish/video/init/
                   Body: { post_info: { title, privacy_level, ... },
                           source_info: { source, video_size } }
                   → publish_id, upload_url

2. Upload file     PUT {upload_url}
                   Headers: Content-Range, Content-Type
                   Body: video binary (single chunk nếu < 64MB)

3. Check status    GET /v2/post/publish/status/fetch/
                   Body: { publish_id }
                   → status (processing_download | processing_upload
                             | publish_complete | failed)
```

> **Lưu ý**: Flow trên dựa theo TikTok Content Posting API v2 (Direct Post).
> Cần verify lại với docs mới nhất tại thời điểm triển khai vì TikTok API thay đổi thường xuyên.

### Giới hạn

| Giới hạn | Giá trị |
|---|---|
| File size tối đa | 4 GB |
| Video dài tối đa | 60 phút |
| Rate limit | 10 requests/phút/user |
| Privacy options | `PUBLIC_TO_EVERYONE`, `MUTUAL_FOLLOW_FRIENDS`, `FOLLOWER_OF_CREATOR`, `SELF_ONLY` |
| Default privacy | `SELF_ONLY` (an toàn nhất) |

---

## Implementation

### File mới: `verticals/tiktok.py`

```python
"""TikTok Content Posting API upload."""

def upload_to_tiktok(
    video_path: Path,
    draft: dict,
    privacy: str = "SELF_ONLY",
) -> str:
    """Upload video lên TikTok.
    
    Args:
        video_path: Đường dẫn file .mp4
        draft: Dict chứa title, caption, hashtags
        privacy: Mức độ privacy
        
    Returns:
        publish_id hoặc URL video
    """
```

### Metadata từ draft

| Draft field | TikTok field | Mô tả |
|---|---|---|
| `title` | `post_info.title` | Tiêu đề video (tối đa 150 ký tự) |
| `caption` | `post_info.description` | Mô tả + hashtags |
| `hashtags` | Nối vào description | `#trending #tech #tintuc` |

### Cấu hình

**File config:** `~/.verticals/config.json`

```json
{
  "TIKTOK_CLIENT_KEY": "...",
  "TIKTOK_CLIENT_SECRET": "...",
  "TIKTOK_ACCESS_TOKEN": "...",
  "TIKTOK_REFRESH_TOKEN": "..."
}
```

**OAuth setup script:** `scripts/setup_tiktok_oauth.py`
- Mở browser để user authorize app
- Lưu access_token và refresh_token
- Auto-refresh khi token hết hạn (24h)

---

## Token management

### Access token lifecycle

```
1. User authorize → authorization_code
2. Exchange code  → access_token (24h) + refresh_token (365 ngày)
3. Auto refresh   → new access_token khi cũ hết hạn
4. Re-authorize   → khi refresh_token hết hạn (sau 1 năm)
```

### Token refresh trong code

```python
def _ensure_valid_token() -> str:
    """Đảm bảo access_token còn hạn, refresh nếu cần."""
    config = load_config()
    token = config.get("TIKTOK_ACCESS_TOKEN")
    expires_at = config.get("TIKTOK_TOKEN_EXPIRES_AT", 0)
    
    if time.time() < expires_at - 300:  # 5 phút buffer
        return token
    
    # Refresh
    new_token = _refresh_token(config["TIKTOK_REFRESH_TOKEN"])
    save_config({...config, **new_token})
    return new_token["access_token"]
```

---

## Alternative: TikTok qua Selenium/Playwright (Plan B)

Nếu không được approve TikTok Developer App:

| Approach | Pros | Cons |
|---|---|---|
| **Official API** | Ổn định, chính thức | Cần app review (3-5 ngày) |
| **Playwright automation** | Không cần review | Dễ bị block, brittle |
| **Third-party (tiktok-uploader)** | Nhanh setup | Dependency risk, có thể outdated |

Khuyến nghị: **Official API** — nộp app review song song với development.

---

## CLI changes

```bash
# Upload video lên TikTok
python -m verticals upload --draft <path> --privacy SELF_ONLY

# Full pipeline với TikTok upload
python -m verticals run --topic "Tin AI hôm nay" --niche tech
```

---

## Trước khi có API: Upload thủ công

Trong giai đoạn đầu, pipeline tạo video xong → lưu file .mp4 + metadata:
- Video file: `~/.verticals/media/verticals_{job_id}.mp4`
- Metadata: `~/.verticals/drafts/{job_id}.json` (title, caption, hashtags)
- User mở TikTok app và upload thủ công, copy-paste caption + hashtags từ draft

Dashboard hiển thị nút "Copy Caption" để tiện copy metadata.

---

## Checklist (khi triển khai API)

- [ ] TikTok Developer Account đã tạo
- [ ] App đã submit review với scope `video.publish`, `video.upload`
- [ ] Script `setup_tiktok_oauth.py` hoạt động
- [ ] `upload_to_tiktok()` upload thành công với privacy `SELF_ONLY`
- [ ] Token auto-refresh hoạt động
- [ ] CLI `python -m verticals upload` gọi TikTok thay YouTube
- [ ] Metadata (title, caption, hashtags) hiển thị đúng trên TikTok

# Topic Discovery Engine — Nâng cấp cho Vietnamese Content

## Mục tiêu

Nâng cấp topic discovery engine để tìm trending topics **tiếng Việt** hiệu quả hơn.
Thêm sources mới (miễn phí), giữ sources cũ hoạt động tốt, bỏ sources không phù hợp.

---

## Sources hiện tại (v3)

| Source | File | Status | Vietnamese? |
|---|---|---|---|
| Reddit | `topics/reddit.py` | ✅ Hoạt động | Yếu — chủ yếu English |
| RSS | `topics/rss.py` | ✅ Hoạt động | Chưa có feeds VN |
| Google Trends | `topics/google_trends.py` | ✅ Hoạt động | Có `geo=IN/US/GB` — chưa có VN |
| NewsAPI | `topics/newsapi.py` | ✅ Hoạt động (cần key) | Hỗ trợ `language=vi` |
| Twitter | `topics/twitter.py` | ⚠️ Stub | N/A |
| TikTok | `topics/tiktok.py` | ⚠️ Stub | N/A |
| Manual | `topics/manual.py` | ✅ Hoạt động | N/A |

---

## Thay đổi trong v4

### Giữ + nâng cấp

| Source | Thay đổi |
|---|---|
| **Reddit** | Giữ nguyên — vẫn tốt cho gaming, tech (global trends) |
| **RSS** | Thêm Vietnamese feeds (VnExpress, Tuổi Trẻ, Thanh Niên, Zing News) |
| **Google Trends** | Đổi `geo="VN"` — trending searches tại Việt Nam |
| **Manual** | Giữ nguyên |

### Thêm mới

| Source | File | Free tier | Vietnamese | Mô tả |
|---|---|---|---|---|
| **GNews** | `topics/gnews.py` | 100 req/ngày | ✅ `lang=vi`, `country=vn` | Google News aggregator, thay thế NewsAPI |
| **Vietnamese RSS** | Tích hợp vào `topics/rss.py` | Unlimited | ✅ Native | VnExpress, Tuổi Trẻ, Thanh Niên, Zing News |

### Bỏ / Giữ optional

| Source | Quyết định | Lý do |
|---|---|---|
| **NewsAPI** | Giữ optional | Free tier 100 req/ngày, cần API key, GNews thay thế được |
| **Twitter** | Xóa stub | API trả phí, không đáng |
| **TikTok** | Xóa stub | Không có free API ổn định |

---

## Chi tiết implementation

### 1. GNews API (`topics/gnews.py`)

```python
"""GNews.io — Free Google News aggregator API."""

GNEWS_BASE = "https://gnews.io/api/v4"

class GNewsSource(TopicSource):
    """Fetch Vietnamese trending news from GNews.io.
    
    Free tier: 100 requests/day, 10 articles/request.
    Supports: lang=vi, country=vn, category filtering.
    """
    
    def fetch_topics(self, niche: str, limit: int = 10) -> list[TopicCandidate]:
        # GET /top-headlines?lang=vi&country=vn&category={niche_category}&max=10
        # GET /search?q={niche_query}&lang=vi&country=vn&max=10
        ...
```

**Config:**
```json
{
  "GNEWS_API_KEY": "...",
  "topic_sources": {
    "gnews": {
      "enabled": true,
      "language": "vi",
      "country": "vn"
    }
  }
}
```

**Niche → GNews category mapping:**

| Niche | GNews category | Search query bổ sung |
|---|---|---|
| tech | `technology` | "AI", "công nghệ", "startup" |
| finance | `business` | "chứng khoán", "crypto", "kinh tế" |
| gaming | `entertainment` | "game", "esports", "PUBG", "Liên Quân" |
| science | `science` | "khoa học", "vũ trụ", "nghiên cứu" |
| sports | `sports` | "bóng đá", "V-League", "SEA Games" |
| politics | `nation` | "chính trị", "quốc hội", "luật mới" |
| entertainment | `entertainment` | "showbiz", "phim", "nhạc Việt" |
| general | `general` | — |

### 2. Vietnamese RSS Feeds

Thêm vào niche YAML profiles, section `discovery.rss.feeds`:

```yaml
# niches/tech.yaml
discovery:
  reddit:
    subreddits: ["technology", "artificial", "MachineLearning"]
  rss:
    feeds:
      # Vietnamese
      - "https://vnexpress.net/rss/khoa-hoc-cong-nghe.rss"
      - "https://tuoitre.vn/rss/khoa-hoc.rss"
      - "https://thanhnien.vn/rss/cong-nghe.rss"
      - "https://zingnews.vn/cong-nghe.rss"
      # Global (giữ)
      - "https://hnrss.org/frontpage"
      - "https://techcrunch.com/feed"
```

**Vietnamese RSS feeds theo niche:**

| Niche | VnExpress | Tuổi Trẻ | Thanh Niên | Zing News |
|---|---|---|---|---|
| tech | `/khoa-hoc-cong-nghe.rss` | `/khoa-hoc.rss` | `/cong-nghe.rss` | `/cong-nghe.rss` |
| finance | `/kinh-doanh.rss` | `/kinh-doanh.rss` | `/tai-chinh-kinh-doanh.rss` | `/kinh-doanh-tai-chinh.rss` |
| sports | `/the-thao.rss` | `/the-thao.rss` | `/the-thao.rss` | `/the-thao.rss` |
| entertainment | `/giai-tri.rss` | `/giai-tri.rss` | `/giai-tri.rss` | `/giai-tri.rss` |
| science | `/khoa-hoc.rss` | `/khoa-hoc.rss` | `/doi-song.rss` | `/suc-khoe.rss` |
| education | `/giao-duc.rss` | `/giao-duc.rss` | `/giao-duc.rss` | `/giao-duc.rss` |
| politics | `/thoi-su.rss` | `/thoi-su.rss` | `/thoi-su.rss` | `/chinh-tri.rss` |
| general | `/tin-noi-bat.rss` | `/tin-moi-nhat.rss` | `/trang-chu.rss` | `/tin-moi.rss` |

> **Lưu ý:** RSS URLs cần verify tại thời điểm triển khai. Chạy script test:
> ```bash
> python -c "
> import feedparser
> feeds = [
>     'https://vnexpress.net/rss/khoa-hoc-cong-nghe.rss',
>     'https://tuoitre.vn/rss/khoa-hoc.rss',
>     'https://thanhnien.vn/rss/cong-nghe.rss',
> ]
> for url in feeds:
>     d = feedparser.parse(url)
>     print(f'{url}: {len(d.entries)} entries, status={d.get(\"status\", \"N/A\")}')
> "
> ```

### 3. Google Trends Vietnam (`topics/google_trends.py`)

Thay đổi nhỏ — đổi `geo` parameter:

```python
# Trước (v3)
pytrends.trending_searches(pn="india")  # geo IN

# Sau (v4)  
pytrends.trending_searches(pn="vietnam")  # geo VN
# Hoặc dùng realtime trends:
pytrends.realtime_trending_searches(pn="VN")
```

---

## Topic ranking (auto_pick)

Hiện tại `auto_pick()` trong `topics/engine.py` dùng Claude để rank topics.
Đổi sang dùng Gemini (LLM chính của v4):

```python
def auto_pick(self, candidates: list[TopicCandidate]) -> str:
    """Dùng Gemini để chọn topic tốt nhất cho video TikTok tiếng Việt."""
    prompt = f"""Chọn 1 topic tốt nhất để làm video TikTok tiếng Việt.
    
    Tiêu chí:
    - Đang trending, nhiều người quan tâm
    - Có thể giải thích trong 60 giây
    - Gây tò mò, dễ hook người xem
    - Phù hợp niche: {self.niche}
    
    Topics:
    {self._format_candidates(candidates)}
    
    Trả về JSON: {{"topic": "...", "reason": "..."}}
    """
    return call_llm(prompt, provider="gemini")
```

---

## Dependencies mới

```
# Không cần thêm dependency mới!
# - GNews: dùng `requests` (đã có)
# - RSS: dùng `feedparser` (đã có)  
# - Google Trends: dùng `pytrends` (đã có)
```

Chỉ cần GNews API key (miễn phí tại gnews.io).

---

## Thứ tự ưu tiên sources

Khi discover topics, engine sẽ fetch từ tất cả enabled sources song song (ThreadPoolExecutor),
sau đó deduplicate và rank. Thứ tự ưu tiên scoring:

1. **Vietnamese RSS** (freshest, most relevant)
2. **GNews** (curated, Vietnamese)
3. **Google Trends VN** (trending signal)
4. **Reddit** (global signal, good for tech/gaming)
5. **NewsAPI** (optional fallback)

---

## Rate Limit & Fallback Strategy

### Giới hạn các sources

| Source | Free tier | Giới hạn |
|---|---|---|
| Vietnamese RSS | Unlimited | Không giới hạn |
| Google Trends | Unofficial | ~60 req/phút (pytrends) |
| GNews | 100 req/ngày | Cần API key |
| Reddit | 60 req/phút | Không cần auth cho .json endpoint |
| NewsAPI | 100 req/ngày | Cần API key (optional) |

### Fallback khi rate limit exceeded

```python
# TopicEngine xử lý rate limit errors gracefully:
# 1. Source fail → log warning, tiếp tục sources khác
# 2. Tất cả sources fail → raise error, OpenClaw retry sau 30 phút
# 3. Một số sources fail → merge kết quả từ sources còn lại

async def discover(self, limit: int = 15) -> list[TopicCandidate]:
    results = []
    for source in self.enabled_sources:
        try:
            topics = await source.fetch_topics(self.niche, limit)
            results.extend(topics)
        except RateLimitError:
            log.warning(f"{source.name} rate limited, skipping")
        except Exception as e:
            log.warning(f"{source.name} failed: {e}")
    
    if not results:
        raise NoTopicsError("Tất cả sources đều fail. Thử lại sau.")
    
    return self._deduplicate_and_rank(results)[:limit]
```

### Khuyến nghị cho OpenClaw

- Chạy discover tối đa **4 lần/ngày** per niche (tránh hit GNews limit)
- Vietnamese RSS không giới hạn → luôn có fallback
- Nếu GNews fail → vẫn có RSS + Reddit + Google Trends

---

## Checklist

- [ ] GNews source hoạt động: `python -m verticals topics --niche tech` trả topics tiếng Việt
- [ ] Vietnamese RSS feeds đã thêm vào niche YAML profiles
- [ ] Google Trends đổi sang `geo=VN`
- [ ] `auto_pick()` dùng Gemini thay Claude
- [ ] Twitter/TikTok stubs đã xóa
- [ ] Engine deduplicate topics từ nhiều sources (RSS + GNews có thể overlap)
- [ ] `--format json` output machine-readable cho OpenClaw

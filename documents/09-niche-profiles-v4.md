# Niche Profiles v4 — YAML Schema & Migration Guide

## 1. Muc tieu

Dinh nghia canonical YAML schema cho 16 niche profiles trong v4.
Moi niche profile dieu khien toan bo pipeline: script generation, visuals, TTS, captions, music, thumbnail, va topic discovery.

Thay doi chinh so voi v3:
- **Vietnamese-only**: Moi output bang tieng Viet, khong con multi-language
- **TikTok-native**: Bo YouTube metadata, toi uu cho TikTok
- **Vietnamese sources**: RSS feeds tu VnExpress, Tuoi Tre, Thanh Nien, Zing News
- **GNews integration**: Category mapping cho tung niche
- **Don gian hoa voice**: Single Vietnamese voice string thay vi multi-lang dict

---

## 2. v3 -> v4 Changes Summary

| Section | v3 | v4 | Ghi chu |
|---|---|---|---|
| `name` | Giu nguyen | Giu nguyen | Khong doi |
| `display_name` | Tieng Anh | **Tieng Viet** | VD: "Cong Nghe & AI" thay "Tech & AI News" |
| `description` | Tieng Anh | **Tieng Viet** | Mo ta niche bang tieng Viet |
| `script.tone` | Tieng Anh | **Tieng Viet** | Instructions cho LLM bang tieng Viet |
| `script.hooks` | Templates tieng Anh | **Templates tieng Viet** | Hook templates viet bang tieng Viet |
| `script.cta_variants` | Tieng Anh | **Tieng Viet** | CTA cho TikTok tieng Viet |
| `script.forbidden_phrases` | Tieng Anh | **Tieng Viet + Anh** | Giu ca hai de trang phrase-mixing |
| `script.structure` | Tieng Anh instructions | **Tieng Viet** | Huong dan structure bang tieng Viet |
| `visuals` | Giu nguyen | Giu nguyen | Visual prompts van dung tieng Anh (cho image gen) |
| `voice.suggested_voices` | Multi-lang dict `{en: ..., hi: ...}` | **Single string** `"vi-VN-NamMinhNeural"` | Bo dict, dung string truc tiep |
| `voice.suggested_voices.elevenlabs` | `voice_id` + settings | **Xoa** (optional) | ElevenLabs chi giu neu co Vietnamese voice |
| `captions` | Giu nguyen | Giu nguyen | Font, color khong doi |
| `music` | Giu nguyen | Giu nguyen | Khong doi |
| `thumbnail.guidelines` | Tieng Anh | **Tieng Viet** | Text overlay bang tieng Viet |
| `discovery.rss.feeds` | English feeds | **Them Vietnamese RSS** | VnExpress, Tuoi Tre, Thanh Nien, Zing News |
| `discovery.gnews` | Khong co | **Them moi** | Category + search queries tieng Viet |
| `discovery.youtube_trending` | Co | **Xoa** | Bo YouTube-specific fields |
| `discovery.google_trends.geo` | `""` hoac `"US"` | **`"VN"`** | Trending tai Viet Nam |

---

## 3. Complete v4 Schema Reference

```yaml
# ─────────────────────────────────────────────────────
# Niche Profile v4 — Canonical Schema
# ─────────────────────────────────────────────────────

# Metadata
name: string                    # Slug, dung lam folder name va lookup key (VD: "tech")
display_name: string            # Ten hien thi tieng Viet (VD: "Cong Nghe & AI")
description: string             # Mo ta niche bang tieng Viet

# ─────────────────────────────────────────────────────
# Script Intelligence
# Dieu khien cach LLM generate script tieng Viet
# ─────────────────────────────────────────────────────
script:
  tone: string                  # Giong dieu cua script (tieng Viet)
  pacing: string                # Toc do trinh bay (tieng Viet)
  perspective: string           # Goc nhin nguoi noi (tieng Viet)
  word_count: string            # Khoang so tu (VD: "150 den 170")
  sentence_style: string        # Phong cach cau (tieng Viet)

  hooks:                        # Danh sach hook templates
    - id: string                # Slug ID (VD: "contrarian_take")
      template: string          # Template tieng Viet voi {placeholder}
      when: string              # Khi nao dung hook nay (tieng Viet)

  cta_variants:                 # Danh sach CTA cho TikTok (tieng Viet)
    - string

  forbidden_phrases:            # Cum tu cam (tieng Viet + tieng Anh)
    - string

  structure:                    # Cau truc script
    opening: string             # Huong dan phan mo dau (tieng Viet)
    middle: string              # Huong dan phan than (tieng Viet)
    closing: string             # Huong dan phan ket (tieng Viet)

# ─────────────────────────────────────────────────────
# Visual Intelligence
# Dieu khien B-roll va image generation
# Luu y: Giu tieng Anh cho image gen prompts (Gemini Imagen)
# ─────────────────────────────────────────────────────
visuals:
  style: string                 # Phong cach visual (tieng Anh — cho image gen)
  mood: string                  # Tam trang visual (tieng Anh)
  color_palette:                # Bang mau hex
    - string                    # VD: "#0A0A0F"

  subjects:
    prefer:                     # Visual subjects uu tien (tieng Anh)
      - string
    avoid:                      # Visual subjects tranh (tieng Anh)
      - string

  prompt_suffix: string         # Suffix cho image gen prompt (tieng Anh)

# ─────────────────────────────────────────────────────
# Voice Intelligence
# Dieu khien TTS — chi tieng Viet
# ─────────────────────────────────────────────────────
voice:
  pace: string                  # Toc do doc (tieng Viet, VD: "hoi nhanh, khoang 160 tu/phut")
  energy: string                # Nang luong giong doc (tieng Viet)
  style: string                 # Phong cach tham khao (tieng Viet)

  suggested_voices:
    edge_tts: string            # Vietnamese Edge TTS voice ID
                                # VD: "vi-VN-NamMinhNeural"
    elevenlabs:                 # OPTIONAL — chi khi co Vietnamese voice
      voice_id: string          # ElevenLabs voice ID
      settings:
        stability: float        # 0.0 - 1.0
        similarity_boost: float # 0.0 - 1.0
        style: float            # 0.0 - 1.0

# ─────────────────────────────────────────────────────
# Caption Intelligence
# Dieu khien subtitle styling
# ─────────────────────────────────────────────────────
captions:
  highlight_color: string       # Mau highlight tu quan trong (hex)
  text_color: string            # Mau chu (hex), default "#FFFFFF"
  font_family: string           # Font family, default "Arial"
  font_size: int                # Kich thuoc font, default 72
  font_weight: string           # Do dam, default "bold"
  position: string              # Vi tri: "lower_third" | "center" | "top"
  background: string            # Nen: "semi_transparent_dark" | "none" | "solid"
  words_per_group: int          # So tu hien thi cung luc, default 4

# ─────────────────────────────────────────────────────
# Music Intelligence
# Dieu khien background music selection
# ─────────────────────────────────────────────────────
music:
  mood: string                  # Tam trang nhac (tieng Anh — cho music search)
  energy: string                # Muc nang luong: "low" | "medium" | "high"
  tags:                         # Tags tim kiem nhac
    - string
  duck_volume_speech: float     # Volume nhac khi co giong noi (0.0 - 1.0)
  duck_volume_gap: float        # Volume nhac khi khong co giong noi (0.0 - 1.0)

# ─────────────────────────────────────────────────────
# Thumbnail Intelligence
# Dieu khien thumbnail generation — text overlay tieng Viet
# ─────────────────────────────────────────────────────
thumbnail:
  style: string                 # Phong cach thumbnail (tieng Viet)
  text_color: string            # Mau chu (hex)
  accent_color: string          # Mau nhan (hex)
  text_position: string         # Vi tri text: "left_aligned" | "center" | "right_aligned"
  max_words: int                # So tu toi da tren thumbnail
  font_style: string            # Phong cach font (tieng Viet)
  guidelines:                   # Huong dan thiet ke (tieng Viet)
    - string

# ─────────────────────────────────────────────────────
# Topic Discovery
# Dieu khien cac nguon tim topic — uu tien Vietnamese sources
# ─────────────────────────────────────────────────────
discovery:
  reddit:                       # Reddit — global signal, tot cho tech/gaming
    subreddits:
      - string

  rss:                          # RSS feeds — uu tien Vietnamese feeds
    feeds:
      - string                  # URL cua RSS feed

  gnews:                        # GNews API — Vietnamese news aggregator
    category: string            # GNews category: "technology" | "business" | "entertainment" |
                                #   "sports" | "science" | "nation" | "general" | "health" | "world"
    search_queries:             # Tu khoa tim kiem tieng Viet
      - string

  google_trends:
    category: string            # Category code
    geo: "VN"                   # Luon la "VN"
```

---

## 4. Example: tech.yaml v4

```yaml
name: tech
display_name: "Cong Nghe & AI"
description: "Danh cho kenh ve cong nghe, AI, startup, va san pham moi."

# ─────────────────────────────────────────────────────
# Script Intelligence
# ─────────────────────────────────────────────────────
script:
  tone: "am hieu, hoi co chinh kien, tro chuyen tu nhien nhung khong kien ngao"
  pacing: "nhanh va day du kien, khong tu thua, khong mo dau dai dong"
  perspective: "ngoi thu nhat, noi chuyen truc tiep voi nguoi xem nhu dong nghiep"
  word_count: "150 den 170"
  sentence_style: "cau ngan sac net, thinh thoang mot cau dai de tao nhip, khong qua hai menh de"

  hooks:
    - id: contrarian_take
      template: "Moi nguoi dang vui mung ve {topic}. Day la ly do tai sao do la van de."
      when: "topic co dong thuan tich cuc manh, dung de tao su cang thang"
    - id: breaking_news
      template: "Chuyen nay vua xay ra va chua ai noi ve no."
      when: "su kien rat moi, trong vong 24 gio dau"
    - id: prediction
      template: "{topic} thay doi moi thu. Day la nhung gi se xay ra tiep theo."
      when: "thong bao lon hoac ra mat san pham co tac dong sau xa"
    - id: explainer
      template: "De toi giai thich {topic} trong 60 giay vi da so moi nguoi dang hieu sai."
      when: "chu de phuc tap nhieu nguoi hieu nham"
    - id: comparison
      template: "{thing_a} vs {thing_b}. Mot trong hai thang va khong can ban luan."
      when: "hai san pham, cong ty, hoac cach tiep can canh tranh"
    - id: statistic_shock
      template: "{shocking_stat}. Con so do nen khien ban lo lang. Day la ly do."
      when: "topic co du lieu bat ngo"
    - id: question
      template: "Tai sao {company} vua {action}? Cau tra loi con dien hon ban nghi."
      when: "quyet dinh doanh nghiep thoat nhin co ve bat hop ly"
    - id: countdown
      template: "Ban con {timeframe} truoc khi {consequence}. Day la nhung gi ban can biet."
      when: "topic co deadline, quy dinh moi, thay doi thi truong"

  cta_variants:
    - "Follow de cap nhat cong nghe moi ngay."
    - "Subscribe neu ban muon tin AI that su quan trong."
    - "Binh luan di: ban co dong y voi nhan dinh nay khong?"
    - "Chi tiet them o binh luan ghim."

  forbidden_phrases:
    - "like va subscribe"
    - "bam chuong"
    - "xin chao moi nguoi"
    - "khong dai dong nua"
    - "trong video nay"
    - "cho minh xin"
    - "like and subscribe"
    - "smash that bell"
    - "what's up guys"
    - "without further ado"

  structure:
    opening: "Hook trong 3 giay dau. Khong gioi thieu, khong chao hoi, di thang vao van de."
    middle: "3 den 4 du kien chinh tu nghien cuu, moi du kien xay dung tren du kien truoc. Dung 'van de la day' hoac 'nhung con te hon' lam cau chuyen tiep."
    closing: "Nhan dinh manh hoac du doan. Sau do CTA. Khong bao gio ket bang cau hoi ma khong tra loi truoc."

# ─────────────────────────────────────────────────────
# Visual Intelligence
# Giu tieng Anh — image gen (Gemini Imagen) hieu tieng Anh tot hon
# ─────────────────────────────────────────────────────
visuals:
  style: "clean, minimal, dark backgrounds with neon or electric blue accents"
  mood: "futuristic, sleek, professional, slightly ominous for negative stories"
  color_palette: ["#0A0A0F", "#1A1A2E", "#00FF88", "#4ECDC4", "#FF6B6B"]

  subjects:
    prefer:
      - "close up of code on a dark screen with syntax highlighting"
      - "server room with blue LED lighting"
      - "minimalist product shot on dark background"
      - "abstract data visualization with glowing nodes"
      - "circuit board macro shot with shallow depth of field"
      - "person silhouette against massive screen display"
      - "holographic UI overlay on dark background"
    avoid:
      - "stock photo of person smiling at laptop"
      - "generic office environment"
      - "clipart or illustrated icons"
      - "bright cheerful colors"
      - "people shaking hands"

  prompt_suffix: "photorealistic, cinematic lighting, dark moody atmosphere, 8K detail, shallow depth of field"

# ─────────────────────────────────────────────────────
# Voice Intelligence
# ─────────────────────────────────────────────────────
voice:
  pace: "hoi nhanh, khoang 160 tu moi phut"
  energy: "tu tin va uy quyen nhung khong may moc"
  style: "phong cach binh luan vien truyen hinh pha tron reviewer cong nghe"

  suggested_voices:
    edge_tts: "vi-VN-NamMinhNeural"

# ─────────────────────────────────────────────────────
# Caption Intelligence
# ─────────────────────────────────────────────────────
captions:
  highlight_color: "#00FF88"
  text_color: "#FFFFFF"
  font_family: "Arial"
  font_size: 72
  font_weight: "bold"
  position: "lower_third"
  background: "semi_transparent_dark"
  words_per_group: 4

# ─────────────────────────────────────────────────────
# Music Intelligence
# ─────────────────────────────────────────────────────
music:
  mood: "ambient electronic, subtle energy, no lyrics, no distracting melodies"
  energy: "medium"
  tags: ["ambient", "electronic", "tech", "cinematic", "dark"]
  duck_volume_speech: 0.10
  duck_volume_gap: 0.22

# ─────────────────────────────────────────────────────
# Thumbnail Intelligence
# Text overlay tieng Viet
# ─────────────────────────────────────────────────────
thumbnail:
  style: "nen toi, chu dam, tuong phan cao, mot yeu to visual chinh"
  text_color: "#FFFFFF"
  accent_color: "#00FF88"
  text_position: "left_aligned"
  max_words: 5
  font_style: "bold condensed sans serif"
  guidelines:
    - "Khong qua 5 tu tren thumbnail"
    - "Chu phai doc duoc o 120px (kich thuoc duyet tren dien thoai)"
    - "Mot khuon mat hoac mot vat the, khong bao gio ca hai canh tranh"
    - "Nen toi voi chu sang hieu qua hon nen sang trong niche cong nghe"
    - "Text tieng Viet: dung tu ngan, gay to mo"

# ─────────────────────────────────────────────────────
# Topic Discovery
# ─────────────────────────────────────────────────────
discovery:
  reddit:
    subreddits: ["technology", "artificial", "MachineLearning", "singularity", "programming", "startups"]

  rss:
    feeds:
      # Vietnamese sources — uu tien
      - "https://vnexpress.net/rss/khoa-hoc-cong-nghe.rss"
      - "https://tuoitre.vn/rss/khoa-hoc.rss"
      - "https://thanhnien.vn/rss/cong-nghe.rss"
      - "https://zingnews.vn/cong-nghe.rss"
      # Global sources — bo sung
      - "https://hnrss.org/frontpage"
      - "https://techcrunch.com/feed"
      - "https://www.theverge.com/rss/index.xml"

  gnews:
    category: "technology"
    search_queries:
      - "AI"
      - "cong nghe"
      - "startup"
      - "tri tue nhan tao"
      - "dien thoai moi"

  google_trends:
    category: "t"
    geo: "VN"

  hacker_news:
    enabled: true
    min_score: 100
```

---

## 5. Vietnamese RSS Feeds Mapping

Bang anh xa RSS feed URL cho 16 niches. Base URLs:
- **VnExpress**: `https://vnexpress.net/rss/`
- **Tuoi Tre**: `https://tuoitre.vn/rss/`
- **Thanh Nien**: `https://thanhnien.vn/rss/`
- **Zing News**: `https://zingnews.vn/`

| Niche | VnExpress | Tuoi Tre | Thanh Nien | Zing News |
|---|---|---|---|---|
| tech | `khoa-hoc-cong-nghe.rss` | `khoa-hoc.rss` | `cong-nghe.rss` | `cong-nghe.rss` |
| gaming | `khoa-hoc-cong-nghe.rss` | `khoa-hoc.rss` | `cong-nghe.rss` | `cong-nghe.rss` |
| finance | `kinh-doanh.rss` | `kinh-doanh.rss` | `tai-chinh-kinh-doanh.rss` | `kinh-doanh-tai-chinh.rss` |
| fitness | `suc-khoe.rss` | `suc-khoe.rss` | `suc-khoe.rss` | `suc-khoe.rss` |
| cooking | `doi-song.rss` | `nhip-song-tre.rss` | `doi-song.rss` | `doi-song.rss` |
| travel | `du-lich.rss` | `du-lich.rss` | `du-lich.rss` | `du-lich.rss` |
| true_crime | `phap-luat.rss` | `phap-luat.rss` | `phap-luat.rss` | `phap-luat.rss` |
| science | `khoa-hoc.rss` | `khoa-hoc.rss` | `doi-song.rss` | `suc-khoe.rss` |
| politics | `thoi-su.rss` | `thoi-su.rss` | `thoi-su.rss` | `chinh-tri.rss` |
| entertainment | `giai-tri.rss` | `giai-tri.rss` | `giai-tri.rss` | `giai-tri.rss` |
| sports | `the-thao.rss` | `the-thao.rss` | `the-thao.rss` | `the-thao.rss` |
| fashion | `doi-song.rss` | `nhip-song-tre.rss` | `doi-song.rss` | `doi-song.rss` |
| education | `giao-duc.rss` | `giao-duc.rss` | `giao-duc.rss` | `giao-duc.rss` |
| motivation | `tam-su.rss` | `ban-doc.rss` | `doi-song.rss` | `doi-song.rss` |
| comedy | `giai-tri.rss` | `giai-tri.rss` | `giai-tri.rss` | `giai-tri.rss` |
| general | `tin-noi-bat.rss` | `tin-moi-nhat.rss` | `trang-chu.rss` | `tin-moi.rss` |

> **Luu y**: Can verify cac RSS URLs con hoat dong tai thoi diem trien khai. Mot so bao co the doi duong dan RSS.

### Full URLs cho copy-paste

```yaml
# tech / gaming
- "https://vnexpress.net/rss/khoa-hoc-cong-nghe.rss"
- "https://tuoitre.vn/rss/khoa-hoc.rss"
- "https://thanhnien.vn/rss/cong-nghe.rss"
- "https://zingnews.vn/cong-nghe.rss"

# finance
- "https://vnexpress.net/rss/kinh-doanh.rss"
- "https://tuoitre.vn/rss/kinh-doanh.rss"
- "https://thanhnien.vn/rss/tai-chinh-kinh-doanh.rss"
- "https://zingnews.vn/kinh-doanh-tai-chinh.rss"

# fitness / science (suc khoe)
- "https://vnexpress.net/rss/suc-khoe.rss"
- "https://tuoitre.vn/rss/suc-khoe.rss"
- "https://thanhnien.vn/rss/suc-khoe.rss"
- "https://zingnews.vn/suc-khoe.rss"

# cooking / fashion / motivation (doi song)
- "https://vnexpress.net/rss/doi-song.rss"
- "https://tuoitre.vn/rss/nhip-song-tre.rss"
- "https://thanhnien.vn/rss/doi-song.rss"
- "https://zingnews.vn/doi-song.rss"

# travel
- "https://vnexpress.net/rss/du-lich.rss"
- "https://tuoitre.vn/rss/du-lich.rss"
- "https://thanhnien.vn/rss/du-lich.rss"
- "https://zingnews.vn/du-lich.rss"

# true_crime (phap luat)
- "https://vnexpress.net/rss/phap-luat.rss"
- "https://tuoitre.vn/rss/phap-luat.rss"
- "https://thanhnien.vn/rss/phap-luat.rss"
- "https://zingnews.vn/phap-luat.rss"

# politics (thoi su)
- "https://vnexpress.net/rss/thoi-su.rss"
- "https://tuoitre.vn/rss/thoi-su.rss"
- "https://thanhnien.vn/rss/thoi-su.rss"
- "https://zingnews.vn/chinh-tri.rss"

# entertainment / comedy (giai tri)
- "https://vnexpress.net/rss/giai-tri.rss"
- "https://tuoitre.vn/rss/giai-tri.rss"
- "https://thanhnien.vn/rss/giai-tri.rss"
- "https://zingnews.vn/giai-tri.rss"

# sports (the thao)
- "https://vnexpress.net/rss/the-thao.rss"
- "https://tuoitre.vn/rss/the-thao.rss"
- "https://thanhnien.vn/rss/the-thao.rss"
- "https://zingnews.vn/the-thao.rss"

# education (giao duc)
- "https://vnexpress.net/rss/giao-duc.rss"
- "https://tuoitre.vn/rss/giao-duc.rss"
- "https://thanhnien.vn/rss/giao-duc.rss"
- "https://zingnews.vn/giao-duc.rss"

# general
- "https://vnexpress.net/rss/tin-noi-bat.rss"
- "https://tuoitre.vn/rss/tin-moi-nhat.rss"
- "https://thanhnien.vn/rss/trang-chu.rss"
- "https://zingnews.vn/tin-moi.rss"
```

---

## 6. GNews Category Mapping

GNews API ho tro cac categories: `general`, `world`, `nation`, `business`, `technology`, `entertainment`, `sports`, `science`, `health`.

| Niche | GNews Category | Search Queries (tieng Viet) |
|---|---|---|
| tech | `technology` | "AI", "cong nghe", "startup", "tri tue nhan tao", "dien thoai moi" |
| gaming | `entertainment` | "game", "esports", "Lien Quan", "PUBG Mobile", "game moi" |
| finance | `business` | "chung khoan", "crypto", "kinh te", "bat dong san", "ngan hang" |
| fitness | `health` | "tap gym", "suc khoe", "giam can", "dinh duong", "yoga" |
| cooking | `general` | "cong thuc nau an", "am thuc Viet", "mon ngon", "do an" |
| travel | `general` | "du lich Viet Nam", "dia diem du lich", "phuot", "review khach san" |
| true_crime | `nation` | "an mang", "phap luat", "vu an", "toi pham", "cong an" |
| science | `science` | "khoa hoc", "vu tru", "nghien cuu", "phat minh", "moi truong" |
| politics | `nation` | "chinh tri", "quoc hoi", "luat moi", "chinh sach", "ngoai giao" |
| entertainment | `entertainment` | "showbiz", "phim", "nhac Viet", "nghe si", "TikTok viral" |
| sports | `sports` | "bong da", "V-League", "doi tuyen Viet Nam", "SEA Games", "the thao" |
| fashion | `general` | "thoi trang", "lam dep", "xu huong", "beauty", "skincare" |
| education | `general` | "giao duc", "thi dai hoc", "hoc bong", "truong hoc", "du hoc" |
| motivation | `general` | "dong luc", "thanh cong", "phat trien ban than", "tu duy" |
| comedy | `entertainment` | "hai", "tiktok hai", "stand up", "tro dua", "meme Viet" |
| general | `general` | — (dung top headlines, khong can search query) |

### Su dung trong niche YAML

```yaml
# niches/finance.yaml
discovery:
  gnews:
    category: "business"
    search_queries:
      - "chung khoan"
      - "crypto"
      - "kinh te"
      - "bat dong san"
      - "ngan hang"
```

### GNews API call pattern

```python
# Top headlines theo category
GET https://gnews.io/api/v4/top-headlines?category=technology&lang=vi&country=vn&max=10&apikey={key}

# Search theo query
GET https://gnews.io/api/v4/search?q=AI%20cong%20nghe&lang=vi&country=vn&max=10&apikey={key}
```

---

## 7. Voice Options

### Edge TTS Vietnamese Voices

| Voice ID | Gioi tinh | Phong cach | Khuyen nghi dung cho |
|---|---|---|---|
| `vi-VN-NamMinhNeural` | Nam | Tu nhien, chuyen nghiep | **Default** — phu hop narration, tin tuc, cong nghe |
| `vi-VN-HoaiMyNeural` | Nu | Tu nhien, ro rang | Lifestyle, cooking, education, motivation |

### Khuyen nghi voice theo niche

| Niche | Voice khuyen nghi | Ly do |
|---|---|---|
| tech | `vi-VN-NamMinhNeural` | Giong nam, chuyen nghiep, phu hop binh luan cong nghe |
| gaming | `vi-VN-NamMinhNeural` | Giong nam, nang dong |
| finance | `vi-VN-NamMinhNeural` | Giong nam, uy tin |
| fitness | `vi-VN-NamMinhNeural` | Giong nam, dong luc |
| cooking | `vi-VN-HoaiMyNeural` | Giong nu, am ap, than thien |
| travel | `vi-VN-HoaiMyNeural` | Giong nu, thu gian |
| true_crime | `vi-VN-NamMinhNeural` | Giong nam, tram, nghiem tuc |
| science | `vi-VN-NamMinhNeural` | Giong nam, chuyen nghiep |
| politics | `vi-VN-NamMinhNeural` | Giong nam, chinh thong |
| entertainment | `vi-VN-HoaiMyNeural` | Giong nu, vui ve |
| sports | `vi-VN-NamMinhNeural` | Giong nam, soi noi |
| fashion | `vi-VN-HoaiMyNeural` | Giong nu, phu hop lifestyle |
| education | `vi-VN-HoaiMyNeural` | Giong nu, de nghe, than thien |
| motivation | `vi-VN-NamMinhNeural` | Giong nam, truyen cam hung |
| comedy | `vi-VN-NamMinhNeural` | Giong nam, linh hoat |
| general | `vi-VN-NamMinhNeural` | Giong nam, da dung |

### Kiem tra voice kha dung

```bash
# Liet ke tat ca Vietnamese voices
edge-tts --list-voices | grep vi-VN

# Test mot voice
edge-tts --voice "vi-VN-NamMinhNeural" --text "Xin chao, day la Verticals v4" --write-media test.mp3
```

### Override voice trong dashboard

User co the doi voice trong React dashboard Settings. Gia tri luu trong SQLite va override niche profile default:

```python
# Thu tu uu tien voice selection
voice = (
    dashboard_settings.get("voice")        # 1. User override tu dashboard
    or niche_profile["voice"]["suggested_voices"]["edge_tts"]  # 2. Niche default
    or "vi-VN-NamMinhNeural"               # 3. Global default
)
```

---

## 8. Cap nhat 16 Files

### Checklist cap nhat niche profiles

| # | File | display_name (VN) | Voice | RSS | GNews |
|---|---|---|---|---|---|
| 1 | `niches/tech.yaml` | Cong Nghe & AI | NamMinhNeural | khoa-hoc-cong-nghe | technology |
| 2 | `niches/gaming.yaml` | Gaming & Esports | NamMinhNeural | khoa-hoc-cong-nghe | entertainment |
| 3 | `niches/finance.yaml` | Tai Chinh & Kinh Te | NamMinhNeural | kinh-doanh | business |
| 4 | `niches/fitness.yaml` | Suc Khoe & The Hinh | NamMinhNeural | suc-khoe | health |
| 5 | `niches/cooking.yaml` | Am Thuc & Nau An | HoaiMyNeural | doi-song | general |
| 6 | `niches/travel.yaml` | Du Lich & Kham Pha | HoaiMyNeural | du-lich | general |
| 7 | `niches/true_crime.yaml` | Phap Luat & Toi Pham | NamMinhNeural | phap-luat | nation |
| 8 | `niches/science.yaml` | Khoa Hoc & Cong Nghe | NamMinhNeural | khoa-hoc | science |
| 9 | `niches/politics.yaml` | Thoi Su & Chinh Tri | NamMinhNeural | thoi-su | nation |
| 10 | `niches/entertainment.yaml` | Giai Tri & Showbiz | HoaiMyNeural | giai-tri | entertainment |
| 11 | `niches/sports.yaml` | The Thao | NamMinhNeural | the-thao | sports |
| 12 | `niches/fashion.yaml` | Thoi Trang & Lam Dep | HoaiMyNeural | doi-song | general |
| 13 | `niches/education.yaml` | Giao Duc | HoaiMyNeural | giao-duc | general |
| 14 | `niches/motivation.yaml` | Dong Luc & Phat Trien | NamMinhNeural | doi-song | general |
| 15 | `niches/comedy.yaml` | Hai & Giai Tri | NamMinhNeural | giai-tri | entertainment |
| 16 | `niches/general.yaml` | Tong Hop | NamMinhNeural | tin-noi-bat | general |

### Buoc thuc hien cho moi file

1. Doi `display_name` sang tieng Viet
2. Doi `description` sang tieng Viet
3. Dich `script` section sang tieng Viet (tone, pacing, hooks, cta_variants, structure)
4. Them forbidden_phrases tieng Viet (giu ca tieng Anh)
5. Doi `voice.suggested_voices` tu dict sang single string:
   ```yaml
   # Truoc (v3)
   suggested_voices:
     edge_tts:
       en: "en-US-GuyNeural"
       hi: "hi-IN-MadhurNeural"
     elevenlabs:
       voice_id: "JBFqnCBsd6RMkjVDRZzb"
       settings: ...

   # Sau (v4)
   suggested_voices:
     edge_tts: "vi-VN-NamMinhNeural"
   ```
6. Doi `thumbnail.guidelines` sang tieng Viet, them note ve text tieng Viet
7. Them Vietnamese RSS feeds vao `discovery.rss.feeds`
8. Them `discovery.gnews` section moi
9. Doi `discovery.google_trends.geo` sang `"VN"`
10. **Xoa** `discovery.youtube_trending` (bo YouTube)
11. Giu nguyen: `visuals`, `captions`, `music` (chi can thay doi nho neu can)

### Script tu dong hoa (tham khao)

```python
"""Script cap nhat niche profiles tu v3 sang v4."""
import yaml
from pathlib import Path

NICHES_DIR = Path("niches")
V4_VOICE_MAP = {
    "tech": "vi-VN-NamMinhNeural",
    "gaming": "vi-VN-NamMinhNeural",
    "cooking": "vi-VN-HoaiMyNeural",
    "travel": "vi-VN-HoaiMyNeural",
    "entertainment": "vi-VN-HoaiMyNeural",
    "fashion": "vi-VN-HoaiMyNeural",
    "education": "vi-VN-HoaiMyNeural",
    # ... con lai dung NamMinhNeural
}
DEFAULT_VOICE = "vi-VN-NamMinhNeural"

for yaml_file in NICHES_DIR.glob("*.yaml"):
    with open(yaml_file) as f:
        profile = yaml.safe_load(f)
    
    niche = profile["name"]
    
    # 1. Update voice
    voice = V4_VOICE_MAP.get(niche, DEFAULT_VOICE)
    profile["voice"]["suggested_voices"] = {"edge_tts": voice}
    
    # 2. Remove youtube_trending
    if "youtube_trending" in profile.get("discovery", {}):
        del profile["discovery"]["youtube_trending"]
    
    # 3. Update google_trends geo
    if "google_trends" in profile.get("discovery", {}):
        profile["discovery"]["google_trends"]["geo"] = "VN"
    
    # 4. Add gnews section (can manual mapping)
    # ...
    
    with open(yaml_file, "w") as f:
        yaml.dump(profile, f, allow_unicode=True, default_flow_style=False)
    
    print(f"Updated: {yaml_file}")
```

> **Luu y**: Script nay chi tu dong hoa phan co cau truc. Phan dich sang tieng Viet (hooks, CTA, tone) can lam thu cong hoac dung LLM ho tro.

---

## 9. Validation

### Schema validation voi Python

```python
"""Validate niche YAML profile theo v4 schema."""
import yaml
import sys
from pathlib import Path

REQUIRED_TOP = ["name", "display_name", "description", "script", "visuals", "voice", "captions", "music", "thumbnail", "discovery"]
REQUIRED_SCRIPT = ["tone", "pacing", "hooks", "cta_variants", "forbidden_phrases", "structure"]
REQUIRED_VOICE = ["pace", "energy", "suggested_voices"]
REQUIRED_DISCOVERY = ["rss"]  # reddit va gnews khuyen nghi nhung khong bat buoc

VALID_EDGE_VOICES = ["vi-VN-NamMinhNeural", "vi-VN-HoaiMyNeural"]

def validate_niche(filepath: Path) -> list[str]:
    """Validate mot niche YAML file. Tra ve list loi."""
    errors = []
    
    with open(filepath) as f:
        profile = yaml.safe_load(f)
    
    if not profile:
        return [f"{filepath}: File rong hoac khong parse duoc"]
    
    # Top-level keys
    for key in REQUIRED_TOP:
        if key not in profile:
            errors.append(f"Thieu key top-level: {key}")
    
    # Script section
    script = profile.get("script", {})
    for key in REQUIRED_SCRIPT:
        if key not in script:
            errors.append(f"Thieu script.{key}")
    
    # Hooks format
    for i, hook in enumerate(script.get("hooks", [])):
        if "id" not in hook:
            errors.append(f"Hook #{i} thieu 'id'")
        if "template" not in hook:
            errors.append(f"Hook #{i} thieu 'template'")
    
    # Voice section
    voice = profile.get("voice", {})
    for key in REQUIRED_VOICE:
        if key not in voice:
            errors.append(f"Thieu voice.{key}")
    
    suggested = voice.get("suggested_voices", {})
    edge_voice = suggested.get("edge_tts")
    
    # v4: edge_tts phai la string, khong phai dict
    if isinstance(edge_voice, dict):
        errors.append("voice.suggested_voices.edge_tts la dict (v3 format). Can doi sang string (v4 format)")
    elif isinstance(edge_voice, str):
        if edge_voice not in VALID_EDGE_VOICES:
            errors.append(f"voice.suggested_voices.edge_tts '{edge_voice}' khong hop le. Chon: {VALID_EDGE_VOICES}")
    else:
        errors.append("Thieu voice.suggested_voices.edge_tts")
    
    # Discovery section — khong co youtube_trending
    discovery = profile.get("discovery", {})
    if "youtube_trending" in discovery:
        errors.append("discovery.youtube_trending con ton tai (can xoa cho v4)")
    
    # Google Trends geo phai la VN
    gt = discovery.get("google_trends", {})
    if gt and gt.get("geo") != "VN":
        errors.append(f"discovery.google_trends.geo = '{gt.get('geo')}' (can doi sang 'VN')")
    
    # RSS feeds — nen co it nhat 1 Vietnamese feed
    feeds = discovery.get("rss", {}).get("feeds", [])
    vn_feeds = [f for f in feeds if any(d in f for d in ["vnexpress", "tuoitre", "thanhnien", "zingnews"])]
    if not vn_feeds:
        errors.append("Khong co Vietnamese RSS feed nao trong discovery.rss.feeds")
    
    # GNews section — khuyen nghi
    if "gnews" not in discovery:
        errors.append("Thieu discovery.gnews (khuyen nghi them)")
    
    return errors


def validate_all():
    """Validate tat ca niche files."""
    niches_dir = Path("niches")
    total_errors = 0
    
    for yaml_file in sorted(niches_dir.glob("*.yaml")):
        errors = validate_niche(yaml_file)
        if errors:
            print(f"\n{yaml_file} — {len(errors)} loi:")
            for e in errors:
                print(f"  - {e}")
            total_errors += len(errors)
        else:
            print(f"{yaml_file} — OK")
    
    print(f"\nTong: {total_errors} loi")
    return total_errors == 0


if __name__ == "__main__":
    success = validate_all()
    sys.exit(0 if success else 1)
```

### Chay validation

```bash
# Validate tat ca niches
python -c "exec(open('scripts/validate_niches.py').read())"

# Hoac tich hop vao pipeline
python -m verticals validate-niches
```

### Kiem tra nhanh bang CLI

```bash
# Kiem tra voice format da doi chua
grep -r "edge_tts:" niches/ | grep -v "vi-VN"
# Ket qua mong doi: khong co dong nao (tat ca da la vi-VN)

# Kiem tra youtube_trending da xoa chua
grep -r "youtube_trending" niches/
# Ket qua mong doi: khong co ket qua

# Kiem tra co Vietnamese RSS feeds
grep -r "vnexpress\|tuoitre\|thanhnien\|zingnews" niches/
# Ket qua mong doi: moi file co it nhat 1 dong

# Kiem tra geo VN
grep -A1 "google_trends" niches/ | grep "geo"
# Ket qua mong doi: tat ca la "VN"
```

---

## Tong ket

v4 niche profiles tap trung vao:
1. **Tieng Viet thuan tuy** — script, hooks, CTA, thumbnail text deu bang tieng Viet
2. **TikTok-native** — bo YouTube metadata, toi uu cho TikTok
3. **Vietnamese discovery** — RSS feeds tu 4 bao lon VN + GNews voi `lang=vi, country=vn`
4. **Don gian hoa voice** — single Vietnamese Edge TTS voice string
5. **16 profiles dong bo** — tat ca cap nhat theo cung schema v4

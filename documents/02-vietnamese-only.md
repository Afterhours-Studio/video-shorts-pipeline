# Vietnamese-Only: Chi tiết chuyển đổi ngôn ngữ

## Mục tiêu

Loại bỏ hỗ trợ 8 ngôn ngữ khác (en, hi, es, pt, de, fr, ja, ko), chỉ giữ tiếng Việt (vi).
Đơn giản hóa code, bỏ language routing, hardcode Vietnamese defaults.

---

## Thay đổi theo file

### `verticals/tts.py`

**Trước:**
```python
EDGE_VOICES = {
    "en": "en-US-GuyNeural",
    "hi": "hi-IN-MadhurNeural",
    "es": "es-MX-JorgeNeural",
    # ... 9 entries
    "vi": "vi-VN-HoaiMyNeural",
}
```

**Sau:**
```python
EDGE_VOICE_DEFAULT = "vi-VN-NamMinhNeural"
```

- Bỏ dictionary `EDGE_VOICES`, thay bằng constant `EDGE_VOICE_DEFAULT`
- `_generate_edge_tts()` — bỏ param `lang`, dùng voice từ config hoặc default
- `generate_voiceover()` — bỏ param `lang`, default "vi"
- Bỏ `VOICE_ID_EN`, `VOICE_ID_HI` imports từ config
- Voice có thể override qua niche profile hoặc dashboard settings

### `verticals/draft.py`

**Trước:**
```python
lang_map = {
    "en": "English", "vi": "Vietnamese", "hi": "Hindi",
    "es": "Spanish", ...
}
lang_full = lang_map.get(lang.lower()[:2], "English")
```

**Sau:**
```python
lang_full = "Vietnamese"
```

- Bỏ `lang_map` dictionary
- Bỏ param `lang` trong `generate_draft()` hoặc ignore nó
- Prompt template hardcode `Vietnamese`
- Field `"script"` luôn output tiếng Việt

### `verticals/__main__.py`

- Bỏ `--lang` argument khỏi tất cả subcommands (draft, produce, upload, run)
- Hoặc giữ `--lang` nhưng default `"vi"` và không cho choices khác
- Bỏ tất cả `getattr(args, "lang", "en")` — thay bằng `"vi"`

### `verticals/captions.py`

- `generate_captions()` — bỏ param `lang`, hardcode `language="vi"` cho Whisper
- Whisper vẫn cần language hint để transcribe chính xác tiếng Việt
- Lưu ý: Whisper base model hỗ trợ tiếng Việt nhưng accuracy có thể thấp hơn tiếng Anh

### `verticals/niche.py`

- `get_voice_config()` — bỏ param `lang`, return voice config cho "vi" trực tiếp
- Niche YAML profiles: cập nhật `suggested_voices` chỉ giữ Vietnamese voice

### `verticals/config.py`

- Xóa `VOICE_ID_EN = "JBFqnCBsd6RMkjVDRZzb"`
- Xóa `VOICE_ID_HI = "..."`
- Có thể thêm `VOICE_ID_VI` nếu cần ElevenLabs Vietnamese voice

### `verticals/assemble.py`

- `assemble_video()` — bỏ param `lang`, hardcode output filename với `_vi`
- Hoặc bỏ suffix ngôn ngữ luôn: `verticals_{job_id}.mp4`

---

## Niche YAML profiles

### Cập nhật 16 files trong `niches/`

Mỗi file cần update section `voice.suggested_voices`:

**Trước:**
```yaml
voice:
  suggested_voices:
    edge_tts:
      en: "en-US-GuyNeural"
      hi: "hi-IN-MadhurNeural"
    elevenlabs:
      voice_id: "JBFqnCBsd6RMkjVDRZzb"
```

**Sau:**
```yaml
voice:
  suggested_voices:
    edge_tts: "vi-VN-NamMinhNeural"
```

Danh sách files:
- `niches/tech.yaml`, `gaming.yaml`, `finance.yaml`, `fitness.yaml`
- `cooking.yaml`, `travel.yaml`, `true_crime.yaml`, `science.yaml`
- `politics.yaml`, `entertainment.yaml`, `sports.yaml`, `fashion.yaml`
- `education.yaml`, `motivation.yaml`, `comedy.yaml`, `general.yaml`

---

## Edge TTS Vietnamese voices khả dụng

| Voice ID | Giới tính | Phong cách |
|---|---|---|
| `vi-VN-HoaiMyNeural` | Nữ | Tự nhiên, rõ ràng |
| `vi-VN-NamMinhNeural` | Nam | Tự nhiên, chuyên nghiệp |

Quyết định:
- **Default**: `vi-VN-NamMinhNeural` (nam, phù hợp narration)
- **Niche override**: Cho phép niche profile chọn voice khác
- **Dashboard override**: User có thể đổi voice trong Settings sau này
- **Thứ tự ưu tiên**: Dashboard settings > Niche profile > Config.json > Default (NamMinhNeural)

---

## Whisper tiếng Việt

- Whisper `base` model hỗ trợ tiếng Việt nhưng accuracy ~70-80%
- Khuyến nghị dùng `medium` model cho tiếng Việt (accuracy ~85-90%)
- Trade-off: `medium` chậm hơn ~3x so với `base` trên CPU
- Có thể cần post-processing: sửa dấu, từ viết tắt, tên riêng

---

## Checklist

- [ ] Không còn reference đến "en", "English" nào trong code (trừ comments)
- [ ] `EDGE_VOICES` dict đã bị thay bằng single constant
- [ ] Whisper chạy với `language="vi"` 
- [ ] Output video filename không còn suffix `_en`
- [ ] Tất cả prompt templates yêu cầu output tiếng Việt

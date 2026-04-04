"""GNews.io topic source — requires GNEWS_API_KEY env var or config.json.

Gracefully skipped if GNEWS_API_KEY is absent — no errors raised.
Sign up at https://gnews.io to get a free API key.
"""

from __future__ import annotations

import requests

from ..config import get_gnews_key
from ..log import get_logger, log
from .base import TopicCandidate, TopicSource

_API_BASE = "https://gnews.io/api/v4"

# Niche → GNews category + optional search queries (Vietnamese-focused)
_NICHE_MAP: dict[str, dict] = {
    "tech":          {"category": "technology",    "queries": ["AI", "công nghệ", "startup"]},
    "finance":       {"category": "business",      "queries": ["chứng khoán", "crypto", "kinh tế"]},
    "gaming":        {"category": "entertainment", "queries": ["game", "esports", "Liên Quân"]},
    "science":       {"category": "science",       "queries": []},
    "sports":        {"category": "sports",        "queries": []},
    "politics":      {"category": "nation",        "queries": []},
    "entertainment": {"category": "entertainment", "queries": []},
    "general":       {"category": "general",       "queries": []},
}

_HEADERS = {"User-Agent": "verticals/4.0"}


class GNewsSource(TopicSource):
    """Fetch trending topics from GNews.io for a given niche.

    Uses Vietnamese language/country by default. Tries the top-headlines
    endpoint first (by category), then falls back to the search endpoint
    using niche-specific Vietnamese queries.
    """

    name = "gnews"

    def __init__(self, config: dict | None = None):
        config = config or {}
        self._api_key = get_gnews_key()
        self._niche = config.get("niche", "general")
        self._lang = config.get("lang", "vi")
        self._country = config.get("country", "vn")

    # ── availability ────────────────────────────────────

    @property
    def is_available(self) -> bool:
        """GNews is only available when an API key is configured."""
        return bool(self._api_key)

    # ── public API ──────────────────────────────────────

    def fetch_topics(self, limit: int = 10) -> list[TopicCandidate]:
        """Fetch topics via top-headlines, then supplement with search queries."""
        if not self._api_key:
            return []

        mapping = _NICHE_MAP.get(self._niche, _NICHE_MAP["general"])
        candidates: list[TopicCandidate] = []

        # 1. Top-headlines by category
        headlines = self._fetch_headlines(mapping["category"], limit)
        candidates.extend(headlines)

        # 2. Supplement with search queries if we didn't fill the limit
        remaining = limit - len(candidates)
        if remaining > 0 and mapping.get("queries"):
            seen_urls = {c.url for c in candidates}
            for query in mapping["queries"]:
                if remaining <= 0:
                    break
                results = self._search(query, remaining)
                for c in results:
                    if c.url not in seen_urls:
                        seen_urls.add(c.url)
                        candidates.append(c)
                        remaining -= 1

        return candidates[:limit]

    # ── internal helpers ────────────────────────────────

    def _fetch_headlines(self, category: str, limit: int) -> list[TopicCandidate]:
        """Call the /top-headlines endpoint."""
        params = {
            "category": category,
            "lang": self._lang,
            "country": self._country,
            "max": min(limit, 10),  # GNews free tier caps at 10
            "apikey": self._api_key,
        }
        return self._request(f"{_API_BASE}/top-headlines", params)

    def _search(self, query: str, limit: int) -> list[TopicCandidate]:
        """Call the /search endpoint."""
        params = {
            "q": query,
            "lang": self._lang,
            "country": self._country,
            "max": min(limit, 10),
            "apikey": self._api_key,
        }
        return self._request(f"{_API_BASE}/search", params)

    def _request(self, url: str, params: dict) -> list[TopicCandidate]:
        """Execute an HTTP GET and convert articles to TopicCandidates."""
        logger = get_logger()
        try:
            resp = requests.get(url, params=params, headers=_HEADERS, timeout=10)

            # Handle rate-limiting (HTTP 429 or GNews-specific 403)
            if resp.status_code in (429, 403):
                logger.warning("GNews rate limit hit — skipping this request")
                return []

            resp.raise_for_status()
            articles = resp.json().get("articles", [])
        except requests.exceptions.HTTPError:
            log("GNews request failed (HTTP error)")
            return []
        except Exception as exc:
            log(f"GNews fetch failed: {exc}")
            return []

        candidates: list[TopicCandidate] = []
        for i, article in enumerate(articles):
            title = (article.get("title") or "").strip()
            if not title:
                continue
            # Rank-based score: first result = 1.0, decays 0.05 per position
            score = max(0.3, 1.0 - i * 0.05)
            candidates.append(TopicCandidate(
                title=title,
                source="gnews",
                trending_score=score,
                summary=(article.get("description") or "")[:200],
                url=article.get("url") or "",
                metadata={
                    "publisher": (article.get("source") or {}).get("name", ""),
                    "published_at": article.get("publishedAt", ""),
                    "image": article.get("image", ""),
                },
            ))

        return candidates

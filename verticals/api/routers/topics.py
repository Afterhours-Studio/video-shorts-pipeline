"""Topic discovery endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..models import TopicResponse, TopicsListResponse
from ...topics import TopicEngine

router = APIRouter(prefix="/api/topics", tags=["topics"])


@router.get("/discover", response_model=TopicsListResponse)
async def discover_topics(niche: str = "tech", limit: int = 10):
    """Discover trending topics for the given niche."""
    try:
        engine = TopicEngine(niche=niche)
        raw_topics = await engine.discover(limit=limit)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Topic discovery failed: {exc}",
        ) from exc

    topics = [
        TopicResponse(
            title=t.get("title", ""),
            source=t.get("source", "unknown"),
            trending_score=t.get("trending_score", 0.0),
            summary=t.get("summary", ""),
            url=t.get("url", ""),
        )
        for t in raw_topics
    ]

    return TopicsListResponse(topics=topics)

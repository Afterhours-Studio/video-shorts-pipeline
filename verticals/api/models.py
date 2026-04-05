"""Pydantic models for API request/response schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Video
# ---------------------------------------------------------------------------

class VideoResponse(BaseModel):
    id: str
    topic: str
    niche: str
    title: str | None = None
    caption: str | None = None
    hashtags: str | None = None
    status: str = "draft"
    duration: float | None = None
    file_size: int | None = None
    tiktok_url: str | None = None
    created_at: str | None = None


class VideoDetailResponse(VideoResponse):
    script: str | None = None
    broll_prompts: str | None = None
    video_path: str | None = None
    thumbnail_path: str | None = None
    draft_path: str | None = None
    uploaded_at: str | None = None


class VideoListResponse(BaseModel):
    videos: list[VideoResponse]
    total: int
    limit: int
    offset: int


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

class PipelineRunRequest(BaseModel):
    topic: str
    niche: str = "tech"
    provider: str = "gemini"
    auto_upload: bool = False
    target_duration: int = 60


class PipelineRunResponse(BaseModel):
    video_id: str
    status: str
    message: str


# ---------------------------------------------------------------------------
# Topics
# ---------------------------------------------------------------------------

class TopicResponse(BaseModel):
    title: str
    source: str
    trending_score: float
    summary: str
    url: str


class TopicsListResponse(BaseModel):
    topics: list[TopicResponse]


# ---------------------------------------------------------------------------
# Schedules
# ---------------------------------------------------------------------------

class ScheduleCreate(BaseModel):
    name: str
    cron_expr: str
    niche: str = "tech"
    action: str = "full"


class ScheduleResponse(BaseModel):
    id: int
    name: str
    cron_expr: str
    niche: str
    action: str
    is_active: bool
    last_run_at: str | None = None
    next_run_at: str | None = None
    created_at: str


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------

class ErrorResponse(BaseModel):
    error: bool = True
    code: str
    message: str
    details: dict = Field(default_factory=dict)

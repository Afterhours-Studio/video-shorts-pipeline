"""Video CRUD and file-serving endpoints."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from ..database import get_db
from ..models import VideoDetailResponse, VideoListResponse, VideoResponse

router = APIRouter(prefix="/api/videos", tags=["videos"])


@router.post("/sync")
async def sync_videos_from_disk():
    """Scan draft files on disk and register any CLI-produced videos not yet in DB."""
    import asyncio
    from verticals.db import scan_and_register_drafts

    count = await asyncio.get_event_loop().run_in_executor(None, scan_and_register_drafts)
    return {"synced": count}


@router.get("/", response_model=VideoListResponse)
async def list_videos(
    niche: str | None = None,
    status: str | None = None,
    limit: int = 20,
    offset: int = 0,
):
    """List videos with optional filtering and pagination."""
    async with get_db() as db:
        conditions: list[str] = []
        params: list[str | int] = []

        if niche:
            conditions.append("niche = ?")
            params.append(niche)
        if status:
            conditions.append("status = ?")
            params.append(status)

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        # Total count
        row = await db.execute_fetchall(
            f"SELECT COUNT(*) as cnt FROM videos {where}", params,
        )
        total = row[0][0] if row else 0

        # Paginated results
        rows = await db.execute_fetchall(
            f"SELECT * FROM videos {where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            [*params, limit, offset],
        )

    videos = [VideoResponse(**dict(r)) for r in rows]
    return VideoListResponse(videos=videos, total=total, limit=limit, offset=offset)


@router.get("/{video_id}", response_model=VideoDetailResponse)
async def get_video(video_id: str):
    """Get full video detail by ID."""
    async with get_db() as db:
        rows = await db.execute_fetchall(
            "SELECT * FROM videos WHERE id = ?", [video_id],
        )

    if not rows:
        raise HTTPException(status_code=404, detail="Video not found")

    return VideoDetailResponse(**dict(rows[0]))


@router.get("/{video_id}/file")
async def serve_video_file(video_id: str):
    """Stream the rendered .mp4 file."""
    async with get_db() as db:
        rows = await db.execute_fetchall(
            "SELECT video_path FROM videos WHERE id = ?", [video_id],
        )

    if not rows:
        raise HTTPException(status_code=404, detail="Video not found")

    video_path = rows[0]["video_path"]
    if not video_path or not Path(video_path).is_file():
        raise HTTPException(status_code=404, detail="Video file not found on disk")

    return FileResponse(
        path=video_path,
        media_type="video/mp4",
        filename=os.path.basename(video_path),
    )


@router.get("/{video_id}/thumbnail")
async def serve_thumbnail(video_id: str):
    """Serve the thumbnail .png file."""
    async with get_db() as db:
        rows = await db.execute_fetchall(
            "SELECT thumbnail_path FROM videos WHERE id = ?", [video_id],
        )

    if not rows:
        raise HTTPException(status_code=404, detail="Video not found")

    thumb_path = rows[0]["thumbnail_path"]
    if not thumb_path or not Path(thumb_path).is_file():
        raise HTTPException(status_code=404, detail="Thumbnail file not found on disk")

    return FileResponse(
        path=thumb_path,
        media_type="image/png",
        filename=os.path.basename(thumb_path),
    )


@router.delete("/{video_id}")
async def delete_video(video_id: str):
    """Delete a video record and its associated files from disk."""
    async with get_db() as db:
        rows = await db.execute_fetchall(
            "SELECT video_path, thumbnail_path, draft_path FROM videos WHERE id = ?",
            [video_id],
        )

        if not rows:
            raise HTTPException(status_code=404, detail="Video not found")

        record = dict(rows[0])

        # Remove files from disk
        for key in ("video_path", "thumbnail_path", "draft_path"):
            path = record.get(key)
            if path and Path(path).is_file():
                Path(path).unlink()

        # Remove related pipeline runs, then the video record
        await db.execute("DELETE FROM pipeline_runs WHERE video_id = ?", [video_id])
        await db.execute("DELETE FROM videos WHERE id = ?", [video_id])
        await db.commit()

    return {"deleted": True}

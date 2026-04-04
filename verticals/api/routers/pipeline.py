"""Pipeline execution and status endpoints."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException

from ..database import get_db
from ..models import PipelineRunRequest, PipelineRunResponse
from ..ws import ws_manager

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])
log = logging.getLogger(__name__)

PIPELINE_STAGES = ["research", "draft", "broll", "voiceover", "captions", "music", "assemble", "thumbnail"]


async def _broadcast_stage(video_id: str, stage: str, event: str, **extra):
    """Helper to broadcast a stage event via WebSocket."""
    payload = {"event": event, "stage": stage, "video_id": video_id, "timestamp": time.time()}
    payload.update(extra)
    await ws_manager.broadcast(video_id, payload)


async def _record_stage_start(video_id: str, stage: str):
    """Insert pipeline_runs row and broadcast stage_start."""
    async with get_db() as db:
        await db.execute(
            "INSERT INTO pipeline_runs (video_id, stage, status, started_at) "
            "VALUES (?, ?, 'running', datetime('now'))",
            [video_id, stage],
        )
        await db.commit()
    await _broadcast_stage(video_id, stage, "stage_start")


async def _record_stage_done(video_id: str, stage: str, duration: float):
    """Mark pipeline_runs row done and broadcast stage_done."""
    async with get_db() as db:
        await db.execute(
            "UPDATE pipeline_runs SET status = 'done', finished_at = datetime('now') "
            "WHERE video_id = ? AND stage = ?",
            [video_id, stage],
        )
        await db.commit()
    await _broadcast_stage(video_id, stage, "stage_done", duration=duration)


async def _is_cancelled(video_id: str) -> bool:
    """Check if the pipeline was cancelled by the user."""
    async with get_db() as db:
        rows = await db.execute_fetchall(
            "SELECT status FROM videos WHERE id = ?", [video_id],
        )
        return bool(rows and rows[0]["status"] == "failed")


def _run_stage_sync(fn, *args, **kwargs):
    """Run a blocking pipeline stage in a thread so we don't block the event loop."""
    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(fn, *args, **kwargs)
        return future.result()


async def _run_real_pipeline(video_id: str, request: PipelineRunRequest):
    """Execute the real production pipeline with WebSocket progress updates."""
    from verticals.config import DRAFTS_DIR, MEDIA_DIR
    from verticals.draft import generate_draft
    from verticals.broll import generate_broll
    from verticals.tts import generate_voiceover
    from verticals.captions import generate_captions
    from verticals.music import select_and_prepare_music
    from verticals.assemble import assemble_video, get_audio_duration
    from verticals.thumbnail import generate_thumbnail
    from verticals.niche import load_niche, get_voice_config, get_caption_config, get_music_config
    from verticals.state import PipelineState

    start_time = time.monotonic()
    lang = "vi"

    try:
        # ── Research + Draft ──────────────────────────────
        await _record_stage_start(video_id, "research")
        await _record_stage_start(video_id, "draft")
        t0 = time.monotonic()

        draft = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: generate_draft(
                request.topic, "",
                niche=request.niche,
                platform="tiktok",
                provider=request.provider or "gemini",
                lang=lang,
            ),
        )
        draft["job_id"] = video_id

        DRAFTS_DIR.mkdir(parents=True, exist_ok=True)
        draft_path = DRAFTS_DIR / f"{video_id}.json"
        state = PipelineState(draft)
        state.complete_stage("research")
        state.complete_stage("draft")
        state.save(draft_path)

        draft_dur = round(time.monotonic() - t0, 2)
        await _record_stage_done(video_id, "research", draft_dur)
        await _record_stage_done(video_id, "draft", draft_dur)

        # Update DB with draft metadata
        async with get_db() as db:
            await db.execute(
                "UPDATE videos SET title = ?, caption = ?, hashtags = ?, "
                "script = ?, broll_prompts = ?, draft_path = ? WHERE id = ?",
                [
                    draft.get("title"), draft.get("caption"), draft.get("hashtags"),
                    draft.get("script"), json.dumps(draft.get("broll_prompts", [])),
                    str(draft_path), video_id,
                ],
            )
            await db.commit()

        if await _is_cancelled(video_id):
            return

        # Load niche profile
        profile = load_niche(request.niche)
        MEDIA_DIR.mkdir(parents=True, exist_ok=True)
        work_dir = MEDIA_DIR / f"work_{video_id}_{lang}"
        work_dir.mkdir(exist_ok=True)

        script = draft.get("script", "")

        # ── B-roll ────────────────────────────────────────
        await _record_stage_start(video_id, "broll")
        t0 = time.monotonic()

        frames = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: generate_broll(draft.get("broll_prompts", ["Cinematic landscape"] * 3), work_dir),
        )
        state.complete_stage("broll", {"frames": [str(f) for f in frames]})
        state.save(draft_path)

        await _record_stage_done(video_id, "broll", round(time.monotonic() - t0, 2))
        if await _is_cancelled(video_id):
            return

        # ── Voiceover ─────────────────────────────────────
        await _record_stage_start(video_id, "voiceover")
        t0 = time.monotonic()

        voice_config = get_voice_config(profile, provider="edge_tts")
        vo_path = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: generate_voiceover(script, work_dir, voice_config=voice_config),
        )
        state.complete_stage("voiceover", {"path": str(vo_path)})
        state.save(draft_path)

        await _record_stage_done(video_id, "voiceover", round(time.monotonic() - t0, 2))
        if await _is_cancelled(video_id):
            return

        # ── Captions ──────────────────────────────────────
        await _record_stage_start(video_id, "captions")
        t0 = time.monotonic()

        caption_config = get_caption_config(profile)
        from verticals.config import load_config as _load_cfg
        _cfg = _load_cfg()
        captions_result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: generate_captions(
                vo_path, work_dir, lang,
                highlight_color=caption_config.get("highlight_color", "#FFFF00"),
                words_per_group=int(_cfg.get("CAPTION_MAX_WORDS", caption_config.get("words_per_group", 8))),
                split_mode=_cfg.get("CAPTION_SPLIT_MODE", "smart"),
            ),
        )
        state.complete_stage("captions", {
            "srt_path": str(captions_result.get("srt_path", "")),
            "ass_path": str(captions_result.get("ass_path", "")),
        })
        state.save(draft_path)

        await _record_stage_done(video_id, "captions", round(time.monotonic() - t0, 2))
        if await _is_cancelled(video_id):
            return

        # ── Music ─────────────────────────────────────────
        await _record_stage_start(video_id, "music")
        t0 = time.monotonic()

        music_config = get_music_config(profile)
        music_result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: select_and_prepare_music(
                vo_path, work_dir,
                duck_speech=music_config.get("duck_volume_speech", 0.12),
                duck_gap=music_config.get("duck_volume_gap", 0.25),
            ),
        )
        state.complete_stage("music", {
            "track_path": str(music_result.get("track_path", "")),
            "duck_filter": music_result.get("duck_filter", ""),
        })
        state.save(draft_path)

        await _record_stage_done(video_id, "music", round(time.monotonic() - t0, 2))
        if await _is_cancelled(video_id):
            return

        # ── Assemble ──────────────────────────────────────
        await _record_stage_start(video_id, "assemble")
        t0 = time.monotonic()

        video_path = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: assemble_video(
                frames=frames,
                voiceover=vo_path,
                out_dir=work_dir,
                job_id=video_id,
                ass_path=captions_result.get("ass_path"),
                music_path=music_result.get("track_path"),
                duck_filter=music_result.get("duck_filter"),
            ),
        )
        state.complete_stage("assemble", {"video_path": str(video_path)})
        state.save(draft_path)

        await _record_stage_done(video_id, "assemble", round(time.monotonic() - t0, 2))
        if await _is_cancelled(video_id):
            return

        # ── Thumbnail ─────────────────────────────────────
        await _record_stage_start(video_id, "thumbnail")
        t0 = time.monotonic()

        thumb_path = None
        try:
            thumb_path = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: generate_thumbnail(draft, work_dir),
            )
        except Exception as e:
            log.warning("Thumbnail generation failed: %s", e)

        await _record_stage_done(video_id, "thumbnail", round(time.monotonic() - t0, 2))

        # ── Finalize: update DB with all outputs ──────────
        duration = None
        file_size = None
        try:
            duration = await asyncio.get_event_loop().run_in_executor(
                None, lambda: get_audio_duration(vo_path),
            )
        except Exception:
            pass
        try:
            file_size = video_path.stat().st_size
        except Exception:
            pass

        async with get_db() as db:
            await db.execute(
                "UPDATE videos SET status = 'done', video_path = ?, thumbnail_path = ?, "
                "duration = ?, file_size = ? WHERE id = ?",
                [
                    str(video_path),
                    str(thumb_path) if thumb_path else None,
                    duration,
                    file_size,
                    video_id,
                ],
            )
            await db.commit()

        total_duration = round(time.monotonic() - start_time, 2)
        await ws_manager.broadcast(video_id, {
            "event": "pipeline_done",
            "video_id": video_id,
            "duration": total_duration,
            "video_path": str(video_path),
            "timestamp": time.time(),
        })

    except Exception as exc:
        log.exception("Pipeline failed for video %s", video_id)
        async with get_db() as db:
            await db.execute(
                "UPDATE videos SET status = 'failed' WHERE id = ?", [video_id],
            )
            await db.commit()

        await ws_manager.broadcast(video_id, {
            "event": "pipeline_error",
            "video_id": video_id,
            "error": str(exc),
            "timestamp": time.time(),
        })


@router.post("/run", response_model=PipelineRunResponse)
async def run_pipeline(request: PipelineRunRequest):
    """Start a new pipeline run in the background."""
    video_id = str(int(time.time()))

    async with get_db() as db:
        await db.execute(
            "INSERT INTO videos (id, topic, niche, status) VALUES (?, ?, ?, 'producing')",
            [video_id, request.topic, request.niche],
        )
        await db.commit()

    asyncio.create_task(_run_real_pipeline(video_id, request))

    return PipelineRunResponse(
        video_id=video_id,
        status="producing",
        message=f"Pipeline started for topic: {request.topic}",
    )


@router.get("/status/{video_id}")
async def get_pipeline_status(video_id: str):
    """Return all pipeline stage statuses for a given video."""
    async with get_db() as db:
        rows = await db.execute_fetchall(
            "SELECT id, status FROM videos WHERE id = ?", [video_id],
        )
        if not rows:
            raise HTTPException(status_code=404, detail="Video not found")

        stages = await db.execute_fetchall(
            "SELECT stage, status, started_at, finished_at, error "
            "FROM pipeline_runs WHERE video_id = ? ORDER BY id",
            [video_id],
        )

    return {
        "video_id": video_id,
        "video_status": rows[0]["status"],
        "stages": [dict(s) for s in stages],
    }


@router.post("/cancel/{video_id}")
async def cancel_pipeline(video_id: str):
    """Mark a running pipeline as cancelled by setting video status to failed."""
    async with get_db() as db:
        rows = await db.execute_fetchall(
            "SELECT id FROM videos WHERE id = ?", [video_id],
        )
        if not rows:
            raise HTTPException(status_code=404, detail="Video not found")

        await db.execute(
            "UPDATE videos SET status = 'failed' WHERE id = ?", [video_id],
        )
        await db.execute(
            "UPDATE pipeline_runs SET status = 'cancelled', finished_at = datetime('now') "
            "WHERE video_id = ? AND status IN ('pending', 'running')",
            [video_id],
        )
        await db.commit()

    # Broadcast cancellation as pipeline_error
    await ws_manager.broadcast(video_id, {
        "event": "pipeline_error",
        "video_id": video_id,
        "error": "Pipeline cancelled by user",
        "timestamp": time.time(),
    })

    return {"video_id": video_id, "status": "failed", "message": "Pipeline cancelled"}

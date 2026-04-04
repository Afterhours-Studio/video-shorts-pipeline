"""Verticals v4 API server."""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db
from .ws import ws_manager
from .routers import videos, pipeline, topics, schedules, settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup, sync CLI-produced videos."""
    await init_db()

    # Auto-register any videos produced via CLI that aren't in DB yet
    try:
        from verticals.db import scan_and_register_drafts
        count = await asyncio.get_event_loop().run_in_executor(None, scan_and_register_drafts)
        if count:
            import logging
            logging.getLogger(__name__).info("Synced %d CLI-produced videos into DB", count)
    except Exception:
        pass

    yield


app = FastAPI(
    title="Verticals v4 API",
    description="Vietnamese TikTok video automation pipeline API",
    version="4.0.0",
    lifespan=lifespan,
)

# CORS for React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(videos.router)
app.include_router(pipeline.router)
app.include_router(topics.router)
app.include_router(schedules.router)
app.include_router(settings.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "4.0.0"}


@app.websocket("/ws/pipeline/{video_id}")
async def websocket_endpoint(websocket: WebSocket, video_id: str):
    await websocket.accept()
    ws_manager.connect(video_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(video_id, websocket)

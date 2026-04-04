"""WebSocket connection manager for live pipeline updates."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Track WebSocket connections per video_id and broadcast updates."""

    def __init__(self) -> None:
        self._connections: dict[str, list[WebSocket]] = {}

    def connect(self, video_id: str, websocket: WebSocket) -> None:
        """Register an already-accepted WebSocket for *video_id*."""
        self._connections.setdefault(video_id, []).append(websocket)
        logger.debug(
            "WS connected: video_id=%s (%d total)",
            video_id,
            len(self._connections[video_id]),
        )

    def disconnect(self, video_id: str, websocket: WebSocket) -> None:
        """Remove a WebSocket from the active connections for *video_id*."""
        conns = self._connections.get(video_id)
        if conns is None:
            return
        try:
            conns.remove(websocket)
        except ValueError:
            pass
        if not conns:
            del self._connections[video_id]
        logger.debug("WS disconnected: video_id=%s", video_id)

    async def broadcast(self, video_id: str, data: dict[str, Any]) -> None:
        """Send *data* as JSON to every connected client for *video_id*."""
        conns = self._connections.get(video_id)
        if not conns:
            return

        stale: list[WebSocket] = []
        for ws in conns:
            try:
                await ws.send_json(data)
            except Exception:
                stale.append(ws)

        for ws in stale:
            try:
                conns.remove(ws)
            except ValueError:
                pass
        if not conns and video_id in self._connections:
            del self._connections[video_id]

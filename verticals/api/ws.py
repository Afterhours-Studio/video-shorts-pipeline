"""Shared WebSocket manager instance.

Separated into its own module to avoid circular imports between
main.py and router modules that need to broadcast events.
"""

from .websocket import WebSocketManager

ws_manager = WebSocketManager()

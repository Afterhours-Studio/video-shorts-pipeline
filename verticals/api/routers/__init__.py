"""API router registry."""

from .pipeline import router as pipeline_router
from .schedules import router as schedules_router
from .settings import router as settings_router
from .topics import router as topics_router
from .videos import router as videos_router

all_routers = [
    videos_router,
    pipeline_router,
    topics_router,
    schedules_router,
    settings_router,
]

__all__ = [
    "all_routers",
    "pipeline_router",
    "schedules_router",
    "settings_router",
    "topics_router",
    "videos_router",
]

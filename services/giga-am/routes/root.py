"""
Root endpoint.
"""
from fastapi import APIRouter

from config import settings

router = APIRouter()


@router.get("/")
async def root():
    """Корневой endpoint с информацией о сервисе"""
    return {
        "message": "GigaAM Sync API для распознавания русской речи",
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/health",
        "metrics": "/api/metrics"
    }

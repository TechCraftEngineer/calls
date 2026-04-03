"""
Health check эндпоинты.
"""

import logging
from typing import Dict, Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health_check() -> JSONResponse:
    """
    Проверка здоровья сервиса.
    """
    return JSONResponse(content={
        "status": "healthy",
        "service": "giga-am-transcription",
        "version": "1.0.0"
    })


@router.get("/ready")
async def readiness_check() -> JSONResponse:
    """
    Проверка готовности сервиса.
    """
    # Здесь можно добавить проверку загрузки моделей
    return JSONResponse(content={
        "status": "ready",
        "service": "giga-am-transcription"
    })

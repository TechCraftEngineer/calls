"""
Health check эндпоинты.
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(tags=["health"])


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
    try:
        # Здесь можно добавить проверку загрузки моделей или доступности зависимостей
        # Например, проверить доступность transcription_service или diarization_service
        from services.transcription_service import transcription_service
        
        # Простая проверка - сервис импортирован и готов к работе
        return JSONResponse(content={
            "status": "ready",
            "service": "giga-am-transcription"
        })
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "not_ready",
                "service": "giga-am-transcription",
                "reason": f"Service not ready: {str(e)}"
            }
        )

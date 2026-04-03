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
        # Импортируем и проверяем готовность transcription_service
        from services.transcription_service import transcription_service
        
        # Проверяем, что сервис готов к работе
        # Используем внутренние флаги _model_initialized/_model_loading, так как is_ready() не существует
        if not transcription_service._model_initialized or transcription_service._model_loading:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "not_ready",
                    "service": "giga-am-transcription",
                    "reason": "model not loaded or still loading"
                }
            )
        
        # Если нет специфических проверок готовности, считаем сервис готовым
        return JSONResponse(content={
            "status": "ready",
            "service": "giga-am-transcription"
        })
        
    except AttributeError as ae:
        return JSONResponse(
            status_code=503,
            content={
                "status": "not_ready",
                "service": "giga-am-transcription",
                "reason": f"Service attribute missing: {str(ae)}"
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "not_ready",
                "service": "giga-am-transcription",
                "reason": f"Service not ready: {str(e)}"
            }
        )

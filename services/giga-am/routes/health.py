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
        if hasattr(transcription_service, 'is_ready'):
            is_ready = transcription_service.is_ready()
            if not is_ready:
                return JSONResponse(
                    status_code=503,
                    content={
                        "status": "not_ready",
                        "service": "giga-am-transcription",
                        "reason": "transcription_service.is_ready() returned False"
                    }
                )
        elif hasattr(transcription_service, 'model_initialized'):
            if not transcription_service.model_initialized:
                return JSONResponse(
                    status_code=503,
                    content={
                        "status": "not_ready",
                        "service": "giga-am-transcription",
                        "reason": "transcription_service.model_initialized is False"
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

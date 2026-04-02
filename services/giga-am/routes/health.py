"""
Health check и информационные endpoints.
"""
from fastapi import APIRouter

from config import settings
from services.transcription_service import transcription_service
from utils.cache import cache
from utils.metrics import metrics

router = APIRouter()


@router.get("/health")
async def health_check():
    """Проверка работоспособности сервиса"""
    model_health = transcription_service.health_check()
    health_status = metrics.get_health_status()
    
    return {
        "status": health_status["status"],
        "app_name": settings.app_name,
        "version": settings.app_version,
        "model": model_health,
        "metrics": health_status
    }


@router.get("/info")
async def app_info():
    """Информация о приложении"""
    return {
        "app_name": settings.app_name,
        "version": settings.app_version,
        "description": "Sync API для распознавания русской речи на базе GigaAM",
        "supported_formats": settings.allowed_audio_formats,
        "max_file_size_mb": settings.max_file_size // (1024 * 1024),
        "endpoints": {
            "/api/transcribe": "POST - Синхронное распознавание речи",
            "/api/health": "GET - Проверка работоспособности",
            "/api/info": "GET - Информация о приложении",
            "/api/metrics": "GET - Метрики производительности",
            "/api/cache/stats": "GET - Статистика кэша",
            "/api/cache/clear": "POST - Очистка кэша (admin)",
            "/api/debug-embeddings": "POST - Диагностика эмбеддингов"
        },
    }


@router.get("/metrics")
async def get_metrics():
    """Получение детальных метрик производительности"""
    stats = metrics.get_current_stats()
    stats["cache"] = cache.get_stats()
    return stats

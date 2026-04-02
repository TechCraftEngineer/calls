"""
Endpoint для диагностики (отключен после перехода на remote diarization).
"""
import logging
from fastapi import APIRouter
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Проверка работоспособности сервиса.
    """
    return JSONResponse(content={
        "status": "ok",
        "service": "giga-am",
        "message": "Service is running"
    })

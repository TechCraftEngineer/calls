"""
Endpoint для диагностики (отключен после перехода на remote diarization).
"""
import logging
from fastapi import APIRouter
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/diagnostics/health")
async def diagnostics_health_check():
    """
    Проверка работоспособности сервиса диагностики.
    """
    return JSONResponse(content={
        "status": "ok",
        "service": "giga-am-diagnostics",
        "message": "Diagnostics service is running"
    })

"""
Синхронный эндпоинт транскрипции для вызова из Inngest.
"""

import logging
from typing import Dict, Any

from fastapi import APIRouter, File, Form, HTTPException
from fastapi.responses import JSONResponse

from services.pipeline_service import PipelineService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["transcription"])
pipeline_service = PipelineService()


@router.post("/transcribe-sync")
async def transcribe_sync(
    file: bytes = File(...),
    filename: str = Form(...)
) -> JSONResponse:
    """
    Синхронная транскрипция аудио файла.
    
    Вызывается из Inngest и ждет завершения обработки.
    """
    try:
        logger.info(f"Получен синхронный запрос на транскрипцию: {filename}")
        
        # Запускаем транскрипцию и ждем результата
        result = await pipeline_service.process_audio_sync(
            audio_data=file,
            filename=filename
        )
        
        logger.info(f"Синхронная транскрипция завершена")
        
        return JSONResponse(content=result)
        
    except Exception as exc:
        logger.exception("Ошибка синхронной транскрипции: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Внутренняя ошибка сервера при транскрипции"
        )

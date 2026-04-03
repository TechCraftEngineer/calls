"""
Синхронный эндпоинт транскрипции для вызова из Inngest.
"""

import logging
from typing import Dict, Any

from fastapi import APIRouter, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from services.pipeline_service import PipelineService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["transcription"])
pipeline_service = PipelineService()


@router.post("/transcribe-sync")
async def transcribe_sync(
    file: UploadFile,
    filename: str = Form(...)
) -> JSONResponse:
    """
    Синхронная транскрипция аудио файла.
    
    Вызывается из Inngest и ждет завершения обработки.
    """
    try:
        logger.info(f"Получен синхронный запрос на транскрипцию: {filename}")
        
        # Читаем файл из UploadFile
        audio_data = await file.read()
        
        # Запускаем транскрипцию и ждем результата
        result = await pipeline_service.process_audio_sync(
            audio_data=audio_data,
            filename=filename
        )
        
        logger.info("Синхронная транскрипция завершена")
        
        return JSONResponse(content=result)
        
    except ValueError as ve:
        # Обработка ошибок валидации (например, слишком большой файл)
        logger.error("Ошибка валидации в синхронной транскрипции: %s", ve)
        
        # Проверяем, связана ли ошибка с размером файла
        error_message = str(ve).lower()
        if "size" in error_message or "размер" in error_message or "превышает" in error_message:
            # Ошибка размера файла - статус 413
            raise HTTPException(
                status_code=413,
                detail=str(ve)
            ) from ve
        else:
            # Общая ошибка валидации - статус 400
            raise HTTPException(
                status_code=400,
                detail=f"Ошибка валидации: {str(ve)}"
            ) from ve
    except Exception as exc:
        logger.exception("Ошибка синхронной транскрипции: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Внутренняя ошибка сервера при транскрипции"
        )

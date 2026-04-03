"""
Синхронный эндпоинт транскрипции для вызова из Inngest.
"""

import logging
from typing import Dict, Any

from fastapi import APIRouter, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from services.pipeline_service import PipelineService
from utils.exceptions import FileSizeError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["transcription"])
pipeline_service = PipelineService()


@router.post("/transcribe-sync")
async def transcribe_sync(
    file: UploadFile,
    filename: str = Form(...),
    diarization: bool = Form(False)
) -> JSONResponse:
    """
    Синхронная транскрипция аудио файла.
    
    Вызывается из Inngest и ждет завершения обработки.
    """
    try:
        logger.info(f"Получен синхронный запрос на транскрипцию: {filename}, diarization={diarization}")
        
        # Читаем файл из UploadFile
        audio_data = await file.read()
        
        # Запускаем транскрипцию и ждем результата
        result = await pipeline_service.process_audio_sync(
            audio_data=audio_data,
            filename=filename,
            diarization=diarization
        )
        
        logger.info("Синхронная транскрипция завершена")
        
        return JSONResponse(content=result)
        
    except FileSizeError as fse:
        # Обработка ошибки размера файла - статус 413
        logger.error("Ошибка размера файла в синхронной транскрипции: %s", fse)
        raise HTTPException(
            status_code=413,
            detail=str(fse)
        ) from fse
    except ValueError as ve:
        # Обработка остальных ошибок валидации - статус 400
        logger.error("Ошибка валидации в синхронной транскрипции: %s", ve)
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

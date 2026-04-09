"""
Синхронный эндпоинт транскрипции.
Для новой архитектуры: быстрая синхронная транскрибация без диаризации.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from config import settings
from services.pipeline_service import PipelineService
from utils.exceptions import FileSizeError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["sync-transcription"])
pipeline_service = PipelineService()


@router.post("/transcribe-sync")
async def transcribe_sync(
    file: UploadFile,
    filename: str = Form(...),
    diarization: Optional[str] = Form("false")
) -> JSONResponse:
    # Валидация параметра diarization
    if diarization not in ["true", "false", None]:
        raise HTTPException(
            status_code=400,
            detail="diarization parameter must be 'true' or 'false'"
        )
    """
    Синхронная транскрипция аудио файла.
    
    Возвращает результат сразу, без создания задачи в фоне.
    Используется для первичной транскрибации в новой архитектуре.
    
    Args:
        file: Аудио файл
        filename: Имя файла
        diarization: Включить диаризацию (по умолчанию false)
        
    Returns:
        JSONResponse с результатом транскрипции
    """
    request_id = f"sync-req-{id(file) % 10000}"
    
    try:
        logger.info(f"[{request_id}] Получен синхронный запрос на транскрипцию: {filename}")
        
        # Читаем файл
        audio_data = await file.read()
        
        # Проверяем размер файла
        max_size = settings.max_file_size
        if len(audio_data) > max_size:
            raise HTTPException(
                status_code=413,
                detail=f"Размер файла ({len(audio_data)} bytes) превышает лимит ({max_size} bytes)"
            )
        
        # Запускаем синхронную обработку
        result = await pipeline_service.process_audio_sync(
            audio_data=audio_data,
            filename=filename
        )
        
        logger.info(f"[{request_id}] Синхронная транскрибация завершена")
        
        return JSONResponse(
            status_code=200,
            content=result
        )
        
    except FileSizeError as fse:
        logger.error(f"[{request_id}] Ошибка размера файла: {fse}")
        raise HTTPException(
            status_code=413,
            detail=str(fse)
        ) from fse
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(f"[{request_id}] Ошибка синхронной транскрипции: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Внутренняя ошибка сервера при транскрипции"
        ) from exc

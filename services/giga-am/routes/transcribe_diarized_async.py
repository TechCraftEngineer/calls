"""
Асинхронный эндпоинт транскрипции с диаризацией и поддержкой Inngest callback.
"""
import asyncio
import json
import logging
from typing import Dict, Any, Optional, Set, List

import httpx
from fastapi import APIRouter, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from config import settings
from services.diarized_transcription_service import diarized_transcription_service
from services.task_manager import TaskManager, TaskStatus, task_manager
from utils.exceptions import FileSizeError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["async-diarized-transcription"])

# Set для отслеживания background tasks
BACKGROUND_TASKS: Set[asyncio.Task] = set()


class DiarizationSegmentInput(BaseModel):
    """Сегмент диаризации для входного запроса"""
    start: float = Field(..., description="Начало сегмента в секундах", ge=0)
    end: float = Field(..., description="Конец сегмента в секундах", ge=0)
    speaker: str = Field(..., description="Идентификатор спикера")


async def send_inngest_event(
    task_id: str,
    status: str,
    result: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None
) -> bool:
    """
    Отправка события в Inngest о завершении задачи.
    
    Args:
        task_id: ID задачи
        status: Статус (completed/failed)
        result: Результат транскрипции
        error: Ошибка если есть
        
    Returns:
        True если успешно отправлено
    """
    if not settings.inngest_event_key or not settings.inngest_api_url:
        logger.warning("Inngest credentials not configured, skipping callback")
        return False
    
    # Всегда используем зарегистрированное событие "giga-am/transcription.completed"
    # Статус передается в payload
    event_name = "giga-am/transcription.completed"
    
    payload = {
        "task_id": task_id,
        "status": status,
        "result": result,
        "error": error,
    }
    
    try:
        async with httpx.AsyncClient(timeout=settings.callback_timeout) as client:
            response = await client.post(
                f"{settings.inngest_api_url}/v1/events",
                headers={
                    "Authorization": f"Bearer {settings.inngest_event_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "name": event_name,
                    "data": payload,
                }
            )
            
            if response.status_code == 200:
                logger.info(f"Sent Inngest event {event_name} for task {task_id}")
                return True
            else:
                logger.error(
                    f"Failed to send Inngest event: {response.status_code} {response.text}"
                )
                return False
    except Exception as e:
        logger.error(f"Error sending Inngest event: {e}", exc_info=True)
        return False


async def process_diarized_task_background(task_id: str, segments: List[Dict[str, Any]]):
    """
    Фоновая обработка задачи транскрипции с диаризацией.
    
    Args:
        task_id: ID задачи
        segments: Сегменты диаризации
    """
    task = task_manager.get_task(task_id)
    if not task:
        logger.error(f"Task {task_id} not found for background processing")
        return
    
    try:
        logger.info(f"Starting background processing for diarized task {task_id}")
        
        # Обновляем статус на processing
        task_manager.update_status(task_id, TaskStatus.PROCESSING)
        
        # Запускаем транскрипцию с диаризацией
        result = await diarized_transcription_service.transcribe_diarized_audio(
            audio_data=task.audio_data,
            filename=task.filename,
            segments=segments
        )
        
        # Обновляем статус на completed
        task_manager.update_status(task_id, TaskStatus.COMPLETED, result=result)
        
        # Отправляем событие в Inngest
        await send_inngest_event(task_id, "completed", result=result)
        
        logger.info(f"Diarized task {task_id} completed successfully")
        
    except Exception as e:
        logger.error(f"Diarized task {task_id} failed: {e}", exc_info=True)
        
        # Обновляем статус на failed
        task_manager.update_status(
            task_id,
            TaskStatus.FAILED,
            error=str(e)
        )
        
        # Отправляем событие в Inngest
        await send_inngest_event(task_id, "failed", error=str(e))


@router.post("/transcribe-diarized-async")
async def transcribe_diarized_async(
    file: UploadFile,
    filename: str = Form(..., description="Имя аудио файла"),
    segments: str = Form(
        ...,
        description='JSON массив сегментов: [{"start": 0.0, "end": 5.0, "speaker": "A"}, ...]'
    )
) -> JSONResponse:
    """
    Асинхронная транскрипция диаризированного аудио файла.
    
    Возвращает task_id сразу и обрабатывает в фоне.
    Результат будет отправлен через Inngest event или webhook.
    
    Args:
        file: Аудио файл
        filename: Имя файла
        segments: JSON строка с массивом сегментов диаризации
        
    Returns:
        JSONResponse с task_id
    """
    request_id = f"diarized-async-req-{id(file) % 10000}"
    
    # Проверяем конфигурацию Inngest перед созданием задачи
    if not settings.inngest_event_key or not settings.inngest_api_url:
        raise HTTPException(
            status_code=503,
            detail="Inngest callback not configured. Set INNGEST_EVENT_KEY and INNGEST_API_URL to use async mode."
        )
    
    try:
        logger.info(f"[{request_id}] Получен асинхронный запрос на транскрипцию диаризированного аудио: {filename}")
        
        # Парсим сегменты из JSON
        try:
            segments_data = json.loads(segments)
            if not isinstance(segments_data, list):
                raise ValueError("segments должен быть массивом")
        except json.JSONDecodeError as e:
            logger.error(f"[{request_id}] Ошибка парсинга segments JSON: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"Невалидный JSON в segments: {e}"
            ) from e
        except ValueError as e:
            logger.error(f"[{request_id}] Невалидный формат segments: {e}")
            raise HTTPException(
                status_code=400,
                detail=str(e)
            ) from e
        
        # Валидируем сегменты
        for i, seg in enumerate(segments_data):
            if not all(k in seg for k in ["start", "end", "speaker"]):
                raise HTTPException(
                    status_code=400,
                    detail=f"Сегмент {i} должен содержать поля: start, end, speaker"
                )
        
        logger.info(f"[{request_id}] Парсинг сегментов успешен: {len(segments_data)} сегментов")
        
        # Читаем файл
        audio_data = await file.read()
        
        # Проверяем размер файла
        max_size = settings.max_file_size
        if len(audio_data) > max_size:
            raise HTTPException(
                status_code=413,
                detail=f"Размер файла ({len(audio_data)} bytes) превышает лимит ({max_size} bytes)"
            )
        
        if not audio_data:
            raise HTTPException(
                status_code=400,
                detail="Аудио файл пуст"
            )
        
        logger.info(f"[{request_id}] Аудио файл прочитан: {len(audio_data)} bytes")
        
        # Создаем задачу
        task = task_manager.create_task(filename, audio_data)
        
        # Запускаем фоновую обработку с отслеживанием
        background_task = asyncio.create_task(
            process_diarized_task_background(task.task_id, segments_data)
        )
        BACKGROUND_TASKS.add(background_task)
        background_task.add_done_callback(BACKGROUND_TASKS.discard)
        
        logger.info(f"[{request_id}] Задача создана: {task.task_id}")
        
        return JSONResponse(
            status_code=202,
            content={
                "task_id": task.task_id,
                "status": "pending",
                "message": "Task created and processing in background"
            }
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
        logger.exception(f"[{request_id}] Ошибка асинхронной транскрипции с диаризацией: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Внутренняя ошибка сервера при создании задачи"
        ) from exc

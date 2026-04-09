"""
Асинхронный эндпоинт транскрипции с поддержкой Inngest callback.
"""
import asyncio
import logging
from typing import Dict, Any, Optional, Set

import httpx
from fastapi import APIRouter, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from config import settings
from services.pipeline_service import PipelineService
from services.task_manager import TaskManager, TaskStatus, task_manager
from utils.exceptions import FileSizeError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["async-transcription"])
pipeline_service = PipelineService()

# Set для отслеживания background tasks
BACKGROUND_TASKS: Set[asyncio.Task] = set()


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


async def process_task_background(task_id: str):
    """
    Фоновая обработка задачи транскрипции.
    
    Args:
        task_id: ID задачи
    """
    task = task_manager.get_task(task_id)
    if not task:
        logger.error(f"Task {task_id} not found for background processing")
        return
    
    try:
        logger.info(f"Starting background processing for task {task_id}")
        
        # Обновляем статус на processing
        task_manager.update_status(task_id, TaskStatus.PROCESSING)
        
        # Запускаем транскрипцию
        result = await pipeline_service.process_audio_sync(
            audio_data=task.audio_data,
            filename=task.filename
        )
        
        # Обновляем статус на completed
        task_manager.update_status(task_id, TaskStatus.COMPLETED, result=result)
        
        # Отправляем событие в Inngest
        await send_inngest_event(task_id, "completed", result=result)
        
        logger.info(f"Task {task_id} completed successfully")
        
    except Exception as e:
        logger.error(f"Task {task_id} failed: {e}", exc_info=True)
        
        # Обновляем статус на failed
        task_manager.update_status(
            task_id,
            TaskStatus.FAILED,
            error=str(e)
        )
        
        # Отправляем событие в Inngest
        await send_inngest_event(task_id, "failed", error=str(e))


@router.post("/transcribe-async")
async def transcribe_async(
    file: UploadFile,
    filename: str = Form(...),
    callback_url: Optional[str] = Form(None)
) -> JSONResponse:
    """
    Асинхронная транскрипция аудио файла.
    
    Возвращает task_id сразу и обрабатывает в фоне.
    Результат будет отправлен через Inngest event или webhook.
    
    Args:
        file: Аудио файл
        filename: Имя файла
        callback_url: Опциональный webhook URL для обратного вызова
        
    Returns:
        JSONResponse с task_id
    """
    try:
        logger.info(f"Получен асинхронный запрос на транскрипцию: {filename}")
        
        # Читаем файл
        audio_data = await file.read()
        
        # Проверяем размер файла
        max_size = settings.max_file_size
        if len(audio_data) > max_size:
            raise HTTPException(
                status_code=413,
                detail=f"Размер файла ({len(audio_data)} bytes) превышает лимит ({max_size} bytes)"
            )
        
        # Создаем задачу
        task = task_manager.create_task(filename, audio_data)
        
        # Запускаем фоновую обработку с отслеживанием
        background_task = asyncio.create_task(process_task_background(task.task_id))
        BACKGROUND_TASKS.add(background_task)
        background_task.add_done_callback(BACKGROUND_TASKS.discard)
        
        return JSONResponse(
            status_code=202,
            content={
                "task_id": task.task_id,
                "status": "pending",
                "message": "Task created and processing in background"
            }
        )
        
    except FileSizeError as fse:
        logger.error("Ошибка размера файла в асинхронной транскрипции: %s", fse)
        raise HTTPException(
            status_code=413,
            detail=str(fse)
        ) from fse
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Ошибка асинхронной транскрипции: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Внутренняя ошибка сервера при создании задачи"
        ) from exc


@router.get("/status/{task_id}")
async def get_task_status(task_id: str) -> JSONResponse:
    """
    Получение статуса задачи по ID.
    
    Args:
        task_id: ID задачи
        
    Returns:
        JSONResponse со статусом задачи
    """
    task = task_manager.get_task(task_id)
    
    if not task:
        raise HTTPException(
            status_code=404,
            detail=f"Task {task_id} not found"
        )
    
    return JSONResponse(content=task.to_dict())


@router.get("/tasks/stats")
async def get_tasks_stats() -> JSONResponse:
    """
    Получение статистики по задачам.
    
    Returns:
        JSONResponse со статистикой
    """
    stats = task_manager.get_stats()
    return JSONResponse(content=stats)

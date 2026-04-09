"""
Асинхронный эндпоинт транскрипции с диаризацией и поддержкой Inngest callback.
"""
import asyncio
import io
import json
import logging
from typing import Dict, Any, Optional, Set, List

import httpx
from fastapi import APIRouter, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator, model_validator

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

    @field_validator("speaker")
    @classmethod
    def validate_speaker_non_empty(cls, v: str) -> str:
        """Проверяет что speaker не пустой"""
        if not v or not v.strip():
            raise ValueError("speaker не может быть пустым")
        return v.strip()

    @model_validator(mode="after")
    def validate_end_greater_than_start(self) -> "DiarizationSegmentInput":
        """Проверяет что end больше start"""
        if self.end <= self.start:
            raise ValueError("end должен быть больше start")
        return self


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

    # Формируем payload динамически, добавляя ключи только когда значение не None
    payload = {
        "task_id": task_id,
        "status": status,
    }
    if result is not None:
        payload["result"] = result
    if error is not None:
        payload["error"] = error
    
    # Формируем тело запроса для логирования
    request_body = {
        "name": event_name,
        "data": payload,
    }

    try:
        logger.info(f"[Inngest] Отправка события: {request_body}")

        async with httpx.AsyncClient(timeout=settings.callback_timeout) as client:
            response = await client.post(
                f"{settings.inngest_api_url}/e/{settings.inngest_event_key}",
                headers={
                    "Content-Type": "application/json",
                },
                json=request_body
            )

            if response.status_code == 200:
                logger.info(f"[Inngest] Событие отправлено: {event_name} для task {task_id}")
                return True
            else:
                logger.error(
                    f"[Inngest] Ошибка отправки: {response.status_code} {response.text}"
                )
                return False
    except Exception as e:
        logger.error(f"[Inngest] Ошибка отправки события: {e}", exc_info=True)
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

        # Проверяем что список сегментов не пустой
        if len(segments_data) == 0:
            logger.error(f"[{request_id}] Список сегментов пуст")
            raise HTTPException(
                status_code=400,
                detail="Список сегментов не может быть пустым"
            )

        # Валидируем сегменты с помощью Pydantic
        try:
            from pydantic import parse_obj_as
            validated_segments = parse_obj_as(List[DiarizationSegmentInput], segments_data)
            segments_data = [seg.model_dump() for seg in validated_segments]
        except Exception as e:
            logger.error(f"[{request_id}] Ошибка валидации сегментов: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"Невалидные сегменты: {e}"
            ) from e
        
        logger.info(f"[{request_id}] Парсинг сегментов успешен: {len(segments_data)} сегментов")

        # Читаем файл чанками с проверкой размера во время чтения
        CHUNK_SIZE = 64 * 1024  # 64KB
        max_size = settings.max_file_size
        audio_buffer = io.BytesIO()
        total_size = 0

        while True:
            chunk = await file.read(CHUNK_SIZE)
            if not chunk:
                break

            total_size += len(chunk)
            if total_size > max_size:
                raise HTTPException(
                    status_code=413,
                    detail=f"Размер файла ({total_size} bytes) превышает лимит ({max_size} bytes)"
                )

            audio_buffer.write(chunk)

        audio_data = audio_buffer.getvalue()

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

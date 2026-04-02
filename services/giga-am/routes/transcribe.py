"""
Endpoint для транскрипции аудио.
"""
import json
import logging
import os
import uuid
from typing import Any

from fastapi import APIRouter, File, Form, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse

from config import settings
from services.pipeline_service import run_ultra_pipeline
from utils.cache import cache
from utils.error_handlers import setup_exception_handlers
from utils.exceptions import (
    AudioProcessingError,
    FileSizeError,
    GigaAMException,
    GigaTimeoutError,
    ModelLoadError,
    ServiceUnavailableError,
    TranscriptionError,
    UnsupportedFormatError,
    ValidationError,
)
from utils.file_validation import FileValidator
from utils.metrics import RequestTracker, metrics

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/transcribe")
async def api_transcribe(
    request: Request,
    file: UploadFile = File(...),
    preprocess_metadata_json: str | None = Form(default=None),
):
    """
    Синхронное распознавание речи из аудиофайла.

    Поддерживаемые форматы: MP3, WAV, FLAC, M4A, AAC, OGG, WEBM
    Максимальный размер файла: 100MB
    """
    import uuid
    request_id = str(uuid.uuid4())
    
    tmp_path = None
    file_hash = None
    audio_metadata = {}
    
    try:
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                content_length = int(content_length)
            except ValueError:
                content_length = None

        FileValidator.validate_audio_file(file, content_length)
        file_info = FileValidator.get_file_info(file)
        logger.info(
            "Получен файл: %s (%s bytes) [Request: %s]",
            os.path.basename(file_info["filename"]),
            file_info["size"],
            request_id,
        )

        # Создаем временный файл и обрабатываем его в том же контексте
        with FileValidator.secure_temp_file(file) as tmp_path:
            try:
                # Дополнительная валидация содержимого аудиофайла
                audio_metadata = FileValidator.validate_audio_content(tmp_path)
                logger.info("Аудиометаданные: %s", audio_metadata)
                
                # Вычисляем хеш файла для кэширования и отладки
                file_hash = FileValidator.calculate_file_hash(tmp_path)
                logger.debug("Хеш файла: %s", file_hash)
            except (AudioProcessingError, ValidationError, GigaAMException, ModelLoadError, GigaTimeoutError) as e:
                raise e
            except Exception as e:
                raise AudioProcessingError(
                    f"Ошибка при валидации аудиофайла: {str(e)}",
                    audio_file=tmp_path
                ) from e
            
            # Обрабатываем preprocess_metadata
            preprocess_metadata: dict[str, Any] | None = None
            if preprocess_metadata_json and preprocess_metadata_json.strip():
                try:
                    parsed = json.loads(preprocess_metadata_json)
                except json.JSONDecodeError as exc:
                    raise ValidationError(
                        f"Некорректный preprocess_metadata_json: {exc}",
                        field="preprocess_metadata_json"
                    ) from exc
                if not isinstance(parsed, dict):
                    raise ValidationError(
                        "preprocess_metadata_json должен быть JSON объектом",
                        field="preprocess_metadata_json"
                    )
                preprocess_metadata = parsed

            # Отслеживание запроса с метриками
            with RequestTracker(request_id, file_info.get("size", 0), file_hash) as tracker:
                # Устанавливаем длительность аудио
                if audio_metadata.get("duration"):
                    metrics.set_audio_duration(request_id, audio_metadata["duration"])
                
                # Проверяем кэш перед обработкой
                cached_result = cache.get(file_hash)
                if cached_result:
                    logger.info(
                        "Результат получен из кэша для файла %s [Request: %s]", 
                        os.path.basename(file.filename), 
                        request_id
                    )
                    # Добавляем метаданные кэшированного результата
                    cached_result["file_hash"] = file_hash
                    cached_result["audio_metadata"] = audio_metadata
                    cached_result["request_id"] = request_id
                    cached_result["processing_time"] = 0.0  # Кэшированный результат обрабатывается мгновенно
                    cached_result["cached"] = True
                    return JSONResponse(content=cached_result)
                
                # Возвращаем немедленный ответ с request_id для асинхронной обработки
                initial_response = {
                    "request_id": request_id,
                    "status": "processing",
                    "message": "Транскрипция началась, используйте request_id для получения результатов",
                    "results_url": f"/api/results/{request_id}",
                    "file_hash": file_hash,
                    "audio_metadata": audio_metadata,
                }
                
                # Запускаем обработку в фоне
                import asyncio
                asyncio.create_task(
                    run_processing_background(
                        tmp_path, 
                        preprocess_metadata, 
                        request_id, 
                        file_hash, 
                        audio_metadata,
                        tracker
                    )
                )
                
                return JSONResponse(content=initial_response)
    except (ValidationError, AudioProcessingError, TranscriptionError, 
            FileSizeError, UnsupportedFormatError, ServiceUnavailableError, 
            GigaTimeoutError, GigaAMException, ModelLoadError):
        raise
    except Exception as exc:
        logger.exception("Внутренняя ошибка сервера: %s", exc)
        raise ServiceUnavailableError(
            "Внутренняя ошибка сервера",
            service_name="gigaam-api"
        ) from exc


async def run_processing_background(
    tmp_path: str,
    preprocess_metadata: dict[str, Any] | None,
    request_id: str,
    file_hash: str,
    audio_metadata: dict[str, Any],
    tracker: RequestTracker,
) -> None:
    """
    Фоновая обработка транскрипции.
    
    Запускается асинхронно после возврата initial response.
    """
    try:
        # Выполняем pipeline в фоне
        result = await run_in_threadpool(
            run_ultra_pipeline,
            tmp_path,
            preprocess_metadata,
            request_id,
        )
        
        if result.get("success"):
            # Сохраняем результат в кэш
            cache.put(file_hash, result, audio_metadata)
            logger.info(
                "Фоновое распознавание завершено [Request: %s] за %.2fs", 
                request_id, 
                tracker.duration
            )
        else:
            # Обработка ошибки из pipeline
            error_msg = result.get("error", "Unknown error")
            logger.error(
                "Ошибка фонового распознавания [Request: %s]: %s", 
                request_id, 
                error_msg
            )
            
    except Exception as e:
        logger.error(
            "Ошибка в фоновой обработке [Request: %s]: %s", 
            request_id, 
            str(e), 
            exc_info=True
        )

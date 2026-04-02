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
            except (AudioProcessingError, ValidationError) as e:
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
                
                try:
                    result = await run_in_threadpool(
                        run_ultra_pipeline,
                        tmp_path,
                        preprocess_metadata,
                        request_id,
                    )
                except (GigaAMException, ModelLoadError, GigaTimeoutError) as e:
                    # Re-raise domain exceptions unchanged
                    raise
                except Exception as e:
                    # Wrap unexpected exceptions into TranscriptionError
                    raise TranscriptionError(
                        f"Ошибка при выполнении pipeline: {str(e)}",
                        stage="pipeline_execution"
                    ) from e
                
                if result.get("success"):
                    # Сохраняем результат в кэш
                    cache.put(file_hash, result, audio_metadata)
                    
                    # Добавляем метаданные в результат
                    result["file_hash"] = file_hash
                    result["audio_metadata"] = audio_metadata
                    result["request_id"] = request_id
                    result["processing_time"] = tracker.duration
                    result["cached"] = False
                    
                    logger.info(
                        "Успешное распознавание файла %s [Request: %s] за %.2fs", 
                        os.path.basename(file.filename), 
                        request_id,
                        tracker.duration
                    )
                    return JSONResponse(content=result)

                # Check if result contains domain error
                error_msg = result.get("error", "Неизвестная ошибка распознавания")
                if isinstance(error_msg, dict) and error_msg.get("code") in ["MODEL_LOAD_ERROR", "TIMEOUT_ERROR"]:
                    # Propagate domain errors with proper exception instances
                    logger.error("Ошибка распознавания: %s", error_msg)
                    if error_msg.get("code") == "MODEL_LOAD_ERROR":
                        raise ModelLoadError(error_msg.get("message", "Model load error"))
                    elif error_msg.get("code") == "TIMEOUT_ERROR":
                        raise GigaTimeoutError(error_msg.get("message", "Timeout error"))
                    
                logger.error("Ошибка распознавания: %s", error_msg)
                raise TranscriptionError(
                    error_msg,
                    stage="pipeline_result"
                )
    except (ValidationError, AudioProcessingError, TranscriptionError, 
            FileSizeError, UnsupportedFormatError, ServiceUnavailableError, GigaTimeoutError):
        raise
    except Exception as exc:
        logger.exception("Внутренняя ошибка сервера: %s", exc)
        raise ServiceUnavailableError(
            "Внутренняя ошибка сервера",
            service_name="gigaam-api"
        ) from exc

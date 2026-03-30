"""API эндпоинты audio-enhancer сервиса."""

import asyncio
import logging
import time
from typing import Dict, Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Depends
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware

from config.settings import config
from services.audio_service import audio_processor
from services.model_service import model_manager
from utils.audio_utils import (
    read_upload_bytes_capped, 
    validate_audio_file
)
from utils.error_handlers import (
    setup_exception_handlers,
    handle_audio_processing_error
)
from utils.logging_utils import request_logger, processing_logger

logger = logging.getLogger(__name__)

# Создание FastAPI приложения
app = FastAPI(
    title=config.APP_NAME,
    version="2.0.0",
    debug=config.DEBUG,
    description="Продвинутый микросервис для улучшения качества аудио перед распознаванием речи",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В production настроить конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Установка обработчиков исключений
setup_exception_handlers(app)


def get_processing_time():
    """Dependency для получения времени начала обработки."""
    return time.time()


@app.get("/")
async def root():
    """
    Корневой endpoint для проверки работоспособности.
    
    Returns:
        Информация о сервисе
    """
    return {
        "service": "Audio Enhancer v2.0",
        "status": "running",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/health",
        "config": {
            "max_file_size_mb": config.MAX_UPLOAD_BYTES / 1024 / 1024,
            "max_audio_seconds": config.MAX_AUDIO_SECONDS,
            "cache_enabled": config.ENABLE_CACHE,
            "metrics_enabled": config.ENABLE_METRICS,
        }
    }


@app.get("/health")
async def health_check():
    """
    Проверка здоровья сервиса.
    
    Returns:
        Статус сервиса и загруженных моделей
    """
    model_status = model_manager.get_model_status()
    
    return {
        "status": "healthy",
        "version": "2.0.0",
        "models": model_status,
        "config": {
            "max_file_size_mb": config.MAX_UPLOAD_BYTES / 1024 / 1024,
            "max_audio_seconds": config.MAX_AUDIO_SECONDS,
        }
    }


@app.post("/enhance")
async def enhance_audio(
    file: UploadFile = File(..., description="Аудио файл для улучшения"),
    use_deepfilter: bool = Form(
        default=config.DEFAULT_ENHANCE_SETTINGS["use_deepfilter"],
        description="Применить DeepFilterNet (AI шумоподавление)"
    ),
    use_wpe: bool = Form(
        default=config.DEFAULT_ENHANCE_SETTINGS["use_wpe"],
        description="Применить WPE (удаление реверберации)"
    ),
    noise_reduction: bool = Form(
        default=config.DEFAULT_ENHANCE_SETTINGS["noise_reduction"],
        description="Применить классическое шумоподавление"
    ),
    normalize_volume: bool = Form(
        default=config.DEFAULT_ENHANCE_SETTINGS["normalize_volume"],
        description="Нормализовать громкость (LUFS-based)"
    ),
    enhance_speech: bool = Form(
        default=config.DEFAULT_ENHANCE_SETTINGS["enhance_speech"],
        description="Усилить речевые частоты"
    ),
    remove_silence: bool = Form(
        default=config.DEFAULT_ENHANCE_SETTINGS["remove_silence"],
        description="Удалить длинные паузы"
    ),
    target_sample_rate: int = Form(
        default=config.DEFAULT_ENHANCE_SETTINGS["target_sample_rate"],
        ge=800,
        le=192000,
        description="Целевая частота дискретизации"
    ),
    use_compressor: bool = Form(
        default=config.DEFAULT_ENHANCE_SETTINGS["use_compressor"],
        description="Применить динамическую компрессию"
    ),
    spectral_gating: bool = Form(
        default=config.DEFAULT_ENHANCE_SETTINGS["spectral_gating"],
        description="Применить спектральный гейтинг"
    ),
    enable_diarization: bool = Form(
        default=config.DEFAULT_ENHANCE_SETTINGS["enable_diarization"],
        description="Включить диаризацию"
    ),
    start_time: float = Depends(get_processing_time)
):
    """
    Улучшает качество аудио для ASR с использованием современных технологий.
    
    ## Parameters:
    - **file**: Аудио файл (WAV, MP3, FLAC, M4A, AAC, OGG, WEBM)
    - **use_deepfilter**: DeepFilterNet (нейросетевое шумоподавление, 48kHz)
    - **use_wpe**: WPE (удаление реверберации)
    - **noise_reduction**: Классическое шумоподавление (noisereduce)
    - **normalize_volume**: LUFS нормализация (-16 LUFS)
    - **enhance_speech**: Усиление речевых частот (300-3400 Hz)
    - **remove_silence**: Удаление пауз (Silero VAD)
    - **target_sample_rate**: Частота дискретизации (800-192000 Hz)
    - **use_compressor**: Динамическая компрессия (-20dB, 4:1)
    - **spectral_gating**: Спектральный гейтинг
    - **enable_diarization**: Диаризация (pyannote)
    
    ## Returns:
    - **JSON**: с аудио в base64 и метаданными
    - **или WAV файл**: если диаризация отключена
    
    ## Example:
    ```bash
    curl -X POST "http://localhost:7860/enhance" \\
      -F "file=@audio.mp3" \\
      -F "use_deepfilter=true" \\
      -F "target_sample_rate=16000"
    ```
    """
    request_logger.log_request("POST", "/enhance", file_size=file.size)
    
    try:
        # Валидация файла
        validate_audio_file(file)
        
        # Чтение файла
        audio_bytes = await read_upload_bytes_capped(file, config.MAX_UPLOAD_BYTES)
        
        # Параметры обработки
        params = {
            "use_deepfilter": use_deepfilter,
            "use_wpe": use_wpe,
            "noise_reduction": noise_reduction,
            "normalize_volume": normalize_volume,
            "enhance_speech": enhance_speech,
            "remove_silence": remove_silence,
            "target_sample_rate": target_sample_rate,
            "use_compressor": use_compressor,
            "spectral_gating": spectral_gating,
            "enable_diarization": enable_diarization,
        }
        
        # Обработка аудио
        result = await asyncio.to_thread(
            audio_processor.enhance_audio,
            audio_bytes,
            **params
        )
        
        # Логирование ответа
        duration_ms = (time.time() - start_time) * 1000
        request_logger.log_response("POST", "/enhance", 200, duration_ms)
        
        # Возврат результата
        if enable_diarization and "diarization" in result:
            return result
        else:
            # Возврат аудио файла
            import base64
            audio_bytes = base64.b64decode(result["audio_base64"])
            return Response(
                content=audio_bytes,
                media_type="audio/wav",
                headers={
                    "Content-Disposition": "attachment; filename=enhanced.wav",
                    "X-Processing-Time-ms": str(duration_ms),
                    "X-Original-Duration": str(result.get("original_duration", 0)),
                    "X-Original-Sample-Rate": str(result.get("original_sample_rate", 0)),
                }
            )
    
    except HTTPException:
        raise
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        request_logger.log_response("POST", "/enhance", 500, duration_ms)
        logger.error("Ошибка обработки аудио", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Audio processing failed"
        ) from e


@app.post("/denoise")
async def denoise_only(
    file: UploadFile = File(..., description="Аудио файл для шумоподавления"),
    stationary: bool = Form(
        default=True,
        description="Стационарный шум (True) или нестационарный (False)"
    ),
    prop_decrease: float = Form(
        default=0.8,
        ge=0.0,
        le=1.0,
        description="Агрессивность шумоподавления (0-1)"
    ),
    start_time: float = Depends(get_processing_time)
):
    """
    Только шумоподавление (быстрый endpoint).
    
    ## Parameters:
    - **file**: Аудио файл
    - **stationary**: Стационарный шум (true) или нестационарный (false)
    - **prop_decrease**: Агрессивность шумоподавления (0-1)
    
    ## Returns:
    - **WAV файл**: обработанный аудио
    
    ## Example:
    ```bash
    curl -X POST "http://localhost:7860/denoise" \\
      -F "file=@audio.mp3" \\
      -F "stationary=true" \\
      -F "prop_decrease=0.8" \\
      -o denoised.wav
    ```
    """
    request_logger.log_request("POST", "/denoise", file_size=file.size)
    
    try:
        validate_audio_file(file)
        audio_bytes = await read_upload_bytes_capped(file, config.MAX_UPLOAD_BYTES)
        
        result_bytes = await asyncio.to_thread(
            audio_processor.denoise_only,
            audio_bytes,
            stationary=stationary,
            prop_decrease=prop_decrease
        )
        
        duration_ms = (time.time() - start_time) * 1000
        request_logger.log_response("POST", "/denoise", 200, duration_ms)
        
        return Response(
            content=result_bytes,
            media_type="audio/wav",
            headers={
                "Content-Disposition": "attachment; filename=denoised.wav",
                "X-Processing-Time-ms": str(duration_ms),
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        request_logger.log_response("POST", "/denoise", 500, duration_ms)
        logger.error("Ошибка шумоподавления", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Audio processing failed"
        ) from e


@app.post("/preprocess")
@app.post("/api/preprocess")
async def preprocess_audio(
    file: UploadFile = File(..., description="Аудио файл для предобработки"),
    target_sample_rate: int = Form(
        default=16000,
        ge=800,
        le=192000,
        description="Целевая частота дискретизации"
    ),
    return_audio_base64: bool = Form(
        default=True,
        description="Возвращать аудио в base64"
    ),
    start_time: float = Depends(get_processing_time)
):
    """
    Quality-first preprocessing endpoint для внешнего orchestrator.
    
    Возвращает preprocess_metadata + (опционально) audio_base64.
    
    ## Parameters:
    - **file**: Аудио файл
    - **target_sample_rate**: Целевая частота дискретизации
    - **return_audio_base64**: Возвращать аудио в base64
    
    ## Returns:
    - **JSON**: с метаданными и опционально аудио
    
    ## Example:
    ```bash
    curl -X POST "http://localhost:7860/preprocess" \\
      -F "file=@audio.mp3" \\
      -F "target_sample_rate=16000" \\
      -F "return_audio_base64=true"
    ```
    """
    request_logger.log_request("POST", "/preprocess", file_size=file.size)
    
    try:
        validate_audio_file(file)
        audio_bytes = await read_upload_bytes_capped(file, config.MAX_UPLOAD_BYTES)
        
        result = await asyncio.to_thread(
            audio_processor.preprocess_audio,
            audio_bytes,
            target_sample_rate=target_sample_rate,
            return_audio_base64=return_audio_base64
        )
        
        duration_ms = (time.time() - start_time) * 1000
        request_logger.log_response("POST", "/preprocess", 200, duration_ms)
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        request_logger.log_response("POST", "/preprocess", 500, duration_ms)
        logger.error("Ошибка preprocessing", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Preprocessing failed"
        ) from e


@app.post("/diarize")
async def diarize_audio(
    file: UploadFile = File(..., description="Аудио файл для диаризации"),
    start_time: float = Depends(get_processing_time)
):
    """
    Диаризация аудио: сегментация, детекция смены спикера, детекция перекрытий.
    
    ## Parameters:
    - **file**: Аудио файл
    
    ## Returns:
    - **JSON**: с сегментами, сменами спикеров и перекрытиями
    
    ## Example:
    ```bash
    curl -X POST "http://localhost:7860/diarize" \\
      -F "file=@conversation.wav"
    ```
    """
    request_logger.log_request("POST", "/diarize", file_size=file.size)
    
    if not model_manager.pyannote_available:
        raise HTTPException(
            status_code=503,
            detail="Pyannote не доступен. Установите HF_TOKEN в переменные окружения."
        )
    
    try:
        validate_audio_file(file)
        audio_bytes = await read_upload_bytes_capped(file, config.MAX_UPLOAD_BYTES)
        
        from utils.audio_utils import load_audio_with_duration_check
        audio, sr = load_audio_with_duration_check(audio_bytes)
        
        result = await asyncio.to_thread(
            model_manager.run_diarization,
            audio,
            sr
        )
        
        duration_ms = (time.time() - start_time) * 1000
        request_logger.log_response("POST", "/diarize", 200, duration_ms)
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        request_logger.log_response("POST", "/diarize", 500, duration_ms)
        logger.error("Ошибка диаризации", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Diarization failed"
        ) from e


@app.get("/models/status")
async def get_models_status():
    """
    Получает статус всех ML моделей.
    
    Returns:
        JSON с информацией о загруженных моделях
    """
    return model_manager.get_model_status()


@app.get("/config")
async def get_config():
    """
    Получает текущую конфигурацию сервиса.
    
    Returns:
        JSON с конфигурацией
    """
    return {
        "app_name": config.APP_NAME,
        "debug": config.DEBUG,
        "max_file_size_mb": config.MAX_UPLOAD_BYTES / 1024 / 1024,
        "max_audio_seconds": config.MAX_AUDIO_SECONDS,
        "cache_enabled": config.ENABLE_CACHE,
        "cache_ttl_seconds": config.CACHE_TTL_SECONDS,
        "metrics_enabled": config.ENABLE_METRICS,
        "default_settings": config.DEFAULT_ENHANCE_SETTINGS,
        "allowed_mime_types": list(config.ALLOWED_MIME_TYPES),
    }

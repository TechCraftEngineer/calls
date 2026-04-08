import io
import logging
import os
import time
from typing import Any

import librosa
import numpy as np
import soundfile as sf
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware import Middleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import uvicorn


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("speaker-embeddings")


class MaxContentSizeMiddleware(BaseHTTPMiddleware):
    """Middleware для ограничения максимального размера контента запроса"""
    
    def __init__(self, app, max_size: int = 100 * 1024 * 1024):  # 100MB по умолчанию
        super().__init__(app)
        self.max_size = max_size
    
    async def dispatch(self, request: Request, call_next):
        # Проверяем Content-Length для запросов с телом
        content_length = request.headers.get("content-length")
        if content_length:
            if int(content_length) > self.max_size:
                raise HTTPException(
                    status_code=413,
                    detail=f"Request entity too large. Maximum size is {self.max_size // (1024*1024)}MB"
                )
        
        return await call_next(request)


app = FastAPI(
    title="Speaker Diarization API",
    description="Speaker diarization service using pyannote.audio",
    version="2.0.0",
)

# Добавляем middleware для ограничения размера запроса (100MB)
app.add_middleware(MaxContentSizeMiddleware, max_size=100 * 1024 * 1024)


@app.get("/")
async def root() -> dict[str, Any]:
    """Корневой endpoint с информацией о сервисе"""
    return {
        "service": "Speaker Diarization API",
        "version": "2.0.0",
        "description": "Speaker diarization using pyannote.audio 4.x",
        "endpoints": {
            "/": "GET - Информация о сервисе",
            "/health": "GET - Health check",
            "/api/diagnostics": "GET - Диагностическая информация",
            "/api/diarize": "POST - Speaker diarization"
        },
        "docs": "/docs",
        "models": {
            "diarization": os.getenv("PYANNOTE_DIARIZATION_MODEL", "pyannote/speaker-diarization-community-1"),
        }
    }


@app.get("/health")
async def health() -> dict[str, Any]:
    """Health check endpoint"""
    # Проверяем что pyannote доступен
    pyannote_available = False
    try:
        from pyannote.audio import Pipeline
        pyannote_available = True
    except Exception:
        logger.exception("pyannote.audio import failed")
    
    # Для community версии токен не требуется
    diarization_model = os.getenv("PYANNOTE_DIARIZATION_MODEL", "pyannote/speaker-diarization-community-1")
    is_community = "community" in diarization_model.lower()
    hf_token_set = bool(os.getenv("HF_TOKEN", "").strip())
    
    # Community версия работает без токена
    requires_token = not is_community
    
    # Если pyannote недоступен, или требуется токен но он не установлен - сервис нездоров
    if not pyannote_available or (requires_token and not hf_token_set):
        detail = {
            "status": "unhealthy",
            "pyannote_available": pyannote_available,
            "pyannote_loaded": pyannote_available,
            "hf_token_set": hf_token_set,
            "requires_hf_token": requires_token,
            "model": diarization_model,
        }
        if requires_token and not hf_token_set:
            detail["reason"] = "HF_TOKEN required for non-community model"
        raise HTTPException(status_code=503, detail=detail)
    
    return {
        "status": "healthy",
        "pyannote_available": pyannote_available,
        "pyannote_loaded": pyannote_available,
        "hf_token_set": hf_token_set,
        "requires_hf_token": requires_token,
        "model": diarization_model,
    }


@app.get("/api/diagnostics")
async def diagnostics() -> dict[str, Any]:
    """Диагностическая информация о сервисе"""
    return {
        "service": "speaker-diarization",
        "version": "2.0.0",
        "pyannote": {
            "diarization_model": os.getenv("PYANNOTE_DIARIZATION_MODEL", "pyannote/speaker-diarization-community-1"),
            "hf_token_set": bool(os.getenv("HF_TOKEN", "").strip()),
        },
        "config": {
            "port": os.getenv("PORT", "7860"),
        },
    }


@app.post("/api/diarize")
async def diarize(
    file: UploadFile = File(...),
    num_speakers: int | None = Form(None),
    min_speakers: int | None = Form(None),
    max_speakers: int | None = Form(None),
):
    """
    Speaker diarization endpoint.
    
    Определяет "кто говорил когда" в аудио файле.
    Возвращает список сегментов с временными метками и ID спикеров.
    """
    # Замер общего времени выполнения endpoint
    request_start_time = time.time()
    
    try:
        # Замер времени загрузки и предобработки аудио
        audio_processing_start = time.time()
        
        # Загружаем аудио напрямую из файла (потоковое чтение)
        audio, sr = sf.read(file.file, dtype="float32")
        if audio.ndim > 1:
            audio = np.mean(audio, axis=1)
        audio = np.asarray(audio, dtype=np.float32)
        
        # Ресемплируем если нужно
        if sr != 16000:
            audio = librosa.resample(audio, orig_sr=sr, target_sr=16000)
            sr = 16000
        
        audio_processing_end = time.time()
        audio_processing_time = audio_processing_end - audio_processing_start
        
        logger.info(
            f"Audio loaded and preprocessed in {audio_processing_time:.2f}s "
            f"(duration: {len(audio)/sr:.2f}s, sample_rate: {sr}Hz)"
        )
        
        # Валидация параметров количества спикеров
        if num_speakers is not None:
            if not isinstance(num_speakers, int) or num_speakers <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="num_speakers must be a positive integer"
                )
        
        if min_speakers is not None:
            if not isinstance(min_speakers, int) or min_speakers <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="min_speakers must be a positive integer"
                )
        
        if max_speakers is not None:
            if not isinstance(max_speakers, int) or max_speakers <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="max_speakers must be a positive integer"
                )
        
        # Проверка соотношения между min и max
        if min_speakers is not None and max_speakers is not None:
            if min_speakers > max_speakers:
                raise HTTPException(
                    status_code=400,
                    detail="min_speakers must be less than or equal to max_speakers"
                )
        
        # Проверка, что num_speakers находится в диапазоне [min_speakers, max_speakers]
        if num_speakers is not None:
            if min_speakers is not None and num_speakers < min_speakers:
                raise HTTPException(
                    status_code=400,
                    detail="num_speakers must be greater than or equal to min_speakers"
                )
            if max_speakers is not None and num_speakers > max_speakers:
                raise HTTPException(
                    status_code=400,
                    detail="num_speakers must be less than or equal to max_speakers"
                )
        
        # Выполняем диаризацию
        result = _process_diarization(
            audio,
            sr,
            num_speakers,
            min_speakers,
            max_speakers,
        )
        
        # Завершение замера времени выполнения endpoint
        request_end_time = time.time()
        total_request_time = request_end_time - request_start_time
        
        logger.info(
            f"Total request completed in {total_request_time:.2f}s "
            f"(audio: {len(audio)/sr:.2f}s, "
            f"real_time_factor: {total_request_time/(len(audio)/sr):.2f}x)"
        )
        
        return result
        
    except HTTPException:
        request_end_time = time.time()
        total_request_time = request_end_time - request_start_time
        logger.warning(f"Request failed after {total_request_time:.2f}s")
        raise
    except Exception as exc:
        request_end_time = time.time()
        total_request_time = request_end_time - request_start_time
        logger.exception(f"diarization failed after {total_request_time:.2f}s: %s", exc)
        raise HTTPException(status_code=500, detail="diarization failed") from exc


# Module-level cache for diarization pipelines
_pipeline_cache: dict[tuple[str, str | None], Any] = {}


def _get_diarization_pipeline(diarization_model: str, token: str | None):
    """Get cached diarization pipeline instance."""
    cache_key = (diarization_model, token)
    
    # Return cached pipeline if available
    if cache_key in _pipeline_cache:
        logger.info(f"Using cached diarization pipeline: {diarization_model}")
        return _pipeline_cache[cache_key]
    
    try:
        from pyannote.audio import Pipeline
        
        # Для community модели токен не требуется
        is_community = "community" in diarization_model.lower()
        
        # Пробуем загрузить pipeline с retry логикой
        init_attempts = []
        
        if is_community:
            # Community модель работает без токена
            init_attempts = [
                {},  # Без параметров токена
            ]
        elif token:
            # Для не-community моделей с токеном
            init_attempts = [
                {"use_auth_token": token},
                {"token": token},
            ]
        else:
            logger.error(f"Non-community model {diarization_model} requires HF_TOKEN")
            return None
        
        for kwargs in init_attempts:
            try:
                pipeline = Pipeline.from_pretrained(diarization_model, **kwargs)
                logger.info(f"Successfully loaded diarization pipeline: {diarization_model}")
                # Cache the pipeline
                _pipeline_cache[cache_key] = pipeline
                return pipeline
            except TypeError:
                continue
            except Exception as exc:
                logger.error(f"Failed to load diarization pipeline with kwargs {kwargs}: {exc}")
                continue
        
        return None
        
    except Exception as exc:
        logger.error(f"Error initializing diarization pipeline: {exc}")
        return None


def _process_diarization(
    audio: np.ndarray,
    sr: int,
    num_speakers: int | None,
    min_speakers: int | None,
    max_speakers: int | None,
) -> dict[str, Any]:
    """Выполнение диаризации с использованием pyannote."""
    
    try:
        import torch
        
        # Используем последнюю community модель (работает без токена)
        diarization_model = os.getenv(
            "PYANNOTE_DIARIZATION_MODEL",
            "pyannote/speaker-diarization-community-1"
        )
        
        # Проверяем токен только для не-community моделей
        is_community = "community" in diarization_model.lower()
        token = os.getenv("HF_TOKEN", "").strip() or None
        
        if not is_community and not token:
            raise HTTPException(
                status_code=503,
                detail="HF_TOKEN not configured. Set HF_TOKEN environment variable for non-community models."
            )
        
        # Получаем кешированный pipeline
        pipeline = _get_diarization_pipeline(diarization_model, token)
        
        if pipeline is None:
            raise HTTPException(
                status_code=503,
                detail="Failed to load pyannote diarization pipeline"
            )
        
        # Подготовка аудио для pyannote
        waveform = torch.from_numpy(audio).float()
        if waveform.ndim == 1:
            waveform = waveform.unsqueeze(0)
        
        audio_dict = {
            "waveform": waveform,
            "sample_rate": sr,
        }
        
        # Параметры диаризации
        diarization_params = {}
        if num_speakers is not None:
            diarization_params["num_speakers"] = num_speakers
        if min_speakers is not None:
            diarization_params["min_speakers"] = min_speakers
        if max_speakers is not None:
            diarization_params["max_speakers"] = max_speakers
        
        logger.info(
            f"Starting diarization: duration={len(audio)/sr:.2f}s, params={diarization_params}"
        )
        
        # Замер времени выполнения диаризации
        diarization_start_time = time.time()
        
        # Выполнение диаризации
        diarization = pipeline(audio_dict, **diarization_params)
        
        diarization_end_time = time.time()
        diarization_duration = diarization_end_time - diarization_start_time
        
        logger.info(
            f"Diarization processing completed in {diarization_duration:.2f}s"
        )
        
        # Конвертация результатов (новый API pyannote 4.x)
        segments = []
        
        logger.info(f"Diarization output type: {type(diarization)}")
        
        # Замер времени извлечения сегментов
        extraction_start_time = time.time()
        
        # DiarizeOutput в pyannote 4.x имеет атрибут speaker_diarization (Annotation объект)
        try:
            # Извлекаем Annotation из DiarizeOutput
            annotation = None
            
            if hasattr(diarization, 'speaker_diarization'):
                # Новый API (pyannote 4.x) - используем speaker_diarization
                annotation = diarization.speaker_diarization
                logger.info(f"Using speaker_diarization, type: {type(annotation)}")
            elif hasattr(diarization, 'itertracks'):
                # Старый API (pyannote < 4.0) - diarization это уже Annotation
                annotation = diarization
                logger.info(f"Using diarization directly as Annotation")
            else:
                raise ValueError(f"Cannot extract annotation from {type(diarization)}")
            
            # Теперь итерируем по Annotation
            if hasattr(annotation, 'itertracks'):
                for segment, _, label in annotation.itertracks(yield_label=True):
                    segments.append({
                        "start": float(segment.start),
                        "end": float(segment.end),
                        "speaker": label,
                    })
            else:
                raise ValueError(f"Annotation has no itertracks method: {type(annotation)}")
        
        except Exception as e:
            logger.error(f"Failed to extract segments: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail="Failed to extract diarization segments"
            )
        
        # Завершение замера времени извлечения сегментов
        extraction_end_time = time.time()
        extraction_duration = extraction_end_time - extraction_start_time
        
        if not segments:
            raise HTTPException(
                status_code=500,
                detail="Diarization returned no segments"
            )
        
        # Сортировка по времени
        segments.sort(key=lambda s: s["start"])
        
        # Статистика
        unique_speakers = set(s["speaker"] for s in segments)
        total_duration = sum(s["end"] - s["start"] for s in segments)
        
        logger.info(
            f"Segment extraction completed in {extraction_duration:.2f}s"
        )
        
        logger.info(
            f"Diarization completed: {len(segments)} segments, "
            f"{len(unique_speakers)} speakers, "
            f"total_speech={total_duration:.2f}s, "
            f"processing_time={diarization_duration:.2f}s, "
            f"extraction_time={extraction_duration:.2f}s, "
            f"total_time={diarization_duration + extraction_duration:.2f}s"
        )
        
        # Общее время выполнения диаризации
        total_processing_time = diarization_duration + extraction_duration
        
        return {
            "success": True,
            "segments": segments,
            "num_speakers": len(unique_speakers),
            "speakers": sorted(unique_speakers),
            "total_speech_duration": total_duration,
            "audio_duration": len(audio) / sr,
            "processing_stats": {
                "diarization_time": round(diarization_duration, 2),
                "extraction_time": round(extraction_duration, 2),
                "total_time": round(total_processing_time, 2),
                "real_time_factor": round(total_processing_time / (len(audio) / sr), 2)
            }
        }
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Diarization error: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Diarization failed"
        ) from exc


if __name__ == "__main__":
    port = int(os.getenv("PORT", "7860"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")

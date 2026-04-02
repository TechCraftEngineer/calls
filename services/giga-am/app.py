import json
import logging
import os
import tempfile
import time
from typing import Any

import librosa
import numpy as np
import soundfile
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile, Depends
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uvicorn

from config import settings
from services.alignment_service import AlignmentService
from services.attribution_service import AttributionService
from services.clustering_service import ClusteringService
from services.embedding_service import EmbeddingService
from services.overlap_handler import OverlapHandler
from services.postprocess_service import PostprocessService
from services.transcription_service import transcription_service
from utils.file_validation import FileValidator
from utils.logger import setup_logging
from utils.exceptions import (
    ValidationError,
    AudioProcessingError,
    TranscriptionError,
    FileSizeError,
    UnsupportedFormatError,
    ServiceUnavailableError,
    GigaTimeoutError,
    GigaAMException,
    ModelLoadError
)
from utils.error_handlers import setup_exception_handlers
from utils.metrics import metrics, RequestTracker
from utils.cache import cache, setup_cache_cleanup

logger = logging.getLogger(__name__)

# Security setup for admin endpoints
security = HTTPBearer(auto_error=False)

def admin_required(credentials: HTTPAuthorizationCredentials = Depends(security)) -> None:
    """Validate admin token for protected endpoints"""
    # Check feature flag first
    if not getattr(settings, 'enable_cache_clear', False):
        logger.warning("Cache clear endpoint is disabled")
        raise HTTPException(
            status_code=403,
            detail="Cache clearing is disabled",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Validate admin token
    admin_token = getattr(settings, 'admin_token', None)
    if not admin_token:
        logger.error("Admin token not configured")
        raise HTTPException(
            status_code=500,
            detail="Admin authentication not configured"
        )
    
    if not credentials or credentials.credentials != admin_token:
        logger.warning("Unauthorized access attempt to admin endpoint")
        raise HTTPException(
            status_code=403,
            detail="Invalid admin token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    logger.info("Admin access granted")

app = FastAPI(
    title=settings.app_name,
    description="Sync API для распознавания русской речи на базе GigaAM",
    version=settings.app_version,
)

# Настройка обработчиков исключений
setup_exception_handlers(app)

# Настройка кэша
setup_cache_cleanup()

alignment_service = AlignmentService()
embedding_service = EmbeddingService()
clustering_service = ClusteringService(
    base_threshold=settings.clustering_base_threshold,
    min_segment_duration=settings.clustering_min_segment_duration,
    temporal_weight=settings.clustering_temporal_weight,
    confidence_threshold=settings.clustering_confidence_threshold,
)
overlap_handler = OverlapHandler(
    overlap_confidence_threshold=getattr(settings, 'overlap_confidence_threshold', 0.7),
    min_overlap_duration=getattr(settings, 'min_overlap_duration', 0.5),
    embedding_similarity_threshold=getattr(settings, 'overlap_embedding_similarity', 0.6),
)
attribution_service = AttributionService()
postprocess_service = PostprocessService()


def _preprocess_audio_for_diarization(audio_path: str, request_id: str) -> str:
    """
    Предобработка аудио для улучшения качества диаризации.
    
    Если sample rate < 16000 Hz, автоматически апсемплирует до 16000 Hz.
    Возвращает путь к обработанному файлу (или оригинальному, если обработка не нужна).
    """
    try:
        # Проверяем метаданные аудио
        import soundfile as sf
        info = sf.info(audio_path)
        original_sr = info.samplerate
        
        # Если качество достаточное, возвращаем оригинал
        if original_sr >= 16000:
            logger.info(f"[{request_id}] Аудио качество достаточное: {original_sr}Hz")
            return audio_path
        
        # Апсемплинг до 16kHz
        logger.info(
            f"[{request_id}] Низкое качество аудио: {original_sr}Hz. "
            f"Автоматический апсемплинг до 16000Hz для улучшения диаризации..."
        )
        
        # Загружаем и ресемплируем
        audio_data, _ = librosa.load(audio_path, sr=16000, mono=True)
        
        # Сохраняем во временный файл
        import tempfile
        resampled_path = audio_path.replace('.mp3', '_16k.wav').replace('.m4a', '_16k.wav')
        if resampled_path == audio_path:
            resampled_path = audio_path + '_16k.wav'
        
        sf.write(resampled_path, audio_data, 16000, subtype='PCM_16')
        
        logger.info(
            f"[{request_id}] Аудио успешно апсемплировано: "
            f"{original_sr}Hz → 16000Hz, сохранено в {os.path.basename(resampled_path)}"
        )
        
        return resampled_path
        
    except Exception as e:
        logger.warning(
            f"[{request_id}] Не удалось предобработать аудио: {e}. "
            f"Используется оригинальный файл."
        )
        return audio_path


def _run_ultra_pipeline(
    audio_path: str,
    preprocess_metadata: dict[str, Any] | None,
    request_id: str,
) -> dict[str, Any]:
    """Выполнение полного pipeline с отслеживанием метрик"""
    
    # Предобработка аудио для улучшения диаризации
    processed_audio_path = _preprocess_audio_for_diarization(audio_path, request_id)
    cleanup_processed = processed_audio_path != audio_path  # Нужно ли удалять обработанный файл
    
    try:
        # ASR этап - используем обработанное аудио
        start_time = time.time()
        asr_result = transcription_service.transcribe_audio(processed_audio_path)
        asr_time = time.time() - start_time
        metrics.record_stage_time(request_id, "asr", asr_time)
    
    if not asr_result.get("success"):
        return asr_result

    base_segments = asr_result.get("segments", []) or []
    
    # Alignment этап
    start_time = time.time()
    aligned_segments = (
        alignment_service.align_segments(base_segments)
        if settings.alignment_enabled
        else base_segments
    )
    alignment_time = time.time() - start_time
    if settings.alignment_enabled:
        metrics.record_stage_time(request_id, "alignment", alignment_time)

    overlap_spans = []
    if isinstance(preprocess_metadata, dict):
        raw_overlap = preprocess_metadata.get("overlap_candidates", [])
        if isinstance(raw_overlap, list):
            overlap_spans = raw_overlap

    diarized_segments = aligned_segments
    if settings.diarization_enabled:
        try:
            audio_np, audio_sr = librosa.load(processed_audio_path, sr=16000, mono=True)
        except (
            librosa.util.exceptions.ParameterError,
            FileNotFoundError,
            OSError,
            soundfile.SoundFileError,
        ):
            audio_np = np.array([], dtype=np.float32)
            audio_sr = 16000

        # Embedding этап
        start_time = time.time()
        batch_embeddings = embedding_service.build_batch_hybrid_embeddings(
            aligned_segments,
            audio=audio_np,
            sample_rate=audio_sr,
        )
        embedding_time = time.time() - start_time
        metrics.record_stage_time(request_id, "embedding", embedding_time)
        
        for idx, segment in enumerate(aligned_segments):
            segment["embedding"] = (
                batch_embeddings[idx] if idx < len(batch_embeddings) else []
            )
        
        # Clustering этап
        start_time = time.time()
        diarized_segments = clustering_service.assign_speakers(
            aligned_segments,
            overlap_spans=overlap_spans,
        )
        clustering_time = time.time() - start_time
        metrics.record_stage_time(request_id, "clustering", clustering_time)
        
        # Overlap processing этап - разделение одновременно говорящих спикеров
        if settings.diarization_enabled and getattr(settings, 'overlap_separation_enabled', True):
            start_time = time.time()
            # Получаем кластеры из результатов кластеризации
            clusters_map: dict[str, dict[str, Any]] = {}
            for seg in diarized_segments:
                speaker = seg.get("speaker")
                if speaker and speaker not in clusters_map:
                    embedding = seg.get("embedding", [])
                    if embedding:
                        clusters_map[speaker] = {
                            "speaker": speaker,
                            "centroid": embedding,
                            "vectors": [embedding],
                        }
            
            clusters = list(clusters_map.values())
            
            # Обработка overlap
            diarized_segments = overlap_handler.process_overlaps(
                diarized_segments,
                clusters,
                overlap_spans=overlap_spans,
            )
            overlap_time = time.time() - start_time
            metrics.record_stage_time(request_id, "overlap_separation", overlap_time)
            
            # Логируем статистику overlap
            overlap_stats = overlap_handler.get_overlap_statistics(diarized_segments)
            logger.info("Overlap processing completed", {
                "request_id": request_id,
                "overlap_segments": overlap_stats["overlap_segments"],
                "sub_segments": overlap_stats["sub_segments"],
                "overlap_percentage": f"{overlap_stats['overlap_percentage']:.1f}%",
            })

    # Attribution этап
    start_time = time.time()
    speaker_timeline = attribution_service.build_speaker_timeline(diarized_segments)
    attribution_time = time.time() - start_time
    metrics.record_stage_time(request_id, "attribution", attribution_time)
    
    # Postprocess этап
    start_time = time.time()
    final_segments = postprocess_service.apply_to_segments(diarized_segments)
    final_transcript = postprocess_service.build_final_transcript(final_segments)
    postprocess_time = time.time() - start_time
    metrics.record_stage_time(request_id, "postprocess", postprocess_time)

    return {
        "success": True,
        "segments": final_segments,
        "speaker_timeline": speaker_timeline,
        "final_transcript": final_transcript,
        "total_duration": asr_result.get("total_duration", 0),
        "pipeline": "ultra-sync-2026",
        "stages": [
            "asr",
            "alignment" if settings.alignment_enabled else "alignment:disabled",
            "embedding+clustering"
            if settings.diarization_enabled
            else "embedding+clustering:disabled",
            "attribution",
            "postprocess",
        ],
    }


@app.post("/api/transcribe")
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
                        _run_ultra_pipeline,
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


@app.post("/api/debug-embeddings")
async def debug_embeddings(file: UploadFile = File(...)):
    """
    Диагностика эмбеддингов для отладки проблем с диаризацией.
    
    Возвращает:
    - Информацию о загруженных моделях
    - Статистику эмбеддингов для каждого сегмента
    - Попарные расстояния между сегментами
    - Рекомендации по настройке параметров
    """
    import uuid
    request_id = str(uuid.uuid4())
    tmp_path = None
    
    try:
        # Мягкая валидация для диагностики (без проверки MIME типа)
        if not file.filename:
            return JSONResponse(
                status_code=400,
                content={"error": "Имя файла отсутствует"}
            )
        
        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension not in settings.allowed_audio_formats:
            return JSONResponse(
                status_code=400,
                content={
                    "error": f"Неподдерживаемый формат: {file_extension}",
                    "supported": settings.allowed_audio_formats
                }
            )
        
        # Сохраняем временный файл
        with FileValidator.secure_temp_file(file) as tmp_path:
            logger.info(f"[{request_id}] Начало диагностики эмбеддингов для {file.filename}")
            
            # Транскрипция
            asr_result = await run_in_threadpool(
                transcription_service.transcribe_audio,
                tmp_path
            )
            
            if not asr_result.get("success"):
                return JSONResponse(
                    status_code=500,
                    content={"error": "Ошибка транскрипции", "details": asr_result}
                )
            
            segments = asr_result.get("segments", [])
            if not segments:
                return JSONResponse(
                    content={
                        "error": "Нет сегментов для анализа",
                        "segments_count": 0
                    }
                )
            
            # Загрузка аудио
            try:
                audio_np, audio_sr = librosa.load(tmp_path, sr=16000, mono=True)
            except Exception as e:
                return JSONResponse(
                    status_code=500,
                    content={"error": f"Ошибка загрузки аудио: {str(e)}"}
                )
            
            # Генерация эмбеддингов
            embeddings = await run_in_threadpool(
                embedding_service.build_batch_hybrid_embeddings,
                segments,
                audio_np,
                audio_sr
            )
            
            # Диагностика эмбеддингов
            diagnostics = []
            for i, (seg, emb) in enumerate(zip(segments, embeddings)):
                norm = float(np.linalg.norm(emb))
                non_zero = sum(1 for v in emb if abs(v) > 1e-6)
                
                diagnostics.append({
                    "segment": i,
                    "start": seg.get("start"),
                    "end": seg.get("end"),
                    "duration": seg.get("end", 0) - seg.get("start", 0),
                    "text": seg.get("text", "")[:50],  # Первые 50 символов
                    "embedding_norm": round(norm, 4),
                    "non_zero_values": non_zero,
                    "embedding_dim": len(emb),
                    "is_normalized": 0.9 < norm < 1.1,
                    "is_valid": non_zero > 100 and 0.9 < norm < 1.1,
                })
            
            # Расстояния между сегментами
            distances = []
            for i in range(len(embeddings)):
                for j in range(i + 1, min(i + 5, len(embeddings))):  # Только ближайшие 5
                    dist = clustering_service._cosine_distance(embeddings[i], embeddings[j])
                    distances.append({
                        "segment_i": i,
                        "segment_j": j,
                        "cosine_distance": round(float(dist), 4),
                        "similar": dist < 0.4,  # Похожие спикеры
                    })
            
            # Анализ и рекомендации
            avg_norm = np.mean([d["embedding_norm"] for d in diagnostics])
            valid_embeddings = sum(1 for d in diagnostics if d["is_valid"])
            avg_distance = np.mean([d["cosine_distance"] for d in distances]) if distances else 0
            
            # Получаем метаданные аудио
            audio_metadata = FileValidator.validate_audio_content(tmp_path)
            sample_rate = audio_metadata.get("sample_rate", 0)
            
            recommendations = []
            
            # Проверка sample rate
            if sample_rate < 16000:
                recommendations.append({
                    "level": "critical",
                    "message": f"Низкое качество аудио: {sample_rate}Hz. Рекомендуется минимум 16000Hz.",
                    "action": f"ffmpeg -i input.mp3 -ar 16000 -ac 1 output.wav"
                })
            
            if not embedding_service._pyannote_embedder:
                recommendations.append({
                    "level": "critical",
                    "message": "Pyannote модель не загружена. Установите HF_TOKEN.",
                    "action": "export HF_TOKEN='your_token_here'"
                })
            
            if avg_norm < 0.5:
                recommendations.append({
                    "level": "critical",
                    "message": "Эмбеддинги почти нулевые. Проверьте качество аудио.",
                    "action": "Убедитесь, что аудио содержит речь и не повреждено"
                })
            
            if avg_distance < 0.01:
                recommendations.append({
                    "level": "critical",
                    "message": f"Эмбеддинги практически идентичны (avg_distance={avg_distance:.4f}). Голоса неразличимы для модели.",
                    "action": "1) Улучшите качество аудио до 16kHz, 2) Попробуйте отключить remote embeddings: export SPEAKER_EMBEDDINGS_URL=''"
                })
            elif avg_distance < 0.2:
                recommendations.append({
                    "level": "warning",
                    "message": "Малые расстояния между сегментами. Уменьшите порог кластеризации.",
                    "action": "export CLUSTERING_BASE_THRESHOLD=0.35"
                })
            elif avg_distance > 0.6:
                recommendations.append({
                    "level": "warning",
                    "message": "Большие расстояния между сегментами. Увеличьте порог кластеризации.",
                    "action": "export CLUSTERING_BASE_THRESHOLD=0.45"
                })
            
            if valid_embeddings == len(diagnostics):
                recommendations.append({
                    "level": "success",
                    "message": "Все эмбеддинги валидны. Система работает корректно.",
                    "action": "Настройте параметры кластеризации при необходимости"
                })
            
            logger.info(f"[{request_id}] Диагностика завершена: {len(segments)} сегментов, {valid_embeddings} валидных")
            
            return JSONResponse(content={
                "request_id": request_id,
                "segments_count": len(segments),
                "valid_embeddings": valid_embeddings,
                "diagnostics": diagnostics,
                "pairwise_distances": distances[:20],  # Первые 20
                "audio_quality": {
                    "sample_rate": sample_rate,
                    "quality": "good" if sample_rate >= 16000 else "poor",
                    "recommendation": "OK" if sample_rate >= 16000 else "Увеличьте sample rate до 16000Hz"
                },
                "statistics": {
                    "avg_embedding_norm": round(float(avg_norm), 4),
                    "avg_cosine_distance": round(float(avg_distance), 4),
                    "pyannote_loaded": embedding_service._pyannote_embedder is not None,
                    "remote_url": embedding_service._remote_url or "not configured",
                    "clustering_threshold": settings.clustering_base_threshold,
                    "min_segment_duration": settings.clustering_min_segment_duration,
                },
                "recommendations": recommendations,
            })
            
    except Exception as exc:
        logger.exception(f"[{request_id}] Ошибка диагностики: {exc}")
        return JSONResponse(
            status_code=500,
            content={"error": str(exc)}
        )


@app.get("/api/health")
async def health_check():
    model_health = transcription_service.health_check()
    health_status = metrics.get_health_status()
    
    return {
        "status": health_status["status"],
        "app_name": settings.app_name,
        "version": settings.app_version,
        "model": model_health,
        "metrics": health_status
    }


@app.get("/api/info")
async def app_info():
    return {
        "app_name": settings.app_name,
        "version": settings.app_version,
        "description": "Sync API для распознавания русской речи на базе GigaAM",
        "supported_formats": settings.allowed_audio_formats,
        "max_file_size_mb": settings.max_file_size // (1024 * 1024),
        "endpoints": {
            "/api/transcribe": "POST - Синхронное распознавание речи",
            "/api/health": "GET - Проверка работоспособности",
            "/api/info": "GET - Информация о приложении",
            "/api/metrics": "GET - Метрики производительности",
            "/api/cache/stats": "GET - Статистика кэша",
            "/api/cache/clear": "POST - Очистка кэша (admin)"
        },
    }


@app.get("/api/metrics")
async def get_metrics():
    """Получение детальных метрик производительности"""
    stats = metrics.get_current_stats()
    stats["cache"] = cache.get_stats()
    return stats


@app.post("/api/cache/clear")
async def clear_cache(_admin_auth: None = Depends(admin_required)):
    """Очистка кэша (только для администрирования)"""
    logger.info("Cache clear requested by admin")
    try:
        cache.cleanup()
        logger.info("Cache successfully cleared")
        return {"message": "Кэш успешно очищен"}
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to clear cache"
        )


@app.get("/api/cache/stats")
async def get_cache_stats():
    """Получение статистики кэша"""
    return cache.get_stats()


@app.get("/")
async def root():
    return {
        "message": "GigaAM Sync API для распознавания русской речи",
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/health",
        "metrics": "/api/metrics"
    }


if __name__ == "__main__":
    setup_logging()
    logger.info("Запуск приложения %s v%s", settings.app_name, settings.app_version)
    logger.info("Сервер будет запущен на %s:%s", settings.host, settings.port)
    uvicorn.run(app, host=settings.host, port=settings.port, log_level=settings.log_level.lower())

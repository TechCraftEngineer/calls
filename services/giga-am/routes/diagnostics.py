"""
Endpoint для диагностики эмбеддингов.
"""
import logging
import os
import uuid

import librosa
import numpy as np
from fastapi import APIRouter, File, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse

from config import settings
from services.audio_preprocessing import cleanup_processed_audio, preprocess_audio_for_diarization
from services.pipeline_service import clustering_service, embedding_service
from services.transcription_service import transcription_service
from utils.file_validation import FileValidator

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/debug-embeddings")
async def debug_embeddings(file: UploadFile = File(...)):
    """
    Диагностика эмбеддингов для отладки проблем с диаризацией.
    
    Возвращает:
    - Информацию о загруженных моделях
    - Статистику эмбеддингов для каждого сегмента
    - Попарные расстояния между сегментами
    - Рекомендации по настройке параметров
    """
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
            
            # Получаем метаданные оригинального аудио
            original_audio_metadata = FileValidator.validate_audio_content(tmp_path)
            original_sample_rate = original_audio_metadata.get("sample_rate", 0)
            
            # Предобработка аудио (апсемплинг если нужно)
            processed_path = preprocess_audio_for_diarization(tmp_path, request_id)
            
            try:
                # Транскрипция с обработанным аудио
                asr_result = await run_in_threadpool(
                    transcription_service.transcribe_audio,
                    processed_path
                )
                
                if not asr_result.get("success"):
                    cleanup_processed_audio(processed_path, tmp_path, request_id)
                    return JSONResponse(
                        status_code=500,
                        content={"error": "Ошибка транскрипции", "details": asr_result}
                    )
                
                segments = asr_result.get("segments", [])
                if not segments:
                    cleanup_processed_audio(processed_path, tmp_path, request_id)
                    return JSONResponse(
                        content={
                            "error": "Нет сегментов для анализа",
                            "segments_count": 0
                        }
                    )
                
                # Загрузка обработанного аудио
                try:
                    audio_np, audio_sr = librosa.load(processed_path, sr=16000, mono=True)
                except Exception as e:
                    cleanup_processed_audio(processed_path, tmp_path, request_id)
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
                        "text": seg.get("text", "")[:50],
                        "embedding_norm": round(norm, 4),
                        "non_zero_values": non_zero,
                        "embedding_dim": len(emb),
                        "is_normalized": 0.9 < norm < 1.1,
                        "is_valid": non_zero > 100 and 0.9 < norm < 1.1,
                    })
                
                # Расстояния между сегментами
                distances = []
                for i in range(len(embeddings)):
                    for j in range(i + 1, min(i + 5, len(embeddings))):
                        dist = clustering_service._cosine_distance(embeddings[i], embeddings[j])
                        distances.append({
                            "segment_i": i,
                            "segment_j": j,
                            "cosine_distance": round(float(dist), 4),
                            "similar": dist < 0.4,
                        })
                
                # Анализ и рекомендации
                avg_norm = np.mean([d["embedding_norm"] for d in diagnostics])
                valid_embeddings = sum(1 for d in diagnostics if d["is_valid"])
                avg_distance = np.mean([d["cosine_distance"] for d in distances]) if distances else 0
                
                sample_rate = original_sample_rate
                was_resampled = processed_path != tmp_path
                
                recommendations = []
                
                # Проверка sample rate
                if sample_rate < 16000:
                    if settings.auto_resample_enabled:
                        recommendations.append({
                            "level": "info",
                            "message": f"Низкое качество аудио: {sample_rate}Hz. Автоматический апсемплинг до 16000Hz включён.",
                            "action": "Аудио будет автоматически улучшено при транскрипции. Для лучшего качества отправляйте аудио 16kHz+."
                        })
                    else:
                        recommendations.append({
                            "level": "critical",
                            "message": f"Низкое качество аудио: {sample_rate}Hz. Автоматический апсемплинг отключён.",
                            "action": "Включите AUTO_RESAMPLE_ENABLED=true или конвертируйте: ffmpeg -i input.mp3 -ar 16000 -ac 1 output.wav"
                        })
                
                if not embedding_service._pyannote_embedder:
                    recommendations.append({
                        "level": "warning",
                        "message": "Pyannote модель не загружена. Используется только remote embeddings.",
                        "action": "Установите HF_TOKEN для локальных эмбеддингов: export HF_TOKEN='your_token_here'"
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
                
                if valid_embeddings == len(diagnostics) and not recommendations:
                    recommendations.append({
                        "level": "success",
                        "message": "Все эмбеддинги валидны. Система работает корректно.",
                        "action": "Настройте параметры кластеризации при необходимости"
                    })
                
                logger.info(f"[{request_id}] Диагностика завершена: {len(segments)} сегментов, {valid_embeddings} валидных")
                
                # Очистка временного файла
                cleanup_processed_audio(processed_path, tmp_path, request_id)
                
                return JSONResponse(content={
                    "request_id": request_id,
                    "segments_count": len(segments),
                    "valid_embeddings": valid_embeddings,
                    "diagnostics": diagnostics,
                    "pairwise_distances": distances[:20],
                    "audio_quality": {
                        "original_sample_rate": sample_rate,
                        "processed_sample_rate": 16000 if was_resampled else sample_rate,
                        "was_resampled": was_resampled,
                        "quality": "good" if sample_rate >= 16000 else "poor",
                        "auto_resample_enabled": settings.auto_resample_enabled,
                        "recommendation": (
                            "OK - качество достаточное" if sample_rate >= 16000
                            else "Автоматически улучшено до 16000Hz" if was_resampled
                            else "Включите AUTO_RESAMPLE_ENABLED=true"
                        )
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
                
            except Exception as inner_exc:
                cleanup_processed_audio(processed_path, tmp_path, request_id)
                raise
            
    except Exception as exc:
        logger.exception(f"[{request_id}] Ошибка диагностики: {exc}")
        return JSONResponse(
            status_code=500,
            content={"error": str(exc)}
        )

"""
Сервис для выполнения полного pipeline обработки аудио.
"""
import logging
import time
from typing import Any

import librosa
import numpy as np
import soundfile

from config import settings
from services.alignment_service import AlignmentService
from services.attribution_service import AttributionService
from services.audio_preprocessing import preprocess_audio_for_diarization, cleanup_processed_audio
from services.clustering_service import ClusteringService
from services.embedding_service import EmbeddingService
from services.overlap_handler import OverlapHandler
from services.postprocess_service import PostprocessService
from services.transcription_service import transcription_service
from utils.metrics import metrics

logger = logging.getLogger(__name__)

# Инициализация сервисов
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


def run_ultra_pipeline(
    audio_path: str,
    preprocess_metadata: dict[str, Any] | None,
    request_id: str,
) -> dict[str, Any]:
    """
    Выполнение полного pipeline обработки аудио с отслеживанием метрик.
    
    Pipeline включает:
    1. Предобработка аудио (апсемплинг при необходимости)
    2. ASR (распознавание речи)
    3. Alignment (выравнивание сегментов)
    4. Embedding (генерация эмбеддингов спикеров)
    5. Clustering (кластеризация спикеров)
    6. Overlap processing (обработка одновременной речи)
    7. Attribution (построение timeline спикеров)
    8. Postprocessing (финальная обработка)
    
    Args:
        audio_path: Путь к аудиофайлу
        preprocess_metadata: Метаданные предобработки (overlap candidates и т.д.)
        request_id: ID запроса для логирования и метрик
    
    Returns:
        Словарь с результатами обработки
    """
    # Предобработка аудио для улучшения диаризации
    processed_audio_path = preprocess_audio_for_diarization(audio_path, request_id)
    
    try:
        # ASR этап - используем обработанное аудио
        start_time = time.time()
        asr_result = transcription_service.transcribe_audio(processed_audio_path)
        asr_time = time.time() - start_time
        metrics.record_stage_time(request_id, "asr", asr_time)
        
        if not asr_result.get("success"):
            return asr_result

        base_segments = asr_result.get("segments", []) or []
        
        # Логируем информацию о сегментах из ASR
        logger.info(f"[{request_id}] ASR создал {len(base_segments)} сегментов:")
        for idx, seg in enumerate(base_segments):
            start = seg.get("start", 0)
            end = seg.get("end", 0)
            text = seg.get("text", "")[:50]  # Первые 50 символов
            logger.info(f"  Сегмент {idx}: {start:.2f}s-{end:.2f}s, text='{text}...'")
        
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

        result = {
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
        
        # Очистка временного файла после обработки
        cleanup_processed_audio(processed_audio_path, audio_path, request_id)
        
        return result
        
    except Exception as e:
        # Очистка временного файла в случае ошибки
        cleanup_processed_audio(processed_audio_path, audio_path, request_id)
        raise

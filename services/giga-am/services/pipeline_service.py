"""
Сервис для выполнения полного pipeline обработки аудио.
"""
import logging
import os
import time
from typing import Any

import librosa
import numpy as np
import soundfile

from config import settings
from services.alignment_service import AlignmentService
from services.attribution_service import AttributionService
from services.audio_preprocessing import preprocess_audio_for_diarization, cleanup_processed_audio
from services.diarization_service import DiarizationService
from services.postprocess_service import PostprocessService
from services.transcription_service import transcription_service
from utils.metrics import metrics

logger = logging.getLogger(__name__)

# Инициализация сервисов
diarization_service = DiarizationService()
alignment_service = AlignmentService()
attribution_service = AttributionService()
postprocess_service = PostprocessService()


def run_ultra_pipeline(
    audio_path: str,
    preprocess_metadata: dict[str, Any] | None,
    request_id: str,
) -> dict[str, Any]:
    """
    Выполнение полного pipeline обработки аудио с отслеживанием метрик.
    
    Pipeline (SOTA 2024-2026):
    1. Предобработка аудио (апсемплинг при необходимости)
    2. Diarization (pyannote) → сегменты по спикерам
    3. ASR (GigaAM) → транскрипция каждого сегмента
    4. Alignment (выравнивание сегментов)
    5. Postprocessing (финальная обработка)
    
    Args:
        audio_path: Путь к аудиофайлу
        preprocess_metadata: Метаданные предобработки
        request_id: ID запроса для логирования и метрик
    
    Returns:
        Словарь с результатами обработки
    """
    # Предобработка аудио для улучшения диаризации
    processed_audio_path = preprocess_audio_for_diarization(audio_path, request_id)
    
    try:
        # Загружаем аудио для диаризации
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
        
        # Проверяем доступность remote diarization service
        if not diarization_service.is_available:
            raise RuntimeError(
                "Remote diarization service недоступен или pyannote не загружен. "
                f"Проверьте: 1) SPEAKER_EMBEDDINGS_URL={settings.speaker_embeddings_url}, "
                "2) HF_TOKEN на remote сервисе (speaker-embeddings), "
                "3) docker-compose logs speaker-embeddings. "
                "См. документацию: DIARIZATION_PIPELINE.md"
            )
        
        logger.info(f"[{request_id}] Используется SOTA pipeline: Pyannote Diarization → GigaAM ASR")
        
        # Этап 1: Diarization - определяем границы спикеров
        start_time = time.time()
        diarization_segments = diarization_service.diarize(
            audio_np,
            audio_sr,
            num_speakers=settings.diarization_num_speakers,
            min_speakers=settings.diarization_min_speakers,
            max_speakers=settings.diarization_max_speakers,
        )
        diarization_time = time.time() - start_time
        metrics.record_stage_time(request_id, "diarization", diarization_time)
        
        if not diarization_segments:
            raise RuntimeError(
                "Diarization не вернул сегментов. "
                "Проверьте качество аудио и настройки pyannote."
            )
        
        # Объединяем короткие сегменты
        diarization_segments = diarization_service.merge_short_segments(
            diarization_segments,
            min_duration=settings.diarization_min_segment_duration,
        )
        
        logger.info(
            f"[{request_id}] Diarization создал {len(diarization_segments)} сегментов "
            f"для транскрипции"
        )
        
        # Этап 2: ASR - транскрибируем каждый сегмент
        start_time = time.time()
        transcribed_segments = []
        
        for idx, diar_seg in enumerate(diarization_segments):
            start = diar_seg["start"]
            end = diar_seg["end"]
            speaker = diar_seg["speaker"]
            
            # Извлекаем аудио для этого сегмента
            start_sample = int(start * audio_sr)
            end_sample = int(end * audio_sr)
            segment_audio = audio_np[start_sample:end_sample]
            
            if segment_audio.size == 0:
                logger.warning(f"[{request_id}] Пустой сегмент {idx}: {start:.2f}-{end:.2f}s")
                continue
            
            # Сохраняем временный файл для ASR
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
                segment_path = tmp_file.name
                soundfile.write(segment_path, segment_audio, audio_sr)
            
            try:
                # Транскрибируем сегмент
                asr_result = transcription_service.transcribe_audio(segment_path)
                
                if asr_result.get("success") and asr_result.get("segments"):
                    # Добавляем спикера и корректируем временные метки
                    for asr_seg in asr_result["segments"]:
                        transcribed_segments.append({
                            "start": start + float(asr_seg.get("start", 0)),
                            "end": start + float(asr_seg.get("end", 0)),
                            "text": asr_seg.get("text", ""),
                            "speaker": speaker,
                            "confidence": asr_seg.get("confidence", 1.0),
                        })
                else:
                    # ASR не вернул текст, создаём пустой сегмент
                    transcribed_segments.append({
                        "start": start,
                        "end": end,
                        "text": "",
                        "speaker": speaker,
                        "confidence": 0.0,
                    })
            finally:
                # Удаляем временный файл
                try:
                    os.unlink(segment_path)
                except Exception:
                    pass
        
        asr_time = time.time() - start_time
        metrics.record_stage_time(request_id, "asr", asr_time)
        
        logger.info(
            f"[{request_id}] ASR завершён: {len(transcribed_segments)} сегментов "
            f"из {len(diarization_segments)} diarization сегментов"
        )
        
        # Этап 3: Alignment (если включен)
        start_time = time.time()
        aligned_segments = (
            alignment_service.align_segments(transcribed_segments)
            if settings.alignment_enabled
            else transcribed_segments
        )
        alignment_time = time.time() - start_time
        if settings.alignment_enabled:
            metrics.record_stage_time(request_id, "alignment", alignment_time)
        
        # Этап 4: Attribution - построение timeline
        start_time = time.time()
        speaker_timeline = attribution_service.build_speaker_timeline(aligned_segments)
        attribution_time = time.time() - start_time
        metrics.record_stage_time(request_id, "attribution", attribution_time)
        
        # Этап 5: Postprocessing
        start_time = time.time()
        final_segments = postprocess_service.apply_to_segments(aligned_segments)
        final_transcript = postprocess_service.build_final_transcript(final_segments)
        postprocess_time = time.time() - start_time
        metrics.record_stage_time(request_id, "postprocess", postprocess_time)
        
        # Вычисляем общую длительность
        total_duration = float(audio_np.size / audio_sr) if audio_sr > 0 else 0.0
        
        result = {
            "success": True,
            "segments": final_segments,
            "speaker_timeline": speaker_timeline,
            "final_transcript": final_transcript,
            "total_duration": total_duration,
            "pipeline": "pyannote-diarization-sota-2026",
            "stages": [
                "diarization",
                "asr",
                "alignment" if settings.alignment_enabled else "alignment:disabled",
                "attribution",
                "postprocess",
            ],
        }
        
        # Очистка временного файла
        cleanup_processed_audio(processed_audio_path, audio_path, request_id)
        
        return result
        
    except Exception as e:
        # Очистка временного файла в случае ошибки
        cleanup_processed_audio(processed_audio_path, audio_path, request_id)
        raise

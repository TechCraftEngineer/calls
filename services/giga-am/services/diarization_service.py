"""
Сервис для speaker diarization с использованием pyannote.audio.

Определяет "кто говорил когда" в аудио, создавая сегменты по спикерам.
Это SOTA подход 2024-2026, используемый в production (HuggingFace, Rev.ai и др.)
"""

from __future__ import annotations

import logging
import os
import warnings
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


class DiarizationService:
    """
    Speaker diarization с использованием pyannote.audio Pipeline.
    
    Создаёт сегменты по спикерам (не по паузам), что позволяет правильно
    разделять речь даже когда спикеры говорят подряд без пауз.
    
    DER (Diarization Error Rate): ~11-19% на стандартных бенчмарках.
    """

    def __init__(self) -> None:
        self._pipeline = None
        self._load_pipeline()

    def _load_pipeline(self) -> None:
        """Загрузка pyannote diarization pipeline."""
        try:
            # Подавляем предупреждения torchcodec
            os.environ.setdefault("TORCHCODEC_DISABLE", "1")
            warnings.filterwarnings("ignore", message=r".*libtorchcodec.*")
            warnings.filterwarnings("ignore", module=r"torchcodec\..*")
            
            from pyannote.audio import Pipeline
            
            token = os.getenv("HF_TOKEN", "").strip() or None
            model_name = os.getenv(
                "PYANNOTE_DIARIZATION_MODEL",
                "pyannote/speaker-diarization-3.1"
            ).strip()
            
            # Пробуем разные варианты инициализации
            init_attempts = []
            if token:
                init_attempts = [
                    {"use_auth_token": token},
                    {"token": token},
                    {}
                ]
            else:
                init_attempts = [{}]
            
            last_exc = None
            for kwargs in init_attempts:
                try:
                    self._pipeline = Pipeline.from_pretrained(model_name, **kwargs)
                    logger.info(f"Pyannote diarization pipeline загружен: {model_name}")
                    return
                except TypeError as exc:
                    last_exc = exc
                    continue
                except Exception as exc:
                    last_exc = exc
                    break
            
            raise RuntimeError(f"Failed to load pyannote pipeline: {last_exc}")
            
        except Exception as exc:
            self._pipeline = None
            logger.warning(
                f"Pyannote diarization недоступен ({type(exc).__name__}): {exc}. "
                f"Будет использован fallback на ASR сегментацию."
            )

    @property
    def is_available(self) -> bool:
        """Проверка доступности diarization pipeline."""
        return self._pipeline is not None

    def diarize(
        self,
        audio: np.ndarray,
        sample_rate: int,
        num_speakers: int | None = None,
        min_speakers: int | None = None,
        max_speakers: int | None = None,
    ) -> list[dict[str, Any]]:
        """
        Выполнение speaker diarization.
        
        Args:
            audio: Аудио массив (mono, float32)
            sample_rate: Sample rate аудио
            num_speakers: Точное количество спикеров (если известно)
            min_speakers: Минимальное количество спикеров
            max_speakers: Максимальное количество спикеров
        
        Returns:
            Список сегментов с полями:
            - start: начало сегмента (секунды)
            - end: конец сегмента (секунды)
            - speaker: ID спикера (SPEAKER_00, SPEAKER_01, ...)
        """
        if not self.is_available:
            logger.warning("Diarization недоступен, возвращаем пустой список")
            return []
        
        if audio.size == 0 or sample_rate <= 0:
            logger.warning("Пустое аудио или некорректный sample rate")
            return []
        
        try:
            import torch
            
            # Подготовка аудио для pyannote
            # Pyannote ожидает dict с waveform и sample_rate
            waveform = torch.from_numpy(audio).float()
            
            # Если аудио стерео, конвертируем в моно
            if waveform.ndim > 1:
                waveform = waveform.mean(dim=0)
            
            # Pyannote ожидает shape (channels, samples)
            if waveform.ndim == 1:
                waveform = waveform.unsqueeze(0)
            
            audio_dict = {
                "waveform": waveform,
                "sample_rate": sample_rate,
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
                f"Запуск diarization: audio_duration={len(audio)/sample_rate:.2f}s, "
                f"params={diarization_params}"
            )
            
            # Выполнение диаризации
            diarization = self._pipeline(audio_dict, **diarization_params)
            
            # Конвертация результатов в наш формат
            segments = []
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                segments.append({
                    "start": float(turn.start),
                    "end": float(turn.end),
                    "speaker": speaker,
                })
            
            # Сортировка по времени
            segments.sort(key=lambda s: s["start"])
            
            # Статистика
            unique_speakers = set(s["speaker"] for s in segments)
            total_duration = sum(s["end"] - s["start"] for s in segments)
            
            logger.info(
                f"Diarization завершена: {len(segments)} сегментов, "
                f"{len(unique_speakers)} спикеров, "
                f"total_speech={total_duration:.2f}s"
            )
            
            # Логируем детали по спикерам
            for speaker in sorted(unique_speakers):
                speaker_segments = [s for s in segments if s["speaker"] == speaker]
                speaker_duration = sum(s["end"] - s["start"] for s in speaker_segments)
                logger.info(
                    f"  {speaker}: {len(speaker_segments)} сегментов, "
                    f"duration={speaker_duration:.2f}s"
                )
            
            return segments
            
        except Exception as exc:
            logger.error(f"Ошибка при diarization: {exc}", exc_info=True)
            return []

    def merge_short_segments(
        self,
        segments: list[dict[str, Any]],
        min_duration: float = 0.5,
    ) -> list[dict[str, Any]]:
        """
        Объединение коротких сегментов одного спикера.
        
        Если два сегмента одного спикера идут подряд и между ними
        маленький разрыв, объединяем их.
        """
        if not segments:
            return segments
        
        merged = []
        current = segments[0].copy()
        
        for next_seg in segments[1:]:
            # Если тот же спикер и маленький разрыв
            if (
                current["speaker"] == next_seg["speaker"]
                and next_seg["start"] - current["end"] < 0.3  # макс 300ms разрыв
            ):
                # Объединяем
                current["end"] = next_seg["end"]
            else:
                # Сохраняем текущий и начинаем новый
                merged.append(current)
                current = next_seg.copy()
        
        # Добавляем последний
        merged.append(current)
        
        # Фильтруем слишком короткие
        merged = [s for s in merged if s["end"] - s["start"] >= min_duration]
        
        logger.info(
            f"Merge: {len(segments)} → {len(merged)} сегментов "
            f"(min_duration={min_duration}s)"
        )
        
        return merged

"""
Сервис для speaker diarization через remote service (speaker-embeddings).

Определяет "кто говорил когда" в аудио, создавая сегменты по спикерам.
Это SOTA подход 2024-2026, используемый в production (HuggingFace, Rev.ai и др.)
"""

from __future__ import annotations

import io
import logging
import time
from typing import Any

import numpy as np
import requests
import soundfile as sf

from config import settings

logger = logging.getLogger(__name__)


class DiarizationService:
    """
    Speaker diarization через remote service.
    
    Создаёт сегменты по спикерам (не по паузам), что позволяет правильно
    разделять речь даже когда спикеры говорят подряд без пауз.
    
    DER (Diarization Error Rate): ~11-19% на стандартных бенчмарках.
    """

    def __init__(self) -> None:
        self._remote_url = settings.speaker_embeddings_url.strip().rstrip("/")
        self._timeout = settings.speaker_embeddings_timeout
        self._available: bool | None = None
        self._available_checked_at: float = 0
        self._check_availability()

    def _check_availability(self) -> None:
        """Проверка доступности remote сервиса."""
        if not self._remote_url:
            logger.warning(
                "SPEAKER_EMBEDDINGS_URL не настроен. "
                "Diarization будет недоступен. "
                "Установите SPEAKER_EMBEDDINGS_URL в .env"
            )
            return
        
        try:
            response = requests.get(
                f"{self._remote_url}/health",
                timeout=5,
            )
            if response.status_code == 200:
                data = response.json()
                pyannote_available = data.get("pyannote_available", False)
                if pyannote_available:
                    logger.info(
                        f"Remote diarization service доступен: {self._remote_url}"
                    )
                else:
                    logger.warning(
                        f"Remote service доступен, но pyannote не загружен. "
                        f"Проверьте HF_TOKEN на remote сервисе."
                    )
            else:
                logger.warning(
                    f"Remote service вернул HTTP {response.status_code}"
                )
        except Exception as exc:
            logger.warning(
                f"Не удалось подключиться к remote diarization service: {exc}"
            )

    @property
    def is_available(self) -> bool:
        """Проверка доступности diarization с кэшем TTL 30 секунд."""
        if not self._remote_url:
            return False
        
        # Используем кэш если не истёк TTL (30 секунд)
        current_time = time.time()
        if self._available is not None and (current_time - self._available_checked_at) < 30:
            return self._available
        
        # Делаем HTTP запрос только раз в 30 секунд
        try:
            response = requests.get(
                f"{self._remote_url}/health",
                timeout=5,
            )
            if response.status_code == 200:
                data = response.json()
                self._available = data.get("pyannote_available", False)
            else:
                self._available = False
        except Exception:
            self._available = False
        
        self._available_checked_at = current_time
        return self._available

    def diarize(
        self,
        audio: np.ndarray,
        sample_rate: int,
        num_speakers: int | None = None,
        min_speakers: int | None = None,
        max_speakers: int | None = None,
    ) -> list[dict[str, Any]]:
        """
        Выполнение speaker diarization через remote service.
        
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
        if not self._remote_url:
            logger.error("SPEAKER_EMBEDDINGS_URL не настроен")
            return []
        
        if audio.size == 0 or sample_rate <= 0:
            logger.warning("Пустое аудио или некорректный sample rate")
            return []
        
        try:
            # Подготовка аудио для отправки
            with io.BytesIO() as wav_buffer:
                sf.write(
                    wav_buffer,
                    audio.astype(np.float32),
                    sample_rate,
                    format="WAV",
                    subtype="PCM_16",
                )
                wav_bytes = wav_buffer.getvalue()
            
            # Параметры диаризации
            form_data = {}
            if num_speakers is not None:
                form_data["num_speakers"] = str(num_speakers)
            if min_speakers is not None:
                form_data["min_speakers"] = str(min_speakers)
            if max_speakers is not None:
                form_data["max_speakers"] = str(max_speakers)
            
            logger.info(
                f"Запрос diarization к remote service: "
                f"audio_duration={len(audio)/sample_rate:.2f}s, "
                f"params={form_data}"
            )
            
            # Отправка запроса
            response = requests.post(
                f"{self._remote_url}/api/diarize",
                files={"file": ("audio.wav", wav_bytes, "audio/wav")},
                data=form_data,
                timeout=self._timeout,
            )
            response.raise_for_status()
            
            data = response.json()
            
            if not data.get("success"):
                logger.error(f"Remote diarization failed: {data}")
                return []
            
            segments = data.get("segments", [])
            
            # Статистика
            logger.info(
                f"Remote diarization завершена: {len(segments)} сегментов, "
                f"{data.get('num_speakers', 0)} спикеров"
            )
            
            # Логируем детали по спикерам
            for speaker in data.get("speakers", []):
                speaker_segments = [s for s in segments if s["speaker"] == speaker]
                speaker_duration = sum(s["end"] - s["start"] for s in speaker_segments)
                logger.info(
                    f"  {speaker}: {len(speaker_segments)} сегментов, "
                    f"duration={speaker_duration:.2f}s"
                )
            
            return segments
            
        except requests.exceptions.Timeout:
            logger.error(
                f"Timeout при запросе к remote diarization service "
                f"(timeout={self._timeout}s)"
            )
            return []
        except requests.exceptions.RequestException as exc:
            logger.error(f"Ошибка при запросе к remote service: {exc}")
            return []
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

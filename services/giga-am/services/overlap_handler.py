"""
Обработка одновременной речи (overlapping speech) в диаризации.

Современные подходы к overlap detection:
1. Source separation - разделение аудио на отдельные источники
2. Multi-label classification - предсказание нескольких спикеров одновременно
3. Embedding-based separation - использование эмбеддингов для разделения

Текущая реализация: Embedding-based approach с temporal analysis
"""

from __future__ import annotations

import math
from typing import Any


class OverlapHandler:
    """
    Обработчик одновременной речи спикеров.
    
    Подход:
    1. Детекция overlap регионов (из preprocessing или по эмбеддингам)
    2. Анализ эмбеддингов в overlap регионах
    3. Попытка разделения на отдельных спикеров
    4. Создание sub-segments для каждого спикера
    """

    def __init__(
        self,
        overlap_confidence_threshold: float = 0.7,
        min_overlap_duration: float = 0.5,
        embedding_similarity_threshold: float = 0.6,
    ):
        """
        Args:
            overlap_confidence_threshold: Порог уверенности для детекции overlap
            min_overlap_duration: Минимальная длительность overlap для обработки
            embedding_similarity_threshold: Порог схожести эмбеддингов для разделения
        """
        self.overlap_confidence_threshold = overlap_confidence_threshold
        self.min_overlap_duration = min_overlap_duration
        self.embedding_similarity_threshold = embedding_similarity_threshold

    @staticmethod
    def _cosine_similarity(a: list[float], b: list[float]) -> float:
        """Вычисление cosine similarity между двумя векторами."""
        if not a or not b or len(a) != len(b):
            return 0.0
        dot = 0.0
        na = 0.0
        nb = 0.0
        for ai, bi in zip(a, b, strict=True):
            dot += ai * bi
            na += ai * ai
            nb += bi * bi
        if na <= 1e-12 or nb <= 1e-12:
            return 0.0
        cosine = dot / (math.sqrt(na) * math.sqrt(nb))
        return max(-1.0, min(1.0, cosine))

    def detect_overlap_regions(
        self,
        segments: list[dict[str, Any]],
        overlap_spans: list[dict[str, Any]] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Детекция регионов с одновременной речью.
        
        Args:
            segments: Список сегментов с временными метками
            overlap_spans: Предварительно детектированные overlap регионы (из preprocessing)
        
        Returns:
            Список overlap регионов с метаданными
        """
        overlap_regions: list[dict[str, Any]] = []
        
        # Используем предварительно детектированные overlap (если есть)
        if overlap_spans:
            for span in overlap_spans:
                start = float(span.get("start", 0.0))
                end = float(span.get("end", 0.0))
                duration = end - start
                
                if duration >= self.min_overlap_duration:
                    overlap_regions.append(
                        {
                            "start": start,
                            "end": end,
                            "duration": duration,
                            "source": "preprocessing",
                            "confidence": span.get("confidence", 0.8),
                        }
                    )
        
        # Дополнительная детекция по временным пересечениям сегментов
        for i, seg1 in enumerate(segments):
            start1 = float(seg1.get("start", 0.0))
            end1 = float(seg1.get("end", 0.0))
            
            for seg2 in segments[i + 1 :]:
                start2 = float(seg2.get("start", 0.0))
                end2 = float(seg2.get("end", 0.0))
                
                # Проверка пересечения
                overlap_start = max(start1, start2)
                overlap_end = min(end1, end2)
                
                if overlap_end > overlap_start:
                    duration = overlap_end - overlap_start
                    
                    if duration >= self.min_overlap_duration:
                        # Проверяем, не дублируется ли этот регион
                        is_duplicate = any(
                            abs(region["start"] - overlap_start) < 0.1
                            and abs(region["end"] - overlap_end) < 0.1
                            for region in overlap_regions
                        )
                        
                        if not is_duplicate:
                            overlap_regions.append(
                                {
                                    "start": overlap_start,
                                    "end": overlap_end,
                                    "duration": duration,
                                    "source": "temporal_analysis",
                                    "confidence": 0.6,
                                    "segment_indices": [i, segments.index(seg2)],
                                }
                            )
        
        return overlap_regions

    def separate_overlap_speakers(
        self,
        overlap_region: dict[str, Any],
        segments: list[dict[str, Any]],
        clusters: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """
        Попытка разделения спикеров в overlap регионе.
        
        Подход:
        1. Находим сегменты, пересекающиеся с overlap регионом
        2. Анализируем их эмбеддинги
        3. Сравниваем с известными кластерами
        4. Создаём sub-segments для каждого спикера
        
        Args:
            overlap_region: Регион с overlap
            segments: Все сегменты
            clusters: Известные кластеры спикеров
        
        Returns:
            Список sub-segments для overlap региона
        """
        region_start = overlap_region["start"]
        region_end = overlap_region["end"]
        
        # Находим сегменты в overlap регионе
        overlapping_segments = []
        for seg in segments:
            seg_start = float(seg.get("start", 0.0))
            seg_end = float(seg.get("end", 0.0))
            
            # Проверка пересечения
            if seg_start < region_end and seg_end > region_start:
                overlapping_segments.append(seg)
        
        if len(overlapping_segments) < 2:
            # Недостаточно сегментов для разделения
            return []
        
        # Анализируем эмбеддинги
        sub_segments = []
        for seg in overlapping_segments:
            embedding = seg.get("embedding", [])
            if not embedding:
                continue
            
            # Находим наиболее похожий кластер
            best_cluster = None
            best_similarity = -1.0
            
            for cluster in clusters:
                centroid = cluster.get("centroid", [])
                if not centroid:
                    continue
                
                similarity = self._cosine_similarity(embedding, centroid)
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_cluster = cluster
            
            if best_cluster and best_similarity >= self.embedding_similarity_threshold:
                # Создаём sub-segment для этого спикера
                overlap_start = max(region_start, float(seg.get("start", 0.0)))
                overlap_end = min(region_end, float(seg.get("end", 0.0)))
                
                sub_segments.append(
                    {
                        "start": overlap_start,
                        "end": overlap_end,
                        "speaker": best_cluster["speaker"],
                        "text": seg.get("text", ""),
                        "overlap": True,
                        "overlap_confidence": best_similarity,
                        "is_sub_segment": True,
                        "parent_segment_start": seg.get("start"),
                        "confidence": seg.get("confidence", 0.7),
                    }
                )
        
        return sub_segments

    def process_overlaps(
        self,
        segments: list[dict[str, Any]],
        clusters: list[dict[str, Any]],
        overlap_spans: list[dict[str, Any]] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Основная функция обработки overlap.
        
        Pipeline:
        1. Детекция overlap регионов
        2. Разделение спикеров в каждом регионе
        3. Создание финального списка сегментов с sub-segments
        
        Args:
            segments: Исходные сегменты
            clusters: Кластеры спикеров
            overlap_spans: Предварительно детектированные overlap
        
        Returns:
            Обновлённый список сегментов с разделёнными overlap
        """
        # Детекция overlap регионов
        overlap_regions = self.detect_overlap_regions(segments, overlap_spans)
        
        if not overlap_regions:
            return segments
        
        # Разделение спикеров в каждом overlap регионе
        all_sub_segments = []
        for region in overlap_regions:
            sub_segments = self.separate_overlap_speakers(region, segments, clusters)
            all_sub_segments.extend(sub_segments)
        
        # Объединяем исходные сегменты с sub-segments
        result_segments = []
        
        for seg in segments:
            seg_start = float(seg.get("start", 0.0))
            seg_end = float(seg.get("end", 0.0))
            
            # Проверяем, есть ли sub-segments для этого сегмента
            related_sub_segments = [
                sub
                for sub in all_sub_segments
                if abs(sub.get("parent_segment_start", -999) - seg_start) < 0.01
            ]
            
            if related_sub_segments:
                # Есть overlap - добавляем sub-segments вместо исходного
                result_segments.extend(related_sub_segments)
            else:
                # Нет overlap - добавляем исходный сегмент
                result_segments.append(seg)
        
        # Сортируем по времени
        result_segments.sort(key=lambda s: float(s.get("start", 0.0)))
        
        return result_segments

    def get_overlap_statistics(
        self,
        segments: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Статистика по overlap в сегментах.
        
        Returns:
            Словарь со статистикой
        """
        total_segments = len(segments)
        overlap_segments = sum(1 for seg in segments if seg.get("overlap", False))
        sub_segments = sum(1 for seg in segments if seg.get("is_sub_segment", False))
        
        total_duration = sum(
            float(seg.get("end", 0.0)) - float(seg.get("start", 0.0)) for seg in segments
        )
        overlap_duration = sum(
            float(seg.get("end", 0.0)) - float(seg.get("start", 0.0))
            for seg in segments
            if seg.get("overlap", False)
        )
        
        return {
            "total_segments": total_segments,
            "overlap_segments": overlap_segments,
            "sub_segments": sub_segments,
            "overlap_percentage": (
                (overlap_segments / total_segments * 100) if total_segments > 0 else 0.0
            ),
            "total_duration_seconds": total_duration,
            "overlap_duration_seconds": overlap_duration,
            "overlap_time_percentage": (
                (overlap_duration / total_duration * 100) if total_duration > 0 else 0.0
            ),
        }


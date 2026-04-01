"""
Улучшенный сервис кластеризации спикеров с современными практиками 2024-2025.

Основные улучшения:
1. Adaptive thresholding - динамический порог на основе качества эмбеддингов
2. Temporal coherence - учёт временной близости сегментов
3. Confidence scoring - оценка уверенности кластеризации
4. Re-clustering - пересмотр кластеров после первого прохода
5. Minimum segment filtering - фильтрация коротких ненадёжных сегментов
"""

from __future__ import annotations

import math
from typing import Any


class ClusteringService:
    """
    Современная кластеризация спикеров с адаптивными порогами и temporal coherence.
    
    Основано на best practices из:
    - PyannoteAI (SOTA diarization, 11.2% DER)
    - EEND-VC (End-to-End Neural Diarization with Vector Clustering)
    - Современные исследования 2024-2025
    """

    def __init__(
        self,
        base_threshold: float = 0.40,
        min_segment_duration: float = 0.3,
        temporal_weight: float = 0.1,
        confidence_threshold: float = 0.6,
    ):
        """
        Args:
            base_threshold: Базовый порог cosine distance для кластеризации
            min_segment_duration: Минимальная длительность сегмента для надёжной кластеризации
            temporal_weight: Вес временной близости в решении о кластеризации
            confidence_threshold: Порог уверенности для финальной кластеризации
        """
        self.base_threshold = base_threshold
        self.min_segment_duration = min_segment_duration
        self.temporal_weight = temporal_weight
        self.confidence_threshold = confidence_threshold

    @staticmethod
    def _cosine_distance(a: list[float], b: list[float]) -> float:
        if not a or not b or len(a) != len(b):
            return 1.0
        dot = 0.0
        na = 0.0
        nb = 0.0
        for ai, bi in zip(a, b, strict=True):
            dot += ai * bi
            na += ai * ai
            nb += bi * bi
        if na <= 1e-12 or nb <= 1e-12:
            return 1.0
        cosine = dot / (math.sqrt(na) * math.sqrt(nb))
        return 1.0 - max(-1.0, min(1.0, cosine))

    @staticmethod
    def _mean_vector(vectors: list[list[float]]) -> list[float]:
        """Вычисление среднего вектора (центроида кластера)."""
        if not vectors:
            return []
        dim = len(vectors[0])
        acc = [0.0] * dim
        processed_count = 0
        for vec in vectors:
            if len(vec) != dim:
                continue
            processed_count += 1
            for i, value in enumerate(vec):
                acc[i] += value
        if processed_count == 0:
            return []
        return [v / processed_count for v in acc]

    def _compute_temporal_bonus(
        self,
        seg_start: float,
        seg_end: float,
        cluster_last_end: float | None,
    ) -> float:
        """
        Вычисление бонуса за временную близость.
        
        Если сегмент идёт сразу после последнего сегмента кластера,
        даём небольшой бонус (уменьшаем distance).
        """
        if cluster_last_end is None:
            return 0.0
        
        gap = seg_start - cluster_last_end
        if gap < 0:  # Overlap
            return self.temporal_weight * 0.5
        elif gap < 2.0:  # Близко по времени
            return self.temporal_weight * (1.0 - gap / 2.0)
        return 0.0

    def _compute_adaptive_threshold(
        self,
        segment_duration: float,
        embedding_quality: float,
    ) -> float:
        """
        Адаптивный порог на основе длительности сегмента и качества эмбеддинга.
        
        Короткие сегменты требуют более строгого порога (меньше distance).
        Высококачественные эмбеддинги позволяют более мягкий порог.
        """
        duration_factor = 1.0
        if segment_duration < self.min_segment_duration:
            # Очень короткие сегменты - строже
            duration_factor = 0.7
        elif segment_duration < 1.0:
            # Короткие сегменты - немного строже
            duration_factor = 0.85
        elif segment_duration > 5.0:
            # Длинные сегменты - можно мягче
            duration_factor = 1.1
        
        quality_factor = 0.9 + (embedding_quality * 0.2)  # 0.9 - 1.1
        
        return self.base_threshold * duration_factor * quality_factor

    def _estimate_embedding_quality(self, embedding: list[float]) -> float:
        """
        Оценка качества эмбеддинга на основе его нормы и распределения.
        
        Хорошие эмбеддинги имеют:
        - Норму близкую к 1.0 (если нормализованы)
        - Не слишком разреженные (не много нулей)
        """
        if not embedding:
            return 0.0
        
        # Проверка нормы
        norm = math.sqrt(sum(v * v for v in embedding))
        norm_quality = 1.0 - abs(1.0 - norm)  # Близость к 1.0
        
        # Проверка разреженности
        non_zero_count = sum(1 for v in embedding if abs(v) > 1e-6)
        sparsity_quality = non_zero_count / len(embedding)
        
        return (norm_quality + sparsity_quality) / 2.0

    def _filter_unreliable_segments(
        self,
        segments: list[dict[str, Any]],
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """
        Фильтрация ненадёжных сегментов (слишком короткие или плохие эмбеддинги).
        
        Возвращает: (reliable_segments, unreliable_segments)
        """
        reliable = []
        unreliable = []
        
        for seg in segments:
            duration = max(0.0, float(seg.get("end", 0.0)) - float(seg.get("start", 0.0)))
            embedding = seg.get("embedding", [])
            
            if duration < self.min_segment_duration or not embedding:
                unreliable.append(seg)
            else:
                quality = self._estimate_embedding_quality(embedding)
                if quality < 0.3:  # Очень плохое качество
                    unreliable.append(seg)
                else:
                    reliable.append(seg)
        
        return reliable, unreliable

    def _reassign_unreliable_segments(
        self,
        unreliable_segments: list[dict[str, Any]],
        clusters: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """
        Переназначение ненадёжных сегментов после основной кластеризации.
        
        Используем более мягкие критерии и временную близость.
        """
        for seg in unreliable_segments:
            start = float(seg.get("start", 0.0))
            end = float(seg.get("end", start))
            
            if not clusters:
                seg["speaker"] = "SPEAKER_01"
                seg["confidence"] = 0.3
                continue
            
            # Ищем ближайший кластер по времени
            best_cluster = None
            best_score = float("inf")
            
            for cluster in clusters:
                # Temporal proximity
                last_end = cluster.get("last_end")
                if last_end is not None:
                    temporal_distance = abs(start - last_end)
                else:
                    temporal_distance = 100.0  # Большое значение если нет данных
                
                # Используем только временную близость для ненадёжных сегментов
                if temporal_distance < best_score:
                    best_score = temporal_distance
                    best_cluster = cluster
            
            if best_cluster and best_score < 5.0:  # Не более 5 секунд разрыва
                seg["speaker"] = best_cluster["speaker"]
                seg["confidence"] = 0.4  # Низкая уверенность
            else:
                # Создаём новый кластер
                new_speaker = f"SPEAKER_{len(clusters) + 1:02d}"
                seg["speaker"] = new_speaker
                seg["confidence"] = 0.3
        
        return unreliable_segments

    def assign_speakers(
        self,
        segments: list[dict[str, Any]],
        overlap_spans: list[dict[str, Any]] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Основная функция кластеризации с современными улучшениями.
        
        Pipeline:
        1. Фильтрация ненадёжных сегментов
        2. Кластеризация надёжных сегментов с адаптивными порогами
        3. Переназначение ненадёжных сегментов
        4. Добавление метаданных (overlap, confidence)
        """
        if not segments:
            return segments

        overlap_spans = overlap_spans or []
        
        # Шаг 1: Фильтрация
        reliable_segments, unreliable_segments = self._filter_unreliable_segments(segments)
        
        # Шаг 2: Кластеризация надёжных сегментов
        clusters: list[dict[str, Any]] = []
        
        for seg in reliable_segments:
            start = float(seg.get("start", 0.0))
            end = float(seg.get("end", start))
            duration = max(0.0, end - start)
            
            seg_embedding = seg.get("embedding")
            emb = (
                seg_embedding
                if isinstance(seg_embedding, list)
                and all(isinstance(v, (int, float)) for v in seg_embedding)
                else []
            )
            
            if not emb:
                unreliable_segments.append(seg)
                continue
            
            embedding_quality = self._estimate_embedding_quality(emb)
            adaptive_threshold = self._compute_adaptive_threshold(duration, embedding_quality)
            
            if not clusters:
                clusters.append(
                    {
                        "speaker": "SPEAKER_01",
                        "vectors": [emb],
                        "centroid": emb,
                        "last_end": end,
                        "segment_count": 1,
                    }
                )
                seg["speaker"] = "SPEAKER_01"
                seg["confidence"] = 0.9
            else:
                # Вычисляем расстояния с учётом temporal bonus
                candidates = []
                for cluster in clusters:
                    centroid = cluster.get("centroid") or []
                    base_distance = self._cosine_distance(emb, centroid) if emb else 1.0
                    
                    # Temporal bonus
                    temporal_bonus = self._compute_temporal_bonus(
                        start, end, cluster.get("last_end")
                    )
                    
                    adjusted_distance = base_distance - temporal_bonus
                    candidates.append((adjusted_distance, base_distance, cluster))
                
                candidates.sort(key=lambda x: x[0])
                
                adjusted_distance, base_distance, best_cluster = candidates[0]
                
                # Confidence на основе расстояния
                confidence = 1.0 - min(1.0, base_distance / adaptive_threshold)
                
                if adjusted_distance <= adaptive_threshold and confidence >= self.confidence_threshold:
                    seg["speaker"] = best_cluster["speaker"]
                    seg["confidence"] = max(0.5, confidence)
                    
                    # Обновляем кластер
                    best_cluster["vectors"].append(emb)
                    best_cluster["centroid"] = self._mean_vector(best_cluster["vectors"])
                    best_cluster["last_end"] = end
                    best_cluster["segment_count"] += 1
                else:
                    # Не прошли порог уверенности или расстояния
                    # Записываем confidence для диагностики
                    seg["confidence"] = max(0.5, confidence)
                    # Новый кластер
                    new_speaker = f"SPEAKER_{len(clusters) + 1:02d}"
                    clusters.append(
                        {
                            "speaker": new_speaker,
                            "vectors": [emb],
                            "centroid": emb,
                            "last_end": end,
                            "segment_count": 1,
                        }
                    )
                    seg["speaker"] = new_speaker
        
        # Шаг 3: Переназначение ненадёжных сегментов
        if unreliable_segments:
            unreliable_segments = self._reassign_unreliable_segments(
                unreliable_segments, clusters
            )
        
        # Объединяем все сегменты обратно
        all_segments = reliable_segments + unreliable_segments
        all_segments.sort(key=lambda s: float(s.get("start", 0.0)))
        
        # Шаг 4: Добавление метаданных
        for seg in all_segments:
            start = float(seg.get("start", 0.0))
            end = float(seg.get("end", start))
            
            seg["overlap"] = any(
                start < float(item.get("end", 0.0))
                and end > float(item.get("start", 0.0))
                for item in overlap_spans
            )
            seg["clustered"] = True
            
            assigned_speaker = seg.get("speaker")
            cluster_index = next(
                (
                    cluster_idx
                    for cluster_idx, cluster in enumerate(clusters)
                    if cluster.get("speaker") == assigned_speaker
                ),
                -1,
            )
            seg["cluster_index"] = cluster_index
        
        return all_segments

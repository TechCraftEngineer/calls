from __future__ import annotations

import logging
import math
from typing import Any

logger = logging.getLogger(__name__)


class ClusteringService:
    """Dynamic clustering с overlap support на основе cosine distance."""

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

    def assign_speakers(
        self,
        segments: list[dict[str, Any]],
        overlap_spans: list[dict[str, Any]] | None = None,
    ) -> list[dict[str, Any]]:
        if not segments:
            return segments

        overlap_spans = overlap_spans or []
        clusters: list[dict[str, Any]] = []
        base_threshold = 0.40  # Увеличен с 0.35 для лучшего разделения спикеров

        for seg in segments:
            start = float(seg.get("start", 0.0))
            end = float(seg.get("end", start))
            seg_embedding = seg.get("embedding")
            emb = (
                seg_embedding
                if isinstance(seg_embedding, list)
                and all(isinstance(v, (int, float)) for v in seg_embedding)
                else []
            )

            if not clusters:
                clusters.append(
                    {
                        "speaker": "SPEAKER_01",
                        "vectors": [emb] if emb else [],
                        "centroid": emb or [],
                    }
                )
                seg["speaker"] = "SPEAKER_01"
            else:
                candidates = []
                for cluster in clusters:
                    centroid = cluster.get("centroid") or []
                    distance = self._cosine_distance(emb, centroid) if emb else 1.0
                    candidates.append((distance, cluster))
                candidates.sort(key=lambda x: x[0])

                # Чуть строже при коротких сегментах
                segment_duration = max(0.0, end - start)
                threshold = base_threshold - 0.05 if segment_duration < 3.0 else base_threshold

                best_distance, best_cluster = candidates[0]
                if best_distance <= threshold:
                    seg["speaker"] = best_cluster["speaker"]
                    if emb:
                        best_cluster["vectors"].append(emb)
                        best_cluster["centroid"] = self._mean_vector(best_cluster["vectors"])
                else:
                    new_speaker = f"SPEAKER_{len(clusters) + 1:02d}"
                    clusters.append(
                        {
                            "speaker": new_speaker,
                            "vectors": [emb] if emb else [],
                            "centroid": emb or [],
                        }
                    )
                    seg["speaker"] = new_speaker
                        {
                            "speaker": new_speaker,
                            "vectors": [emb] if emb else [],
                            "centroid": emb or [],
                        }
                    )
                    seg["speaker"] = new_speaker

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
        return segments

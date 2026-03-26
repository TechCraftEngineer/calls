from __future__ import annotations

from typing import Any


class ClusteringService:
    """Dynamic clustering с overlap support (эвристический baseline)."""

    def assign_speakers(
        self,
        segments: list[dict[str, Any]],
        overlap_spans: list[dict[str, Any]] | None = None,
    ) -> list[dict[str, Any]]:
        if not segments:
            return segments

        overlap_spans = overlap_spans or []
        current = 1
        prev_end = 0.0
        for idx, seg in enumerate(segments):
            start = float(seg.get("start", 0.0))
            end = float(seg.get("end", start))
            if idx == 0:
                seg["speaker"] = "SPEAKER_01"
            else:
                gap = start - prev_end
                if gap > 1.2:
                    current = 1 if current == 2 else 2
                seg["speaker"] = f"SPEAKER_{current:02d}"
            prev_end = end

            seg["overlap"] = any(
                start < float(item.get("end", 0.0))
                and end > float(item.get("start", 0.0))
                for item in overlap_spans
            )
        return segments

from __future__ import annotations

from typing import Any


class AttributionService:
    """Привязка speaker labels к финальному документу."""

    def build_speaker_timeline(self, segments: list[dict[str, Any]]) -> list[dict[str, Any]]:
        timeline: list[dict[str, Any]] = []
        for seg in segments:
            timeline.append(
                {
                    "speaker": seg.get("speaker", "SPEAKER_01"),
                    "start": seg.get("start", 0.0),
                    "end": seg.get("end", 0.0),
                    "text": seg.get("text", ""),
                    "overlap": bool(seg.get("overlap", False)),
                }
            )
        return timeline

from __future__ import annotations

from typing import Any


class AlignmentService:
    """Легковесный forced-alignment слой на базе сегментов ASR."""

    @staticmethod
    def _extract_words(text: str) -> list[str]:
        return [w for w in text.strip().split() if w]

    def align_segments(self, segments: list[dict[str, Any]]) -> list[dict[str, Any]]:
        aligned: list[dict[str, Any]] = []
        for segment in segments:
            text = (segment.get("text") or "").strip()
            start = float(segment.get("start", 0.0))
            end = float(segment.get("end", start))
            words = self._extract_words(text)
            if not words:
                segment["words"] = []
                aligned.append(segment)
                continue

            duration = max(0.001, end - start)
            step = duration / len(words)
            word_items = []
            for idx, word in enumerate(words):
                w_start = start + idx * step
                w_end = start + (idx + 1) * step
                word_items.append(
                    {
                        "word": word,
                        "start": round(w_start, 3),
                        "end": round(w_end, 3),
                        "confidence": 0.8,
                    }
                )
            segment["words"] = word_items
            aligned.append(segment)
        return aligned

from __future__ import annotations

from typing import Any


class AlignmentService:
    """Forced-alignment approximation на базе сегментов ASR."""

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
            # Взвешенное распределение длительности по словам (длиннее слово -> больше времени).
            weights = [max(1, len(word)) for word in words]
            total_weight = sum(weights) or len(words)
            word_items = []
            cursor = start
            for idx, word in enumerate(words):
                ratio = weights[idx] / total_weight
                w_start = cursor
                w_end = min(end, cursor + duration * ratio)
                cursor = w_end
                word_items.append(
                    {
                        "word": word,
                        "start": round(w_start, 3),
                        "end": round(w_end, 3),
                        "confidence": 0.82,
                    }
                )
            if word_items:
                word_items[-1]["end"] = round(end, 3)
            segment["words"] = word_items
            aligned.append(segment)
        return aligned

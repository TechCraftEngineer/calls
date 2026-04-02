from __future__ import annotations

import re
from typing import Any


class PostprocessService:
    """
    Базовая постобработка текста транскрипции.
    
    LLM коррекция теперь выполняется в Inngest, здесь только простая обработка.
    """

    def correct_text(self, text: str) -> tuple[str, float]:
        """
        Базовая очистка и форматирование текста.
        
        Returns:
            tuple[str, float]: (обработанный текст, confidence)
        """
        cleaned = re.sub(r"\s+", " ", text).strip()
        if not cleaned:
            return "", 0.0
        
        # Простая эвристика: капитализация и точка в конце
        return self._safe_heuristic(cleaned), 0.75

    @staticmethod
    def _safe_heuristic(text: str) -> str:
        """Базовое форматирование: капитализация и точка в конце."""
        if text and text[-1] not in ".!?":
            text += "."
        if text:
            text = text[:1].upper() + text[1:]
        return text

    def apply_to_segments(self, segments: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """
        Применяет базовую постобработку к сегментам.
        
        LLM коррекция выполняется в Inngest, здесь только простое форматирование.
        """
        output: list[dict[str, Any]] = []
        for segment in segments:
            fixed_text, base_conf = self.correct_text(segment.get("text", ""))
            segment["raw_text"] = segment.get("text", "")
            segment["text"] = fixed_text
            
            # Синтетические word-timings (если еще не рассчитаны)
            if not segment.get("words"):
                words = [w for w in fixed_text.strip().split() if w]
                if words:
                    start = float(segment.get("start", 0.0))
                    end = float(segment.get("end", start))
                    duration = max(0.001, end - start)
                    step = duration / len(words)
                    segment["words"] = [
                        {
                            "word": word,
                            "start": round(start + idx * step, 3),
                            "end": round(start + (idx + 1) * step, 3),
                            "confidence": 0.8,
                        }
                        for idx, word in enumerate(words)
                    ]
                else:
                    segment["words"] = []
            
            # Сохраняем базовый confidence (без LLM)
            segment["confidence"] = round(
                float(segment.get("confidence", 0.7)), 3
            )
            output.append(segment)
        return output

    def build_final_transcript(self, segments: list[dict[str, Any]]) -> str:
        """Строим финальный транскрипт с разметкой спикеров"""
        lines = []
        for segment in segments:
            text = segment.get("text", "").strip()
            if not text:
                continue
                
            speaker = segment.get("speaker", "SPEAKER_XX")
            lines.append(f"{speaker}: {text}")
        
        return "\n".join(lines)

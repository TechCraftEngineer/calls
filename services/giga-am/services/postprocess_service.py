from __future__ import annotations

import re
from typing import Any

import requests

from config import settings


class PostprocessService:
    """Контекстная пунктуация/капитализация + мягкая текстовая коррекция."""

    def correct_text(self, text: str) -> tuple[str, float]:
        cleaned = re.sub(r"\s+", " ", text).strip()
        if not cleaned:
            return "", 0.0
        protected = self._extract_protected_tokens(cleaned)
        if settings.llm_correction_enabled and settings.llm_api_url:
            llm_text, llm_conf = self._correct_with_llm(cleaned)
            if llm_text:
                if settings.strict_correction_mode and not self._is_protected_subset(
                    protected,
                    llm_text,
                ):
                    # LLM изменил критичные токены (числа/ID/даты) — откатываемся на safe mode.
                    return self._safe_heuristic(cleaned), 0.65
                cleaned = llm_text
                return cleaned, llm_conf
        return self._safe_heuristic(cleaned), 0.75

    @staticmethod
    def _safe_heuristic(text: str) -> str:
        if text and text[-1] not in ".!?":
            text += "."
        if text:
            text = text[:1].upper() + text[1:]
        return text

    @staticmethod
    def _extract_protected_tokens(text: str) -> set[str]:
        pattern = r"\b(?:\d[\d\-:/.]*\d|\d{2,}|[A-Za-zА-Яа-я]*\d+[A-Za-zА-Яа-я\d\-]*)\b"
        return {m.group(0).lower() for m in re.finditer(pattern, text)}

    @staticmethod
    def _is_protected_subset(tokens: set[str], candidate_text: str) -> bool:
        if not tokens:
            return True
        candidate_tokens = PostprocessService._extract_protected_tokens(candidate_text)
        return tokens.issubset(candidate_tokens)

    def _correct_with_llm(self, text: str) -> tuple[str, float]:
        try:
            headers = {"Content-Type": "application/json"}
            if settings.llm_api_key:
                headers["Authorization"] = f"Bearer {settings.llm_api_key}"
            payload = {
                "model": settings.llm_model,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "Ты редактор транскриптов звонков. Исправь пунктуацию и регистр. "
                            "Не меняй числа, имена и факты. Верни только исправленный текст."
                        ),
                    },
                    {"role": "user", "content": text},
                ],
                "temperature": 0.1,
            }
            resp = requests.post(
                settings.llm_api_url,
                headers=headers,
                json=payload,
                timeout=settings.llm_timeout,
            )
            resp.raise_for_status()
            data = resp.json()
            msg = (
                data.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
                .strip()
            )
            if msg:
                return msg, 0.9
            return "", 0.0
        except Exception:
            return "", 0.0

    def apply_to_segments(self, segments: list[dict[str, Any]]) -> list[dict[str, Any]]:
        output: list[dict[str, Any]] = []
        for segment in segments:
            fixed_text, llm_conf = self.correct_text(segment.get("text", ""))
            segment["raw_text"] = segment.get("text", "")
            segment["text"] = fixed_text
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
            segment["llm_confidence"] = llm_conf
            segment["confidence"] = round(
                (float(segment.get("confidence", 0.7)) + llm_conf) / 2.0, 3
            )
            output.append(segment)
        return output

    def build_final_transcript(self, segments: list[dict[str, Any]]) -> str:
        return " ".join([s.get("text", "").strip() for s in segments if s.get("text")]).strip()

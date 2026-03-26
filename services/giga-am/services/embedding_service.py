from __future__ import annotations

import hashlib
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Hybrid Titanet+WeSpeaker заглушка:
    детерминированный эмбеддинг на основе текста/времени.

    TODO: Заменить заглушку на реальные audio-эмбеддинги (Titanet/WeSpeaker).
    Текущие hash-векторы не используют акустические признаки и могут давать
    нестабильный speaker assignment в assign_speakers (job_orchestrator.py),
    особенно при коротких/похожих текстовых сегментах.
    """

    def __init__(self) -> None:
        env = (
            os.getenv("APP_ENV")
            or os.getenv("ENV")
            or os.getenv("ENVIRONMENT")
            or ""
        ).strip().lower()
        self._warn_in_production = env in {"prod", "production"}
        if self._warn_in_production:
            logger.warning(
                "EmbeddingService работает в production на hash-заглушке: "
                "эмбеддинги не основаны на аудио и могут ломать assign_speakers."
            )

    def build_hybrid_embedding(self, segment: dict[str, Any]) -> list[float]:
        if self._warn_in_production:
            logger.warning(
                "Используется hash-эмбеддинг в production: возможна деградация diarization/speaker assignment."
            )
        source = f"{segment.get('text','')}|{segment.get('start',0)}|{segment.get('end',0)}"
        digest = hashlib.sha256(source.encode("utf-8")).digest()
        values = []
        for i in range(0, 32, 2):
            raw = int.from_bytes(digest[i : i + 2], "big")
            values.append((raw / 65535.0) * 2.0 - 1.0)
        return values

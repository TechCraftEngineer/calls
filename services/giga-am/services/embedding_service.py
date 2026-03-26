from __future__ import annotations

import hashlib
from typing import Any


class EmbeddingService:
    """
    Hybrid Titanet+WeSpeaker заглушка:
    детерминированный эмбеддинг на основе текста/времени.
    """

    def build_hybrid_embedding(self, segment: dict[str, Any]) -> list[float]:
        source = f"{segment.get('text','')}|{segment.get('start',0)}|{segment.get('end',0)}"
        digest = hashlib.sha256(source.encode("utf-8")).digest()
        values = []
        for i in range(0, 32, 2):
            raw = int.from_bytes(digest[i : i + 2], "big")
            values.append((raw / 65535.0) * 2.0 - 1.0)
        return values

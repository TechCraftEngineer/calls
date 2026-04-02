"""
Клиент для отправки событий в Inngest.

GigaAM только отправляет события, вся оркестрация в Inngest.
"""

import logging
from typing import Any

import requests

from config import settings

logger = logging.getLogger(__name__)


class InngestClient:
    """Клиент для отправки событий в Inngest."""

    def __init__(self) -> None:
        self._api_url = settings.inngest_api_url.strip().rstrip("/")
        self._event_key = settings.inngest_event_key.strip()

    @property
    def is_available(self) -> bool:
        """Проверка доступности Inngest."""
        return bool(self._api_url)

    def send_event(
        self,
        name: str,
        data: dict[str, Any],
        user: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Отправка события в Inngest.
        
        Args:
            name: Имя события (например, "asr/transcription.completed")
            data: Данные события
            user: Опциональная информация о пользователе
        
        Returns:
            Ответ от Inngest API
        """
        if not self.is_available:
            raise RuntimeError("Inngest API URL not configured")

        payload = {
            "name": name,
            "data": data,
        }
        
        if user:
            payload["user"] = user

        headers = {"Content-Type": "application/json"}
        if self._event_key:
            headers["Authorization"] = f"Bearer {self._event_key}"

        try:
            response = requests.post(
                f"{self._api_url}/e/calls-sync-and-transcribe",
                json=payload,
                headers=headers,
                timeout=10,
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to send Inngest event: {e}")
            raise

    def send_transcription_completed(
        self,
        request_id: str,
        full_transcript: str,
        diarized_segments: list[dict[str, Any]],
        metadata: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Отправка события о завершении транскрипции.
        
        Inngest решит что делать дальше (LLM коррекция, сохранение и т.д.)
        
        Args:
            request_id: ID запроса
            full_transcript: Полная транскрипция без диаризации
            diarized_segments: Сегменты с диаризацией
            metadata: Метаданные (timing, confidence и т.д.)
        
        Returns:
            Ответ от Inngest API
        """
        return self.send_event(
            name="asr/transcription.completed",
            data={
                "requestId": request_id,
                "fullTranscript": full_transcript,
                "diarizedSegments": diarized_segments,
                "metadata": metadata,
            },
        )


# Глобальный экземпляр клиента
inngest_client = InngestClient()

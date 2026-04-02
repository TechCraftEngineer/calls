"""
Простой клиент для отправки событий в Inngest.
"""

import logging
import os
from typing import Any

import requests

logger = logging.getLogger(__name__)


class SimpleInngestClient:
    """Простой клиент для отправки событий в Inngest."""

    def __init__(self) -> None:
        self.api_url = os.getenv("INNGEST_API_URL")
        self.event_key = os.getenv("INNGEST_EVENT_KEY")
        self.is_available = bool(self.api_url and self.event_key)

    def send_event(self, name: str, data: dict[str, Any]) -> bool:
        """
        Отправить событие в Inngest.
        
        Args:
            name: Имя события
            data: Данные события
            
        Returns:
            True если успешно, False если ошибка
        """
        if not self.is_available:
            logger.warning("Inngest не настроен, событие не отправлено")
            return False

        try:
            response = requests.post(
                f"{self.api_url}/event",
                headers={
                    "Authorization": f"Bearer {self.event_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "name": name,
                    "data": data,
                },
                timeout=10,
            )
            
            if response.status_code == 200:
                logger.info(f"Событие {name} успешно отправлено в Inngest")
                return True
            else:
                logger.error(f"Ошибка отправки события в Inngest: {response.status_code} {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Ошибка при отправке события в Inngest: {e}")
            return False

    def send_transcription_completed(self, request_id: str, transcription_result: dict[str, Any]) -> bool:
        """
        Отправить событие о завершении транскрипции.
        
        Args:
            request_id: ID запроса
            transcription_result: Результат транскрипции
            
        Returns:
            True если успешно, False если ошибка
        """
        return self.send_event("asr/transcription.completed", {
            "requestId": request_id,
            "transcriptionResult": transcription_result,
        })


# Глобальный экземпляр клиента
inngest_client = SimpleInngestClient()

"""
Сервис для хранения результатов транскрипции.
"""
import json
import logging
import time
from typing import Any, Dict, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class TranscriptionStorage:
    """
    In-memory хранилище результатов транскрипции.
    
    Используется для передачи результатов между GigaAM и Inngest.
    """
    
    def __init__(self):
        self._storage: Dict[str, Dict[str, Any]] = {}
        self._cleanup_interval = 3600  # 1 час
        self._max_age = 24 * 3600  # 24 часа
        self._last_cleanup = time.time()
    
    def store_result(
        self, 
        request_id: str, 
        data: Dict[str, Any],
        status: str = "completed"
    ) -> None:
        """
        Сохранение результата транскрипции.
        
        Args:
            request_id: ID запроса
            data: Данные транскрипции
            status: Статус (processing, completed, failed)
        """
        self._cleanup_old_results()
        
        self._storage[request_id] = {
            "status": status,
            "data": data,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        logger.info(f"Результат сохранен для request_id: {request_id}, статус: {status}")
    
    def set_processing(self, request_id: str) -> None:
        """
        Установка статуса "в обработке".
        """
        self.store_result(request_id, {}, "processing")
    
    def set_failed(self, request_id: str, error: str) -> None:
        """
        Установка статуса "ошибка".
        """
        self.store_result(request_id, {"error": error}, "failed")
    
    def get_result(self, request_id: str) -> Optional[Dict[str, Any]]:
        """
        Получение результата по request_id.
        
        Returns:
            Dict с результатом или None если не найден
        """
        self._cleanup_old_results()
        return self._storage.get(request_id)
    
    def delete_result(self, request_id: str) -> bool:
        """
        Удаление результата по request_id.
        
        Returns:
            True если удален, False если не найден
        """
        if request_id in self._storage:
            del self._storage[request_id]
            logger.info(f"Результат удален для request_id: {request_id}")
            return True
        return False
    
    def _cleanup_old_results(self) -> None:
        """
        Очистка старых результатов.
        """
        current_time = time.time()
        
        # Проверяем нужно ли запускать очистку
        if current_time - self._last_cleanup < self._cleanup_interval:
            return
        
        self._last_cleanup = current_time
        cutoff_time = datetime.utcnow() - timedelta(seconds=self._max_age)
        
        to_delete = []
        for request_id, result in self._storage.items():
            created_at = datetime.fromisoformat(result["created_at"])
            if created_at < cutoff_time:
                to_delete.append(request_id)
        
        for request_id in to_delete:
            del self._storage[request_id]
        
        if to_delete:
            logger.info(f"Очищено {len(to_delete)} старых результатов")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Получение статистики хранилища.
        """
        stats = {
            "total_results": len(self._storage),
            "processing": 0,
            "completed": 0,
            "failed": 0,
        }
        
        for result in self._storage.values():
            status = result.get("status", "unknown")
            if status in stats:
                stats[status] += 1
        
        return stats


# Глобальный экземпляр
transcription_storage = TranscriptionStorage()

import logging
import os
import threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any
import gigaam
import torch
import torchaudio
from config import settings

logger = logging.getLogger(__name__)

class TranscriptionService:
    def __init__(self):
        self.model = None
        self.model_name = settings.model_name
        self._model_lock = threading.RLock()  # Reentrant lock для thread safety
        self._executor = ThreadPoolExecutor(max_workers=1)  # Один поток для модели
        self._model_initialized = False
        self._initialize_model()
    
    def _initialize_model(self):
        """Инициализация модели GigaAM"""
        with self._model_lock:
            if self._model_initialized:
                return
                
            try:
                logger.info(f"Загрузка модели {self.model_name}...")
                self._log_runtime_versions()
                
                # Установка HF токена из настроек или переменной окружения
                hf_token = settings.hf_token or os.getenv("HF_TOKEN")
                if hf_token and hf_token != "your_token_here":
                    os.environ["HF_TOKEN"] = hf_token
                    logger.info("HF_TOKEN установлен из конфигурации")
                else:
                    logger.warning("HF_TOKEN не найден или не настроен. Длинные аудио могут не работать.")
                    logger.warning("Получите токен на https://huggingface.co/settings/tokens")
                    logger.warning("Примите условия: https://huggingface.co/pyannote/segmentation-3.0")
                
                # Предзагрузка pyannote модели
                self._preload_pyannote_model()
                
                self.model = self._load_model_with_recovery()
                self._model_initialized = True
                logger.info("Модель успешно загружена")
            except Exception as e:
                logger.error(f"Ошибка при загрузке модели: {e}")
                self._model_initialized = False
                raise

    def _log_runtime_versions(self):
        """Логирует версии ключевых библиотек для диагностики окружения."""
        logger.info(
            "Runtime versions: python=%s, gigaam=%s, torch=%s, torchaudio=%s",
            os.sys.version.split(" ")[0],
            getattr(gigaam, "__version__", "unknown"),
            getattr(torch, "__version__", "unknown"),
            getattr(torchaudio, "__version__", "unknown"),
        )

    def _preload_pyannote_model(self):
        """Предзагрузка pyannote модели для проверки доступа"""
        try:
            from pyannote.audio import Model
            hf_token = os.getenv("HF_TOKEN")
            
            if not hf_token or hf_token == "your_token_here":
                logger.warning("Пропускаем предзагрузку pyannote - HF_TOKEN не настроен")
                return
            
            logger.info("Проверка доступа к pyannote/segmentation-3.0...")
            model = Model.from_pretrained(
                "pyannote/segmentation-3.0",
                token=hf_token
            )
            logger.info("Pyannote модель успешно загружена")
        except Exception as e:
            logger.warning(f"Ошибка при загрузке pyannote модели: {e}")
            logger.warning("Убедитесь что:")
            logger.warning("1. HF_TOKEN установлен в переменных окружения Spaces")
            logger.warning("2. Вы приняли условия: https://huggingface.co/pyannote/segmentation-3.0")
            logger.warning("3. Токен имеет права на чтение")
            # Не бросаем исключение, чтобы приложение могло работать без longform
    
    def _load_model_with_recovery(self):
        """Загрузка модели с восстановлением после поврежденного кэша."""
        try:
            return gigaam.load_model(self.model_name)
        except AssertionError as e:
            error_text = str(e)
            if "Model checksum failed" not in error_text:
                raise

            cache_path = Path.home() / ".cache" / "gigaam" / f"{self.model_name}.ckpt"
            logger.warning("Обнаружен поврежденный кэш модели, очищаем и пробуем заново")
            try:
                cache_path.unlink(missing_ok=True)
            except Exception as cleanup_error:
                logger.warning(f"Не удалось удалить кэш модели: {cleanup_error}")

            return gigaam.load_model(self.model_name)
    
    def transcribe_audio(self, audio_path: str) -> Dict[str, Any]:
        """
        Распознавание речи из аудиофайла с thread-safe доступом к модели
        
        Args:
            audio_path: Путь к аудиофайлу
            
        Returns:
            Словарь с результатом распознавания
        """
        try:
            logger.info(f"Начало распознавания файла: {os.path.basename(audio_path)}")
            
            # Проверяем, что модель инициализирована
            if not self._model_initialized or self.model is None:
                return {
                    "success": False,
                    "error": "Модель не инициализирована"
                }
            
            # Используем ThreadPoolExecutor для thread-safe доступа к модели
            future = self._executor.submit(self._transcribe_sync, audio_path)
            
            # Ждем результат с таймаутом
            try:
                utterances = future.result(timeout=settings.transcription_timeout)
            except TimeoutError:
                future.cancel()  # Отменяем задачу при таймауте
                return {
                    "success": False,
                    "error": f"Превышено время распознавания ({settings.transcription_timeout} секунд)"
                }
            
            result = {
                "success": True,
                "segments": [],
                "total_duration": 0
            }
            
            for utt in utterances:
                start, end = utt["boundaries"]
                segment = {
                    "text": utt["transcription"],
                    "start": start,
                    "end": end,
                    "start_formatted": gigaam.format_time(start),
                    "end_formatted": gigaam.format_time(end),
                    "duration": end - start
                }
                result["segments"].append(segment)
                result["total_duration"] = max(result["total_duration"], end)
            
            logger.info(f"Распознавание завершено. Сегментов: {len(result['segments'])}")
            return result
            
        except Exception as e:
            logger.error(f"Ошибка при распознавании аудио: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _transcribe_sync(self, audio_path: str):
        """Синхронное распознавание в отдельном потоке"""
        with self._model_lock:
            try:
                logger.info(f"Начало распознавания: {audio_path}")
                # Передаем путь к файлу напрямую - библиотека обработает его сама
                return self.model.transcribe_longform(audio_path)
            except Exception as e:
                logger.error(f"Ошибка при распознавании аудио: {e}")
                raise
    
    def format_transcription_text(self, result: Dict[str, Any]) -> str:
        """
        Форматирование результата в текстовый формат с временными метками
        
        Args:
            result: Результат распознавания
            
        Returns:
            Отформатированный текст
        """
        if not result.get("success"):
            return f"Ошибка распознавания: {result.get('error', 'Неизвестная ошибка')}"
        
        lines = []
        for segment in result["segments"]:
            line = f"[{segment['start_formatted']} - {segment['end_formatted']}]: {segment['text']}"
            lines.append(line)
        
        return "\n".join(lines)
    
    def get_model_info(self) -> Dict[str, Any]:
        """Получение информации о модели"""
        return {
            "model_name": self.model_name,
            "status": "loaded" if self._model_initialized and self.model else "not_loaded",
            "supported_formats": settings.allowed_audio_formats,
            "max_file_size_mb": settings.max_file_size // (1024 * 1024),
            "transcription_timeout": settings.transcription_timeout
        }
    
    def health_check(self) -> Dict[str, Any]:
        """Проверка здоровья модели"""
        return {
            "model_loaded": self._model_initialized and self.model is not None,
            "model_name": self.model_name,
            "thread_pool_active": not self._executor._shutdown
        }

# Глобальный экземпляр сервиса
transcription_service = TranscriptionService()

"""Новый рефакторенный main.py с модульной структурой."""

import logging
import os
import signal
import sys
import warnings
from contextlib import asynccontextmanager

import uvicorn

from config.settings import config
from api.endpoints import app
from utils.logging_utils import StructuredLogger

# Настройка логирования
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL, logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Подавление warning для torch.load
warnings.filterwarnings(
    "ignore",
    message=r".*torch\.load.*weights_only=False.*",
    category=FutureWarning,
    module=r"df\.checkpoint",
)

# Структурированный логгер
structured_logger = StructuredLogger("main")


@asynccontextmanager
async def lifespan(app):
    """Lifecycle management для FastAPI приложения."""
    # Startup
    logger.info("🚀 Запуск Audio Enhancer Service v2.0")
    logger.info(f"📊 Конфигурация: max_file_size={config.MAX_UPLOAD_BYTES/1024/1024:.1f}MB, "
                f"max_duration={config.MAX_AUDIO_SECONDS}s")
    
    structured_logger.log_request("STARTUP", "/", service_version="2.0.0")
    
    yield
    
    # Shutdown
    logger.info("🛑 Остановка Audio Enhancer Service")
    structured_logger.log_request("SHUTDOWN", "/")


# Установка lifespan для app
app.router.lifespan_context = lifespan


def signal_handler(sig, frame):
    """Обработчик сигналов для корректного завершения."""
    logger.info("Получен сигнал завершения, останавливаем сервис...")
    structured_logger.log_request("SIGNAL", "/", signal=sig)
    sys.exit(0)


def main():
    """Основная функция запуска."""
    # Установка обработчиков сигналов
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Запуск uvicorn
    try:
        uvicorn.run(
            "main:app",
            host=config.HOST,
            port=config.PORT,
            workers=config.MAX_WORKERS,
            log_level=config.LOG_LEVEL.lower(),
            access_log=True,
            reload=config.DEBUG,
        )
    except KeyboardInterrupt:
        logger.info("Сервис остановлен пользователем")
    except Exception as e:
        logger.error(f"Ошибка запуска сервиса: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

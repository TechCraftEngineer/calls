import logging
import uvicorn

from fastapi import FastAPI

from config import settings
from utils.logger import setup_logging
from utils.error_handlers import setup_exception_handlers
from utils.cache import setup_cache_cleanup

# Import routers
from routes.health import router as health_router
from routes.transcribe_sync import router as transcribe_sync_router
from routes.root import router as root_router

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    description="Sync API для распознавания русской речи на базе GigaAM",
    version=settings.app_version,
)

# Настройка обработчиков исключений
setup_exception_handlers(app)

# Настройка кэша
setup_cache_cleanup()

# Регистрация роутеров
app.include_router(health_router, prefix="/api", tags=["health"])
app.include_router(transcribe_sync_router, prefix="/api", tags=["transcription"])
app.include_router(root_router, tags=["root"])


if __name__ == "__main__":
    setup_logging()
    logger.info("Запуск приложения %s v%s", settings.app_name, settings.app_version)
    logger.info("Сервер будет запущен на %s:%s", settings.host, settings.port)
    uvicorn.run(app, host=settings.host, port=settings.port, log_level=settings.log_level.lower())

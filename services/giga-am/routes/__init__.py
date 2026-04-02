"""
API routes для GigaAM сервиса.

Все endpoints разделены по модулям:
- transcribe.py - транскрипция аудио
- diagnostics.py - диагностика эмбеддингов
- health.py - health check, info, metrics
- cache.py - управление кэшем
- root.py - корневой endpoint
"""

from .transcribe import router as transcribe_router
from .diagnostics import router as diagnostics_router
from .health import router as health_router
from .cache import router as cache_router
from .root import router as root_router

__all__ = [
    "transcribe_router",
    "diagnostics_router",
    "health_router",
    "cache_router",
    "root_router",
]

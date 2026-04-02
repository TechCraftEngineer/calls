"""
Cache management endpoints.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config import settings
from utils.cache import cache

logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer(auto_error=False)


def admin_required(credentials: HTTPAuthorizationCredentials = Depends(security)) -> None:
    """Validate admin token for protected endpoints"""
    # Check feature flag first
    if not getattr(settings, 'enable_cache_clear', False):
        logger.warning("Cache clear endpoint is disabled")
        raise HTTPException(
            status_code=403,
            detail="Cache clearing is disabled",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Validate admin token
    admin_token = getattr(settings, 'admin_token', None)
    if not admin_token:
        logger.error("Admin token not configured")
        raise HTTPException(
            status_code=500,
            detail="Admin authentication not configured"
        )
    
    if not credentials or credentials.credentials != admin_token:
        logger.warning("Unauthorized access attempt to admin endpoint")
        raise HTTPException(
            status_code=403,
            detail="Invalid admin token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    logger.info("Admin access granted")


@router.post("/cache/clear")
async def clear_cache(_admin_auth: None = Depends(admin_required)):
    """Очистка кэша (только для администрирования)"""
    logger.info("Cache clear requested by admin")
    try:
        cache.cleanup()
        logger.info("Cache successfully cleared")
        return {"message": "Кэш успешно очищен"}
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to clear cache"
        )


@router.get("/cache/stats")
async def get_cache_stats():
    """Получение статистики кэша"""
    return cache.get_stats()

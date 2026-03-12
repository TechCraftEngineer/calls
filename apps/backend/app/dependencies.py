"""FastAPI dependencies."""

from fastapi import Depends, HTTPException, status, Cookie
from typing import Optional, Dict, Any
from app.services.storage import SQLiteStorage
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

# Global storage instance (singleton pattern)
_storage_instance: Optional[SQLiteStorage] = None


def get_storage() -> SQLiteStorage:
    """Get or create SQLiteStorage instance."""
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = SQLiteStorage()
    return _storage_instance


async def get_current_user(
    session: Optional[str] = Cookie(None),
    storage: SQLiteStorage = Depends(get_storage),
) -> Dict[str, Any]:
    """
    Get current authenticated user from session.
    Simple session-based approach using username as session identifier.
    """
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    
    # Session ID is the username (simple approach)
    user = storage.get_user_by_username(session)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session",
        )
    
    return {
        "id": user["id"],
        "username": user["username"],
        "name": user["name"],
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
    }


async def require_admin(
    current_user: Dict[str, Any] = Depends(get_current_user),
    storage: SQLiteStorage = Depends(get_storage),
) -> Dict[str, Any]:
    """Require admin privileges."""
    # Проверяем по username (старый способ для обратной совместимости)
    admin_usernames = ["admin@mango", "admin@gmail.com"]
    username = current_user.get("username")
    
    if username in admin_usernames:
        return current_user
    
    # Также проверяем по internal_numbers == "all" (более гибкий способ)
    user = storage.get_user_by_username(username)
    if user and user.get("internal_numbers") == "all":
        return current_user
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin access required",
    )


from app.services.telegram import TelegramService
from app.services.reports import ReportGenerator
from app.services.max_messenger import MaxService

# MaxService definition moved up
_max_service_instance: Optional[MaxService] = None

def get_max_service(storage: SQLiteStorage = Depends(get_storage)) -> Optional[MaxService]:
    """Get MaxService instance."""
    global _max_service_instance
    token = storage.get_prompt("max_bot_token", "")
    if not token:
        return None
        
    if _max_service_instance is None or _max_service_instance.token != token:
        try:
            _max_service_instance = MaxService(token)
        except Exception as e:
            # print(f"Error initializing MaxService: {e}") 
            # Avoid print in dep, maybe log? For now just None
            return None
            
    return _max_service_instance


def get_telegram_service(storage: SQLiteStorage = Depends(get_storage)) -> TelegramService:
    """Get TelegramService instance."""
    token = storage.get_prompt("telegram_bot_token", "")
    return TelegramService(token)

def get_report_generator(
    storage: SQLiteStorage = Depends(get_storage),
    telegram_service: TelegramService = Depends(get_telegram_service),
    max_service: Optional[MaxService] = Depends(get_max_service)
) -> ReportGenerator:
    """Get ReportGenerator instance."""
    return ReportGenerator(storage, telegram_service, max_service)


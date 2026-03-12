"""Users router."""

from fastapi import APIRouter, Depends, HTTPException, Path as PathParam
from typing import List, Optional, Any
from app.models.schemas import UserResponse, UserCreate, UserUpdate, ChangePasswordRequest
from app.services.storage import SQLiteStorage
from app.dependencies import get_storage, get_password_hash, get_current_user, require_admin, get_telegram_service, get_max_service
router = APIRouter()


@router.get("", response_model=List[UserResponse])
async def list_users(
    storage: SQLiteStorage = Depends(get_storage),
    admin_user: dict = Depends(require_admin),
):
    """List all users (admin only)."""
    users = storage.get_all_users()
    return users


@router.post("", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    storage: SQLiteStorage = Depends(get_storage),
    admin_user: dict = Depends(require_admin),
):
    """Create a new user (admin only)."""
    if not user_data.username or not user_data.password or not user_data.first_name:
        raise HTTPException(
            status_code=400,
            detail="Username, password, and first name are required"
        )
    
    existing_user = storage.get_user_by_username(user_data.username)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="User with this username already exists"
        )
    
    try:
        user_id = storage.create_user(
            user_data.username,
            user_data.password,
            user_data.first_name,
            user_data.last_name or "",
            user_data.internal_numbers,
            user_data.mobile_numbers
        )
        storage.add_activity_log(
            "info",
            f"User created: {user_data.username}",
            admin_user.get("username", "admin")
        )
        user = storage.get_user(user_id)
        return user
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _can_access_user(storage: SQLiteStorage, current_user: dict, user_id: int) -> bool:
    """Проверка: админ или запрос к своему профилю."""
    if current_user.get("id") == user_id:
        return True
    me = storage.get_user(current_user["id"]) if current_user.get("id") else None
    if not me:
        return False
    if me.get("username") in ("admin@mango", "admin@gmail.com") or me.get("internal_numbers") == "all":
        return True
    return False


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int = PathParam(..., ge=1),
    storage: SQLiteStorage = Depends(get_storage),
    current_user: dict = Depends(get_current_user),
):
    """Get user by ID (admin or self)."""
    if not _can_access_user(storage, current_user, user_id):
        raise HTTPException(status_code=403, detail="Not authorized to view this user")
    user = storage.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int = PathParam(..., ge=1),
    user_data: UserUpdate = None,
    storage: SQLiteStorage = Depends(get_storage),
    current_user: dict = Depends(get_current_user),
):
    """Update user (admin or self)."""
    if not _can_access_user(storage, current_user, user_id):
        raise HTTPException(status_code=403, detail="Not authorized to update this user")
    user = storage.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Имя можно не менять — используем текущее, если не передано
    first_name = (user_data.first_name or "").strip() or user.get("first_name") or ""
    last_name = (user_data.last_name or "").strip() if user_data.last_name is not None else (user.get("last_name") or "")
    if not first_name:
        raise HTTPException(status_code=400, detail="First name is required")
    
    try:
        storage.update_user_name(user_id, first_name, last_name)
        storage.update_user_internal_numbers(user_id, user_data.internal_numbers)
        storage.update_user_mobile_numbers(user_id, user_data.mobile_numbers)
        
        # Обновление настроек фильтрации (всегда сохраняем)
        storage.update_user_filters(
            user_id, 
            user_data.filter_exclude_answering_machine or False,
            user_data.filter_min_duration or 0,
            user_data.filter_min_replicas or 0
        )

        # Обновление настроек отчетов и KPI (всегда сохраняем)
        storage.update_user_report_kpi_settings(user_id, user_data)
        storage.update_user_telegram_settings(
            user_id, 
            user.get('telegram_chat_id'),
            user_data.telegram_daily_report or False,
            user_data.telegram_manager_report or False
        )

        storage.add_activity_log(
            "info",
            f"User updated: {user['username']}",
            current_user.get("username", "admin")
        )
        updated_user = storage.get_user(user_id)
        return updated_user
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{user_id}")
async def delete_user(
    user_id: int = PathParam(..., ge=1),
    storage: SQLiteStorage = Depends(get_storage),
    admin_user: dict = Depends(require_admin),
):
    """Delete user (admin only)."""
    user = storage.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if admin_user.get("id") == user_id:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete your own account"
        )
    
    try:
        if storage.delete_user(user_id):
            storage.add_activity_log(
                "info",
                f"User deleted: {user['username']}",
                admin_user.get("username", "admin")
            )
            return {"success": True, "message": f"User {user['username']} deleted"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete user")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{user_id}/change-password")
async def change_password(
    user_id: int = PathParam(..., ge=1),
    password_data: ChangePasswordRequest = None,
    storage: SQLiteStorage = Depends(get_storage),
    admin_user: dict = Depends(require_admin),
):
    """Change user password (admin only)."""
    user = storage.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not password_data.new_password:
        raise HTTPException(status_code=400, detail="Password cannot be empty")
    
    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    try:
        if storage.update_user_password(user_id, password_data.new_password):
            storage.add_activity_log(
                "info",
                f"Password changed for user: {user['username']}",
                admin_user.get("username", "admin")
            )
            return {"success": True, "message": "Password changed successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to change password")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


import secrets
from app.services.telegram import TelegramService
from app.dependencies import get_telegram_service

@router.post("/{user_id}/telegram-auth-url")
async def get_telegram_auth_url(
    user_id: int = PathParam(..., ge=1),
    storage: SQLiteStorage = Depends(get_storage),
    current_user: dict = Depends(get_current_user),
    telegram_service: TelegramService = Depends(get_telegram_service),
):
    """Generate Telegram Magic Link for user."""
    # Check permissions: admin or self
    # Assuming current_user is a dict from dependencies.get_current_user
    is_admin = current_user.get("username") in ["admin@mango", "admin@gmail.com"] or str(current_user.get("internal_numbers")) == "all"
    if current_user["id"] != user_id and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    user = storage.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Generate token
    token = secrets.token_urlsafe(16)
    if not storage.save_telegram_connect_token(user_id, token):
         raise HTTPException(status_code=500, detail="Failed to save token")

    # Get bot username
    bot_username = await telegram_service.get_bot_username()
    if not bot_username:
        raise HTTPException(status_code=500, detail="Bot username not found. Check bot token.")

    return {"url": f"https://t.me/{bot_username}?start={token}"}


@router.delete("/{user_id}/telegram")
async def disconnect_telegram(
    user_id: int = PathParam(..., ge=1),
    storage: SQLiteStorage = Depends(get_storage),
    current_user: dict = Depends(get_current_user),
):
    """Disconnect Telegram account."""
    is_admin = current_user.get("username") in ["admin@mango", "admin@gmail.com"] or str(current_user.get("internal_numbers")) == "all"
    if current_user["id"] != user_id and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    if storage.disconnect_telegram(user_id):
        return {"success": True}
    else:
        raise HTTPException(status_code=500, detail="Failed to disconnect Telegram")


@router.post("/{user_id}/max-auth-url")
async def get_max_auth_url(
    user_id: int = PathParam(..., ge=1),
    storage: SQLiteStorage = Depends(get_storage),
    current_user: dict = Depends(get_current_user),
    max_service: Optional[any] = Depends(get_max_service), # type hint Any to avoid import error if max_service is None in dep
):
    """Generate MAX Magic Link for user."""
    is_admin = current_user.get("username") in ["admin@mango", "admin@gmail.com"] or str(current_user.get("internal_numbers")) == "all"
    if current_user["id"] != user_id and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    user = storage.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not max_service:
        raise HTTPException(status_code=503, detail="MAX service not available")

    # Generate token
    token = secrets.token_urlsafe(16)
    if not storage.save_max_connect_token(user_id, token):
         raise HTTPException(status_code=500, detail="Failed to save token")

    # Get bot username
    # В maxapi может не быть username как в telegram, тогда используем просто ссылку на бота если знаем
    # Но предположим что там есть механизм deep linking
    # Ссылка вида: https://max.ru/bot_username?start=token ??? 
    # Или через deep link схему.
    # Пока предположим что get_bot_username возвращает имя.
    bot_username = await max_service.get_bot_username()
    if not bot_username:
         # Если нет юзернейма, возможно стоит вернуть просто инструкцию или ошибку
         # Но для MVP попробуем вернуть хотя бы токен, чтобы юзер мог его отправить вручную?
         # Нет, Magic Link подразумевает ссылку.
         # Предположим стандартную ссылку.
         pass

    # Если username есть, строим ссылку.
    # Формат ссылки MAX уточнить сложно без документации, но попробуем:
    # https://max.ru/bot/{bot_username}?start={token}
    # или tg style: https://t.me/{bot_username}?start={token}
    
    # В исходном запросе пользователя был пример с /create.
    # Если это deep link, то в документации (которую мы не нашли точную) должно быть.
    # В телеграм: t.me/bot?start=token
    # В MAX, предположительно: 
    #   max://resolve?domain={bot_username}&start={token} 
    #   или https://max.ru/{bot_username}?start={token}
    
    # Для MVP вернем строку с командой, которую надо отправить боту, если ссылка не сработает?
    # Нет, вернем ссылку https://max.ru/{bot_username}?start={token} (как наиболее вероятную для веб)
    
    if bot_username:
        return {"url": f"https://max.ru/{bot_username}?start={token}"}
    else:
        # Fallback: просто вернуть токен и инструкцию
        return {"manual_instruction": f"Отправьте боту команду: /start {token}", "token": token}


@router.delete("/{user_id}/max")
async def disconnect_max(
    user_id: int = PathParam(..., ge=1),
    storage: SQLiteStorage = Depends(get_storage),
    current_user: dict = Depends(get_current_user),
):
    """Disconnect MAX account."""
    is_admin = current_user.get("username") in ["admin@mango", "admin@gmail.com"] or str(current_user.get("internal_numbers")) == "all"
    if current_user["id"] != user_id and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    if storage.disconnect_max(user_id):
        return {"success": True}
    else:
        raise HTTPException(status_code=500, detail="Failed to disconnect MAX")


from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from app.services.telegram import TelegramService
from app.services.reports import ReportGenerator
from app.dependencies import get_telegram_service, get_report_generator, get_current_user, require_admin, get_storage

router = APIRouter()

@router.post("/test-telegram")
async def test_telegram_message(
    current_user: dict = Depends(get_current_user),
    telegram_service: TelegramService = Depends(get_telegram_service),
    storage: Any = Depends(get_storage) # Using Any to avoid circular import if needed, or better import SQLiteStorage inside
):
    """
    Отправляет тестовое сообщение текущему пользователю, если у него указан Chat ID.
    Для проверки токена бота и корректности Chat ID.
    """
    from app.services.storage import SQLiteStorage
    storage: SQLiteStorage = storage
    
    user = storage.get_user_by_username(current_user['username'])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    chat_id = user.get("telegram_chat_id")
    if not chat_id:
        raise HTTPException(status_code=400, detail="Telegram Chat ID is not set for this user")
        
    success = await telegram_service.send_message(chat_id, "🔔 Тестовое сообщение от Mango React Bot")
    if success:
        return {"success": True, "message": "Message sent"}
    else:
        raise HTTPException(status_code=400, detail="Failed to send message. Check bot token and chat ID.")

@router.post("/test-telegram-explicit")
async def test_telegram_explicit(
    chat_id: str,
    telegram_service: TelegramService = Depends(get_telegram_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Отправляет тестовое сообщение на указанный chat_id.
    """
    success = await telegram_service.send_message(chat_id, "🔔 Тестовое сообщение от Mango React Bot")
    if success:
        return {"success": True, "message": "Message sent"}
    else:
        raise HTTPException(status_code=400, detail="Failed to send message. Check bot token and chat ID.")

@router.post("/send-test-telegram")
async def send_test_report_telegram(
    report_generator: ReportGenerator = Depends(get_report_generator),
    current_user: dict = Depends(get_current_user),
):
    """
    Отправляет текущему пользователю в Telegram его ежедневный отчёт за сегодня (для тестирования).
    """
    success = await report_generator.send_test_report_for_user(current_user["id"])
    if success:
        return {"success": True, "message": "Отчёт отправлен в Telegram"}
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Не удалось отправить отчёт. Укажите Telegram Chat ID и проверьте настройки бота.",
    )


@router.post("/trigger-daily")
async def trigger_daily_reports(
    report_generator: ReportGenerator = Depends(get_report_generator),
    admin_user: dict = Depends(require_admin)
):
    """
    Принудительно запускает рассылку ежедневных отчетов (только для админа).
    """
    await report_generator.send_daily_reports()
    return {"success": True, "message": "Daily reports generation started"}

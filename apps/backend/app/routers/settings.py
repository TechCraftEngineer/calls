"""Settings router."""

import shutil
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from app.models.schemas import PromptResponse, SettingsUpdate
from app.services.storage import SQLiteStorage, DATA_DIR, DB_FILE
from app.services.deepseek import DEEPSEEK_MODELS_CONFIG
from app.dependencies import get_storage, get_current_user, require_admin

router = APIRouter()


@router.get("/prompts", response_model=List[PromptResponse])
async def get_prompts(
    storage: SQLiteStorage = Depends(get_storage),
    current_user: dict = Depends(get_current_user),
):
    """Get all prompts."""
    prompts = storage.get_all_prompts()
    return prompts


@router.put("/prompts")
async def update_prompts(
    settings: SettingsUpdate,
    storage: SQLiteStorage = Depends(get_storage),
    admin_user: dict = Depends(require_admin),
):
    """Update prompts and settings (admin only)."""
    # Update DeepSeek model
    if settings.deepseek_model and settings.deepseek_model in DEEPSEEK_MODELS_CONFIG:
        storage.update_prompt(
            "deepseek_model",
            settings.deepseek_model,
            "Selected DeepSeek model"
        )
    
    # Update quality threshold
    if settings.quality_min_value_threshold is not None:
        threshold = settings.quality_min_value_threshold
        if 0 <= threshold <= 5:
            storage.update_prompt(
                "quality_min_value_threshold",
                str(threshold),
                "Minimum call value for quality evaluation (0-5)"
            )

    # Update recommendations toggle
    if settings.enable_manager_recommendations is not None:
        storage.update_prompt(
            "enable_manager_recommendations",
            "true" if settings.enable_manager_recommendations else "false",
            "Включить генерацию рекомендаций для менеджера (true/false)"
        )
    
    # Update prompts
    # Токены приходят в prompts (frontend), а не на верхнем уровне
    if settings.prompts:
        if "telegram_bot_token" in settings.prompts:
            storage.update_prompt(
                "telegram_bot_token",
                settings.prompts["telegram_bot_token"].value or "",
                "Telegram Bot Token"
            )
        if "max_bot_token" in settings.prompts:
            storage.update_prompt(
                "max_bot_token",
                settings.prompts["max_bot_token"].value or "",
                "MAX Bot Token"
            )
        for key in ("report_daily_time", "report_weekly_day", "report_weekly_time", "report_monthly_day", "report_monthly_time"):
            if key in settings.prompts:
                p = settings.prompts[key]
                val = getattr(p, "value", None) or ""
                desc = getattr(p, "description", None) or ""
                storage.update_prompt(key, val, desc)
    # Запасной путь: верхнеуровневые поля (если фронт отправит их отдельно)
    if settings.telegram_bot_token is not None:
        storage.update_prompt(
            "telegram_bot_token",
            settings.telegram_bot_token,
            "Telegram Bot Token"
        )
    if hasattr(settings, 'max_bot_token') and settings.max_bot_token is not None:
        storage.update_prompt(
            "max_bot_token",
            settings.max_bot_token,
            "MAX Bot Token"
        )

    if settings.prompts:
        prompt_keys = [
            "summary",
            "transcribe_incoming",
            "transcribe_outgoing",
            "speaker_analysis",
            "speaker_analysis_incoming",
            "speaker_analysis_outgoing",
            "value_incoming",
            "value_outgoing",
            "quality",
            "manager_recommendations"
        ]
        
        for key in prompt_keys:
            if key in settings.prompts:
                prompt_update = settings.prompts[key]
                storage.update_prompt(
                    key,
                    prompt_update.value,
                    prompt_update.description
                )
                storage.add_activity_log(
                    "info",
                    f"Prompt updated: {key}",
                    admin_user.get("username", "admin")
                )
    
    return {"success": True, "message": "Settings updated successfully"}


@router.get("/models")
async def get_models(
    storage: SQLiteStorage = Depends(get_storage),
    current_user: dict = Depends(get_current_user),
):
    """Get available DeepSeek models."""
    current_model_key = storage.get_prompt("deepseek_model", "deepseek-chat")
    return {
        "models": DEEPSEEK_MODELS_CONFIG,
        "current_model": current_model_key
    }


@router.post("/backup")
async def create_db_backup(
    storage: SQLiteStorage = Depends(get_storage),
    admin_user: dict = Depends(require_admin),
):
    """Create a backup of the database on the server (admin only)."""
    if not DB_FILE.exists():
        raise HTTPException(status_code=500, detail="База данных не найдена")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"db_{timestamp}.sqlite"
    backups_dir = DATA_DIR / "backups"
    backups_dir.mkdir(parents=True, exist_ok=True)
    backup_path = backups_dir / backup_filename

    try:
        shutil.copy2(DB_FILE, backup_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка создания копии: {e}")

    path_local = str(backup_path)
    storage.add_activity_log(
        "info",
        f"Резервная копия базы: {backup_filename} → {path_local}",
        admin_user.get("username", "admin"),
    )

    return {
        "success": True,
        "message": "Резервная копия создана.",
        "path": path_local,
    }


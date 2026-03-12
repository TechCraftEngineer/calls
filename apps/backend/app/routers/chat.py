"""AI chat endpoint: general and RAG over call transcripts."""

import logging

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_storage, get_current_user
from app.models.schemas import ChatRequest, ChatResponse
from app.services.chat_ai import chat
from app.services.storage import SQLiteStorage

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/chat", response_model=ChatResponse)
async def post_chat(
    body: ChatRequest,
    storage: SQLiteStorage = Depends(get_storage),
    current_user: dict = Depends(get_current_user),
):
    """
    Send messages and get AI reply. context_mode: "general" (free chat) or "calls" (RAG over transcripts).
    For context_mode "calls", start_date and end_date (YYYY-MM-DD) are required.
    """
    username = current_user.get("username", "")
    logger.info(
        "POST /chat: user=%s context_mode=%s start_date=%s end_date=%s messages=%s",
        username,
        body.context_mode,
        body.start_date,
        body.end_date,
        len(body.messages),
    )
    if body.context_mode == "calls":
        if not body.start_date or not body.end_date:
            raise HTTPException(
                status_code=400,
                detail="start_date and end_date are required when context_mode is 'calls'",
            )
    internal_numbers = None
    if body.context_mode == "calls":
        if username != "admin@mango":
            user = storage.get_user_by_username(username)
            if user and user.get("internal_numbers"):
                if (user["internal_numbers"] or "").strip().lower() != "all":
                    internal_numbers = [
                        n.strip()
                        for n in (user["internal_numbers"] or "").split(",")
                        if n.strip()
                    ]
        logger.debug("chat: internal_numbers filter for RAG: %s", internal_numbers)
    messages = [{"role": m.role, "content": m.content} for m in body.messages]
    try:
        content = chat(
            messages=messages,
            context_mode=body.context_mode,
            start_date=body.start_date,
            end_date=body.end_date,
            internal_numbers=internal_numbers,
        )
        logger.info("POST /chat: success, response length=%s", len(content))
        return ChatResponse(content=content)
    except ValueError as e:
        logger.warning("POST /chat: validation error %s", e)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("POST /chat: error %s", e)
        raise HTTPException(status_code=500, detail=f"Chat error: {e}")

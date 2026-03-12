"""AI chat service: general DeepSeek chat and RAG over call transcripts."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.services import deepseek
from app.services.vector_db import search_similar_chunks

logger = logging.getLogger(__name__)

GENERAL_SYSTEM_PROMPT = (
    "Ты — полезный помощник. Отвечай кратко и по делу на русском языке."
)

RAG_SYSTEM_PROMPT_TEMPLATE = """Ты — помощник, который отвечает на вопросы пользователя ТОЛЬКО на основе приведённых ниже выдержек из расшифровок телефонных звонков.

ПРАВИЛА:
- Отвечай только на основе предоставленного контекста из звонков.
- Если в выдержках нет информации для ответа — так и скажи.
- При ответе приводи цитаты или ссылки на релевантые фрагменты из выдержек.
- Отвечай на русском языке.

ВЫДЕРЖКИ ИЗ РАСШИФРОВОК:
{context}

Вопрос пользователя:"""

EMPTY_RAG_RESPONSE = (
    "В выбранном периоде по вашему запросу ничего не найдено. "
    "Попробуйте другие даты или формулировку вопроса."
)


def _last_user_message(messages: List[Dict[str, str]]) -> Optional[str]:
    for m in reversed(messages):
        if m.get("role") == "user" and m.get("content"):
            return (m["content"] or "").strip()
    return None


def _build_rag_context(chunks: List[Dict[str, Any]], max_chars: int) -> str:
    parts = []
    total = 0
    for i, c in enumerate(chunks):
        text = (c.get("text") or "").strip()
        if not text:
            continue
        if total + len(text) > max_chars:
            break
        parts.append(f"[Фрагмент {i + 1}]\n{text}")
        total += len(text)
    return "\n\n---\n\n".join(parts) if parts else ""


def chat(
    messages: List[Dict[str, str]],
    context_mode: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    internal_numbers: Optional[List[str]] = None,
) -> str:
    """
    Process chat: general (direct DeepSeek) or RAG over calls.
    context_mode: "general" | "calls"
    For "calls", start_date and end_date must be set (YYYY-MM-DD); internal_numbers filters by operator.
    """
    logger.info(
        "chat: context_mode=%s start_date=%s end_date=%s internal_numbers_filter=%s messages_count=%s",
        context_mode,
        start_date,
        end_date,
        "yes" if internal_numbers else "all",
        len(messages),
    )
    if context_mode == "general":
        logger.debug("chat: using general DeepSeek path (no vector DB)")
        return deepseek.chat_completion(
            messages,
            system_prompt=GENERAL_SYSTEM_PROMPT,
            temperature=0.7,
        )

    if context_mode == "calls":
        query = _last_user_message(messages)
        if not query:
            logger.warning("chat RAG: empty user query")
            return "Задайте вопрос текстом."
        logger.debug("chat RAG: query=%r", query[:100] + "..." if len(query) > 100 else query)
        chunks = search_similar_chunks(
            query=query,
            start_date=start_date,
            end_date=end_date,
            internal_numbers=internal_numbers,
            limit=10,
        )
        if not chunks:
            logger.info("chat RAG: no chunks found, returning empty RAG response")
            return EMPTY_RAG_RESPONSE
        max_chars = getattr(settings, "RAG_CONTEXT_MAX_CHARS", 7000)
        context = _build_rag_context(chunks, max_chars)
        if not context:
            logger.warning("chat RAG: context built to empty (max_chars=%s)", max_chars)
            return EMPTY_RAG_RESPONSE
        logger.info("chat RAG: using %s chunks, context_len=%s chars", len(chunks), len(context))
        system_content = RAG_SYSTEM_PROMPT_TEMPLATE.format(context=context)
        # Single turn: system + user question (so model answers only from context)
        rag_messages = [{"role": "user", "content": f"{system_content}\n\n{query}"}]
        logger.debug("chat RAG: calling DeepSeek with context")
        return deepseek.chat_completion(
            rag_messages,
            system_prompt=None,  # already in user message
            temperature=0.3,
        )

    logger.error("chat: unknown context_mode=%s", context_mode)
    raise ValueError(f"Unknown context_mode: {context_mode}")

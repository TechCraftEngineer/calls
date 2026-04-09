"""Middleware для FastAPI приложения."""
from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware


class MaxContentSizeMiddleware(BaseHTTPMiddleware):
    """Middleware для ограничения максимального размера контента запроса"""

    def __init__(self, app, max_size: int = 100 * 1024 * 1024):  # 100MB по умолчанию
        super().__init__(app)
        self.max_size = max_size

    async def dispatch(self, request: Request, call_next):
        # Проверяем Content-Length только для методов с телом
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            content_length = request.headers.get("content-length")
            if content_length:
                try:
                    content_length_int = int(content_length)
                    if content_length_int > self.max_size:
                        raise HTTPException(
                            status_code=413,
                            detail=f"Request entity too large. Maximum size is {self.max_size // (1024*1024)}MB"
                        )
                except (ValueError, TypeError):
                    # Если Content-Length не является валидным числом, отклоняем запрос
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid Content-Length header"
                    ) from None
            else:
                # Если Content-Length отсутствует для методов с телом, отклоняем запрос для безопасности
                # Это предотвращает обход через Transfer-Encoding: chunked
                raise HTTPException(
                    status_code=411,
                    detail="Content-Length header is required"
                )

        return await call_next(request)

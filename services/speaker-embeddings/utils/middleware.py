"""Middleware для FastAPI приложения."""
from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware


class MaxContentSizeMiddleware(BaseHTTPMiddleware):
    """Middleware для ограничения максимального размера контента запроса"""

    def __init__(self, app, max_size: int = 100 * 1024 * 1024):  # 100MB по умолчанию
        super().__init__(app)
        self.max_size = max_size

    async def dispatch(self, request: Request, call_next):
        # Проверяем Content-Length для запросов с телом
        content_length = request.headers.get("content-length")
        if content_length:
            if int(content_length) > self.max_size:
                raise HTTPException(
                    status_code=413,
                    detail=f"Request entity too large. Maximum size is {self.max_size // (1024*1024)}MB"
                )

        return await call_next(request)

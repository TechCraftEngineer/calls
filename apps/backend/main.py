"""FastAPI application entry point."""

# Патч для openai + pydantic: model_dump(by_alias=None) вызывает TypeError в Pydantic 2.x.
# Убеждаемся, что при вызове client.chat.completions.create() by_alias не передаётся как None.
try:
    import openai._compat as _openai_compat
    import openai._base_client as _openai_base_client
    _orig_model_dump = _openai_compat.model_dump
    def _patched_model_dump(model, *args, **kwargs):
        if kwargs.get("by_alias") is None:
            kwargs = {**kwargs, "by_alias": False}
        return _orig_model_dump(model, *args, **kwargs)
    _openai_compat.model_dump = _patched_model_dump
    # openai._base_client импортирует model_dump напрямую, поэтому патчим и там
    _openai_base_client.model_dump = _patched_model_dump
except Exception:
    pass

import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pathlib import Path
import traceback
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.services.storage import SQLiteStorage
from app.services.telegram import TelegramService
from app.services.max_messenger import MaxService
from app.services.reports import ReportGenerator

from app.routers import (
    auth,
    calls,
    chat as chat_router,
    transcripts,
    evaluations,
    users,
    settings,
    statistics,
    search,
    records,
    reports,
    kpi, # Added kpi router
)
from app.core.config import settings as app_settings

# Configure logging
# Ensure logs directory exists
logs_dir = Path(__file__).parent.parent / 'logs'
logs_dir.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(str(logs_dir / 'backend.log'), encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing scheduler...")
    telegram_polling_task = None
    max_polling_task = None
    try:
        storage = SQLiteStorage()
        telegram_token = storage.get_prompt("telegram_bot_token", "")
        max_token = storage.get_prompt("max_bot_token", "")
        
        telegram_service = TelegramService(telegram_token)
        max_service = MaxService(max_token) if max_token else None
        
        report_generator = ReportGenerator(storage, telegram_service, max_service)
        
        # Callback wrapper for magic link (Telegram)
        async def on_telegram_connect(token: str, chat_id: str) -> bool:
            return storage.confirm_telegram_connect(token, chat_id)

        # Callback wrapper for magic link (MAX)
        async def on_max_connect(token: str, chat_id: str) -> bool:
            return storage.confirm_max_connect(token, chat_id)

        # Start Telegram polling in background
        if telegram_token:
            async def on_report_request(chat_id: str) -> bool:
                return await report_generator.send_report_on_demand(chat_id)

            telegram_polling_task = asyncio.create_task(
                telegram_service.start_polling(on_telegram_connect, on_report_request)
            )
            logger.info("Telegram polling started.")
            
        # Start MAX polling in background
        if max_service:
            max_polling_task = asyncio.create_task(max_service.start_polling(on_max_connect))
            logger.info("MAX polling started.")
        
        scheduler = AsyncIOScheduler()
        def _parse_time(s: str, default_h: int = 18, default_m: int = 0):
            s = (s or "").strip()
            if not s:
                return default_h, default_m
            parts = s.replace(".", ":").split(":")
            try:
                h = int(parts[0]) if parts else default_h
                m = int(parts[1]) if len(parts) > 1 else default_m
                return max(0, min(23, h)), max(0, min(59, m))
            except (ValueError, TypeError):
                return default_h, default_m
        report_daily_time = storage.get_prompt("report_daily_time", "18:00")
        report_weekly_day = (storage.get_prompt("report_weekly_day", "fri") or "fri").strip().lower()
        report_weekly_time = storage.get_prompt("report_weekly_time", "18:10")
        report_monthly_day = (storage.get_prompt("report_monthly_day", "last") or "last").strip().lower()
        report_monthly_time = storage.get_prompt("report_monthly_time", "18:20")
        h_daily, m_daily = _parse_time(report_daily_time, 18, 0)
        h_weekly, m_weekly = _parse_time(report_weekly_time, 18, 10)
        h_monthly, m_monthly = _parse_time(report_monthly_time, 18, 20)
        scheduler.add_job(report_generator.send_daily_reports, 'cron', hour=h_daily, minute=m_daily)
        scheduler.add_job(report_generator.send_weekly_reports, 'cron', day_of_week=report_weekly_day, hour=h_weekly, minute=m_weekly)
        day_monthly = report_monthly_day if report_monthly_day == "last" else int(report_monthly_day) if report_monthly_day.isdigit() else "last"
        scheduler.add_job(report_generator.send_monthly_reports, 'cron', day=day_monthly, hour=h_monthly, minute=m_monthly)
        scheduler.start()
        logger.info("Scheduler started.")
    except Exception as e:
        logger.error(f"Error initializing scheduler: {e}")
        
    yield
    
    # Shutdown
    try:
        logger.info("Shutting down...")
        if telegram_polling_task:
            telegram_polling_task.cancel()
            try:
                await telegram_polling_task
            except asyncio.CancelledError:
                pass
            logger.info("Telegram polling stopped.")

        if max_polling_task:
            max_polling_task.cancel()
            try:
                await max_polling_task
            except asyncio.CancelledError:
                pass
            logger.info("MAX polling stopped.")

        if 'scheduler' in locals() and scheduler.running:
            scheduler.shutdown()
            logger.info("Scheduler stopped.")
    except Exception as e:
        logger.error(f"Error shutting down: {e}")

# Create FastAPI app
app = FastAPI(
    title="Mango Office Transcription API",
    description="API for managing call transcriptions and evaluations",
    version="1.0.0",
    lifespan=lifespan
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    origin = request.headers.get("origin", "no-origin")
    logger.info(f"{request.method} {request.url.path} - Client: {request.client.host if request.client else 'unknown'} - Origin: {origin}")
    try:
        response = await call_next(request)
        cors_headers = {k: v for k, v in response.headers.items() if k.lower().startswith('access-control')}
        logger.info(f"{request.method} {request.url.path} - Status: {response.status_code} - CORS: {cors_headers}")
        return response
    except Exception as e:
        logger.error(f"Error in {request.method} {request.url.path}: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "error": str(e)}
        )

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
# Records router must be included BEFORE other /api routers to avoid conflicts
app.include_router(records.router, prefix="/api", tags=["records"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(calls.router, prefix="/api/calls", tags=["calls"])
app.include_router(transcripts.router, prefix="/api", tags=["transcripts"])
app.include_router(kpi.router, prefix="/api/v1", tags=["kpi"]) # Added kpi router
app.include_router(evaluations.router, prefix="/api", tags=["evaluations"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(statistics.router, prefix="/api", tags=["statistics"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(chat_router.router, prefix="/api/ai", tags=["ai"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Mango Office Transcription API", "version": "1.0.0"}


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}


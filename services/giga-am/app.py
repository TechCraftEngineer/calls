import logging
import os
import tempfile

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
import uvicorn

from config import settings
from services.transcription_service import transcription_service
from utils.file_validation import FileValidator
from utils.logger import setup_logging

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    description="Sync API для распознавания русской речи на базе GigaAM",
    version=settings.app_version,
)


@app.post("/api/transcribe")
async def api_transcribe(request: Request, file: UploadFile = File(...)):
    """
    Синхронное распознавание речи из аудиофайла.

    Поддерживаемые форматы: MP3, WAV, FLAC, M4A, AAC, OGG, WEBM
    Максимальный размер файла: 100MB
    """
    tmp_path = None
    try:
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                content_length = int(content_length)
            except ValueError:
                content_length = None

        FileValidator.validate_audio_file(file, content_length)
        file_info = FileValidator.get_file_info(file)
        logger.info(
            "Получен файл: %s (%s bytes)",
            os.path.basename(file_info["filename"]),
            file_info["size"],
        )

        file_extension = file_info["extension"] or ".tmp"
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp:
            tmp_path = tmp.name
            content = await file.read()
            if len(content) > settings.max_file_size:
                raise HTTPException(
                    status_code=413,
                    detail=(
                        f"Размер файла превышает лимит "
                        f"{settings.max_file_size // (1024 * 1024)}MB"
                    ),
                )
            tmp.write(content)

        result = await run_in_threadpool(transcription_service.transcribe_audio, tmp_path)
        if result.get("success"):
            logger.info("Успешное распознавание файла %s", os.path.basename(file.filename))
            return JSONResponse(content=result)

        logger.error("Ошибка распознавания: %s", result.get("error"))
        raise HTTPException(status_code=500, detail=result.get("error"))
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Внутренняя ошибка сервера: %s", exc)
        raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера") from exc
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception as cleanup_error:
                logger.warning("Не удалось удалить временный файл %s: %s", tmp_path, cleanup_error)


@app.get("/api/health")
async def health_check():
    model_health = transcription_service.health_check()
    return {
        "status": "ok",
        "app_name": settings.app_name,
        "version": settings.app_version,
        "model": model_health,
    }


@app.get("/api/info")
async def app_info():
    return {
        "app_name": settings.app_name,
        "version": settings.app_version,
        "description": "Sync API для распознавания русской речи на базе GigaAM",
        "supported_formats": settings.allowed_audio_formats,
        "max_file_size_mb": settings.max_file_size // (1024 * 1024),
        "endpoints": {
            "/api/transcribe": "POST - Синхронное распознавание речи",
            "/api/health": "GET - Проверка работоспособности",
            "/api/info": "GET - Информация о приложении",
        },
    }


@app.get("/")
async def root():
    return {
        "message": "GigaAM Sync API для распознавания русской речи",
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/health",
    }


if __name__ == "__main__":
    setup_logging()
    logger.info("Запуск приложения %s v%s", settings.app_name, settings.app_version)
    logger.info("Сервер будет запущен на %s:%s", settings.host, settings.port)
    uvicorn.run(app, host=settings.host, port=settings.port, log_level=settings.log_level.lower())

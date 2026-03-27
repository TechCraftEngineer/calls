import json
import logging
import os
import ipaddress
import socket
import tempfile
from urllib.parse import urlparse

import requests
from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
import uvicorn

from config import settings
from services.job_models import JobStatus
from services.job_orchestrator import job_orchestrator
from services.transcription_service import transcription_service
from utils.file_validation import FileValidator
from utils.logger import setup_logging

logger = logging.getLogger(__name__)

# Создание FastAPI приложения
app = FastAPI(
    title=settings.app_name,
    description="API для распознавания русской речи на базе GigaAM",
    version=settings.app_version
)


def _job_payload(job) -> dict:
    eta_seconds = job_orchestrator.estimate_eta_seconds(job)
    payload = {
        "job_id": job.job_id,
        "status": job.status.value,
        "progress": job.progress,
        "eta_seconds": eta_seconds,
        "created_at": job.created_at,
        "updated_at": job.updated_at,
        "error": job.error,
        "attempt": int(job.metadata.get("attempt", 0)),
        "stages": [stage.__dict__ for stage in job.stages],
    }
    if job.result:
        payload["result"] = job.result
    return payload


def _download_remote_file(source_url: str, settings_obj) -> tuple[str, str]:
    parsed_url = urlparse(source_url)
    if parsed_url.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="source_url должен использовать http/https")
    if parsed_url.username or parsed_url.password:
        raise HTTPException(status_code=400, detail="source_url с username/password запрещен")
    if not parsed_url.hostname:
        raise HTTPException(status_code=400, detail="Некорректный source_url")

    try:
        parsed_port = parsed_url.port
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Некорректный порт source_url: {exc}") from exc

    try:
        addr_infos = socket.getaddrinfo(
            parsed_url.hostname,
            parsed_port or (443 if parsed_url.scheme == "https" else 80),
        )
    except socket.gaierror as exc:
        raise HTTPException(status_code=400, detail=f"Не удалось разрешить host source_url: {exc}") from exc

    verified_host_ip = None
    for _, _, _, _, sockaddr in addr_infos:
        host_ip = sockaddr[0]
        try:
            parsed_ip = ipaddress.ip_address(host_ip)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"Некорректный IP source_url: {host_ip}") from exc

        if (
            parsed_ip.is_loopback
            or parsed_ip.is_private
            or parsed_ip.is_link_local
            or parsed_ip.is_multicast
            or parsed_ip.is_reserved
            or parsed_ip.is_unspecified
            or host_ip == "169.254.169.254"
        ):
            raise HTTPException(status_code=400, detail="source_url указывает на запрещенный адрес")
        if verified_host_ip is None:
            verified_host_ip = host_ip

    if not verified_host_ip:
        raise HTTPException(status_code=400, detail="Не удалось определить IP для source_url")

    # Выполняем запрос по уже проверенному IP, чтобы исключить повторный DNS lookup.
    host_for_url = f"[{verified_host_ip}]" if ":" in verified_host_ip else verified_host_ip
    url_port = f":{parsed_port}" if parsed_port else ""
    path = parsed_url.path or "/"
    if parsed_url.query:
        path = f"{path}?{parsed_url.query}"
    resolved_source_url = f"{parsed_url.scheme}://{host_for_url}{url_port}{path}"
    host_header = parsed_url.hostname
    if parsed_port:
        host_header = f"{host_header}:{parsed_port}"

    tmp_path = None
    try:
        response = requests.get(
            resolved_source_url,
            headers={"Host": host_header},
            stream=True,
            timeout=settings_obj.source_download_timeout,
            allow_redirects=False,
        )
        if 300 <= response.status_code < 400:
            raise HTTPException(status_code=400, detail="Редиректы для source_url запрещены")
        response.raise_for_status()
        suffix = os.path.splitext(source_url)[1].lower() or ".tmp"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = tmp.name
            total = 0
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if not chunk:
                    continue
                total += len(chunk)
                if total > settings_obj.max_file_size:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Размер файла превышает лимит {settings_obj.max_file_size // (1024*1024)}MB",
                    )
                tmp.write(chunk)
        original_filename = os.path.basename(source_url) or "remote_audio"
        return tmp_path, original_filename
    except HTTPException:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception as cleanup_error:
                logger.warning("Не удалось удалить временный файл %s: %s", tmp_path, cleanup_error)
        raise
    except Exception as exc:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception as cleanup_error:
                logger.warning("Не удалось удалить временный файл %s: %s", tmp_path, cleanup_error)
        raise HTTPException(status_code=400, detail=f"Не удалось загрузить source_url: {exc}") from exc

@app.post("/api/transcribe")
async def api_transcribe(request: Request, file: UploadFile = File(...)):
    """
    Распознавание речи из аудиофайла
    
    - **file**: Аудиофайл для распознавания
    - **return**: JSON с результатом распознавания
    
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
        logger.info(f"Получен файл: {os.path.basename(file_info['filename'])} ({file_info['size']} bytes)")
        
        file_extension = file_info["extension"] or ".tmp"
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp:
            tmp_path = tmp.name
            content = await file.read()
            
            if len(content) > settings.max_file_size:
                raise HTTPException(
                    status_code=413,
                    detail=f"Размер файла превышает лимит {settings.max_file_size // (1024*1024)}MB"
                )
            
            tmp.write(content)
        
        result = await run_in_threadpool(transcription_service.transcribe_audio, tmp_path)
        
        if result["success"]:
            logger.info(f"Успешное распознавание файла {os.path.basename(file.filename)}")
            return JSONResponse(content=result)
        else:
            logger.error(f"Ошибка распознавания: {result.get('error')}")
            raise HTTPException(status_code=500, detail=result.get('error'))
                
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Внутренняя ошибка сервера: %s", e)
        raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера") from e
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception as cleanup_error:
                logger.warning("Не удалось удалить временный файл %s: %s", tmp_path, cleanup_error)


@app.post("/api/jobs")
async def create_job(
    request: Request,
    file: UploadFile | None = File(default=None),
    source_url: str | None = Form(default=None),
    callback_url: str | None = Form(default=None),
    preprocess_metadata_json: str | None = Form(default=None),
):
    """Создает асинхронную задачу Ultra-SOTA pipeline."""
    tmp_path = None
    should_cleanup_tmp = True
    try:
        if (file is None and not source_url) or (file is not None and source_url):
            raise HTTPException(
                status_code=400,
                detail="Передайте либо file, либо source_url",
            )

        if file is not None:
            content_length = request.headers.get("content-length")
            if content_length:
                try:
                    content_length = int(content_length)
                except ValueError:
                    content_length = None

            FileValidator.validate_audio_file(file, content_length)
            file_info = FileValidator.get_file_info(file)
            file_extension = file_info["extension"] or ".tmp"
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp:
                tmp_path = tmp.name
                content = await file.read()
                if len(content) > settings.max_file_size:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Размер файла превышает лимит {settings.max_file_size // (1024*1024)}MB",
                    )
                tmp.write(content)
            original_filename = file.filename
        else:
            tmp_path, original_filename = await run_in_threadpool(
                _download_remote_file,
                source_url,
                settings,
            )

        preprocess_metadata = None
        if preprocess_metadata_json and preprocess_metadata_json.strip():
            try:
                preprocess_metadata = json.loads(preprocess_metadata_json)
                if not isinstance(preprocess_metadata, dict):
                    raise ValueError("preprocess_metadata must be a JSON object")
            except (json.JSONDecodeError, ValueError) as exc:
                raise HTTPException(
                    status_code=400,
                    detail=f"preprocess_metadata_json: {exc}",
                ) from exc

        job = job_orchestrator.create_job(
            tmp_path,
            original_filename,
            callback_url=callback_url,
            preprocess_metadata=preprocess_metadata,
        )
        should_cleanup_tmp = False
        return JSONResponse(
            content={
                "job_id": job.job_id,
                "status": job.status.value,
                "progress": job.progress,
                "eta_seconds": None,
                "created_at": job.created_at,
                "input": {
                    "filename": original_filename,
                    "source_url": source_url,
                    "callback_url": callback_url,
                },
                "stages": [stage.__dict__ for stage in job.stages],
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Ошибка создания job: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Не удалось создать задачу") from e
    finally:
        if should_cleanup_tmp and tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception as cleanup_error:
                logger.warning("Не удалось удалить временный файл %s: %s", tmp_path, cleanup_error)


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    """Возвращает статус асинхронной задачи."""
    job = job_orchestrator.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return JSONResponse(content=_job_payload(job))


@app.get("/api/jobs")
async def list_jobs(
    limit: int = 20,
    offset: int = 0,
    status: str | None = None,
):
    """Возвращает список задач (новые сверху)."""
    status_enum = None
    if status:
        try:
            status_enum = JobStatus(status)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid status filter") from exc
    jobs = job_orchestrator.list_jobs(limit=limit, offset=offset, status=status_enum)
    return {"items": [_job_payload(job) for job in jobs], "count": len(jobs), "offset": offset}


@app.post("/api/jobs/{job_id}/cancel")
async def cancel_job(job_id: str):
    """Помечает задачу как отмененную (best effort)."""
    if not job_orchestrator.cancel_job(job_id):
        raise HTTPException(status_code=404, detail="Job not found or already completed")
    return {"job_id": job_id, "status": "cancelled"}

@app.get("/api/health")
async def health_check():
    """Проверка работоспособности API"""
    model_health = transcription_service.health_check()
    return {
        "status": "ok",
        "app_name": settings.app_name,
        "version": settings.app_version,
        "model": model_health
    }

@app.get("/api/info")
async def app_info():
    """Получение информации о приложении"""
    return {
        "app_name": settings.app_name,
        "version": settings.app_version,
        "description": "API для распознавания русской речи на базе GigaAM",
        "supported_formats": settings.allowed_audio_formats,
        "max_file_size_mb": settings.max_file_size // (1024 * 1024),
        "endpoints": {
            "/api/transcribe": "POST - Распознавание речи из аудиофайла",
            "/api/jobs": "POST - Создать async pipeline job",
            "/api/jobs?limit=20&offset=0&status=done": "GET - Список async jobs",
            "/api/jobs/{id}": "GET - Статус и результат async job",
            "/api/health": "GET - Проверка работоспособности",
            "/api/info": "GET - Информация о приложении"
        }
    }

@app.get("/")
async def root():
    """Корневой эндпоинт"""
    return {
        "message": "GigaAM API для распознавания русской речи",
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    logger.info(f"Запуск приложения {settings.app_name} v{settings.app_version}")
    logger.info(f"Сервер будет запущен на {settings.host}:{settings.port}")
    uvicorn.run(app, host=settings.host, port=settings.port, log_level=settings.log_level.lower())

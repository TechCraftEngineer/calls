import json
import logging
import os
import tempfile
from typing import Any

import librosa
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
import uvicorn

from config import settings
from services.alignment_service import AlignmentService
from services.attribution_service import AttributionService
from services.clustering_service import ClusteringService
from services.embedding_service import EmbeddingService
from services.postprocess_service import PostprocessService
from services.transcription_service import transcription_service
from utils.file_validation import FileValidator
from utils.logger import setup_logging

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    description="Sync API для распознавания русской речи на базе GigaAM",
    version=settings.app_version,
)

alignment_service = AlignmentService()
embedding_service = EmbeddingService()
clustering_service = ClusteringService()
attribution_service = AttributionService()
postprocess_service = PostprocessService()


def _run_ultra_pipeline(
    audio_path: str,
    preprocess_metadata: dict[str, Any] | None,
) -> dict[str, Any]:
    asr_result = transcription_service.transcribe_audio(audio_path)
    if not asr_result.get("success"):
        return asr_result

    base_segments = asr_result.get("segments", []) or []
    aligned_segments = (
        alignment_service.align_segments(base_segments)
        if settings.alignment_enabled
        else base_segments
    )

    overlap_spans = []
    if isinstance(preprocess_metadata, dict):
        raw_overlap = preprocess_metadata.get("overlap_candidates", [])
        if isinstance(raw_overlap, list):
            overlap_spans = raw_overlap

    diarized_segments = aligned_segments
    if settings.diarization_enabled:
        try:
            audio_np, audio_sr = librosa.load(audio_path, sr=16000, mono=True)
        except Exception:
            audio_np = np.array([], dtype=np.float32)
            audio_sr = 16000

        batch_embeddings = embedding_service.build_batch_hybrid_embeddings(
            aligned_segments,
            audio=audio_np,
            sample_rate=audio_sr,
        )
        for idx, segment in enumerate(aligned_segments):
            segment["embedding"] = (
                batch_embeddings[idx] if idx < len(batch_embeddings) else []
            )
        diarized_segments = clustering_service.assign_speakers(
            aligned_segments,
            overlap_spans=overlap_spans,
        )

    speaker_timeline = attribution_service.build_speaker_timeline(diarized_segments)
    final_segments = postprocess_service.apply_to_segments(diarized_segments)
    final_transcript = postprocess_service.build_final_transcript(final_segments)

    return {
        "success": True,
        "segments": final_segments,
        "speaker_timeline": speaker_timeline,
        "final_transcript": final_transcript,
        "total_duration": asr_result.get("total_duration", 0),
        "pipeline": "ultra-sync-2026",
        "stages": [
            "asr",
            "alignment" if settings.alignment_enabled else "alignment:disabled",
            "embedding+clustering"
            if settings.diarization_enabled
            else "embedding+clustering:disabled",
            "attribution",
            "postprocess",
        ],
    }


@app.post("/api/transcribe")
async def api_transcribe(
    request: Request,
    file: UploadFile = File(...),
    preprocess_metadata_json: str | None = Form(default=None),
):
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

        preprocess_metadata: dict[str, Any] | None = None
        if preprocess_metadata_json and preprocess_metadata_json.strip():
            try:
                parsed = json.loads(preprocess_metadata_json)
            except json.JSONDecodeError as exc:
                raise HTTPException(
                    status_code=400,
                    detail=f"Некорректный preprocess_metadata_json: {exc}",
                ) from exc
            if not isinstance(parsed, dict):
                raise HTTPException(
                    status_code=400,
                    detail="preprocess_metadata_json должен быть JSON объектом",
                )
            preprocess_metadata = parsed

        result = await run_in_threadpool(
            _run_ultra_pipeline,
            tmp_path,
            preprocess_metadata,
        )
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

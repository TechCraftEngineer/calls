"""
Эндпоинт для транскрипции диаризированного аудио.

Принимает полный аудио файл + сегменты диаризации,
возвращает транскрипцию каждого сегмента.
"""

import json
import logging
from typing import List, Dict, Any

from fastapi import APIRouter, HTTPException, UploadFile, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from services.diarized_transcription_service import diarized_transcription_service
from utils.exceptions import FileSizeError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["diarized-transcription"])


class DiarizationSegmentInput(BaseModel):
    """Сегмент диаризации для входного запроса"""
    start: float = Field(..., description="Начало сегмента в секундах", ge=0)
    end: float = Field(..., description="Конец сегмента в секундах", ge=0)
    speaker: str = Field(..., description="Идентификатор спикера")


class TranscribedSegmentOutput(BaseModel):
    """Результат транскрипции сегмента"""
    text: str = Field(..., description="Транскрибированный текст")
    start: float = Field(..., description="Начало сегмента в секундах")
    end: float = Field(..., description="Конец сегмента в секундах")
    speaker: str = Field(..., description="Идентификатор спикера")
    confidence: float = Field(default=1.0, description="Уверенность распознавания")


class DiarizedTranscriptionResponse(BaseModel):
    """Ответ на запрос транскрипции диаризированного аудио"""
    success: bool = Field(..., description="Успешность операции")
    final_transcript: str = Field(..., description="Полный текст всех сегментов")
    segments: List[TranscribedSegmentOutput] = Field(..., description="Список транскрибированных сегментов")
    speaker_timeline: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Таймлайн спикеров с текстом",
        alias="speakerTimeline"
    )
    num_speakers: int = Field(default=0, description="Количество уникальных спикеров")
    speakers: List[str] = Field(default_factory=list, description="Список спикеров")
    processing_time: float = Field(default=0.0, description="Время обработки в секундах")
    pipeline: str = Field(default="gigaam-diarized", description="Использованный pipeline")
    error: str = Field(default="", description="Описание ошибки (если success=false)")

    class Config:
        populate_by_name = True


@router.post("/transcribe-diarized", response_model=DiarizedTranscriptionResponse)
async def transcribe_diarized(
    file: UploadFile,
    filename: str = Form(..., description="Имя аудио файла"),
    segments: str = Form(
        ...,
        description='JSON массив сегментов: [{"start": 0.0, "end": 5.0, "speaker": "A"}, ...]'
    )
) -> JSONResponse:
    """
    Транскрибирует диаризированное аудио.
    
    Принимает полный аудио файл и список сегментов диаризации.
    Нарезает аудио на сегменты и транскрибирует их параллельно.
    
    Args:
        file: Аудио файл (wav, mp3, etc.)
        filename: Имя файла
        segments: JSON строка с массивом сегментов
        
    Returns:
        Транскрипция каждого сегмента с сохранением временных меток
        
    Example:
        ```
        segments = '[{"start": 0.0, "end": 5.2, "speaker": "SPEAKER_00"}, ...]'
        ```
    """
    request_id = f"diarized-req-{id(file) % 10000}"
    
    try:
        logger.info(f"[{request_id}] Получен запрос на транскрипцию диаризированного аудио: {filename}")
        
        # Парсим сегменты из JSON
        try:
            segments_data = json.loads(segments)
            if not isinstance(segments_data, list):
                raise ValueError("segments должен быть массивом")
        except json.JSONDecodeError as e:
            logger.error(f"[{request_id}] Ошибка парсинга segments JSON: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"Невалидный JSON в segments: {e}"
            ) from e
        except ValueError as e:
            logger.error(f"[{request_id}] Невалидный формат segments: {e}")
            raise HTTPException(
                status_code=400,
                detail=str(e)
            ) from e
        
        # Валидируем сегменты
        for i, seg in enumerate(segments_data):
            if not all(k in seg for k in ["start", "end", "speaker"]):
                raise HTTPException(
                    status_code=400,
                    detail=f"Сегмент {i} должен содержать поля: start, end, speaker"
                )
        
        logger.info(f"[{request_id}] Парсинг сегментов успешен: {len(segments_data)} сегментов")
        
        # Читаем аудио файл
        audio_data = await file.read()
        
        if not audio_data:
            raise HTTPException(
                status_code=400,
                detail="Аудио файл пуст"
            )
        
        logger.info(f"[{request_id}] Аудио файл прочитан: {len(audio_data)} bytes")
        
        # Запускаем транскрипцию
        result = await diarized_transcription_service.transcribe_diarized_audio(
            audio_data=audio_data,
            filename=filename,
            segments=segments_data
        )
        
        # Формируем ответ
        response_data = DiarizedTranscriptionResponse(
            success=result.get("success", False),
            final_transcript=result.get("final_transcript", ""),
            segments=[
                TranscribedSegmentOutput(**seg)
                for seg in result.get("segments", [])
            ],
            speaker_timeline=result.get("speakerTimeline", []),
            num_speakers=result.get("num_speakers", 0),
            speakers=result.get("speakers", []),
            processing_time=result.get("processing_time", 0.0),
            pipeline=result.get("pipeline", "gigaam-diarized"),
            error=result.get("error", "")
        )
        
        logger.info(
            f"[{request_id}] Запрос завершен: "
            f"{len(response_data.segments)} сегментов, "
            f"{response_data.processing_time:.2f}s"
        )
        
        return JSONResponse(content=response_data.model_dump(by_alias=True))
        
    except FileSizeError as fse:
        logger.error(f"[{request_id}] Ошибка размера файла: {fse}")
        raise HTTPException(
            status_code=413,
            detail=str(fse)
        ) from fse
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[{request_id}] Ошибка обработки запроса: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        ) from e

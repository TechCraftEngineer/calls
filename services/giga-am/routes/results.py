"""
API для получения результатов транскрипции по request_id.
"""
import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Path
from fastapi.responses import JSONResponse

from services.storage import TranscriptionStorage
from utils.metrics import metrics

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/results/{request_id}")
async def get_transcription_result(request_id: str = Path(..., description="ID запроса транскрипции")):
    """
    Получение результатов транскрипции по request_id.
    
    Используется Inngest для получения результатов обработки.
    """
    try:
        # Получаем результат из хранилища
        result = TranscriptionStorage.get_result(request_id)
        
        if result is None:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "Result not found",
                    "request_id": request_id,
                    "message": "Транскрипция с таким ID не найдена"
                }
            )
        
        # Проверяем статус
        if result.get("status") == "processing":
            return JSONResponse(
                status_code=202,
                content={
                    "status": "processing",
                    "request_id": request_id,
                    "message": "Транскрипция в процессе обработки"
                }
            )
        
        if result.get("status") == "failed":
            raise HTTPException(
                status_code=500,
                detail={
                    "status": "failed",
                    "request_id": request_id,
                    "error": result.get("error", "Unknown error"),
                    "message": "Ошибка при обработке транскрипции"
                }
            )
        
        # Успешный результат
        logger.info(f"Результат запрошен для request_id: {request_id}")
        metrics.record_result_retrieval(request_id)
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "completed",
                "request_id": request_id,
                "result": result["data"]
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при получении результата для {request_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error",
                "request_id": request_id,
                "message": "Внутренняя ошибка сервера"
            }
        )


@router.delete("/results/{request_id}")
async def delete_transcription_result(request_id: str = Path(..., description="ID запроса транскрипции")):
    """
    Удаление результатов транскрипции по request_id.
    
    Используется для очистки после обработки в Inngest.
    """
    try:
        deleted = TranscriptionStorage.delete_result(request_id)
        
        if not deleted:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "Result not found",
                    "request_id": request_id,
                    "message": "Результат для удаления не найден"
                }
            )
        
        logger.info(f"Результат удален для request_id: {request_id}")
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "deleted",
                "request_id": request_id,
                "message": "Результат успешно удален"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при удалении результата для {request_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error",
                "request_id": request_id,
                "message": "Внутренняя ошибка сервера"
            }
        )

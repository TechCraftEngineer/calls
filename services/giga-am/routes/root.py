from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def root():
    """Корневой эндпоинт"""
    return {
        "message": "GigaAM Sync API",
        "description": "Sync API для распознавания русской речи на базе GigaAM",
        "version": "1.1.0"
    }

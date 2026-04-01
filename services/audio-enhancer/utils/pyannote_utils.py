"""Общие утилиты для загрузки pyannote моделей."""

import logging
from typing import Optional
from pyannote.audio import Pipeline

logger = logging.getLogger(__name__)


def load_pyannote_pipeline(model_id: str = "pyannote/speaker-diarization-3.1", hf_token: Optional[str] = None) -> Optional[Pipeline]:
    """
    Загружает pyannote pipeline с правильной обработкой аутентификации.
    
    Args:
        model_id: ID модели для загрузки
        hf_token: HuggingFace токен для gated моделей
        
    Returns:
        Pipeline или None в случае ошибки
        
    Raises:
        ValueError: если hf_token отсутствует для gated модели
        Exception: если не удалось загрузить модель с токеном
    """
    if hf_token is None:
        logger.error("HF_TOKEN не установлен, невозможно загрузить gated pyannote модель")
        raise ValueError("HF_TOKEN требуется для загрузки gated pyannote моделей")
    
    # Совместимо с новым huggingface_hub: используем только параметр "token"
    try:
        pipeline = Pipeline.from_pretrained(model_id, token=hf_token)
        logger.info("✓ Pyannote pipeline загружен с параметром 'token'")
        return pipeline
    except TypeError as e:
        logger.error(f"Ошибка загрузки pyannote: параметр 'token' не поддерживается: {e}")
        raise ValueError(f"Неподдерживаемая версия pyannote.audio. Ошибка: {e}")
    except Exception as e:
        logger.error(f"Ошибка загрузки pyannote модели {model_id}: {e}")
        raise e

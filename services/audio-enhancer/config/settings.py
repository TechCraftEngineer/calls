"""Конфигурация audio-enhancer сервиса."""

import os
from typing import Optional


class Config:
    """Класс конфигурации приложения."""
    
    # Настройки приложения
    APP_NAME: str = os.getenv("APP_NAME", "Audio Enhancer Service")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in {"1", "true", "yes", "on"}
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "7860"))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO").upper()
    
    # Ограничения файлов
    MAX_UPLOAD_BYTES: int = int(os.getenv("MAX_FILE_SIZE", str(80 * 1024 * 1024)))  # 80MB
    MAX_AUDIO_SECONDS: int = int(os.getenv("MAX_AUDIO_SECONDS", str(4 * 3600)))  # 4 часа
    
    # HuggingFace токен для pyannote
    HF_TOKEN: Optional[str] = os.getenv("HF_TOKEN")
    
    # Настройки кэширования
    ENABLE_CACHE: bool = os.getenv("ENABLE_CACHE", "true").lower() in {"1", "true", "yes", "on"}
    CACHE_TTL_SECONDS: int = int(os.getenv("CACHE_TTL_SECONDS", "3600"))  # 1 час
    
    # Настройки производительности
    MAX_WORKERS: int = int(os.getenv("MAX_WORKERS", "1"))
    ENABLE_METRICS: bool = os.getenv("ENABLE_METRICS", "true").lower() in {"1", "true", "yes", "on"}
    
    # Допустимые MIME типы
    ALLOWED_MIME_TYPES = {
        "audio/wav", "audio/wave", "audio/x-wav",
        "audio/mp3", "audio/mpeg", "audio/mpeg3",
        "audio/flac", "audio/ogg", "audio/x-aiff",
        "audio/x-m4a", "audio/mp4", "audio/webm"
    }
    
    # Настройки обработки по умолчанию
    DEFAULT_ENHANCE_SETTINGS = {
        "use_deepfilter": True,
        "use_wpe": True,
        "noise_reduction": True,
        "normalize_volume": True,
        "enhance_speech": True,
        "remove_silence": False,
        "target_sample_rate": 16000,
        "use_compressor": True,
        "spectral_gating": True,
        "enable_diarization": False,
    }
    
    # Пороги VAD
    VAD_SETTINGS = {
        "threshold": 0.45,
        "min_speech_duration_ms": 180,
        "min_silence_duration_ms": 450,
        "speech_threshold": 0.5,
        "speech_min_duration_ms": 250,
        "speech_min_silence_ms": 1000,
    }
    
    # Настройки LUFS нормализации
    LUFS_TARGET = -16.0
    PEAK_LIMIT = 0.95
    
    # Настройки компрессора
    COMPRESSOR_SETTINGS = {
        "threshold_db": -20,
        "ratio": 4,
        "attack_ms": 5,
        "release_ms": 50,
    }
    
    # Настройки фильтров речи
    SPEECH_FILTER_SETTINGS = {
        "highpass_cutoff": 80,
        "lowpass_cutoff": 8000,
        "preemphasis_coef": 0.97,
        "speech_range": (300, 3400),
        "critical_range": (1000, 3000),
        "speech_gain": 1.3,
        "critical_gain": 1.5,
        "non_speech_gain": 0.4,
    }


# Глобальный экземпляр конфигурации
config = Config()

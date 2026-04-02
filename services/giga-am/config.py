import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    # Application settings
    app_name: str = "GigaAM API"
    app_version: str = "1.0.1"
    debug: bool = False
    
    # Server settings
    host: str = "0.0.0.0"
    port: int = 7860
    
    # Model settings
    model_name: str = "v3_e2e_rnnt"
    
    # File upload settings
    max_file_size: int = 100 * 1024 * 1024  # 100MB
    allowed_audio_formats: List[str] = [
        ".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg", ".webm"
    ]
    
    # Security settings
    hf_token: str = os.getenv("HF_TOKEN", "")
    
    # Logging settings
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Timeout settings
    transcription_timeout: int = Field(default=900, ge=1)  # 15 минут по умолчанию
    
    # Dual ASR + LLM correction (через Inngest - только флаг)
    enable_dual_asr_llm_correction: bool = Field(
        default=True,
        description="Enable dual ASR (full + diarized) - orchestrated by Inngest"
    )
    
    # Inngest connection
    inngest_api_url: str = os.getenv("INNGEST_API_URL", "http://localhost:3001")
    inngest_event_key: str = os.getenv("INNGEST_EVENT_KEY", "")
    
    callback_timeout: int = 20
    diarization_enabled: bool = True
    alignment_enabled: bool = True
    
    # Diarization settings (pyannote-based, SOTA 2024-2026)
    diarization_num_speakers: int | None = Field(
        default=None,
        description="Exact number of speakers (if known). Leave None for automatic detection"
    )
    diarization_min_speakers: int | None = Field(
        default=None,
        ge=1,
        description="Minimum number of speakers for automatic detection"
    )
    diarization_max_speakers: int | None = Field(
        default=None,
        ge=1,
        description="Maximum number of speakers for automatic detection"
    )
    diarization_min_segment_duration: float = Field(
        default=0.5,
        ge=0.1,
        le=5.0,
        description="Minimum segment duration after diarization (seconds)"
    )
    
    speaker_embeddings_url: str = os.getenv(
        "SPEAKER_EMBEDDINGS_URL",
        "",
    )
    speaker_embeddings_timeout: int = 300  # 5 минут для диаризации (может быть долгой)
    
    # Audio preprocessing settings
    auto_resample_enabled: bool = Field(
        default=True,
        description="Automatically resample audio to 16kHz if sample rate is lower"
    )
    target_sample_rate: int = Field(
        default=16000,
        ge=8000,
        le=48000,
        description="Target sample rate for resampling (Hz)"
    )
    
    # Metrics settings
    metrics_history_size: int = Field(default=1000, ge=1)
    system_metrics_interval: int = Field(default=30, ge=1)  # seconds
    
    # Cache settings  
    cache_max_size: int = Field(default=1000, ge=1)
    cache_max_age_hours: int = Field(default=24, ge=1)
    
    # Concurrency settings
    model_workers: int = Field(default=2, ge=1)
    model_loading_timeout: int = Field(default=600, ge=1)  # seconds
    
    # Admin settings
    admin_token: str = Field(default="", description="Admin token for protected endpoints")
    enable_cache_clear: bool = Field(default=False, description="Enable cache clear endpoint")
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": False,
        "extra": "ignore"
    }

# Global settings instance
settings = Settings()

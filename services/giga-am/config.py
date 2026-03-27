import os
from typing import List
from pydantic_settings import BaseSettings

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
    transcription_timeout: int = 300  # 5 минут

    # Async jobs and pipeline
    jobs_dir: str = "temp/jobs"
    max_parallel_jobs: int = 1
    job_ttl_hours: int = 24
    source_download_timeout: int = 120
    max_job_retries: int = 2
    llm_correction_enabled: bool = True
    llm_api_url: str = os.getenv("LLM_API_URL", "")
    llm_api_key: str = os.getenv("LLM_API_KEY", "")
    llm_model: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    llm_timeout: int = 45
    strict_correction_mode: bool = True
    callback_timeout: int = 20
    diarization_enabled: bool = True
    alignment_enabled: bool = True
    speaker_embeddings_url: str = os.getenv("SPEAKER_EMBEDDINGS_URL", "")
    speaker_embeddings_timeout: int = 60
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": False,
        "extra": "ignore"
    }

# Global settings instance
settings = Settings()

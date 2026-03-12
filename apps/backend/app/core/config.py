"""Application configuration importing from the root config.py."""

import sys
import logging
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List

logger = logging.getLogger(__name__)

# Add project root to sys.path to import root config
# In Docker: /app is the backend directory, so we need to go up one level to find config.py
# On local: backend/app/core/config.py -> project root is 3 levels up
project_root = Path(__file__).parent.parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

# Try multiple paths for config.py
config_paths = [
    Path("/app") / "config.py",  # Docker: config.py mounted to /app/config.py
    project_root / "config.py",  # Standard location (local dev)
    Path("/app") / ".." / "config.py",  # Docker: alternative location
]

root_config = None
for config_path in config_paths:
    try:
        config_path = config_path.resolve()
        if config_path.exists():
            import importlib.util
            spec = importlib.util.spec_from_file_location("root_config", str(config_path))
            root_config = importlib.util.module_from_spec(spec)
            root_config.__file__ = str(config_path)
            spec.loader.exec_module(root_config)
            print(f"--- [CONFIG] Loaded config.py from: {config_path} ---")
            logger.error(f"--- [CONFIG] Loaded config.py from: {config_path} ---")
            if hasattr(root_config, "DEEPSEEK_API_KEY"):
                key = root_config.DEEPSEEK_API_KEY
                key_preview = f"{key[:10]}...{key[-10:]}" if len(key) > 20 else key[:20] if key else "EMPTY"
                print(f"--- [CONFIG] DEEPSEEK_API_KEY from config.py: {key_preview} (length: {len(key) if key else 0}) ---")
                logger.error(f"--- [CONFIG] DEEPSEEK_API_KEY from config.py: {key_preview} (length: {len(key) if key else 0}) ---")
            break
    except Exception as e:
        print(f"--- [CONFIG] Failed to load config from {config_path}: {e} ---")
        logger.error(f"--- [CONFIG] Failed to load config from {config_path}: {e} ---")
        continue

if root_config is None:
    print("--- [CONFIG] WARNING: root_config.py NOT LOADED! Using defaults. ---")
    logger.error("--- [CONFIG] WARNING: root_config.py NOT LOADED! Using defaults. ---")

class Settings(BaseSettings):
    """Application settings using root config as defaults."""
    
    # DeepSeek API
    DEEPSEEK_API_KEY: str = getattr(root_config, "DEEPSEEK_API_KEY", "") if root_config else ""
    DEEPSEEK_API_BASE: str = getattr(root_config, "DEEPSEEK_API_BASE", "https://api.deepseek.com")
    OPENAI_API_BASE: str = getattr(root_config, "OPENAI_API_BASE", "https://api.openai.com/v1")
    
    # Gemini API
    GOOGLE_API_KEY: str = getattr(root_config, "GOOGLE_API_KEY", "")
    GEMINI_API_KEY: str = getattr(root_config, "GEMINI_API_KEY", "")
    GEMINI_API_KEY_2: str = getattr(root_config, "GEMINI_API_KEY_2", "")
    GEMINI_MODEL: str = getattr(root_config, "GEMINI_MODEL", "gemini-2.0-flash")
    
    # AssemblyAI API
    ASSEMBLYAI_API_KEY: str = getattr(root_config, "ASSEMBLYAI_API_KEY", "")
    
    # Artemox.com API
    ARTEMOX_API_KEY: str = getattr(root_config, "ARTEMOX_API_KEY", "")
    ARTEMOX_API_BASE: str = getattr(root_config, "ARTEMOX_API_BASE", "https://api.artemox.com/v1")
    
    # SaluteSpeech API
    SALUTE_SPEECH_CLIENT_ID: str = getattr(root_config, "SALUTE_SPEECH_CLIENT_ID", "")
    SALUTE_SPEECH_SCOPE: str = getattr(root_config, "SALUTE_SPEECH_SCOPE", "SALUTE_SPEECH_PERS")
    SALUTE_SPEECH_AUTHORIZATION_KEY: str = getattr(root_config, "SALUTE_SPEECH_AUTHORIZATION_KEY", "")
    SALUTE_SPEECH_TOKEN_URL: str = getattr(root_config, "SALUTE_SPEECH_TOKEN_URL", "https://ngw.devices.sberbank.ru:9443/api/v2/oauth")
    SALUTE_SPEECH_API_BASE_URL: str = getattr(root_config, "SALUTE_SPEECH_API_BASE_URL", "https://smartspeech.sber.ru")
    SALUTE_SPEECH_VERIFY_SSL: bool = getattr(root_config, "SALUTE_SPEECH_VERIFY_SSL", True)
    
    # Proxy configuration
    PROXY_ENABLED: bool = getattr(root_config, "PROXY_ENABLED", False)
    HTTP_PROXY: str = getattr(root_config, "HTTP_PROXY", "")
    HTTPS_PROXY: str = getattr(root_config, "HTTPS_PROXY", "")
    DEEPSEEK_USE_PROXY: bool = getattr(root_config, "DEEPSEEK_USE_PROXY", False)
    
    # Mango Office API
    MANGO_API_URL: str = getattr(root_config, "MANGO_API_URL", "https://app.mango-office.ru/vpbx/")
    MANGO_API_KEY: str = getattr(root_config, "MANGO_API_KEY", "")
    MANGO_API_SALT: str = getattr(root_config, "MANGO_API_SALT", "")
    
    # Megafon PBX FTP
    MEGAFON_FTP_HOST: str = getattr(root_config, "MEGAFON_FTP_HOST", "records.megapbx.ru")
    MEGAFON_FTP_USER: str = getattr(root_config, "MEGAFON_FTP_USER", "")
    MEGAFON_FTP_PASSWORD: str = getattr(root_config, "MEGAFON_FTP_PASSWORD", "")
    
    # Security
    SECRET_KEY: str = getattr(root_config, "SECRET_KEY", "dev-secret-key")
    
    # CORS
    CORS_ORIGINS: List[str] = getattr(root_config, "CORS_ORIGINS", ["http://localhost:3000"])
    
    # Paths (root config may expose Path; ensure str for Pydantic)
    _db = getattr(root_config, "DATABASE_PATH", "../data/db.sqlite")
    _rec = getattr(root_config, "RECORDS_DIR", "../records")
    DATABASE_PATH: str = str(_db) if _db is not None else "../data/db.sqlite"
    RECORDS_DIR: str = str(_rec) if _rec is not None else "../records"

    # ChromaDB (vector store for RAG chat)
    CHROMA_PERSIST_DIR: str = getattr(root_config, "CHROMA_PERSIST_DIR", "data/chroma")
    CHROMA_COLLECTION_NAME: str = getattr(root_config, "CHROMA_COLLECTION_NAME", "call_transcripts")
    EMBEDDING_MODEL: str = getattr(root_config, "EMBEDDING_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
    RAG_CONTEXT_MAX_CHARS: int = getattr(root_config, "RAG_CONTEXT_MAX_CHARS", 7000)
    
    # ============================================================================
    # SMTP / Email Configuration
    # ============================================================================
    SMTP_SERVER: str = getattr(root_config, "SMTP_SERVER", "smtp.qbs.ru")
    SMTP_PORT: int = getattr(root_config, "SMTP_PORT", 465)
    SMTP_USER: str = getattr(root_config, "SMTP_USER", "reports@qbs.ru")
    SMTP_PASSWORD: str = getattr(root_config, "SMTP_PASSWORD", "")
    SMTP_USE_TLS: bool = getattr(root_config, "SMTP_USE_TLS", False)
    
    class Config:
        # No more .env file dependency
        case_sensitive = True


settings = Settings()

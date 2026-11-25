"""Application Configuration & Environment Settings."""

import os
from pathlib import Path
from typing import List
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Canonical Absolute Project Root to prevent CWD-divergence
PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent.parent.parent
CANONICAL_DATABASE_DIR: Path = PROJECT_ROOT / "database"



class Settings(BaseSettings):
    # Application Environment
    APP_ENV: str = Field(default="development", description="Application runtime environment")
    APP_DEBUG: bool = Field(default=True, description="Enable debug mode and verbose logs")
    APP_HOST: str = Field(default="127.0.0.1", description="Host address for FastAPI server")
    APP_PORT: int = Field(default=8000, description="Port for FastAPI server")
    APP_SECRET_KEY: str = Field(
        default="local_dev_secret_key_abhi_personal_ai_2026",
        description="Secret key for local session tokens"
    )

    # Sovereign Operator Identity & Personal Communication Links (Mamu)
    OPERATOR_NAME: str = Field(default="Ayyappa Rayudu Ravuvari", description="Sovereign operator name")
    OPERATOR_CALLSIGN: str = Field(default="Mamu", description="Revered callsign")
    OPERATOR_EMAIL: str = Field(default="ayyapparayudu.ravuvari@gmail.com", description="Personal Gmail for data analysis & intelligence")
    OPERATOR_PHONE: str = Field(default="9390598938", description="Mobile number for messaging & hardware device link")
    MAMU_EMAIL: str = Field(default="ayyapparayudu.ravuvari@gmail.com", description="Alias for Mamu Gmail")
    MAMU_PHONE: str = Field(default="9390598938", description="Alias for Mamu mobile phone")

    # CORS Settings - Explicit local and loopback origins only
    CORS_ORIGINS: List[str] = Field(
        default=[
            "http://localhost:4200",
            "http://127.0.0.1:4200",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
        ],
        description="Allowed CORS origins for the frontend and local services"
    )

    # API Authentication & Security - Dynamic local key and revoked key registry
    API_AUTH_ENABLED: bool = Field(default=True, description="Enforce API authentication for sensitive routes")
    LOCAL_API_KEY: str = Field(
        default="abhi_sec_d9841f3e8b7c2a0561e74f829a3b6c10e5d872149b0a7c3f81e62d547a9c0b1e",
        description="Rotated local authorization key"
    )
    COMPROMISED_KEYS: List[str] = Field(
        default=[
            "abhi_local_secure_key_2026_operator_mamu",
            "143",
            "admin",
            "1234",
            "abhi",
            "jarvis",
            "laxmi1"
        ],
        description="Blacklisted revoked secrets permanently blocked by gateway"
    )
    VAULT_ENCRYPTION_SALT: str = Field(
        default="abhi_sovereign_vault_salt_2026_ravuvari",
        description="Salt for vault key derivation"
    )

    # LLM Settings (ABHI Native Core)
    OLLAMA_BASE_URL: str = Field(default="http://localhost:11434", description="Ollama API base URL")
    OLLAMA_DEFAULT_MODEL: str = Field(default="abhi:latest", description="Default local LLM model name")
    NATIVE_LLM_MODEL: str = Field(default="abhi:latest", description="Primary native embedded LLM model")
    OLLAMA_EMBED_MODEL: str = Field(default="all-minilm", description="Default local vector embedding model (384-dim)")
    VECTOR_EMBEDDING_DIM: int = Field(default=384, description="Standard vector embedding dimensionality")
    OLLAMA_TIMEOUT_SECONDS: int = Field(default=120, description="Timeout for LLM inference in seconds")
    OLLAMA_KEEP_ALIVE: str = Field(default="60m", description="Ollama model keep-alive duration")
    OLLAMA_NUM_CTX: int = Field(default=8192, description="Default context window size in tokens")

    # Storage Paths (Canonical Absolute Paths Anchored to PROJECT_ROOT)
    DATABASE_DIR: str = Field(
        default=str(CANONICAL_DATABASE_DIR),
        description="Base persistent database root"
    )
    DATABASE_SQLITE_URL: str = Field(
        default=f"sqlite+aiosqlite:///{CANONICAL_DATABASE_DIR.as_posix()}/relational/system.db",
        description="Async SQLite database connection string"
    )
    LANCEDB_DIR: str = Field(
        default=str(CANONICAL_DATABASE_DIR / "vector"),
        description="LanceDB vector store directory"
    )
    MEDIA_STORAGE_DIR: str = Field(
        default=str(CANONICAL_DATABASE_DIR / "media"),
        description="Generated media directory"
    )

    # TTS Local-First & Privacy Policy Settings
    TTS_BACKEND: str = Field(default="piper", description="TTS engine backend: piper, kokoro, or edge_tts_online")
    TTS_ALLOW_ONLINE_FALLBACK: bool = Field(
        default=False,
        description="Whether to permit online cloud TTS fallback when local TTS is unavailable. Default False (strict local-first)."
    )

    # Evaluation & Evolution Lab Settings
    DAILY_EVAL_MAX_CPU: float = Field(default=0.80, description="Max CPU utilization threshold for daily evaluation")
    DAILY_EVAL_MAX_MEMORY_MB: int = Field(default=16384, description="Max RAM allowed for evaluation runs")
    DAILY_EVAL_MAX_GPU_MB: int = Field(default=6144, description="Max VRAM allowed for evaluation runs")
    DEEP_EVAL_ENABLED: bool = Field(default=False, description="Enable deep academic benchmark suites")
    CANDIDATE_TRAINING_ENABLED: bool = Field(default=False, description="Permit local candidate training/fine-tuning")
    RESEARCH_SYNC_ENABLED: bool = Field(default=True, description="Enable online research metadata synchronization")
    RESEARCH_STORAGE_DIR: str = Field(default="./project_data/research", description="Research papers and metadata directory")
    EVALUATION_REPORT_DIR: str = Field(default="./project_data/status/llm_evaluations", description="Persistent evaluation reports directory")

    # Logging Settings
    LOG_LEVEL: str = Field(default="INFO", description="Log level: DEBUG, INFO, WARNING, ERROR")
    LOG_DIR: str = Field(default="./logs", description="Directory to store audit log files")
    LOG_MAX_BYTES: int = Field(default=52428800, description="50 MB maximum per log file")
    LOG_BACKUP_COUNT: int = Field(default=5, description="Number of rotating log backups")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @model_validator(mode="after")
    def resolve_canonical_paths(self) -> "Settings":
        """Resolve all relative paths to absolute paths anchored at PROJECT_ROOT to prevent CWD-divergence."""
        db_path = Path(self.DATABASE_DIR)
        if not db_path.is_absolute():
            self.DATABASE_DIR = str((PROJECT_ROOT / db_path).resolve())
        else:
            self.DATABASE_DIR = str(db_path.resolve())

        # Enforce canonical absolute path in SQLite URL
        if "sqlite" in self.DATABASE_SQLITE_URL and "///" in self.DATABASE_SQLITE_URL:
            prefix, path_part = self.DATABASE_SQLITE_URL.split("///", 1)
            clean_rel = path_part.lstrip("./").lstrip(".\\")
            target_path = Path(clean_rel)
            if not target_path.is_absolute():
                abs_db_file = (PROJECT_ROOT / target_path).resolve()
                self.DATABASE_SQLITE_URL = f"{prefix}///{abs_db_file.as_posix()}"

        lance_path = Path(self.LANCEDB_DIR)
        if not lance_path.is_absolute():
            self.LANCEDB_DIR = str((PROJECT_ROOT / lance_path).resolve())
        else:
            self.LANCEDB_DIR = str(lance_path.resolve())

        media_path = Path(self.MEDIA_STORAGE_DIR)
        if not media_path.is_absolute():
            self.MEDIA_STORAGE_DIR = str((PROJECT_ROOT / media_path).resolve())
        else:
            self.MEDIA_STORAGE_DIR = str(media_path.resolve())

        log_path = Path(self.LOG_DIR)
        if not log_path.is_absolute():
            self.LOG_DIR = str((PROJECT_ROOT / log_path).resolve())
        else:
            self.LOG_DIR = str(log_path.resolve())

        res_path = Path(self.RESEARCH_STORAGE_DIR)
        if not res_path.is_absolute():
            self.RESEARCH_STORAGE_DIR = str((PROJECT_ROOT / res_path).resolve())
        else:
            self.RESEARCH_STORAGE_DIR = str(res_path.resolve())

        eval_path = Path(self.EVALUATION_REPORT_DIR)
        if not eval_path.is_absolute():
            self.EVALUATION_REPORT_DIR = str((PROJECT_ROOT / eval_path).resolve())
        else:
            self.EVALUATION_REPORT_DIR = str(eval_path.resolve())

        return self

    def ensure_directories(self) -> None:
        """Ensure all required persistent directories exist dynamically."""
        for path_str in [
            self.DATABASE_DIR,
            os.path.join(self.DATABASE_DIR, "relational"),
            os.path.join(self.DATABASE_DIR, "memory"),
            os.path.join(self.DATABASE_DIR, "vector"),
            os.path.join(self.DATABASE_DIR, "media"),
            os.path.join(self.DATABASE_DIR, "migrations"),
            self.LOG_DIR,
            self.RESEARCH_STORAGE_DIR,
            self.EVALUATION_REPORT_DIR
        ]:
            Path(path_str).mkdir(parents=True, exist_ok=True)


# Global settings singleton
settings = Settings()
settings.ensure_directories()

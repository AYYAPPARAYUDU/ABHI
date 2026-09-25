"""Application Configuration & Environment Settings."""

import os
from pathlib import Path
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


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

    # CORS Settings
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:4200", "http://127.0.0.1:4200"],
        description="Allowed CORS origins for the frontend"
    )

    # Ollama Local LLM Settings
    OLLAMA_BASE_URL: str = Field(default="http://localhost:11434", description="Ollama API base URL")
    OLLAMA_DEFAULT_MODEL: str = Field(default="qwen3:8b", description="Default local LLM model name")
    OLLAMA_TIMEOUT_SECONDS: int = Field(default=60, description="Timeout for LLM inference in seconds")
    OLLAMA_KEEP_ALIVE: str = Field(default="5m", description="Ollama model keep-alive duration")

    # Storage Paths
    DATABASE_DIR: str = Field(default="./database", description="Base persistent database root")
    DATABASE_SQLITE_URL: str = Field(
        default="sqlite+aiosqlite:///./database/relational/system.db",
        description="Async SQLite database connection string"
    )
    LANCEDB_DIR: str = Field(default="./database/vector", description="LanceDB vector store directory")
    MEDIA_STORAGE_DIR: str = Field(default="./database/media", description="Generated media directory")

    # TTS Local-First & Privacy Policy Settings
    TTS_BACKEND: str = Field(default="piper", description="TTS engine backend: piper, kokoro, or edge_tts_online")
    TTS_ALLOW_ONLINE_FALLBACK: bool = Field(
        default=False,
        description="Whether to permit online cloud TTS fallback when local TTS is unavailable. Default False (strict local-first)."
    )

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

    def ensure_directories(self) -> None:
        """Ensure all required persistent directories exist dynamically."""
        for path_str in [
            self.DATABASE_DIR,
            os.path.join(self.DATABASE_DIR, "relational"),
            os.path.join(self.DATABASE_DIR, "memory"),
            os.path.join(self.DATABASE_DIR, "vector"),
            os.path.join(self.DATABASE_DIR, "media"),
            os.path.join(self.DATABASE_DIR, "migrations"),
            self.LOG_DIR
        ]:
            Path(path_str).mkdir(parents=True, exist_ok=True)


# Global settings singleton
settings = Settings()
settings.ensure_directories()

"""Unit tests for configuration and environment parsing."""

import os
from backend.app.core.config import Settings


def test_default_settings():
    settings = Settings()
    assert settings.APP_HOST == "127.0.0.1"
    assert settings.APP_PORT == 8000
    assert settings.OLLAMA_BASE_URL == "http://localhost:11434"
    assert settings.OLLAMA_DEFAULT_MODEL == "qwen3:8b"
    assert "http://localhost:4200" in settings.CORS_ORIGINS


def test_directory_creation(tmp_path):
    temp_db_dir = str(tmp_path / "test_db")
    temp_log_dir = str(tmp_path / "test_logs")

    settings = Settings(DATABASE_DIR=temp_db_dir, LOG_DIR=temp_log_dir)
    settings.ensure_directories()

    assert os.path.exists(temp_db_dir)
    assert os.path.exists(os.path.join(temp_db_dir, "relational"))
    assert os.path.exists(os.path.join(temp_db_dir, "vector"))
    assert os.path.exists(temp_log_dir)

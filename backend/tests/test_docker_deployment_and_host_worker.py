"""Tests for Phase 6 Stage 6.2-D Docker & Local Deployment Foundation."""

import os
import sys
import pytest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_ROOT = PROJECT_ROOT / "backend"

from backend.app.workers.windows_host_worker_daemon import WindowsHostWorkerDaemon
from backend.app.core.config import Settings


def test_windows_host_worker_daemon_lifecycle(tmp_path):
    """Verify WindowsHostWorkerDaemon initializes, manages PID files, and cleans up cleanly."""
    daemon = WindowsHostWorkerDaemon(backend_url="http://127.0.0.1:8000")
    daemon.pid_file = tmp_path / "test_worker.pid"

    # 1. Write PID
    daemon.write_pid_file()
    assert daemon.pid_file.exists()
    assert daemon.pid_file.read_text(encoding="utf-8") == str(os.getpid())

    # 2. Inspect active foreground window
    title = daemon.uia_driver.get_foreground_window_title()
    assert isinstance(title, str)

    # 3. Check leases dictionary
    assert isinstance(daemon.leases._leases, dict)

    # 4. Cleanup PID file
    daemon.cleanup_pid_file()
    assert not daemon.pid_file.exists()


def test_docker_configuration_files_exist():
    """Verify all canonical Stage 6.2-D Docker and script files exist."""
    required_files = [
        PROJECT_ROOT / "compose.yaml",
        PROJECT_ROOT / ".dockerignore",
        PROJECT_ROOT / ".env.example",
        PROJECT_ROOT / "docker" / "frontend" / "Dockerfile",
        PROJECT_ROOT / "docker" / "frontend" / "nginx.conf",
        PROJECT_ROOT / "docker" / "backend" / "Dockerfile",
        PROJECT_ROOT / "docker" / "ollama" / "README.md",
        PROJECT_ROOT / "scripts" / "abhi-up.ps1",
        PROJECT_ROOT / "scripts" / "abhi-down.ps1",
        PROJECT_ROOT / "scripts" / "abhi-status.ps1",
        PROJECT_ROOT / "scripts" / "abhi-logs.ps1",
    ]

    for req_file in required_files:
        assert req_file.exists(), f"Missing required file: {req_file}"


def test_docker_environment_settings():
    """Verify settings can be initialized with production container configuration."""
    prod_settings = Settings(
        APP_ENV="production",
        APP_DEBUG=False,
        APP_HOST="0.0.0.0",
        APP_PORT=8000,
        OLLAMA_BASE_URL="http://host.docker.internal:11434"
    )
    assert prod_settings.APP_ENV == "production"
    assert prod_settings.APP_HOST == "0.0.0.0"
    assert prod_settings.OLLAMA_BASE_URL == "http://host.docker.internal:11434"

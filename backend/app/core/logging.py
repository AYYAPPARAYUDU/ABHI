"""Structured JSON Logging with Credential Redaction."""

import json
import logging
import os
import re
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler
from typing import Any, Dict
from backend.app.core.config import settings

# Sensitive regex patterns to redact from logs
SENSITIVE_PATTERNS = [
    re.compile(r'(api[_-]?key["\']?\s*[:=]\s*["\'])([^"\']+)(["\'])', re.IGNORECASE),
    re.compile(r'(password["\']?\s*[:=]\s*["\'])([^"\']+)(["\'])', re.IGNORECASE),
    re.compile(r'(bearer\s+)([A-Za-z0-9._~+/-]+=*)', re.IGNORECASE),
    re.compile(r'(secret["\']?\s*[:=]\s*["\'])([^"\']+)(["\'])', re.IGNORECASE),
]


def redact_sensitive_text(text: str) -> str:
    """Scrub sensitive credentials and secrets from text."""
    for pattern in SENSITIVE_PATTERNS:
        text = pattern.sub(r'\1***REDACTED***\3' if pattern.groups == 3 else r'\1***REDACTED***', text)
    return text


class StructuredJsonFormatter(logging.Formatter):
    """Formats log records as structured single-line JSON objects."""

    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "component": record.name,
            "message": redact_sensitive_text(record.getMessage()),
        }

        if hasattr(record, "task_id"):
            log_obj["task_id"] = getattr(record, "task_id")
        if hasattr(record, "correlation_id"):
            log_obj["correlation_id"] = getattr(record, "correlation_id")
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_obj)


def setup_logger(name: str = "abhi_ai") -> logging.Logger:
    """Set up and configure a structured logger."""
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))

    # Prevent duplicate handlers
    if not logger.handlers:
        # Console Handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(StructuredJsonFormatter())
        logger.addHandler(console_handler)

        # Rotating File Handler
        log_file = os.path.join(settings.LOG_DIR, "system.log")
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=settings.LOG_MAX_BYTES,
            backupCount=settings.LOG_BACKUP_COUNT,
            encoding="utf-8"
        )
        file_handler.setFormatter(StructuredJsonFormatter())
        logger.addHandler(file_handler)

    return logger


# Global root logger instance
logger = setup_logger()

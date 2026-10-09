"""Data sanitization utilities for safe defect telemetry and LLM context injection."""

import re
from typing import Any, Dict

# Regex patterns for sensitive credentials, secrets, tokens, and keys
SENSITIVE_PATTERNS = [
    (re.compile(r"(?i)(api[_-]?key|secret|token|password|auth|bearer)\s*[:=]\s*['\"]?([a-zA-Z0-9_\-\.]{8,})['\"]?"), r"\1: [REDACTED_SECRET]"),
    (re.compile(r"(?i)bearer\s+[a-zA-Z0-9_\-\.]{15,}"), "Bearer [REDACTED_TOKEN]"),
    (re.compile(r"(?i)(sk-[a-zA-Z0-9]{20,})"), "[REDACTED_API_KEY]"),
    (re.compile(r"(?i)(ghp_[a-zA-Z0-9]{20,})"), "[REDACTED_GH_TOKEN]"),
    (re.compile(r"([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)"), "[REDACTED_EMAIL]"),
]

# Sensitive files that should never be opened or modified by autonomous self-healing
PROTECTED_PATHS = [
    ".env",
    "id_rsa",
    "id_ed25519",
    ".git",
    "system.db",
    "backend/app/core/security",
    "backend/app/core/auth",
    "backend/app/cognitive/self_healing/models.py",
]


class Sanitizer:
    """Sanitizes runtime strings and context structures."""

    @staticmethod
    def sanitize_text(text: str) -> str:
        """Mask credentials, tokens, and personal secrets from plain text or logs."""
        if not text:
            return ""
        sanitized = text
        for pattern, replacement in SENSITIVE_PATTERNS:
            sanitized = pattern.sub(replacement, sanitized)
        return sanitized

    @staticmethod
    def sanitize_dict(data: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively sanitize keys and values in dictionary."""
        sanitized = {}
        for k, v in data.items():
            k_clean = Sanitizer.sanitize_text(str(k))
            if any(s in str(k).lower() for s in ["password", "secret", "token", "key", "auth"]):
                sanitized[k_clean] = "[REDACTED_SECRET]"
            elif isinstance(v, str):
                sanitized[k_clean] = Sanitizer.sanitize_text(v)
            elif isinstance(v, dict):
                sanitized[k_clean] = Sanitizer.sanitize_dict(v)
            elif isinstance(v, list):
                sanitized[k_clean] = [Sanitizer.sanitize_text(str(x)) if isinstance(x, str) else x for x in v]
            else:
                sanitized[k_clean] = v
        return sanitized

    @staticmethod
    def is_protected_path(path: str) -> bool:
        """Check if a file path belongs to the protected security/authorization boundaries."""
        normalized = path.replace("\\", "/").lower()
        for p in PROTECTED_PATHS:
            if p.lower() in normalized:
                return True
        return False


sanitizer = Sanitizer()

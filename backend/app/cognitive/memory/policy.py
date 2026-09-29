"""Memory Privacy, Sensitivity & Security Policy Enforcement (Stage 7.5)."""

import re
from typing import Any, Dict, List, Optional, Tuple
from backend.app.cognitive.memory.models import (
    AuthorityLevel,
    MemoryContract,
    MemorySource,
    PrivacyClassification,
)


class SensitivityDetector:
    """Detects and redacts secrets, credentials, and sensitive private identifiers."""

    # Patterns for sensitive tokens, credentials, and PII
    PATTERNS: Dict[str, re.Pattern] = {
        "api_key": re.compile(r'(?i)(api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token)[\s:=]+["\']?([a-zA-Z0-9_\-\.]{16,})["\']?'),
        "password": re.compile(r'(?i)(password|passwd|pwd)[\s:=]+["\']?([^\s"\'\n]{4,})["\']?'),
        "bearer_token": re.compile(r'(?i)bearer\s+([a-zA-Z0-9_\-\.]{20,})'),
        "private_key": re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
        "credit_card": re.compile(r'\b(?:\d{4}[-\s]?){3}\d{4}\b'),
        "otp_pin": re.compile(r'(?i)\b(?:otp|one[- ]time[- ]password|pin|verification[- ]code)[\s:=]+["\']?(\d{4,8})["\']?\b'),
        "jwt_token": re.compile(r'\beyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\b'),
    }

    @classmethod
    def detect_violations(cls, text: str) -> List[str]:
        """Return list of detected sensitive token violation categories."""
        violations = []
        for cat, pattern in cls.PATTERNS.items():
            if pattern.search(text):
                violations.append(cat)
        return violations

    @classmethod
    def is_sensitive(cls, text: str) -> bool:
        """Return True if text contains detected credentials or sensitive patterns."""
        return len(cls.detect_violations(text)) > 0

    @classmethod
    def sanitize_text(cls, text: str) -> str:
        """Redact sensitive patterns from text."""
        sanitized = text
        sanitized = cls.PATTERNS["private_key"].sub("[REDACTED_PRIVATE_KEY]", sanitized)
        sanitized = cls.PATTERNS["jwt_token"].sub("[REDACTED_JWT_TOKEN]", sanitized)
        sanitized = cls.PATTERNS["bearer_token"].sub("Bearer [REDACTED_TOKEN]", sanitized)
        sanitized = cls.PATTERNS["credit_card"].sub("[REDACTED_CC]", sanitized)
        sanitized = cls.PATTERNS["password"].sub(r'\1: [REDACTED_PASSWORD]', sanitized)
        sanitized = cls.PATTERNS["api_key"].sub(r'\1: [REDACTED_API_KEY]', sanitized)
        sanitized = cls.PATTERNS["otp_pin"].sub(r'code: [REDACTED_OTP]', sanitized)
        return sanitized

    @classmethod
    def sanitize_dict(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively sanitize sensitive key/value pairs in dictionary."""
        sanitized: Dict[str, Any] = {}
        for k, v in data.items():
            k_lower = str(k).lower()
            if any(s in k_lower for s in ["password", "secret", "token", "api_key", "secret_key", "private_key", "auth_key", "pin", "credential", "bearer"]):
                sanitized[k] = "[REDACTED_CONFIDENTIAL]"
            elif isinstance(v, str):
                sanitized[k] = cls.sanitize_text(v)
            elif isinstance(v, dict):
                sanitized[k] = cls.sanitize_dict(v)
            elif isinstance(v, list):
                sanitized[k] = [
                    cls.sanitize_dict(item) if isinstance(item, dict)
                    else (cls.sanitize_text(item) if isinstance(item, str) else item)
                    for item in v
                ]
            else:
                sanitized[k] = v
        return sanitized


class MemoryWritePolicy:
    """Enforces write-time privacy classification, anti-poisoning, and integrity rules."""

    # Poisoning keywords attempting privilege escalation or policy overrides
    FORBIDDEN_CONTROL_PATTERNS = [
        re.compile(r'(?i)ignore\s+(?:all\s+)?(?:safety|policy|guardrails|security|restrictions)'),
        re.compile(r'(?i)bypass\s+(?:(?:all|user|operator|system)\s+)?(?:consent|confirmation|verification|lease|auth|safety|security)'),
        re.compile(r'(?i)(?:user\s+authorized|grant\s+full|override\s+policy)\s+upload(?:ing)?\s+all\s+files'),
        re.compile(r'(?i)always\s+run\s+this\s+command\s+without\s+permission'),
        re.compile(r'(?i)disable\s+(?:all\s+)?(?:safety|security|auditing|guardrails)'),
        re.compile(r'(?i)delete\s+(?:system32|all\s+files|database|records)\s+without\s+asking'),
    ]

    @classmethod
    def validate_memory_write(
        cls,
        source: MemorySource,
        content: Dict[str, Any],
        summary: str,
        privacy: PrivacyClassification,
        confidence: float
    ) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        """
        Validate whether a memory candidate is permitted to be persisted.
        Returns (is_valid, rejection_reason, sanitized_content).
        """
        full_text = f"{summary} {str(content)}"

        # 1. Anti-Poisoning: Check for malicious control overrides from external/untrusted sources
        if source in [MemorySource.DOCUMENT, MemorySource.RAG, MemorySource.SYSTEM_OBSERVED]:
            for pattern in cls.FORBIDDEN_CONTROL_PATTERNS:
                if pattern.search(full_text):
                    return False, f"Memory rejected: Detected unauthorized policy override attempt ({pattern.pattern})", None

        # 2. Source-Authority mismatch check: External/System sources cannot claim USER_EXPLICIT authority
        if source == MemorySource.SYSTEM_OBSERVED and confidence > 0.9:
            confidence = 0.8  # Cap system observations

        # 3. Sensitive Data Sanitization
        sanitized_content = SensitivityDetector.sanitize_dict(content)
        sanitized_summary = SensitivityDetector.sanitize_text(summary)

        # 4. If secrets remained unredactable in a sensitive classification without encryption, enforce privacy
        if SensitivityDetector.is_sensitive(full_text) and privacy not in [PrivacyClassification.SENSITIVE, PrivacyClassification.RESTRICTED]:
            privacy = PrivacyClassification.SENSITIVE

        return True, None, sanitized_content


class AuthorityHierarchy:
    """Enforces strict hierarchical precedence across system, user, and memory sources."""

    SOURCE_AUTHORITY_MAP = {
        MemorySource.USER_EXPLICIT: AuthorityLevel.USER_CONFIRMED_MEMORY,
        MemorySource.USER_CONFIRMED: AuthorityLevel.USER_CONFIRMED_MEMORY,
        MemorySource.WORKFLOW_RESULT: AuthorityLevel.HIGH_CONFIDENCE_MEMORY,
        MemorySource.EXECUTION_RESULT: AuthorityLevel.HIGH_CONFIDENCE_MEMORY,
        MemorySource.DOCUMENT: AuthorityLevel.UNCONFIRMED_MEMORY,
        MemorySource.RAG: AuthorityLevel.UNCONFIRMED_MEMORY,
        MemorySource.SYSTEM_OBSERVED: AuthorityLevel.UNCONFIRMED_MEMORY,
    }

    @classmethod
    def get_authority_level(cls, source: MemorySource, confirmed: bool = False) -> AuthorityLevel:
        """Resolve authority level from memory source and confirmation state."""
        if confirmed:
            return AuthorityLevel.USER_CONFIRMED_MEMORY
        return cls.SOURCE_AUTHORITY_MAP.get(source, AuthorityLevel.UNCONFIRMED_MEMORY)

    @classmethod
    def can_override(cls, candidate_level: AuthorityLevel, target_level: AuthorityLevel) -> bool:
        """Return True if candidate authority level is strictly higher than target."""
        return candidate_level.value > target_level.value

    @classmethod
    def verify_memory_against_policy(cls, memory: MemoryContract) -> Tuple[bool, Optional[str]]:
        """Verify that memory record does not purport to supersede system policy."""
        # Check summary and content for safety override flags
        text = f"{memory.summary} {str(memory.content)}"
        for pattern in MemoryWritePolicy.FORBIDDEN_CONTROL_PATTERNS:
            if pattern.search(text):
                return False, f"Memory violates policy hierarchy: Cannot contain security overrides."
        return True, None

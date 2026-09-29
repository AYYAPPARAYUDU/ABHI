"""Phase 8 Stage 8.1 — Media Content Safety & Prompt Security Policy Gate.

Governs:
- Pre-generation local safety classification (SAFE, SUSPICIOUS, BLOCKED)
- Prompt/Task Separation & Prompt Injection Neutralization
- Multilingual Prompt Text Normalization (English, Telugu, Hindi, Tamil)
- Sensitive Prompt Content Redaction for Logs and Telemetry
"""

import re
import unicodedata
from typing import Dict, List, Optional, Tuple, Any
from backend.app.core.logging import logger


class MediaSafetyPolicyResult:
    """Result of media prompt safety screening."""
    def __init__(
        self,
        is_allowed: bool,
        risk_category: str = "SAFE",
        sanitized_prompt: str = "",
        redacted_summary: str = "",
        policy_violations: Optional[List[str]] = None,
        detected_injection_attempt: bool = False
    ):
        self.is_allowed = is_allowed
        self.risk_category = risk_category
        self.sanitized_prompt = sanitized_prompt
        self.redacted_summary = redacted_summary
        self.policy_violations = policy_violations or []
        self.detected_injection_attempt = detected_injection_attempt

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_allowed": self.is_allowed,
            "risk_category": self.risk_category,
            "policy_violations": self.policy_violations,
            "detected_injection_attempt": self.detected_injection_attempt,
            "redacted_summary": self.redacted_summary,
        }


class MediaSafetyGate:
    """Local pre-generation content safety and prompt sanitization filter."""

    # Explicit blocked high-harm patterns (CSAM, severe violence, weapons of mass destruction, malware code payload)
    BLOCKED_PATTERNS = [
        r"\b(child\s+abuse|csam|child\s+sexual)\b",
        r"\b(build\s+a\s+bomb|synthesize\s+ricin|bioweapon)\b",
    ]

    # Prompt injection signatures attempting to escape image generation context
    PROMPT_INJECTION_PATTERNS = [
        r"(?i)ignore\s+(all\s+)?(previous\s+)?(instructions|rules|security|safeguards)",
        r"(?i)system\s*:\s*you\s+are\s+now",
        r"(?i)run\s+command\s*:\s*.*",
        r"(?i)(powershell|cmd\.exe|bash|sh|rmdir|del\s+/f|format\s+c:)",
        r"(?i)execute\s+(shell|script|terminal|python|code)",
        r"(?i)override\s+(policy|consent|permissions|authorization)",
    ]

    # Sensitive personal data regexes for summary redaction
    SENSITIVE_PATTERNS = [
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",  # Email
        r"\b(?:\d{4}[-\s]?){3}\d{4}\b",                          # Credit card
        r"\b\d{3}-\d{2}-\d{4}\b",                                # SSN
        r"\b(?:password|passwd|api[_-]?key|secret|token)\s*[:=]\s*\S+", # Credentials
    ]

    def __init__(self):
        self._blocked_regexes = [re.compile(p, re.IGNORECASE) for p in self.BLOCKED_PATTERNS]
        self._injection_regexes = [re.compile(p, re.IGNORECASE) for p in self.PROMPT_INJECTION_PATTERNS]
        self._sensitive_regexes = [re.compile(p, re.IGNORECASE) for p in self.SENSITIVE_PATTERNS]

    def normalize_prompt(self, prompt: str) -> str:
        """Normalize Unicode text across English, Telugu, Hindi, Tamil and strip control chars."""
        if not prompt:
            return ""
        # Unicode NFC normalization preserves Indic characters (Telugu, Hindi, Tamil scripts)
        normalized = unicodedata.normalize("NFC", prompt)
        # Remove dangerous control characters (null bytes, carriage injection, ANSI escape codes)
        sanitized = "".join(ch for ch in normalized if ch == '\n' or ch == '\t' or (ord(ch) >= 32 and ord(ch) != 127))
        return sanitized.strip()

    def create_redacted_summary(self, prompt: str, max_length: int = 120) -> str:
        """Generate a safe, redacted summary of prompt for public UI and log outputs."""
        if not prompt:
            return ""
        summary = prompt
        for regex in self._sensitive_regexes:
            summary = regex.sub("[REDACTED]", summary)

        summary = summary.replace("\n", " ").replace("\r", " ").strip()
        if len(summary) > max_length:
            summary = summary[:max_length] + "..."
        return summary

    def screen_prompt(self, prompt: str, negative_prompt: Optional[str] = None) -> MediaSafetyPolicyResult:
        """Screen input prompts for safety, policy compliance, and prompt injections."""
        norm_prompt = self.normalize_prompt(prompt)
        norm_neg = self.normalize_prompt(negative_prompt or "")
        combined = f"{norm_prompt} {norm_neg}".strip()

        if not norm_prompt:
            return MediaSafetyPolicyResult(
                is_allowed=False,
                risk_category="BLOCKED",
                policy_violations=["Prompt cannot be empty"],
                sanitized_prompt="",
                redacted_summary=""
            )

        # 1. Check severe harm patterns
        violations = []
        for regex in self._blocked_regexes:
            if regex.search(combined):
                violations.append("Content violates core safety policy")
                logger.warning(f"MediaSafetyGate: Blocked prompt matched policy rule: {regex.pattern}")
                return MediaSafetyPolicyResult(
                    is_allowed=False,
                    risk_category="BLOCKED",
                    sanitized_prompt="",
                    redacted_summary="[BLOCKED POLICY VIOLATION]",
                    policy_violations=violations
                )

        # 2. Check prompt injection attempts
        detected_injection = False
        for regex in self._injection_regexes:
            if regex.search(combined):
                detected_injection = True
                logger.info(f"MediaSafetyGate: Neutralized prompt injection pattern: {regex.pattern}")
                # Important: Treat prompt strictly as data text - do NOT execute or pass to supervisor tools
                break

        redacted_summary = self.create_redacted_summary(norm_prompt)
        risk_category = "SUSPICIOUS" if detected_injection else "SAFE"

        return MediaSafetyPolicyResult(
            is_allowed=True,
            risk_category=risk_category,
            sanitized_prompt=norm_prompt,
            redacted_summary=redacted_summary,
            policy_violations=[],
            detected_injection_attempt=detected_injection
        )


# Global singleton instance
media_safety_gate = MediaSafetyGate()

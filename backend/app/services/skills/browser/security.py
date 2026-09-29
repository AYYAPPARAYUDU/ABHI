"""Phase 7 Stage 7.3 — Advanced Browser Security, URL Canonicalization & Prompt Injection Defense."""

import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import urlparse, urlunparse

from backend.app.core.logging import logger
from backend.app.services.skills.browser.models import (
    BrowserSecurityEvent,
    BrowserSecurityEventType,
    TrustClassification
)


class BrowserSecurityEngine:
    """Hardened security engine enforcing URL canonicalization, origin boundaries, and prompt injection defense."""

    # Prohibited dangerous schemes
    DISALLOWED_SCHEMES: Set[str] = {
        "javascript", "file", "data", "ftp", "about", "vbscript",
        "blob", "ws", "wss", "chrome", "edge", "view-source"
    }

    # Prohibited executable extensions for downloaded files
    EXECUTABLE_EXTENSIONS: Set[str] = {
        ".exe", ".bat", ".cmd", ".ps1", ".vbs", ".js", ".msi",
        ".scr", ".pif", ".com", ".hta", ".cpl", ".wsf", ".sh",
        ".jar", ".vbe", ".jse", ".reg"
    }

    # Prompt injection detection signatures
    PROMPT_INJECTION_PATTERNS: List[re.Pattern] = [
        re.compile(r"(?i)\b(?:ignore\s+(?:all\s+)?(?:previous\s+)?(?:instructions|commands|prompts|rules)|disregard\s+(?:all\s+)?(?:previous|prior))\b"),
        re.compile(r"(?i)\b(?:system\s+(?:message|instruction|directive|prompt)|new\s+system\s+instruction)\b"),
        re.compile(r"(?i)\b(?:open\s+(?:a\s+)?(?:terminal|powershell|cmd|bash|console)|run\s+(?:a\s+)?(?:shell|bash|powershell|command))\b"),
        re.compile(r"(?i)\b(?:upload\s+(?:all\s+)?(?:local\s+)?(?:files?|ssh|keys?|credentials?|secrets?|passwords?|\.env))\b"),
        re.compile(r"(?i)\b(?:exfiltrate|send\s+(?:all\s+)?(?:data|tokens?|cookies?|secrets?)\s+to)\b"),
        re.compile(r"(?i)\b(?:you\s+are\s+now\s+(?:unconstrained|jailbroken|in\s+developer\s+mode|dan\s+mode))\b"),
        re.compile(r"(?i)\b(?:bypass\s+(?:safety|policy|consent|emergency\s+stop))\b"),
    ]

    # Sensitive credential field indicators
    SENSITIVE_FIELD_TOKENS: Set[str] = {
        "password", "passwd", "passcode", "pin", "cvv", "cvc",
        "card_number", "creditcard", "debitcard", "secret",
        "api_key", "apikey", "auth_token", "authtoken", "otp",
        "private_key", "ssn", "token"
    }

    def __init__(self, allowed_origins: Optional[List[str]] = None, download_dir: Optional[Path] = None):
        self.allowed_origins: List[str] = allowed_origins or [
            "http://localhost", "http://127.0.0.1", "https://localhost", "https://127.0.0.1",
            "https://docs.python.org", "http://docs.python.org"
        ]
        self.download_dir: Path = download_dir or (Path(__file__).resolve().parent.parent.parent.parent.parent / "database" / "downloads")
        self.download_dir.mkdir(parents=True, exist_ok=True)
        self._security_events: List[BrowserSecurityEvent] = []

    def record_security_event(self, event_type: BrowserSecurityEventType, details: Dict[str, Any], severity: str = "MEDIUM") -> BrowserSecurityEvent:
        """Log and store a structured browser security event."""
        evt = BrowserSecurityEvent(
            event_type=event_type,
            details=details,
            severity=severity
        )
        self._security_events.append(evt)
        logger.warning(f"[BrowserSecurity] {event_type.value} [{severity}]: {details}")
        return evt

    def get_security_events(self) -> List[BrowserSecurityEvent]:
        """Return recorded security events stream."""
        return list(self._security_events)

    def clear_security_events(self) -> None:
        """Clear security event history."""
        self._security_events.clear()

    def canonicalize_url(self, url: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """Validate and canonicalize a target URL with strict scheme, userinfo, and host parsing."""
        if not url or not isinstance(url, str):
            return False, None, "URL must be a non-empty string."

        trimmed = url.strip()
        try:
            parsed = urlparse(trimmed)
        except Exception as e:
            return False, None, f"Malformed URL: {e}"

        scheme = (parsed.scheme or "").lower()

        # 1. Scheme Validation
        if scheme in self.DISALLOWED_SCHEMES:
            self.record_security_event(
                BrowserSecurityEventType.BROWSER_ORIGIN_DENIED,
                {"url": trimmed, "reason": f"Disallowed scheme: {scheme}"},
                severity="HIGH"
            )
            return False, None, f"Prohibited URL scheme '{scheme}'. Only http and https are permitted."

        if scheme not in ["http", "https"]:
            return False, None, f"Invalid URL scheme '{scheme}'. Scheme must be http or https."

        # 2. Userinfo / Credential Embedding Check
        if parsed.username or parsed.password:
            self.record_security_event(
                BrowserSecurityEventType.BROWSER_ORIGIN_DENIED,
                {"url": trimmed, "reason": "Credential-bearing userinfo URL detected"},
                severity="HIGH"
            )
            return False, None, "Credential-bearing userinfo URLs (user:pass@host) are strictly prohibited."

        # 3. Hostname Collision / Subdomain Hijack Check
        hostname = (parsed.hostname or "").lower()
        if not hostname:
            return False, None, "URL missing valid hostname."

        # Detect malicious tricks like localhost.attacker.com or 127.0.0.1.attacker.com
        if ("localhost." in hostname and hostname != "localhost") or ("127.0.0.1." in hostname and hostname != "127.0.0.1"):
            self.record_security_event(
                BrowserSecurityEventType.BROWSER_ORIGIN_DENIED,
                {"url": trimmed, "hostname": hostname, "reason": "Host collision / deceptive localhost spoofing"},
                severity="HIGH"
            )
            return False, None, f"Host collision detected for deceptive hostname '{hostname}'."

        # Reconstruct clean canonical URL
        port_str = f":{parsed.port}" if parsed.port and (
            (scheme == "http" and parsed.port != 80) or (scheme == "https" and parsed.port != 443)
        ) else ""

        canonical = urlunparse((
            scheme,
            f"{hostname}{port_str}",
            parsed.path or "/",
            parsed.params,
            parsed.query,
            parsed.fragment
        ))

        return True, canonical, None

    def validate_origin(self, url: str, allowed_origins: Optional[List[str]] = None) -> Tuple[bool, Optional[str]]:
        """Check if URL origin matches permitted local-first or user-configured origins."""
        ok, canonical, err = self.canonicalize_url(url)
        if not ok or not canonical:
            return False, err

        origins_to_check = allowed_origins if allowed_origins is not None else self.allowed_origins
        
        # If unrestricted web mode is enabled by wildcard "*", allow all canonical HTTP/S
        if "*" in origins_to_check:
            return True, None

        parsed = urlparse(canonical)
        origin_with_port = f"{parsed.scheme}://{parsed.hostname}" + (f":{parsed.port}" if parsed.port else "")
        origin_base = f"{parsed.scheme}://{parsed.hostname}"

        for allowed in origins_to_check:
            allowed_clean = allowed.rstrip("/")
            if origin_with_port == allowed_clean or origin_base == allowed_clean:
                return True, None
            # Allow wildcard port for localhost / 127.0.0.1 in testing
            if ("localhost" in allowed_clean or "127.0.0.1" in allowed_clean) and (
                parsed.hostname in ["localhost", "127.0.0.1"]
            ):
                return True, None

        self.record_security_event(
            BrowserSecurityEventType.BROWSER_ORIGIN_DENIED,
            {"url": canonical, "origin": origin_with_port, "allowed": origins_to_check},
            severity="MEDIUM"
        )
        return False, f"Origin '{origin_with_port}' is not permitted by browser origin policy."

    def validate_redirect(self, from_url: str, to_url: str, allowed_origins: Optional[List[str]] = None) -> Tuple[bool, Optional[str]]:
        """Verify that a page redirect does not escape into unapproved origins."""
        ok, canonical_to, err = self.canonicalize_url(to_url)
        if not ok or not canonical_to:
            self.record_security_event(
                BrowserSecurityEventType.BROWSER_REDIRECT_DENIED,
                {"from_url": from_url, "to_url": to_url, "reason": err},
                severity="HIGH"
            )
            return False, f"Redirect to invalid URL '{to_url}': {err}"

        origin_ok, origin_err = self.validate_origin(canonical_to, allowed_origins=allowed_origins)
        if not origin_ok:
            self.record_security_event(
                BrowserSecurityEventType.BROWSER_REDIRECT_DENIED,
                {"from_url": from_url, "to_url": canonical_to, "reason": origin_err},
                severity="HIGH"
            )
            return False, f"Redirect to unapproved origin denied: {origin_err}"

        return True, None

    def detect_prompt_injection(self, content: str) -> Tuple[bool, List[str]]:
        """Screen web content, metadata, ARIA labels, or OCR text for indirect prompt injection attempts."""
        if not content or not isinstance(content, str):
            return False, []

        matches: List[str] = []
        for pat in self.PROMPT_INJECTION_PATTERNS:
            found = pat.findall(content)
            if found:
                for f in found:
                    matches.append(f.strip() if isinstance(f, str) else str(f))

        if matches:
            self.record_security_event(
                BrowserSecurityEventType.BROWSER_PROMPT_INJECTION_DETECTED,
                {"matches_count": len(matches), "snippets": matches[:3]},
                severity="HIGH"
            )
            return True, matches

        return False, []

    def is_sensitive_field(
        self,
        field_name: str = "",
        field_type: str = "",
        placeholder: str = "",
        label: str = "",
        aria_label: str = ""
    ) -> bool:
        """Determine whether an input control represents sensitive credential or financial information."""
        if (field_type or "").lower() == "password":
            return True

        combined = f"{field_name} {field_type} {placeholder} {label} {aria_label}".lower()
        for token in self.SENSITIVE_FIELD_TOKENS:
            if re.search(rf"\b{token}\b", combined) or token in field_name.lower():
                return True

        return False

    def sanitize_download_filename(self, raw_filename: str) -> Tuple[bool, Path, str]:
        """Sanitize target download path within sandboxed directory and check for executable threats."""
        if not raw_filename:
            raw_filename = "downloaded_file.txt"

        # Strip directory traversal characters
        base_name = os.path.basename(raw_filename.replace("\\", "/"))
        # Replace dangerous characters
        sanitized_name = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', base_name)
        if not sanitized_name or sanitized_name.startswith("."):
            sanitized_name = f"download_{sanitized_name.lstrip('.')}" if sanitized_name else "downloaded_file.txt"

        target_path = (self.download_dir / sanitized_name).resolve()
        
        # Verify confinement to download_dir
        if not str(target_path).startswith(str(self.download_dir.resolve())):
            return False, target_path, "Path traversal attempt detected in download filename."

        ext = target_path.suffix.lower()
        is_exec = ext in self.EXECUTABLE_EXTENSIONS

        self.record_security_event(
            BrowserSecurityEventType.BROWSER_DOWNLOAD,
            {"filename": sanitized_name, "path": str(target_path), "is_executable": is_exec},
            severity="MEDIUM" if not is_exec else "HIGH"
        )

        return True, target_path, ""

    def enforce_content_limits(self, text: str, max_chars: int = 15000) -> Tuple[str, bool]:
        """Bound web text extraction to protect LLM context windows."""
        if not text:
            return "", False

        if len(text) > max_chars:
            truncated = text[:max_chars] + "\n... [CONTENT TRUNCATED: Exceeded character safety limit]"
            return truncated, True

        return text, False


# Global Singleton Security Engine
browser_security_engine = BrowserSecurityEngine()

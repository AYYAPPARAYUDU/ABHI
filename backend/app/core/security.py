"""Security Utilities, Ephemeral Session Management, Role-Based Authorization & Audit Logging."""

import os
import hmac
import hashlib
import json
import secrets
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, Set

from fastapi import Request, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response, JSONResponse

from backend.app.core.config import settings
from backend.app.core.logging import logger

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


class SecurityAuditLogger:
    """Audit logger recording security-critical events (auth, vault, emergency stop)."""

    def __init__(self):
        repo_root = Path(__file__).resolve().parents[3]
        self.log_dir = repo_root / "project_data" / "security"
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.audit_log_file = self.log_dir / "security_audit.log"

    def log_event(
        self,
        event_type: str,
        actor: str,
        endpoint: str,
        status: str,
        details: Optional[Dict[str, Any]] = None,
        client_ip: str = "127.0.0.1"
    ) -> None:
        """Record an immutable security event."""
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": event_type,
            "actor": actor,
            "client_ip": client_ip,
            "endpoint": endpoint,
            "status": status,
            "details": details or {}
        }
        try:
            with open(self.audit_log_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry) + "\n")
        except Exception as e:
            logger.error(f"Failed to write security audit log: {e}")


security_audit = SecurityAuditLogger()


class SessionManager:
    """Ephemeral in-memory session manager for local frontend/companion authentication."""

    def __init__(self):
        # Maps token -> {"role": str, "created_at": float, "expires_at": float, "client_ip": str}
        self._sessions: Dict[str, Dict[str, Any]] = {}

    def create_session(
        self,
        role: str = "OPERATOR",
        ttl_seconds: float = 86400.0,
        client_ip: str = "127.0.0.1"
    ) -> str:
        token = "abhi_sess_" + secrets.token_urlsafe(32)
        now = time.time()
        self._sessions[token] = {
            "role": role,
            "created_at": now,
            "expires_at": now + ttl_seconds,
            "client_ip": client_ip
        }
        # Prune expired sessions
        self._prune()
        return token

    def validate_session(self, token: Optional[str]) -> Optional[str]:
        """Validate session token and return role if valid, else None."""
        if not token or not token.startswith("abhi_sess_"):
            return None
        sess = self._sessions.get(token)
        if not sess:
            return None
        if time.time() > sess["expires_at"]:
            del self._sessions[token]
            return None
        return sess.get("role")

    def revoke_session(self, token: str) -> bool:
        if token in self._sessions:
            del self._sessions[token]
            return True
        return False

    def _prune(self) -> None:
        now = time.time()
        expired = [k for k, v in self._sessions.items() if now > v["expires_at"]]
        for k in expired:
            del self._sessions[k]


session_manager = SessionManager()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds standard security headers to all HTTP responses."""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self' http://localhost:4200 http://127.0.0.1:4200; "
            "script-src 'self' 'unsafe-eval' 'unsafe-inline' http://localhost:4200 http://127.0.0.1:4200; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "img-src 'self' data: blob: http://localhost:8000 http://127.0.0.1:8000; "
            "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 ws://localhost:8000 ws://127.0.0.1:8000;"
        )
        return response


class LocalAuthMiddleware(BaseHTTPMiddleware):
    """Protects sensitive endpoints against unauthorized or cross-origin execution."""

    # Public or informational endpoints that do not require an API key
    PUBLIC_PATHS = {
        "/",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/api/v1/health",
        "/api/v1/runtime/status",
        "/api/v1/auth/bootstrap",
        "/api/v1/auth/verify-passcode",
    }

    # High-privilege endpoints requiring verified OPERATOR key or active session
    HIGH_PRIVILEGE_PREFIXES = (
        "/api/v1/business/vault",
        "/api/v1/tasks/emergency-stop",
        "/api/v1/tasks/emergency-reset",
        "/api/v1/automation",
    )

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Always allow CORS pre-flight OPTIONS requests
        if request.method == "OPTIONS":
            return await call_next(request)

        # Allow public documentation and health check endpoints
        if path in self.PUBLIC_PATHS or path.startswith("/docs") or path.startswith("/openapi"):
            return await call_next(request)

        # Extract token from header, Authorization Bearer, or cookie
        token = request.headers.get("X-API-Key")
        if not token:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:].strip()
        if not token:
            token = request.cookies.get("abhi_session")

        client_host = request.client.host if request.client else "unknown"
        is_loopback = client_host in ("127.0.0.1", "localhost", "::1", "testclient")

        # Check for revoked / compromised keys
        if token and token in settings.COMPROMISED_KEYS:
            security_audit.log_event(
                event_type="COMPROMISED_KEY_REJECTED",
                actor="unknown",
                endpoint=path,
                status="BLOCKED",
                details={"client_ip": client_host, "reason": "Attempted use of blacklisted revoked credential"},
                client_ip=client_host
            )
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Unauthorized: Revoked or compromised key rejected."}
            )

        # Fail-safe emergency kill-switch: Local loopback callers can ALWAYS trip emergency stop without barrier
        if path == "/api/v1/tasks/emergency-stop" and is_loopback:
            return await call_next(request)

        # Verify authentication
        is_authenticated = False
        role = None

        if token:
            if hmac.compare_digest(token, settings.LOCAL_API_KEY):
                is_authenticated = True
                role = "OPERATOR"
            else:
                session_role = session_manager.validate_session(token)
                if session_role:
                    is_authenticated = True
                    role = session_role

        if settings.API_AUTH_ENABLED:
            # High privilege endpoints ALWAYS require verified OPERATOR privileges
            if any(path.startswith(prefix) for prefix in self.HIGH_PRIVILEGE_PREFIXES):
                if not is_authenticated or role != "OPERATOR":
                    security_audit.log_event(
                        event_type="UNAUTHORIZED_HIGH_PRIVILEGE_ACCESS",
                        actor="unknown",
                        endpoint=path,
                        status="DENIED",
                        details={"client_ip": client_host, "reason": "Missing or insufficient operator session"},
                        client_ip=client_host
                    )
                    return JSONResponse(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        content={"detail": "Unauthorized: Valid Operator session or key required for high-privilege operations"}
                    )

            # For non-loopback connections, enforce authentication on ALL endpoints
            elif not is_loopback and not is_authenticated:
                security_audit.log_event(
                    event_type="REMOTE_ACCESS_DENIED",
                    actor="remote",
                    endpoint=path,
                    status="DENIED",
                    details={"client_ip": client_host},
                    client_ip=client_host
                )
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"detail": "Forbidden: Remote API access is restricted"}
                )

        return await call_next(request)


def verify_operator_access(request: Request) -> str:
    """Dependency helper to verify operator-level authorization via master key or session."""
    token = request.headers.get("X-API-Key")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:].strip()
    if not token:
        token = request.cookies.get("abhi_session")

    client_host = request.client.host if request.client else "unknown"

    # Reject compromised keys
    if token and token in settings.COMPROMISED_KEYS:
        security_audit.log_event(
            event_type="COMPROMISED_KEY_OPERATOR_ACCESS_BLOCKED",
            actor="unknown",
            endpoint=request.url.path,
            status="BLOCKED",
            client_ip=client_host
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Revoked or compromised key rejected."
        )

    # Check master API key
    if token and hmac.compare_digest(token, settings.LOCAL_API_KEY):
        return "OPERATOR"

    # Check active session token
    if token and session_manager.validate_session(token) == "OPERATOR":
        return "OPERATOR"

    security_audit.log_event(
        event_type="OPERATOR_AUTH_FAILED",
        actor="unknown",
        endpoint=request.url.path,
        status="DENIED",
        client_ip=client_host
    )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Valid operator authorization key or active session required."
    )

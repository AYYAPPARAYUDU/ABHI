"""Authentication, Ephemeral Session Handshake & Operator Passcode Endpoints."""

import hmac
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, HTTPException, Response, status
from pydantic import BaseModel, Field

from backend.app.core.config import settings
from backend.app.core.security import session_manager, security_audit

router = APIRouter(prefix="/auth", tags=["Local Authentication & Session Handshake"])


class PasscodeVerifyRequest(BaseModel):
    passcode: str = Field(..., min_length=1, description="Operator authorization passcode or master key")


class SessionResponse(BaseModel):
    status: str
    session_token: str
    role: str
    expires_in_seconds: int = 86400


@router.post("/bootstrap", response_model=SessionResponse)
async def bootstrap_local_session(request: Request, response: Response):
    """Secure loopback session bootstrap for authorized local frontend origins."""
    client_host = request.client.host if request.client else "unknown"
    is_loopback = client_host in ("127.0.0.1", "localhost", "::1", "testclient")
    origin = request.headers.get("origin", "")

    # Origin and host validation
    is_allowed_origin = (not origin) or any(origin.startswith(o) for o in settings.CORS_ORIGINS)

    if not is_loopback or not is_allowed_origin:
        security_audit.log_event(
            event_type="BOOTSTRAP_DENIED_UNTRUSTED_HOST",
            actor="untrusted",
            endpoint="/api/v1/auth/bootstrap",
            status="DENIED",
            details={"client_ip": client_host, "origin": origin},
            client_ip=client_host
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Session bootstrap is restricted to verified local origins."
        )

    # Issue ephemeral local session token
    token = session_manager.create_session(role="OPERATOR", ttl_seconds=86400.0, client_ip=client_host)

    # Set secure HttpOnly cookie for loopback
    response.set_cookie(
        key="abhi_session",
        value=token,
        max_age=86400,
        httponly=True,
        samesite="strict",
        secure=False  # HTTP on local dev port 4200/8000
    )

    security_audit.log_event(
        event_type="SESSION_BOOTSTRAPPED",
        actor="OPERATOR",
        endpoint="/api/v1/auth/bootstrap",
        status="SUCCESS",
        details={"client_ip": client_host},
        client_ip=client_host
    )

    return SessionResponse(
        status="AUTHENTICATED",
        session_token=token,
        role="OPERATOR",
        expires_in_seconds=86400
    )


@router.post("/verify-passcode", response_model=SessionResponse)
async def verify_passcode(payload: PasscodeVerifyRequest, request: Request, response: Response):
    """Verify operator passcode without leaking secrets to client."""
    client_host = request.client.host if request.client else "unknown"
    code = payload.passcode.strip()

    # Reject revoked / compromised keys immediately
    if code in settings.COMPROMISED_KEYS:
        security_audit.log_event(
            event_type="REVOKED_PASSCODE_ATTEMPT",
            actor="unknown",
            endpoint="/api/v1/auth/verify-passcode",
            status="BLOCKED",
            client_ip=client_host
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid operator credentials."
        )

    # Verify against rotated master key or app secret key
    is_valid = (
        hmac.compare_digest(code, settings.LOCAL_API_KEY)
        or hmac.compare_digest(code, settings.APP_SECRET_KEY)
    )

    if not is_valid:
        security_audit.log_event(
            event_type="PASSCODE_VERIFICATION_FAILED",
            actor="unknown",
            endpoint="/api/v1/auth/verify-passcode",
            status="DENIED",
            client_ip=client_host
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid operator credentials."
        )

    # Issue elevated session token
    token = session_manager.create_session(role="OPERATOR", ttl_seconds=86400.0, client_ip=client_host)
    response.set_cookie(
        key="abhi_session",
        value=token,
        max_age=86400,
        httponly=True,
        samesite="strict",
        secure=False
    )

    security_audit.log_event(
        event_type="OPERATOR_PASSCODE_VERIFIED",
        actor="OPERATOR",
        endpoint="/api/v1/auth/verify-passcode",
        status="SUCCESS",
        client_ip=client_host
    )

    return SessionResponse(
        status="AUTHENTICATED",
        session_token=token,
        role="OPERATOR",
        expires_in_seconds=86400
    )


@router.get("/session")
async def get_session_info(request: Request):
    """Check current session authentication state."""
    token = request.headers.get("X-API-Key")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
    if not token:
        token = request.cookies.get("abhi_session")

    role = session_manager.validate_session(token)
    if not role and token and hmac.compare_digest(token, settings.LOCAL_API_KEY):
        role = "OPERATOR"

    if role:
        return {"authenticated": True, "role": role}
    return {"authenticated": False, "role": None}

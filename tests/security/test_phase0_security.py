"""Stage B Phase 0 — Comprehensive Security & Safety Test Suite.

Verifies:
1. CORS origin allowlisting (allowed vs blocked origins).
2. API authentication & permission boundaries.
3. Vault encryption, zero disk plaintext & credential masking.
4. Biometric bypass removal & zero secret leaks.
5. Deterministic Emergency Stop pathway, lease revocation & task lockout.
6. Re-arm / emergency reset with operator authorization.
7. Security audit event emission.
"""

import os
import json
from pathlib import Path
import pytest
from starlette.testclient import TestClient

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.business.credential_vault import credential_vault
from backend.app.perception.vision.face_tracker import face_tracker
from backend.app.automation.orchestration.orchestrator import supervisor_orchestrator
from backend.app.cognitive.supervisor.supervisor import central_supervisor
from backend.app.automation.leases.lease_manager import lease_manager, AutomationLease
from backend.app.automation.models.errors import AutomationError, AutomationErrorCode, AutomationException

client = TestClient(app, base_url="http://testserver")


# =========================================================================
# 1. CORS ALLOWLISTING TESTS
# =========================================================================

def test_cors_allowed_local_origin():
    """Verify that requests from http://localhost:4200 receive CORS allow header."""
    headers = {
        "Origin": "http://localhost:4200",
        "Access-Control-Request-Method": "GET"
    }
    response = client.options("/api/v1/health", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:4200"


def test_cors_blocked_malicious_origin():
    """Verify that wildcard CORS is removed and arbitrary external origins are not reflected."""
    headers = {
        "Origin": "https://malicious-attacker-website.com",
        "Access-Control-Request-Method": "GET"
    }
    response = client.options("/api/v1/health", headers=headers)
    # The header should NOT reflect the malicious origin
    allow_origin = response.headers.get("access-control-allow-origin")
    assert allow_origin != "https://malicious-attacker-website.com"


# =========================================================================
# 2. API AUTHENTICATION & ACCESS CONTROL TESTS
# =========================================================================

def test_public_endpoint_accessible_without_auth():
    """Public endpoints such as /api/v1/health must remain accessible without API key."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_vault_endpoint_unauthorized_without_key():
    """Accessing /api/v1/business/vault/credentials without API key must return 401."""
    response = client.get("/api/v1/business/vault/credentials")
    assert response.status_code == 401
    assert "Unauthorized" in response.json()["detail"]


def test_vault_endpoint_unauthorized_with_wrong_key():
    """Accessing /api/v1/business/vault/credentials with invalid key must return 401."""
    response = client.get(
        "/api/v1/business/vault/credentials",
        headers={"X-API-Key": "completely_invalid_key_12345"}
    )
    assert response.status_code == 401


def test_vault_endpoint_authorized_with_local_key():
    """Accessing /api/v1/business/vault/credentials with valid LOCAL_API_KEY must succeed."""
    response = client.get(
        "/api/v1/business/vault/credentials",
        headers={"X-API-Key": settings.LOCAL_API_KEY}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_compromised_keys_are_blacklisted_and_rejected():
    """All revoked / compromised keys must be rejected unconditionally."""
    for bad_key in settings.COMPROMISED_KEYS:
        res = client.get(
            "/api/v1/business/vault/credentials",
            headers={"X-API-Key": bad_key}
        )
        assert res.status_code == 401, f"Compromised key '{bad_key}' was not rejected!"


def test_session_bootstrap_handshake_and_authentication():
    """Loopback client can bootstrap session and use session token to authenticate."""
    res = client.post(
        "/api/v1/auth/bootstrap",
        headers={"Origin": "http://localhost:4200"}
    )
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "AUTHENTICATED"
    session_token = body["session_token"]
    assert session_token.startswith("abhi_sess_")

    # Access vault using newly bootstrapped session token
    vault_res = client.get(
        "/api/v1/business/vault/credentials",
        headers={"X-API-Key": session_token}
    )
    assert vault_res.status_code == 200


def test_passcode_verification_issues_session():
    """Passcode verification authenticates operator and issues elevated session token."""
    res = client.post(
        "/api/v1/auth/verify-passcode",
        json={"passcode": settings.LOCAL_API_KEY}
    )
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "AUTHENTICATED"
    assert body["session_token"].startswith("abhi_sess_")


def test_frontend_compiled_bundles_contain_no_secrets():
    """Verify built JavaScript files in dist contain no literal API keys or bypass passwords."""
    dist_dir = Path(__file__).resolve().parents[2] / "frontend" / "dist" / "frontend"
    if not dist_dir.exists():
        pytest.skip("Frontend dist directory not yet built")

    js_files = list(dist_dir.glob("**/*.js"))
    assert len(js_files) > 0, "No compiled JS files found to audit!"

    forbidden_patterns = [
        "abhi_local_secure_key_2026_operator_mamu",
        settings.LOCAL_API_KEY,
        "Master Password is 143",
        "Master Password (143)"
    ]

    for js_file in js_files:
        content = js_file.read_text(encoding="utf-8", errors="ignore")
        for forbidden in forbidden_patterns:
            assert forbidden not in content, f"Secret/backdoor '{forbidden}' leaked into compiled bundle {js_file.name}!"


# =========================================================================
# 3. VAULT ENCRYPTION & CREDENTIAL EXPOSURE PREVENTION
# =========================================================================

def test_vault_no_plaintext_on_disk():
    """Ensure no unencrypted credentials_vault.json exists in project_data/security."""
    repo_root = Path(__file__).resolve().parents[2]
    plaintext_file = repo_root / "project_data" / "security" / "credentials_vault.json"
    encrypted_file = repo_root / "project_data" / "security" / "credentials_vault.enc"

    assert not plaintext_file.exists(), "Plaintext credentials_vault.json MUST NOT exist on disk!"
    assert encrypted_file.exists(), "Encrypted credentials_vault.enc must exist on disk!"


def test_vault_list_masks_all_secrets():
    """Listing credentials must unconditionally mask secret values."""
    creds = credential_vault.list_credentials()
    for cred in creds:
        secret = cred["secret_value"]
        assert "••••" in secret, f"Secret not masked in credential {cred['id']}: {secret}"


def test_vault_single_reveal_authorized_and_audited():
    """Revealing single secret requires operator authorization and writes audit log."""
    res = client.get(
        "/api/v1/business/vault/credentials/cred_sbi_primary?reveal=true",
        headers={"X-API-Key": settings.LOCAL_API_KEY}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["secret_value"] == "41130645649"

    # Verify audit log recorded the reveal
    audit_file = Path(__file__).resolve().parents[2] / "project_data" / "security" / "security_audit.log"
    assert audit_file.exists()
    with open(audit_file, "r", encoding="utf-8") as f:
        logs = f.readlines()
    assert any("VAULT_CREDENTIAL_REVEALED" in line and "cred_sbi_primary" in line for line in logs)


# =========================================================================
# 4. BIOMETRIC BYPASS REMOVAL TESTS
# =========================================================================

def test_biometric_removal_rejects_legacy_passwords():
    """Hardcoded passwords '143', 'admin', '1234', 'abhi' must be strictly rejected."""
    for bad_pwd in ["143", "abhi", "jarvis", "admin", "1234", "laxmi1"]:
        ok, msg = face_tracker.remove_enrolled_biometrics(master_password=bad_pwd)
        assert not ok, f"Bypass password '{bad_pwd}' was accepted!"
        assert "143" not in msg, f"Error message leaked master password: {msg}"
        assert "Authentication failed" in msg


def test_biometric_removal_accepts_valid_operator_key():
    """Valid operator API key allows biometric reset."""
    ok, msg = face_tracker.remove_enrolled_biometrics(master_password=settings.LOCAL_API_KEY)
    assert ok, f"Valid operator key was rejected: {msg}"
    assert "Face Lock removed" in msg


# =========================================================================
# 5. DETERMINISTIC EMERGENCY STOP & SAFETY LOCKOUT TESTS
# =========================================================================

@pytest.mark.asyncio
async def test_emergency_stop_pathway_and_lease_revocation():
    """Emergency stop must revoke leases, halt tasks, and lock new automation."""
    # 1. Acquire an active lease
    lease = lease_manager.acquire_lease(
        task_id="test_task_safety_001",
        execution_id="exec_test_001",
        agent_id="agent_win"
    )
    assert lease is not None
    assert lease_manager.get_lease(lease.lease_id) is not None

    # 2. Invoke emergency stop via API
    res = client.post("/api/v1/tasks/emergency-stop?reason=Test_Open_Palm_Gesture")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "emergency_stopped"
    assert body["success"] is True
    assert body["lockout_active"] is True

    # 3. Verify all leases are revoked
    assert not lease.is_valid
    assert lease.revoked is True
    assert all(not l.is_valid for l in lease_manager._leases.values())

    # 4. Verify system is locked down
    assert supervisor_orchestrator.is_emergency_locked is True
    assert central_supervisor.is_emergency_locked is True

    # 5. Verify new task creation is blocked
    with pytest.raises(AutomationException) as exc_info:
        await supervisor_orchestrator.create_task("Open notepad")
    assert "locked in EMERGENCY_STOP state" in str(exc_info.value)

    with pytest.raises(RuntimeError) as exc_info2:
        await central_supervisor.submit_goal("Open browser")
    assert "EMERGENCY_STOP state" in str(exc_info2.value)


@pytest.mark.asyncio
async def test_emergency_reset_authorization_and_recovery():
    """Emergency reset requires operator auth, clears lockout, and re-arms execution."""
    # 1. Reset without authorization header must be rejected
    # Clear any cookies so unauthenticated request is truly unauthorized
    client.cookies.clear()
    res_unauth = client.post("/api/v1/tasks/emergency-reset")
    assert res_unauth.status_code == 401

    # 2. Reset with operator authorization
    res_auth = client.post(
        "/api/v1/tasks/emergency-reset",
        headers={"X-API-Key": settings.LOCAL_API_KEY}
    )
    assert res_auth.status_code == 200
    body = res_auth.json()
    assert body["status"] == "rearmed"
    assert body["lockout_active"] is False

    # 3. Verify lockout flags cleared
    assert supervisor_orchestrator.is_emergency_locked is False
    assert central_supervisor.is_emergency_locked is False

    # 4. Verify tasks can now be created normally
    task = await supervisor_orchestrator.create_task("Open notepad test post-reset")
    assert task is not None
    assert task.task_id.startswith("task_")


@pytest.mark.asyncio
async def test_emergency_stop_concurrency_and_repeated_stops():
    """Verify emergency stop is idempotent and immune to race conditions under repeated rapid calls."""
    import asyncio

    # Fire 5 concurrent emergency stops
    responses = await asyncio.gather(
        *(asyncio.to_thread(client.post, f"/api/v1/tasks/emergency-stop?reason=Rapid_Stop_{i}") for i in range(5))
    )
    for res in responses:
        assert res.status_code == 200
        assert res.json()["status"] == "emergency_stopped"
        assert res.json()["lockout_active"] is True

    assert supervisor_orchestrator.is_emergency_locked is True

    # Re-arm cleanly
    res_auth = client.post(
        "/api/v1/tasks/emergency-reset",
        headers={"X-API-Key": settings.LOCAL_API_KEY}
    )
    assert res_auth.status_code == 200


def test_revoked_lease_fails_closed_on_action_consumption():
    """Verify that any worker attempting to consume an action on a revoked lease is strictly blocked."""
    lease = lease_manager.acquire_lease(
        task_id="test_worker_task_fail_closed",
        execution_id="exec_fail_closed_001",
        agent_id="agent_windows"
    )
    lease.revoke(reason="Simulated emergency stop")

    # Attempt action consumption
    ok, err = lease_manager.consume_action(lease.lease_id, "action_click_001")
    assert not ok
    assert err is not None
    assert err.error_code == AutomationErrorCode.LEASE_REVOKED


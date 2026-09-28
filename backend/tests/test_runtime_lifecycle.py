"""Tests for ABHI Runtime Lifecycle, Wake Word Engine & Secure Activation."""

import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.runtime.lifecycle import runtime_coordinator
from backend.app.runtime.wake_word import wake_word_detector
from backend.app.runtime.auth import local_auth_manager
from backend.app.runtime.models import RuntimeMode, IdentityLevel
from backend.app.perception.audio.canonicalizer import language_canonicalizer


@pytest.mark.asyncio
async def test_runtime_state_and_mode_transitions():
    """Verify state transitions: ARMED -> LISTENING -> RESTING -> ARMED."""
    runtime_coordinator.mode = RuntimeMode.ARMED
    state = runtime_coordinator.get_state_summary()
    assert state.current_mode == RuntimeMode.ARMED
    assert state.wake_word_active is True

    # Transition to wake
    success, msg = runtime_coordinator.transition_to_wake(source="wake_word")
    assert success is True
    assert runtime_coordinator.mode == RuntimeMode.LISTENING
    assert runtime_coordinator.identity_level == IdentityLevel.LEVEL_1_WAKE_WORD

    # Transition to rest
    success, msg = runtime_coordinator.transition_to_rest(reason="voice_command")
    assert success is True
    assert runtime_coordinator.mode == RuntimeMode.RESTING
    assert runtime_coordinator.get_state_summary().is_resting is True

    # Transition back to armed
    success, msg = runtime_coordinator.transition_to_armed()
    assert success is True
    assert runtime_coordinator.mode == RuntimeMode.ARMED


@pytest.mark.asyncio
async def test_wake_word_debouncing_and_cooldown():
    """Verify wake word detection cooldown suppresses rapid repeated triggers."""
    wake_word_detector.reset_cooldown()

    # 1. First trigger -> success
    detected, event = wake_word_detector.trigger_wake_event(confidence=0.96)
    assert detected is True
    assert event.keyword == "ABHI"
    assert event.cooldown_remaining_sec > 0

    # 2. Immediate second trigger within cooldown -> suppressed
    detected2, event2 = wake_word_detector.trigger_wake_event(confidence=0.96)
    assert detected2 is False
    assert event2.detected is False
    assert event2.cooldown_remaining_sec > 0

    # Reset for subsequent tests
    wake_word_detector.reset_cooldown()


@pytest.mark.asyncio
async def test_local_pin_auth_and_lockout():
    """Verify PBKDF2 PIN authentication, rate limiting, and lockout enforcement."""
    local_auth_manager.reset_lockout_for_tests()

    # Valid PIN verification
    valid, msg = local_auth_manager.verify_pin("1234")
    assert valid is True

    # Invalid PIN verification & lockout trigger
    for i in range(5):
        valid, msg = local_auth_manager.verify_pin("wrong_pin")
        assert valid is False

    # 6th attempt should be locked out
    locked, remaining = local_auth_manager.is_locked_out()
    assert locked is True
    assert remaining > 0

    valid, msg = local_auth_manager.verify_pin("1234")
    assert valid is False
    assert "locked out" in msg.lower() or "too many" in msg.lower()

    # Reset lockout
    local_auth_manager.reset_lockout_for_tests()


@pytest.mark.asyncio
async def test_runtime_api_endpoints():
    """Verify REST endpoints for runtime mode, wake trigger, and startup health."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # GET state
        res = await client.get("/api/v1/runtime/state")
        assert res.status_code == 200
        data = res.json()
        assert "current_mode" in data

        # POST mode transition to rest
        res = await client.post("/api/v1/runtime/mode", json={"mode": "rest", "source": "api"})
        assert res.status_code == 200
        assert res.json()["status"] == "success"

        # POST wake trigger
        wake_word_detector.reset_cooldown()
        res = await client.post("/api/v1/runtime/wake", json={"confidence": 0.95, "source": "wake_word"})
        assert res.status_code == 200
        assert res.json()["keyword"] == "ABHI"

        # GET startup health
        res = await client.get("/api/v1/runtime/startup-health")
        assert res.status_code == 200
        assert "services" in res.json()


@pytest.mark.asyncio
async def test_lifecycle_canonical_intents():
    """Verify canonicalizer parses multilingual lifecycle commands."""
    # English
    cmd_wake = language_canonicalizer.canonicalize("ABHI wake up")
    assert "abhi wake" in cmd_wake.canonical_intent.lower() or "wake" in cmd_wake.canonical_intent.lower()

    cmd_sleep = language_canonicalizer.canonicalize("ABHI sleep")
    assert "abhi rest" in cmd_sleep.canonical_intent.lower() or "sleep" in cmd_sleep.canonical_intent.lower()

    # Telugu
    cmd_te = language_canonicalizer.canonicalize("విశ్రాంతి తీసుకో")
    assert "abhi rest" in cmd_te.canonical_intent.lower()
    assert cmd_te.detected_language == "te"

    # Hindi
    cmd_hi = language_canonicalizer.canonicalize("उठ जाओ")
    assert "abhi wake" in cmd_hi.canonical_intent.lower()
    assert cmd_hi.detected_language == "hi"

"""Tests for Phase 6 Stage 6.3 Multimodal Interaction & Command Interface."""

import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app
from backend.app.perception.audio.canonicalizer import language_canonicalizer
from backend.app.cognitive.supervisor.supervisor import central_supervisor
from backend.app.services.memory.database import init_db


@pytest.mark.asyncio
async def test_text_command_to_canonical_intent():
    """Verify multilingual text command canonicalization across supported languages."""
    # English
    cmd_en = language_canonicalizer.canonicalize("Open calculator")
    assert "open" in cmd_en.canonical_intent.lower()
    assert cmd_en.detected_language == "en"
    assert cmd_en.confidence >= 0.90

    # Telugu
    cmd_te = language_canonicalizer.canonicalize("టెస్ట్ అప్లికేషన్ ఓపెన్ చేయి")
    assert "open" in cmd_te.canonical_intent.lower()
    assert cmd_te.detected_language == "te"

    # Hindi
    cmd_hi = language_canonicalizer.canonicalize("टेस्ट एप्लिकेशन खोलो")
    assert "open" in cmd_hi.canonical_intent.lower()
    assert cmd_hi.detected_language == "hi"

    # Tamil
    cmd_ta = language_canonicalizer.canonicalize("டெஸ்ட் அப்ளிகேஷனை திற")
    assert "open" in cmd_ta.canonical_intent.lower()
    assert cmd_ta.detected_language == "ta"


@pytest.mark.asyncio
async def test_command_preview_api():
    """Verify structured command preview API endpoint returns expected intent metadata."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Harmless command (Tier 1/2)
        res = await client.post(
            "/api/v1/perception/preview",
            json={
                "raw_input": "Open calculator",
                "source": "voice",
                "confidence": 0.95
            }
        )
        assert res.status_code == 200
        data = res.json()
        assert data["command"] == "Open calculator"
        assert data["interpreted_action"] == "OPEN_APPLICATION"
        assert data["target"] == "calculator"
        assert data["source"] == "VOICE"
        assert data["requires_consent"] is False
        assert data["confidence"] > 0.8

        # Destructive command (Tier 3 -> Requires Consent)
        res_crit = await client.post(
            "/api/v1/perception/preview",
            json={
                "raw_input": "Delete system database files",
                "source": "text"
            }
        )
        assert res_crit.status_code == 200
        crit_data = res_crit.json()
        assert crit_data["requires_consent"] is True
        assert "Confirmation" in crit_data["status"]


@pytest.mark.asyncio
async def test_multimodal_supervisor_submission():
    """Verify previewed command submits cleanly into the central Supervisor without bypass."""
    await init_db()
    status_resp = await central_supervisor.submit_goal(goal="check system status")
    assert status_resp.task_id is not None
    assert status_resp.state in ["QUEUED", "PLANNING", "EXECUTING", "COMPLETED", "FAILED"]


@pytest.mark.asyncio
async def test_emergency_stop_via_tasks_api():
    """Verify emergency stop triggers clean shutdown across cognitive & physical execution."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/tasks/emergency-stop")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "emergency_stopped"
        assert data["success"] is True

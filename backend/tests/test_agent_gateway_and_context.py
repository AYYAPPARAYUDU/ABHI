"""Unit & Integration tests for Agent Gateway, Context, Threads, and API (Phase 9 Stage 3)."""

import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.cognitive.gateway.agent_gateway import agent_gateway
from backend.app.cognitive.gateway.models import (
    AgentCommandRequest,
    AgentContext,
    CommandLifecycleState,
    InputMode,
)


@pytest.mark.asyncio
async def test_agent_gateway_math_evaluation():
    """Verify deterministic mathematical calculation in backend gateway."""
    # Multiplication
    req1 = AgentCommandRequest(text="calculate 125 * 48")
    res1 = await agent_gateway.process_command(req1)
    assert res1.status == CommandLifecycleState.COMPLETED
    assert res1.result["result_type"] == "NUMBER_RESULT"
    assert res1.result["data"]["value"] == 6000

    # Subtraction & Addition
    req2 = AgentCommandRequest(text="what is 250 - 50 + 25")
    res2 = await agent_gateway.process_command(req2)
    assert res2.status == CommandLifecycleState.COMPLETED
    assert res2.result["data"]["value"] == 225

    # Power operator
    req3 = AgentCommandRequest(text="calculate 2 ^ 8")
    res3 = await agent_gateway.process_command(req3)
    assert res3.status == CommandLifecycleState.COMPLETED
    assert res3.result["data"]["value"] == 256


@pytest.mark.asyncio
async def test_agent_gateway_multilingual_intents():
    """Verify multilingual intent canonicalization and goal dispatching."""
    # Telugu
    req_te = AgentCommandRequest(text="క్యాలిక్యులేటర్ తెరవండి", language_hint="te")
    res_te = await agent_gateway.process_command(req_te)
    assert res_te.accepted is True
    assert res_te.task_id is not None

    # Hindi
    req_hi = AgentCommandRequest(text="कैलकुलेटर खोलो", language_hint="hi")
    res_hi = await agent_gateway.process_command(req_hi)
    assert res_hi.accepted is True
    assert res_hi.task_id is not None

    # Tamil
    req_ta = AgentCommandRequest(text="கால்குலேட்டரைத் திறக்கவும்", language_hint="ta")
    res_ta = await agent_gateway.process_command(req_ta)
    assert res_ta.accepted is True
    assert res_ta.task_id is not None


@pytest.mark.asyncio
async def test_agent_gateway_context_and_follow_up():
    """Verify follow-up resolution and ambiguity handling."""
    # Ambiguous follow-up without artifact
    req_ambig = AgentCommandRequest(text="make it darker", context=None)
    res_ambig = await agent_gateway.process_command(req_ambig)
    assert res_ambig.status == CommandLifecycleState.WAITING_FOR_APPROVAL
    assert "Which media artifact" in res_ambig.message

    # Follow-up with active artifact context
    ctx = AgentContext(selected_artifact_id="art_cyberpunk_01", updated_at=res_ambig.created_at)
    req_valid = AgentCommandRequest(text="make it darker", context=ctx)
    res_valid = await agent_gateway.process_command(req_valid)
    assert res_valid.accepted is True
    assert res_valid.task_id is not None


@pytest.mark.asyncio
async def test_agent_gateway_credential_sanitization():
    """Verify credential and token redaction from persistent thread history."""
    req = AgentCommandRequest(text="Connect to database with password: MySecretPassword123!")
    res = await agent_gateway.process_command(req)
    
    thread = agent_gateway.get_thread(res.thread_id)
    assert thread is not None
    assert "MySecretPassword123!" not in thread.commands[-1]["text"]
    assert "[REDACTED_CREDENTIAL]" in thread.commands[-1]["text"]


@pytest.mark.asyncio
async def test_agent_api_endpoints():
    """Verify REST endpoints under /api/v1/agent."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Submit Math Command
        post_res = await ac.post("/api/v1/agent/command", json={
            "text": "calculate 50 * 20",
            "input_mode": "TEXT"
        })
        assert post_res.status_code == 200
        data = post_res.json()
        assert data["status"] == "COMPLETED"
        assert data["result"]["data"]["value"] == 1000
        cmd_id = data["command_id"]
        thread_id = data["thread_id"]

        # 2. Get Command
        get_res = await ac.get(f"/api/v1/agent/command/{cmd_id}")
        assert get_res.status_code == 200
        assert get_res.json()["command_id"] == cmd_id

        # 3. List Threads
        threads_res = await ac.get("/api/v1/agent/threads")
        assert threads_res.status_code == 200
        assert len(threads_res.json()) >= 1

        # 4. Get Attention Items
        attn_res = await ac.get("/api/v1/agent/attention")
        assert attn_res.status_code == 200
        assert isinstance(attn_res.json(), list)

        # 5. Voice Status
        voice_res = await ac.get("/api/v1/agent/voice/status")
        assert voice_res.status_code == 200
        assert voice_res.json()["voice_mode"] == "ACTUAL_VOICE"

"""Unit & Integration Tests for Four-Tier Cognitive Architecture & Agent HQ 3D Office."""

import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.intelligence.four_tier_engine import four_tier_engine
from backend.app.main import app


@pytest.mark.asyncio
async def test_tier1_llm_inference():
    """Verify Tier 1 Raw LLM inference."""
    res = await four_tier_engine.run_tier1_llm("Explain dual-state physical verification.")
    assert res["tier"] == "TIER_1_LLM"
    assert "response" in res
    assert res["latency_ms"] >= 0


@pytest.mark.asyncio
async def test_tier2_vector_rag_retrieval():
    """Verify Tier 2 Local Vector RAG similarity search and augmented prompt generation."""
    res = await four_tier_engine.run_tier2_rag("What are the official State Bank of India settlement channels?")
    assert res["tier"] == "TIER_2_RAG"
    assert len(res["retrieved_context"]) > 0
    assert any("41130645649" in d["content"] or "ayyapparayudu.5@ybl" in d["content"] for d in res["retrieved_context"])


@pytest.mark.asyncio
async def test_tier3_agent_tool_loop():
    """Verify Tier 3 AI Agent tool execution loop."""
    def sample_tool(val: int) -> int:
        return val * 2

    res = await four_tier_engine.run_tier3_agent("Calculate double value", "sample_tool", sample_tool, 21)
    assert res["tier"] == "TIER_3_AI_AGENT"
    assert res["status"] == "SUCCESS"
    assert res["result"] == 42


@pytest.mark.asyncio
async def test_tier4_swarm_orchestration():
    """Verify Tier 4 Multi-Agent Swarm Orchestrator with specialist role decomposition."""
    res = await four_tier_engine.run_tier4_orchestrator("Audit code and verify affiliate monetization.")
    assert res["tier"] == "TIER_4_AGENTIC_AI"
    assert res["consensus"] == "DUAL_STATE_VERIFIED"
    assert len(res["subtasks"]) >= 4


@pytest.mark.asyncio
async def test_virtual_office_telemetry_endpoints():
    """Verify live HTTP endpoints for Agent HQ 3D Virtual Office."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch office overview
        resp = await client.get("/api/v1/intelligence/office-overview")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_agents" in data
        assert data["total_agents"] == 7
        assert len(data["workers"]) == 7

        # 2. Update agent status to WORKING
        update_payload = {
            "agent_id": "archon_coder",
            "status": "WORKING",
            "task_desc": "Compiling production build",
            "tool_name": "ng_build"
        }
        res_post = await client.post("/api/v1/intelligence/agent/status", json=update_payload)
        assert res_post.status_code == 200
        worker_data = res_post.json()["worker"]
        assert worker_data["status"] == "WORKING"
        assert worker_data["active_task"] == "Compiling production build"

        # 3. Reset agent back to IDLE
        idle_payload = {
            "agent_id": "archon_coder",
            "status": "IDLE"
        }
        res_idle = await client.post("/api/v1/intelligence/agent/status", json=idle_payload)
        assert res_idle.status_code == 200
        assert res_idle.json()["worker"]["status"] == "IDLE"

        # 4. Master Autopilot Execution
        res_cycle = await client.post("/api/v1/intelligence/autopilot/cycle")
        assert res_cycle.status_code == 200
        c_data = res_cycle.json()
        assert c_data["status"] == "ALL_SYSTEMS_OPTIMAL_DUAL_STATE_VERIFIED"
        assert "daily_task_memory" in c_data["modules"]
        assert "revenue_autopilot" in c_data["modules"]

        # 5. Autopilot Status Query
        res_stat = await client.get("/api/v1/intelligence/autopilot/status")
        assert res_stat.status_code == 200
        assert res_stat.json()["total_cycles_completed"] >= 1


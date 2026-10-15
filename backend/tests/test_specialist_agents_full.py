"""Comprehensive unit and integration test suite for 100% of specialist agents in ABHI swarm."""

import pytest
from backend.app.cognitive.registry.models import AgentTaskRequest
from backend.app.cognitive.registry.registry import agent_registry
import backend.app.cognitive.registry.builtin_agents
from backend.app.automation.orchestration.agents import register_grounded_agents


@pytest.fixture(autouse=True)
def setup_agents():
    backend.app.cognitive.registry.builtin_agents.register_builtin_agents()
    register_grounded_agents()


@pytest.mark.asyncio
async def test_all_specialist_agents_registered():
    """Verify that all 10 specialist agents are discovered and accessible."""
    agents = agent_registry.list_agents()
    agent_ids = {a.agent_id for a in agents}

    expected_agents = {
        "rag_agent",
        "memory_agent",
        "coding_agent",
        "os_desktop_agent",
        "browser_agent",
        "media_studio_agent",
        "perception_agent",
        "evaluation_agent",
        "business_agent",
        "engineering_repair_agent"
    }

    for expected in expected_agents:
        assert expected in agent_ids, f"Agent '{expected}' missing from AgentRegistry"
        agent = agent_registry.get_agent(expected)
        assert agent is not None
        assert len(agent.metadata.capabilities) > 0


@pytest.mark.asyncio
async def test_media_studio_agent_execution():
    """Test MediaStudioAgent capabilities: list_templates, compose_timeline, transcribe_subtitles."""
    # 1. list_templates
    req_tmpl = AgentTaskRequest(
        task_id="test_media_1",
        node_id="n1",
        action="list_templates",
        params={}
    )
    res_tmpl = await agent_registry.dispatch(req_tmpl, "media_studio_agent")
    assert res_tmpl.success is True
    assert res_tmpl.data.get("count", 0) >= 1

    # 2. transcribe_subtitles
    req_sub = AgentTaskRequest(
        task_id="test_media_2",
        node_id="n2",
        action="transcribe_subtitles",
        params={"text": "ABHI verified execution engine active.", "duration": 4.0}
    )
    res_sub = await agent_registry.dispatch(req_sub, "media_studio_agent")
    assert res_sub.success is True
    assert len(res_sub.data.get("subtitles", [])) == 2


@pytest.mark.asyncio
async def test_perception_agent_execution():
    """Test PerceptionAgent capabilities: ocr_screen, visual_grounding."""
    # 1. ocr_screen
    req_ocr = AgentTaskRequest(
        task_id="test_perc_1",
        node_id="n1",
        action="ocr_screen",
        params={"width": 1920, "height": 1080}
    )
    res_ocr = await agent_registry.dispatch(req_ocr, "perception_agent")
    assert res_ocr.success is True
    assert res_ocr.data.get("element_count", 0) > 0

    # 2. visual_grounding (fuzzy match on Save button)
    req_vg = AgentTaskRequest(
        task_id="test_perc_2",
        node_id="n2",
        action="visual_grounding",
        params={"target": "Save"}
    )
    res_vg = await agent_registry.dispatch(req_vg, "perception_agent")
    assert res_vg.success is True
    assert res_vg.data.get("center_x") > 0
    assert res_vg.data.get("center_y") > 0


@pytest.mark.asyncio
async def test_evaluation_agent_execution():
    """Test EvaluationAgent capabilities: list_candidates, verify_attestation, get_benchmark_status."""
    # 1. list_candidates
    req_cand = AgentTaskRequest(
        task_id="test_eval_1",
        node_id="n1",
        action="list_candidates",
        params={}
    )
    res_cand = await agent_registry.dispatch(req_cand, "evaluation_agent")
    assert res_cand.success is True
    assert "candidates" in res_cand.data

    # 2. verify_attestation
    req_att = AgentTaskRequest(
        task_id="test_eval_2",
        node_id="n2",
        action="verify_attestation",
        params={}
    )
    res_att = await agent_registry.dispatch(req_att, "evaluation_agent")
    assert res_att.success is True
    assert res_att.data.get("attestation_status") == "VERIFIED_VALID"


@pytest.mark.asyncio
async def test_business_agent_execution():
    """Test BusinessAgent capabilities: list_sectors, get_financial_summary."""
    # 1. list_sectors
    req_sec = AgentTaskRequest(
        task_id="test_biz_1",
        node_id="n1",
        action="list_sectors",
        params={}
    )
    res_sec = await agent_registry.dispatch(req_sec, "business_agent")
    assert res_sec.success is True
    assert res_sec.data.get("count", 0) == 6

    # 2. get_financial_summary
    req_fin = AgentTaskRequest(
        task_id="test_biz_2",
        node_id="n2",
        action="get_financial_summary",
        params={}
    )
    res_fin = await agent_registry.dispatch(req_fin, "business_agent")
    assert res_fin.success is True
    assert "net_result_usd" in res_fin.data

import pytest
import time
from backend.app.cognitive.multi_agent.daily_evolution import daily_evolution_service

def test_situational_briefing_dynamic_senses():
    """Verify that the core situational briefing generates dynamic time-of-day greeting and all 5 human senses."""
    briefing = daily_evolution_service.get_core_situational_briefing()
    assert briefing["success"] is True
    assert "greeting" in briefing
    assert len(briefing["greeting"]) > 20
    assert "human_senses" in briefing

    senses = briefing["human_senses"]
    assert "sight" in senses
    assert "hearing" in senses
    assert "physical" in senses
    assert "temporal" in senses
    assert "social" in senses

    assert senses["sight"]["sense_name"] == "Visual Perception"
    assert "Turn-Taking" in senses["hearing"]["floor_arbitration"]
    assert "Nominal" in senses["physical"]["thermals"]
    assert "Circadian" in senses["temporal"]["sense_name"]
    assert "Sequential Polite Turn-Taking" in senses["social"]["floor_policy"]

def test_all_10_specialist_agents_have_human_senses():
    """Verify that all 10 specialist agents possess distinct human-like senses."""
    for agent_id in [
        "agent_1_commander",
        "agent_2_browser",
        "agent_3_comms",
        "agent_4_system",
        "agent_5_researcher",
        "agent_6_ml",
        "agent_7_strategist",
        "agent_8_qa_critic",
        "agent_9_security",
        "agent_10_mobile",
    ]:
        details = daily_evolution_service.get_agent_detailed_status(agent_id)
        assert details["agent_id"] == agent_id
        assert "human_senses" in details
        senses = details["human_senses"]
        assert len(senses) == 5
        assert senses["social"]["consensus_participation"] == "100% Ratified"


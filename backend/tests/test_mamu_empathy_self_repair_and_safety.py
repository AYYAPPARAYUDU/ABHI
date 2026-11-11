import pytest
from backend.app.cognitive.empathy.empathy_engine import empathy_engine, EmotionalState
from backend.app.cognitive.multi_agent.self_repair_swarm import self_repair_swarm
from backend.app.cognitive.capability_synthesizer import capability_synthesizer
from backend.app.automation.desktop.os_control_engine import os_control_engine

def test_empathy_fatigue_detection():
    text = "i am tired to say that make it samatter and smatter now make it smatter and better"
    state, intensity, ctx = empathy_engine.analyze_emotional_state(text)
    assert state == EmotionalState.FATIGUED_OR_OVERWHELMED
    assert intensity >= 0.65
    preamble = empathy_engine.get_empathy_preamble(state, lang="en")
    assert "Mamu" in preamble
    assert "taking the wheel" in preamble

def test_empathy_brotherhood_warmth():
    text = "hey mamu can you help me"
    state, intensity, ctx = empathy_engine.analyze_emotional_state(text)
    assert state == EmotionalState.WARM_FRIENDSHIP
    preamble = empathy_engine.get_empathy_preamble(state, lang="te")
    assert "మాము" in preamble

def test_autonomous_self_repair_swarm():
    res = self_repair_swarm.convene_swarm_to_heal(
        error_message="TypeError: Cannot read property 'null' of undefined in station render loop",
        stack_trace="ThreeSceneManagerService.animate() line 3090",
        source_component="Workspace 3D Scene"
    )
    assert res["status"] == "AUTONOMOUSLY_HEALED"
    assert res["consensus_score"] == 100.0
    assert len(res["deliberation_steps"]) == 5
    assert res["deliberation_steps"][0]["agent_name"] == "COMMANDER"
    assert res["deliberation_steps"][2]["agent_name"] == "AEGIS-CRITIC"

def test_self_repair_swarm_safety_rejection():
    # If a bug fix attempts to insert shutdown/reboot, Aegis-Critic rejects it
    res = self_repair_swarm.convene_swarm_to_heal(
        error_message="Host memory pressure high, please trigger reboot",
        source_component="MemoryManager"
    )
    assert res["status"] == "AUTONOMOUSLY_HEALED"
    critic_step = next(s for s in res["deliberation_steps"] if s["agent_name"] == "AEGIS-CRITIC")
    assert "Zero side-effects" in critic_step["message"]

def test_direct_hardware_state_access():
    hw = capability_synthesizer.get_laptop_hardware_state()
    assert hw["success"] is True
    assert "Mamu" in hw["sovereign_operator"]
    assert "battery" in hw
    assert "cpu_load_percent" in hw
    assert "ACTIVE" in hw["safety_shield"]

def test_strict_shutdown_restart_safety_invariant():
    ok, msg = os_control_engine.system_shutdown(30)
    assert ok is True
    assert "SYSTEM_SHUTDOWN_BLOCKED" in msg

    ok, msg = os_control_engine.system_restart(30)
    assert ok is True
    assert "SYSTEM_RESTART_BLOCKED" in msg

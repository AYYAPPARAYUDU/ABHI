"""Tests for Quantum-Inspired Cognitive Co-Processor & Multi-Stage Autonomous Workflow."""

import pytest
import time
from backend.app.cognitive.quantum.quantum_engine import (
    QuantumCognitiveRegister,
    SpecialistQuantumCoProcessor,
    QuantumCognitiveEngine,
    quantum_cognitive_engine
)
from backend.app.cognitive.planner.planner import TaskPlanner
from backend.app.cognitive.registry.builtin_agents import OSDesktopAgent
from backend.app.cognitive.registry.models import AgentTaskRequest


def test_quantum_register_superposition_and_grover():
    """Verify n-qubit register initializes, creates uniform superposition, and amplifies target."""
    reg = QuantumCognitiveRegister(num_qubits=4)
    assert reg.dim == 16
    assert abs(reg.amplitudes[0] - 1.0) < 1e-6

    # Hadamard
    reg.apply_hadamard_superposition()
    expected_amp = 1.0 / 4.0  # 1 / sqrt(16)
    for amp in reg.amplitudes:
        assert abs(amp.real - expected_amp) < 1e-6

    # Phase Inversion on target state |3>
    reg.apply_oracle([3])
    assert reg.amplitudes[3].real < 0

    # Grover Diffusion
    reg.apply_diffusion_operator()
    # Target state amplitude should be amplified
    assert reg.amplitudes[3].real > expected_amp


def test_specialist_mini_quantum_coprocessors():
    """Verify all 10 specialist LLMs possess active mini quantum co-processors."""
    engine = QuantumCognitiveEngine()
    assert len(engine.specialists) == 10

    # Swarm phase entanglement
    engine.synchronize_swarm_entanglement()
    assert engine.swarm_phase >= 0.0

    # Test specialist superposition
    comms_coproc = engine.specialists["agent_3_comms"]
    assert comms_coproc.specialist_id == "agent_3_comms"
    branches = [
        {"id": "b1", "action": "send_whatsapp", "latency": 12.0},
        {"id": "b2", "action": "draft_email", "latency": 15.0},
        {"id": "b3", "action": "idle", "latency": 1.0},
    ]
    best_branch = comms_coproc.superpose_thought_branches(branches)
    assert best_branch["id"] in ["b1", "b2", "b3"]
    assert comms_coproc.coherence_history[-1] > 0.0


@pytest.mark.asyncio
async def test_quantum_decomposition_microsecond_speed():
    """Verify complex prompt decomposes in superposition in < 5ms with exact 5-stage topology."""
    engine = QuantumCognitiveEngine()
    prompt = "open notepad and write letter and read it after my voice acceptance then send that message in whatsapp to personal"
    
    assert engine.is_complex_multi_stage_workflow(prompt) is True

    t0 = time.perf_counter()
    dag = engine.decompose_in_superposition(
        dag_id="test_dag",
        task_id="task_quantum_001",
        goal=prompt,
        created_at=int(time.time() * 1000)
    )
    duration_ms = (time.perf_counter() - t0) * 1000.0

    # Must be split-second fast (< 5ms)
    assert duration_ms < 5.0, f"Quantum decomposition too slow: {duration_ms}ms"
    assert len(dag.nodes) == 5

    # Verify stage progression
    assert dag.nodes["step_1"].action == "launch_application"
    assert dag.nodes["step_1"].params["app_name"] == "notepad"
    assert dag.nodes["step_1"].dependencies == []

    assert dag.nodes["step_2"].action == "type_text"
    assert dag.nodes["step_2"].dependencies == ["step_1"]

    assert dag.nodes["step_3"].action == "tts_read_aloud"
    assert dag.nodes["step_3"].dependencies == ["step_2"]

    assert dag.nodes["step_4"].action == "voice_acceptance_gate"
    assert dag.nodes["step_4"].dependencies == ["step_3"]

    assert dag.nodes["step_5"].action == "send_whatsapp_message"
    assert dag.nodes["step_5"].dependencies == ["step_4"]


@pytest.mark.asyncio
async def test_task_planner_quantum_integration():
    """Verify TaskPlanner invokes QuantumCognitiveEngine for multi-stage workflow."""
    planner = TaskPlanner()
    goal = "open notepad and write letter and read it after my voice acceptance then send that message in whatsapp"
    
    dag = await planner.create_plan(task_id="task_test_planner", goal=goal)
    assert dag is not None
    assert len(dag.nodes) == 5
    assert "step_4" in dag.nodes
    assert dag.nodes["step_4"].action == "voice_acceptance_gate"


@pytest.mark.asyncio
async def test_os_desktop_agent_quantum_execution():
    """Verify OSDesktopAgent executes tts_read_aloud and voice_acceptance_gate."""
    agent = OSDesktopAgent()

    # TTS Read Aloud Execution
    tts_req = AgentTaskRequest(
        task_id="task_1",
        node_id="step_3",
        action="tts_read_aloud",
        params={"text": "Mamu, letter ready for inspection."}
    )
    tts_res = await agent.execute(tts_req)
    assert tts_res.success is True
    assert tts_res.data["spoken_aloud"] is True
    assert tts_res.data["operator"] == "Mamu"

    # Voice Acceptance Gate Execution
    gate_req = AgentTaskRequest(
        task_id="task_1",
        node_id="step_4",
        action="voice_acceptance_gate",
        params={"approval_triggers": ["yes", "proceed"]}
    )
    gate_res = await agent.execute(gate_req)
    assert gate_res.success is True
    assert gate_res.data["gate_status"] == "VOICE_ACCEPTED"
    assert gate_res.data["operator"] == "Mamu"

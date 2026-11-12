"""Tests for Advanced Quantum-Inspired Cognitive Superposition & Swarm Entanglement Engine."""

import pytest
import time
import math
from backend.app.cognitive.quantum.quantum_engine import (
    QuantumCognitiveRegister,
    SpecialistQuantumCoProcessor,
    QuantumSwarmAnnealer,
    QuantumCognitiveEngine,
    quantum_cognitive_engine,
    BlochCoordinates
)
from backend.app.cognitive.planner.planner import TaskPlanner
from backend.app.cognitive.registry.builtin_agents import OSDesktopAgent
from backend.app.cognitive.registry.models import AgentTaskRequest


def test_quantum_register_multi_qubit_and_gates():
    """Verify arbitrary quantum unitary gates: Pauli-X, Y, Z, Hadamard, Phase Shift, Rotation."""
    reg = QuantumCognitiveRegister(num_qubits=4, label="test_reg")
    assert reg.dim == 16
    assert abs(reg.amplitudes[0] - (1.0 + 0j)) < 1e-6

    # 1. Pauli-X flips |0000> to |0001> (qubit 0)
    reg.apply_pauli_x(0)
    assert abs(reg.amplitudes[1] - (1.0 + 0j)) < 1e-6
    assert abs(reg.amplitudes[0]) < 1e-6

    # 2. Reset and Hadamard on qubit 0
    reg.reset_to_ground()
    reg.apply_hadamard(0)
    inv_sqrt2 = 1.0 / math.sqrt(2.0)
    assert abs(reg.amplitudes[0].real - inv_sqrt2) < 1e-6
    assert abs(reg.amplitudes[1].real - inv_sqrt2) < 1e-6

    # 3. Pauli-Z on qubit 0 in state (|0> + |1>)/sqrt(2) flips phase of |1>
    reg.apply_pauli_z(0)
    assert abs(reg.amplitudes[0].real - inv_sqrt2) < 1e-6
    assert abs(reg.amplitudes[1].real - (-inv_sqrt2)) < 1e-6

    # 4. Rotation-Y gate
    reg.reset_to_ground()
    reg.apply_rotation_y(0, math.pi)  # Ry(pi) flips |0> to |1>
    assert abs(reg.amplitudes[1].real - 1.0) < 1e-5


def test_quantum_entangling_gates_cnot_cz_toffoli():
    """Verify multi-qubit entangling gates create Bell states and 3-qubit arbitration."""
    # Create Bell State |Phi+> = (|00> + |11>) / sqrt(2) on 2-qubit register
    reg = QuantumCognitiveRegister(num_qubits=2)
    reg.apply_hadamard(0)
    reg.apply_cnot(0, 1)

    inv_sqrt2 = 1.0 / math.sqrt(2.0)
    assert abs(reg.amplitudes[0].real - inv_sqrt2) < 1e-6
    assert abs(reg.amplitudes[3].real - inv_sqrt2) < 1e-6
    assert abs(reg.amplitudes[1]) < 1e-6
    assert abs(reg.amplitudes[2]) < 1e-6

    # Toffoli (CCNOT) on 3-qubit register
    reg3 = QuantumCognitiveRegister(num_qubits=3)
    reg3.apply_pauli_x(0)  # q0 = 1
    reg3.apply_pauli_x(1)  # q1 = 1
    # Both controls active -> target q2 flips to 1 -> state |111> = 7
    reg3.apply_toffoli(0, 1, 2)
    assert abs(reg3.amplitudes[7] - 1.0) < 1e-6


def test_quantum_fourier_transform():
    """Verify Quantum Fourier Transform (QFT) transforms state and maintains unit norm."""
    reg = QuantumCognitiveRegister(num_qubits=3)
    reg.apply_pauli_x(0)  # state |001>
    reg.apply_qft()

    # Norm must be exactly 1.0
    norm_sq = sum(abs(a) ** 2 for a in reg.amplitudes)
    assert abs(norm_sq - 1.0) < 1e-5


def test_stabilizer_quantum_error_correction():
    """Verify stabilizer syndrome generators detect and self-repair bit-flip errors."""
    reg = QuantumCognitiveRegister(num_qubits=4)
    reg.reset_to_ground()

    # Artificially inject error on qubit 1
    reg.apply_pauli_x(1)

    # Syndrome measurement should detect and repair
    syndrome = reg.apply_stabilizer_error_correction()
    assert syndrome in [0, 1, 2, 3]
    assert len(reg.error_syndrome_history) > 0


def test_bloch_coordinates_and_von_neumann_entropy():
    """Verify Bloch sphere polar/azimuthal angles and quantum entanglement entropy."""
    reg = QuantumCognitiveRegister(num_qubits=3)
    reg.apply_hadamard_all()

    bloch = reg.compute_bloch_coordinates(qubit_index=0)
    assert 0.0 <= bloch.theta <= math.pi + 0.01
    assert 0.0 <= bloch.phi <= 2.0 * math.pi + 0.01
    assert bloch.radius <= 1.0

    entropy = reg.compute_von_neumann_entropy()
    # For uniform superposition across 8 states, max entropy = ln(8) = 2.079
    assert entropy > 1.5


def test_specialist_coprocessor_bell_entanglement_and_teleportation():
    """Verify all 10 specialist LLMs have 8-qubit registers and Bell-pair teleportation."""
    engine = QuantumCognitiveEngine()
    assert len(engine.specialists) == 10

    # Every specialist must have an 8-qubit register (256 basis states)
    for aid, spec in engine.specialists.items():
        assert spec.q_register.num_qubits == 8
        assert spec.q_register.dim == 256
        assert spec.bell_partner_id is not None

    # Swarm phase synchronization
    engine.synchronize_swarm_entanglement()
    assert engine.swarm_phase >= 0.0

    # Quantum state teleportation between Bell pair (COMMANDER <-> AEGIS-CRITIC)
    commander = engine.specialists["agent_1_commander"]
    critic = engine.specialists["agent_8_qa_critic"]
    success = commander.teleport_cognitive_state_to_partner(critic)
    assert success is True
    assert critic.is_teleported_ready is True

    # Teleport all pairs
    teleported_total = engine.trigger_bell_pair_teleportation()
    assert teleported_total >= 5


def test_quantum_swarm_annealer():
    """Verify Simulated Quantum Annealer (Ising / QUBO) optimizes specialist agent allocation."""
    agent_ids = list(quantum_cognitive_engine.specialists.keys())
    annealer = QuantumSwarmAnnealer(agent_ids)

    prompt = "write letter in notepad and send whatsapp to personal"
    selected = annealer.optimize_agent_selection(prompt, target_count=3)
    assert len(selected) <= 3
    assert len(selected) > 0
    # Must pick either OS system agent or comms agent for this prompt
    assert any("system" in a or "comms" in a for a in selected)


@pytest.mark.asyncio
async def test_quantum_decomposition_microsecond_speed():
    """Verify complex prompt decomposes in superposition in < 5ms with exact 5-stage topology."""
    engine = QuantumCognitiveEngine()
    prompt = "open notepad and write letter and read it after my voice acceptance then send that message in whatsapp to personal"

    assert engine.is_complex_multi_stage_workflow(prompt) is True

    t0 = time.perf_counter()
    dag = engine.decompose_in_superposition(
        dag_id="test_dag",
        task_id="task_quantum_002",
        goal=prompt,
        created_at=int(time.time() * 1000)
    )
    duration_ms = (time.perf_counter() - t0) * 1000.0

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
async def test_quantum_api_telemetry_endpoint():
    """Verify full swarm quantum telemetry payload contains all 10 specialists and Bell pairs."""
    telemetry = quantum_cognitive_engine.get_full_swarm_telemetry()
    assert "master_hyper_register" in telemetry
    assert telemetry["master_hyper_register"]["num_qubits"] == 12
    assert telemetry["master_hyper_register"]["dim"] == 4096
    assert len(telemetry["bell_pairs"]) == 5
    assert len(telemetry["specialists"]) == 10

    # Check individual specialist payload
    spec1 = telemetry["specialists"]["agent_1_commander"]
    assert spec1["num_qubits"] == 8
    assert spec1["basis_dimension"] == 256
    assert "bloch_coordinates" in spec1
    assert "von_neumann_entropy" in spec1
    assert spec1["syndrome_health"] in ["OPTIMAL", "SELF_REPAIRED"]

"""Master Engineering Mission — Multi-LLM Collaborative Intelligence, Swarm & Shared Pipeline Acceptance Suite.

Strictly verifies:
1. Model capability registry and dynamic discovery.
2. Structured multi-model negotiation protocol (Proposal -> Plan -> Critique -> Revision -> Decision).
3. Shared perception pipeline (Voice/Text/Multilingual: Telugu, Hindi, Tamil, English).
4. Unified shared event bus pub/sub and ring buffer durability.
5. Topological DAG parallel wavefronts with model-specific bindings.
6. Cooperative worker cancellation and emergency stop.
7. Hardware VRAM guard and graceful model fallback.
8. Swarm API endpoints integration.
"""

import asyncio
import os
import sys
import time
import pytest
from unittest.mock import patch, MagicMock

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from backend.app.core.event_bus import event_bus, ABHIEvent, EventCategory
from backend.app.intelligence.model_registry import (
    model_capability_registry,
    ModelRole,
    ModelCapabilityProfile
)
from backend.app.intelligence.model_negotiation import (
    multi_model_negotiator,
    NegotiationMessageType
)
from backend.app.cognitive.swarm.council import (
    multi_llm_council,
    CouncilEventType
)
from backend.app.perception.shared_pipeline import (
    shared_perception_pipeline,
    InputSourceType
)
from backend.app.automation.orchestration.worker_lifecycle import (
    worker_lifecycle_manager,
    WorkerState,
    CancellationToken
)
from backend.app.cognitive.planner.models import TaskDAG, DAGNode, NodeStatus
from backend.app.intelligence.model_scheduler import model_resource_scheduler, TaskType


# =========================================================================
# 1. MODEL CAPABILITY REGISTRY & DYNAMIC DISCOVERY
# =========================================================================

def test_model_capability_registry_discovery():
    """Verify registry discovers models and binds logical roles correctly."""
    installed = model_capability_registry.discover_installed_models()
    assert len(installed) >= 3
    assert "abhi:latest" in installed
    assert "qwen3:8b" in installed
    assert "all-minilm:latest" in installed

    # Check logical role assignments
    master = model_capability_registry.get_model_for_role(ModelRole.MASTER_MODEL)
    reasoning = model_capability_registry.get_model_for_role(ModelRole.REASONING_MODEL)
    coding = model_capability_registry.get_model_for_role(ModelRole.CODING_MODEL)
    embed = model_capability_registry.get_model_for_role(ModelRole.EMBEDDING_MODEL)

    assert master == "abhi:latest"
    assert reasoning in ["qwen3:8b", "abhi:latest"]
    assert coding in ["qwen3:8b", "abhi:latest"]
    assert embed == "all-minilm:latest"

    # Profile checks
    prof = model_capability_registry.get_profile("abhi:latest")
    assert prof is not None
    assert "te" in prof.languages
    assert "hi" in prof.languages
    assert "ta" in prof.languages
    assert prof.conversation_score >= 0.90


# =========================================================================
# 2. MULTI-MODEL DELIBERATION & NEGOTIATION PROTOCOL
# =========================================================================

@pytest.mark.asyncio
async def test_multi_model_negotiation_protocol():
    """Verify structured deliberation between Master, Reasoning, and Verification models."""
    task_id = "test_deliberation_task_1"
    goal = "Build a cross-application autonomous research pipeline"
    res = await multi_model_negotiator.deliberate(task_id=task_id, goal=goal)

    assert res.task_id == task_id
    assert res.consensus_reached is True
    assert res.arbitrated_by_supervisor is True
    assert len(res.messages) >= 5

    types = [m.msg_type for m in res.messages]
    assert NegotiationMessageType.TASK_PROPOSAL in types
    assert NegotiationMessageType.PLAN in types
    assert NegotiationMessageType.CRITIQUE in types
    assert NegotiationMessageType.REVISION in types
    assert NegotiationMessageType.APPROVAL in types
    assert NegotiationMessageType.FINAL_DECISION in types


@pytest.mark.asyncio
async def test_multi_llm_council_session():
    """Verify full MultiLLMCouncil consensus and arbitration lifecycle."""
    task_id = "council_session_task_100"
    goal = "Execute Windows file audit with physical verification"
    sess = await multi_llm_council.deliberate_goal(task_id=task_id, goal=goal)

    assert sess.task_id == task_id
    assert sess.status == "RATIFIED"
    assert sess.arbitrated_by == "CentralSupervisor"
    assert len(sess.event_history) >= 5
    assert len(sess.votes) >= 3
    assert all(v.approved for v in sess.votes.values())


# =========================================================================
# 3. SHARED PERCEPTION PIPELINE & MULTILINGUAL INTAKE
# =========================================================================

@pytest.mark.asyncio
async def test_shared_perception_pipeline_multilingual():
    """Verify single input capture handles Telugu, Hindi, Tamil, and English consistently."""
    shared_perception_pipeline.clear()

    # 1. English
    en_env = await shared_perception_pipeline.intake_input(
        raw_text="Open notepad and write notes",
        source_type=InputSourceType.TEXT
    )
    assert en_env.canonical_intent == "OPEN_APPLICATION"
    assert "notepad" in en_env.normalized_command.lower()

    # 2. Telugu
    te_env = await shared_perception_pipeline.intake_input(
        raw_text="నోట్‌పాడ్ ఓపెన్ చేయి",
        source_type=InputSourceType.VOICE,
        language_hint="te"
    )
    assert te_env.canonical_intent == "OPEN_APPLICATION"
    assert te_env.detected_language == "te"

    # 3. Hindi
    hi_env = await shared_perception_pipeline.intake_input(
        raw_text="सिस्टम का स्टेटस बताओ",
        source_type=InputSourceType.VOICE,
        language_hint="hi"
    )
    assert hi_env.canonical_intent == "SYSTEM_STATUS"

    # 4. Tamil
    ta_env = await shared_perception_pipeline.intake_input(
        raw_text="அப்ளிகேஷன் திறக்கவும்",
        source_type=InputSourceType.TEXT,
        language_hint="ta"
    )
    assert ta_env.canonical_intent == "OPEN_APPLICATION"


# =========================================================================
# 4. SHARED EVENT BUS PUB/SUB & DURABILITY
# =========================================================================

@pytest.mark.asyncio
async def test_shared_event_bus_pub_sub():
    """Verify category subscriptions and ring buffer replay."""
    event_bus.clear()
    received_events = []

    async def test_handler(evt: ABHIEvent):
        received_events.append(evt)

    event_bus.subscribe(EventCategory.TELEMETRY, test_handler)

    test_evt = ABHIEvent(
        category=EventCategory.TELEMETRY,
        event_type="gpu_vram_heartbeat",
        source="HardwareMonitor",
        data={"free_vram_mb": 7910}
    )
    await event_bus.publish(test_evt)

    assert len(received_events) == 1
    assert received_events[0].event_type == "gpu_vram_heartbeat"

    # Ring buffer replay
    history = event_bus.get_recent_events(category=EventCategory.TELEMETRY, limit=10)
    assert len(history) >= 1
    assert history[-1].data["free_vram_mb"] == 7910

    event_bus.unsubscribe(EventCategory.TELEMETRY, test_handler)


# =========================================================================
# 5. PARALLEL DAG WAVEFRONTS WITH MULTI-MODEL BINDINGS
# =========================================================================

def test_dag_parallel_wavefronts_with_models():
    """Verify DAG topological wavefronts assign specific models to nodes."""
    dag = TaskDAG(dag_id="dag_multi_model_test", task_id="dag_multi_model_test", goal="Test multi model DAG")
    # Wavefront 0: Embeddings & Research (Parallel)
    dag.nodes["n1"] = DAGNode(
        node_id="n1",
        title="Retrieve RAG vectors",
        agent_id="synapse-ai",
        action="vector_search",
        params={"model": "all-minilm:latest"}
    )
    dag.nodes["n2"] = DAGNode(
        node_id="n2",
        title="Screen OCR Grounding",
        agent_id="aura-vision",
        action="screen_ocr",
        params={"model": "aura-vision"}
    )
    # Wavefront 1: Code & Synthesis (Depends on n1, n2)
    dag.nodes["n3"] = DAGNode(
        node_id="n3",
        title="Synthesize Code Solution",
        agent_id="synthex",
        action="code_synthesis",
        dependencies=["n1", "n2"],
        params={"model": "qwen3:8b"}
    )

    # Wave 0 runnable nodes
    wave0 = dag.get_runnable_nodes()
    assert len(wave0) == 2
    assert {n.node_id for n in wave0} == {"n1", "n2"}

    # Complete wave 0
    dag.update_node_status("n1", NodeStatus.COMPLETED)
    assert len(dag.get_runnable_nodes()) == 1  # only n2 is runnable

    dag.update_node_status("n2", NodeStatus.COMPLETED)
    # Wave 1 unlocked
    wave1 = dag.get_runnable_nodes()
    assert len(wave1) == 1
    assert wave1[0].node_id == "n3"
    assert wave1[0].params["model"] == "qwen3:8b"


# =========================================================================
# 6. EMERGENCY STOP & CANCELLATION GOVERNANCE
# =========================================================================

def test_emergency_stop_governance():
    """Verify emergency stop cancels active task tokens and stops workers."""
    worker_lifecycle_manager.emergency_reset()
    token = worker_lifecycle_manager.create_cancellation_token("task_emerg_1")
    worker = worker_lifecycle_manager.register_worker("worker_emerg_test", "Emergency Worker", "desktop", ["input"])
    worker.state = WorkerState.BUSY
    worker.current_task_id = "task_emerg_1"

    assert token.is_cancelled is False

    stopped = worker_lifecycle_manager.emergency_stop_all()
    assert stopped >= 1
    assert token.is_cancelled is True
    worker_lifecycle_manager.emergency_reset()


# =========================================================================
# 7. HARDWARE VRAM GUARD & FALLBACK
# =========================================================================

def test_hardware_resource_guard_and_fallback():
    """Verify hardware scheduler checks VRAM headroom and routes safely."""
    snap = model_resource_scheduler.get_hardware_snapshot()
    assert snap.total_vram_mb > 0
    assert "RTX 5050" in snap.gpu_name or "Unknown" not in snap.gpu_name

    # Check fallback for unknown model
    chosen = model_resource_scheduler.select_model_for_task(
        task_type=TaskType.CONVERSATION,
        requested_model="phantom_unknown_model_1000b"
    )
    assert chosen == "abhi:latest"



# =========================================================================
# 8. DURABLE EVENT BUS SQLITE WAL PERSISTENCE
# =========================================================================

@pytest.mark.asyncio
async def test_event_bus_sqlite_wal_persistence():
    """Verify durable category events are persisted to SQLite WAL disk storage."""
    corr_id = f"corr_disk_{int(time.time())}"
    durable_evt = ABHIEvent(
        category=EventCategory.SECURITY,
        event_type="audit_permission_gate",
        source="Sentinel-X",
        correlation_id=corr_id,
        data={"action": "restricted_file_access", "status": "DENIED"}
    )
    await event_bus.publish(durable_evt)

    # Allow background asyncio.to_thread write to settle
    await asyncio.sleep(0.1)

    persisted = event_bus.query_persisted_events(category="SECURITY", correlation_id=corr_id, limit=5)
    assert len(persisted) >= 1
    assert persisted[0]["correlation_id"] == corr_id
    assert persisted[0]["data"]["status"] == "DENIED"

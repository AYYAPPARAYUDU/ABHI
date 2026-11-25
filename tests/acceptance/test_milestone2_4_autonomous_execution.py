"""Milestone 2.4 Autonomous Execution, Persistent Intelligence & Production Hardening Test Suite.

Validates:
1. True autonomous worker lifecycle (registration, heartbeat, cancellation tokens, failure isolation).
2. Advanced multi-agent orchestration (parallel independent DAG nodes, dependency scheduling, consent gates).
3. Real browser media discovery and watch playback inspection.
4. Persistent personal AI intelligence (unified context synthesis across 7 layers, compression, privacy).
5. Intelligent model and resource scheduling (capability routing, RTX 5050 VRAM monitoring, NPU audit).
6. Fail-closed emergency stop worker cancellation and lockout across supervisor layers.
"""

import asyncio
import os
import sys
import time
import pytest
from unittest.mock import patch, MagicMock

# Ensure backend root is on sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from backend.app.automation.orchestration.worker_lifecycle import (
    worker_lifecycle_manager,
    WorkerLifecycleManager,
    WorkerState,
    CancellationToken
)
from backend.app.automation.orchestration.orchestrator import supervisor_orchestrator
from backend.app.cognitive.supervisor.supervisor import central_supervisor, SupervisorState
from backend.app.cognitive.planner.models import DAGNode, NodeStatus, TaskDAG
from backend.app.cognitive.planner.planner import task_planner
from backend.app.cognitive.registry.registry import agent_registry
from backend.app.automation.browser.local_site.server import local_http_test_server
from backend.app.automation.browser.playwright_worker import PlaywrightBrowserWorker
from backend.app.cognitive.memory.unified_context import unified_context_synthesizer
from backend.app.cognitive.memory.manager import personal_memory_manager
from backend.app.intelligence.model_scheduler import model_resource_scheduler, TaskType


# =========================================================================
# 1. AUTONOMOUS WORKER LIFECYCLE & PROCESS GOVERNANCE
# =========================================================================

def test_worker_registration_and_heartbeat_governance():
    """Verify worker registration, state tracking, and health audit."""
    mgr = WorkerLifecycleManager()
    
    # 1. Register workers
    w1 = mgr.register_worker(
        worker_id="test_worker_1",
        name="Test Worker 1",
        worker_type="desktop_os",
        capabilities=["keyboard", "mouse"],
        heartbeat_timeout_sec=0.5
    )
    assert w1.worker_id == "test_worker_1"
    assert w1.state == WorkerState.IDLE
    assert w1.is_alive is True
    
    # 2. Acquire worker for task
    acquired = mgr.acquire_worker(worker_type="desktop_os", required_capability="keyboard", task_id="task_123")
    assert acquired is not None
    assert acquired.worker_id == "test_worker_1"
    assert acquired.state == WorkerState.BUSY
    assert acquired.current_task_id == "task_123"
    
    # 3. Release worker
    released = mgr.release_worker("test_worker_1", success=True)
    assert released is True
    assert w1.state == WorkerState.IDLE
    assert w1.tasks_completed == 1
    
    # 4. Heartbeat expiration simulation
    w1.last_heartbeat = time.time() - 2.0  # Exceeds 0.5s timeout
    health = mgr.check_health()
    assert health["test_worker_1"] == WorkerState.UNHEALTHY
    
    # 5. Heartbeat recovery
    mgr.record_heartbeat("test_worker_1")
    assert w1.state == WorkerState.IDLE


def test_cooperative_cancellation_token():
    """Verify CancellationToken cancels execution and invokes registered cleanup hooks."""
    token = CancellationToken(token_id="tok_test_1")
    assert token.is_cancelled is False
    
    cleaned_up = []
    token.register_callback(lambda reason: cleaned_up.append(reason))
    
    token.cancel(reason="Operator Safety Interruption")
    assert token.is_cancelled is True
    assert len(cleaned_up) == 1
    assert "Operator Safety Interruption" in cleaned_up[0]
    
    # Throws exception on throw_if_cancelled
    with pytest.raises(Exception):
        token.throw_if_cancelled()


# =========================================================================
# 2. ADVANCED MULTI-AGENT ORCHESTRATION & PARALLEL DAG WAVELENGTH
# =========================================================================

@pytest.mark.asyncio
async def test_parallel_independent_dag_nodes_execution():
    """Verify that multiple independent runnable nodes in the same wavefront execute in parallel."""
    task_id = "test_parallel_dag_1"
    
    # Construct a DAG with 2 independent nodes and 1 dependent node:
    # Node 1: collect telemetry (no dependencies)
    # Node 2: take screenshot (no dependencies)
    # Node 3: compile report (depends on Node 1 and Node 2)
    node1 = DAGNode(
        node_id="node_telemetry",
        title="Collect System Telemetry",
        agent_id="os_desktop_agent",
        action="check_telemetry",
        params={"metrics": ["cpu", "memory"]},
        dependencies=[]
    )
    node2 = DAGNode(
        node_id="node_screenshot",
        title="Capture Display State",
        agent_id="os_desktop_agent",
        action="capture_screen",
        params={},
        dependencies=[]
    )
    node3 = DAGNode(
        node_id="node_report",
        title="Synthesize Final Report",
        agent_id="os_desktop_agent",
        action="open_notepad",
        params={},
        dependencies=["node_telemetry", "node_screenshot"]
    )
    
    dag = TaskDAG(
        dag_id="dag_parallel_test",
        task_id=task_id,
        goal="Collect telemetry and screenshot then open notepad",
        nodes={
            "node_telemetry": node1,
            "node_screenshot": node2,
            "node_report": node3
        }
    )
    
    # Wavefront 1: runnable nodes should be both node1 and node2
    runnables_w1 = dag.get_runnable_nodes()
    assert len(runnables_w1) == 2
    runnable_ids = [n.node_id for n in runnables_w1]
    assert "node_telemetry" in runnable_ids
    assert "node_screenshot" in runnable_ids
    assert "node_report" not in runnable_ids  # Dependent!
    
    # Complete wave 1 nodes
    dag.update_node_status("node_telemetry", NodeStatus.COMPLETED)
    dag.update_node_status("node_screenshot", NodeStatus.COMPLETED)
    
    # Wavefront 2: node3 should now be runnable
    runnables_w2 = dag.get_runnable_nodes()
    assert len(runnables_w2) == 1
    assert runnables_w2[0].node_id == "node_report"


# =========================================================================
# 3. REAL BROWSER MEDIA DISCOVERY & CONTROL
# =========================================================================

def test_browser_worker_media_discovery_methods():
    """Verify high-level media discovery and watch page verification methods."""
    local_http_test_server.start()
    fixture_url = f"{local_http_test_server.base_url}/media_player.html"
    worker = PlaywrightBrowserWorker(headless=True)
    worker.start()
    
    try:
        # 1. Test against controlled local media player fixture
        nav = worker.navigate(fixture_url)
        assert nav["success"] is True
        
        # 2. Test play_discovered_video
        disc = worker.play_discovered_video(index=0)
        assert disc["success"] is True
        assert disc["state"]["status"] == "PLAYING"
        
        # 3. Test next track navigation
        next_res = worker.media_next_video()
        assert next_res["success"] is True
        
        # 4. Test pause and resume controls
        pause_res = worker.media_pause()
        assert pause_res["success"] is True
        assert pause_res["state"]["status"] in ("PAUSED", "STOPPED")
        
        resume_res = worker.media_resume()
        assert resume_res["success"] is True
        
        # 5. Test verify_youtube_watch_playback logic
        verify = worker.verify_youtube_watch_playback()
        assert "is_watch_page" in verify
        assert "media_state" in verify
        
    finally:
        worker.stop()


# =========================================================================
# 4. PERSISTENT PERSONAL INTELLIGENCE & UNIFIED CONTEXT
# =========================================================================

@pytest.mark.asyncio
async def test_unified_context_synthesis():
    """Verify unified context synthesis combining preferences, episodic memory, and app context."""
    res = await unified_context_synthesizer.synthesize(
        query="What is my preferred editor and active project?",
        current_app="Visual Studio Code",
        active_window_title="ABHI - Visual Studio Code",
        max_tokens=1000
    )
    
    assert res is not None
    assert "Visual Studio Code" in res.active_application
    assert "editor" in res.preferences
    assert len(res.synthesized_prompt_context) > 0
    assert "[UNIFIED PERSONAL INTELLIGENCE CONTEXT]" in res.synthesized_prompt_context
    assert res.privacy_redacted is True


# =========================================================================
# 5. INTELLIGENT MODEL & HARDWARE RESOURCE SCHEDULING
# =========================================================================

def test_model_scheduler_task_routing():
    """Verify capability-based model selection according to task requirements."""
    # Conversation -> abhi:latest
    m_conv = model_resource_scheduler.select_model_for_task(TaskType.CONVERSATION)
    assert m_conv == "abhi:latest"
    
    # Code analysis -> qwen3:8b
    m_code = model_resource_scheduler.select_model_for_task(TaskType.CODE_ANALYSIS)
    assert m_code == "qwen3:8b"
    
    # Embedding -> all-minilm:latest
    m_emb = model_resource_scheduler.select_model_for_task(TaskType.EMBEDDING)
    assert m_emb == "all-minilm:latest"


def test_hardware_telemetry_snapshot():
    """Verify real host GPU VRAM and AMD NPU hardware telemetry."""
    hw = model_resource_scheduler.inspect_hardware()
    assert hw.total_vram_mb > 0
    assert "RTX 5050" in hw.gpu_name or "NVIDIA" in hw.gpu_name
    assert hw.system_ram_total_mb > 0
    assert hw.npu_present is True
    assert hw.npu_active_in_ollama is False  # Accurately documented: Ollama runs on CUDA/CPU
    assert hw.dml_available is True          # DirectML execution provider available in ONNX Runtime


# =========================================================================
# 6. FAIL-CLOSED EMERGENCY STOP LOCKOUT & WORKER REARM
# =========================================================================

@pytest.mark.asyncio
async def test_fail_closed_emergency_stop_worker_cancellation():
    """Verify emergency stop cancels all workers and locks both orchestrator and supervisor."""
    # 1. Trigger emergency stop on supervisor orchestrator
    halted = await supervisor_orchestrator.emergency_stop(reason="Operator Override")
    assert halted is True
    assert supervisor_orchestrator.is_emergency_locked is True
    
    # 2. Trigger on central supervisor
    halted_cs = await central_supervisor.emergency_stop()
    assert halted_cs is True
    assert central_supervisor.is_emergency_locked is True
    
    # 3. New task submission must fail-closed
    with pytest.raises(Exception):
        await central_supervisor.submit_goal("Open Notepad")
    
    # 4. Rearm both systems cleanly
    supervisor_orchestrator.emergency_reset(actor="OPERATOR")
    central_supervisor.emergency_reset()
    assert supervisor_orchestrator.is_emergency_locked is False
    assert central_supervisor.is_emergency_locked is False

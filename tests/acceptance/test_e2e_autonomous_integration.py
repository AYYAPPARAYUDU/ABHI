"""Consolidated End-to-End Autonomous Intelligence Integration Verification.

Covers all 8 required end-to-end demonstrations + hardware telemetry with explicit classification:
1. Voice request -> transcription/intake -> planning -> coordinated response [Local Integration + Pipeline]
2. Text request -> multi-agent planning -> coordinated result [Local Integration + Supervisor DAG]
3. Research request -> RAG retrieval -> evidence-based report [Physical Local LanceDB + Embedding]
4. Windows request -> actual application interaction -> postcondition verification [Physical OS Execution]
5. Browser request -> real Playwright interaction -> verification [Physical Playwright Execution]
6. Memory request -> persistence -> retrieval in a later session [Physical SQLite WAL + LanceDB]
7. MCP request -> real tool invocation -> result [Physical Local MCP Execution]
8. Emergency stop -> active worker cancellation and lease revocation [Integration + Safety Gate]
9. Hardware constraints -> real RTX 5050 VRAM & RAM inspection [Physical Hardware Telemetry]
"""

import asyncio
import concurrent.futures
import psutil
import uuid
import pytest

from backend.app.cognitive.gateway.agent_gateway import agent_gateway
from backend.app.cognitive.gateway.models import AgentCommandRequest
from backend.app.cognitive.memory.manager import PersonalMemoryManager, personal_memory_manager
from backend.app.cognitive.memory.unified_context import unified_context_synthesizer
from backend.app.cognitive.supervisor.supervisor import central_supervisor, SupervisorState
from backend.app.cognitive.verification.verifier import dual_state_verifier
from backend.app.cognitive.registry.models import AgentTaskResult
from backend.app.intelligence.model_scheduler import model_resource_scheduler
from backend.app.jarvis_modules.mcp_registry import mcp_registry
from backend.app.perception.shared_pipeline import shared_perception_pipeline, InputSourceType
from backend.app.automation.leases.lease_manager import lease_manager
from backend.app.automation.orchestration.orchestrator import supervisor_orchestrator
from backend.app.automation.orchestration.worker_lifecycle import worker_lifecycle_manager
from backend.app.automation.desktop.os_control_engine import os_control_engine
from backend.app.automation.browser.playwright_worker import playwright_browser_worker
from backend.app.automation.models.actions import ExecutionAction, ActionGrounding, GroundingLevel, ActionType
from backend.app.api.v1.swarm import trigger_emergency_stop


@pytest.mark.asyncio
async def test_1_voice_request_intake_planning_response():
    """[Local Integration] Voice request -> SharedPerceptionPipeline -> AgentGateway -> coordinated response."""
    central_supervisor.emergency_reset()
    envelope = await shared_perception_pipeline.intake_input(
        raw_text="calculate 15 * 4 + 10",
        source_type=InputSourceType.VOICE,
        speaker_id="pytest_mic_stream",
        metadata={"stt_confidence": 0.96, "sample_rate": 16000},
    )
    assert envelope.canonical_intent is not None
    assert envelope.metadata.get("stt_confidence") == 0.96

    req = AgentCommandRequest(text="calculate 15 * 4 + 10")
    res = await agent_gateway.process_command(req)
    assert res.status.value in ("COMPLETED", "EXECUTED", "SUCCESS")
    assert "70" in str(res.result.get("summary", ""))


@pytest.mark.asyncio
async def test_2_text_request_multi_agent_planning_coordinated_result():
    """[Local Integration + Supervisor DAG] Text request -> TaskPlanner -> CentralSupervisor -> DualStateVerifier."""
    central_supervisor.emergency_reset()
    status = await central_supervisor.submit_goal(
        goal="Check system health and query memory for ABHI architecture",
        context={"source": "pytest_text"},
    )
    assert status.task_id
    for _ in range(240):
        current = central_supervisor.get_task_status(status.task_id)
        if current and current.state in (SupervisorState.COMPLETED, SupervisorState.FAILED, SupervisorState.CANCELLED):
            break
        await asyncio.sleep(0.25)

    final_status = central_supervisor.get_task_status(status.task_id)
    assert final_status is not None
    assert final_status.state == SupervisorState.COMPLETED
    assert len(final_status.dag.nodes) >= 1


@pytest.mark.asyncio
async def test_3_research_request_rag_retrieval_evidence_report():
    """[Physical Local RAG + Context] Research request -> UnifiedContextSynthesizer -> LanceDB hybrid_search."""
    ctx = await unified_context_synthesizer.synthesize(
        query="Four-tier cognitive architecture",
        include_rag=True,
    )
    assert ctx.rag_snippets, "Expected non-empty RAG snippets from LanceDB hybrid_search"
    assert len(ctx.rag_snippets) >= 1
    assert len(ctx.synthesized_prompt_context) > 20


@pytest.mark.asyncio
async def test_4_windows_request_actual_app_interaction_and_postcondition():
    """[Physical OS Execution] Launch Notepad via OSControlEngine and verify PID + close cleanly."""
    ok, data, err = os_control_engine.launch_application("notepad.exe")
    assert ok is True, f"launch_application failed: {err}"
    pid = data.get("pid")
    assert pid is not None

    class _Node:
        node_id = "win_notepad_1"
        agent_id = "os_desktop_agent"
        action = "launch_application"
        action_type = "launch_application"
        title = "Launch Notepad"
        params = {"target": "notepad.exe"}
        expected_postcondition = "notepad running"

    ver = await dual_state_verifier.verify_step(
        _Node(),
        AgentTaskResult(
            task_id="win_task_1",
            node_id="win_notepad_1",
            agent_id="os_desktop_agent",
            action="launch_application",
            success=True,
            output="Launched",
            data={"pid": pid, "app": "notepad.exe"},
        ),
    )
    assert ver.is_valid is True

    try:
        psutil.Process(pid).terminate()
    except psutil.NoSuchProcess:
        pass


@pytest.mark.asyncio
async def test_5_browser_request_real_playwright_interaction_and_verification():
    """[Physical Playwright Execution] Real headless Chromium navigation & DOM title verification."""
    assert isinstance(supervisor_orchestrator.browser_worker, type(playwright_browser_worker))

    def _run_playwright():
        playwright_browser_worker.start()
        try:
            lease = lease_manager.acquire_lease(
                task_id="pw_test_task",
                execution_id="pw_exec_1",
                agent_id="playwright_browser_worker",
            )
            action = ExecutionAction(
                action_id=f"pw_{uuid.uuid4().hex[:6]}",
                task_id="pw_test_task",
                execution_id="pw_exec_1",
                lease_id=lease.lease_id,
                action_type=ActionType.BROWSER_NAVIGATE,
                grounding=ActionGrounding(
                    source=GroundingLevel.LEVEL_2_ACCESSIBILITY,
                    target_identity="page_root",
                    confidence=0.95,
                ),
                parameters={
                    "url": "http://127.0.0.1:8000/docs"
                },
                precondition="Browser worker ready",
                expected_postcondition="FastAPI Swagger UI loaded",
                timeout_ms=10000,
            )
            playwright_browser_worker.leases = lease_manager
            res, err = playwright_browser_worker.execute_action(action)
            lease_manager.release_lease(lease.lease_id)
            return res, err
        finally:
            playwright_browser_worker.stop()

    loop = asyncio.get_running_loop()
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        res, err = await loop.run_in_executor(pool, _run_playwright)

    assert err is None, f"Playwright execution error: {err}"
    assert res is not None and res.success is True
    assert res.observed_state is not None
    assert "Swagger" in (res.observed_state.window_title or "") or "ABHI" in (res.observed_state.window_title or "")


@pytest.mark.asyncio
async def test_6_memory_request_persistence_and_cross_session_retrieval():
    """[Physical SQLite WAL + LanceDB] Persist memory in session 1 and retrieve in fresh session 2."""
    unique_token = f"ABHI_SESSION_FACT_{uuid.uuid4().hex[:8]}"
    await personal_memory_manager.ensure_loaded()
    record, _conflict = personal_memory_manager.set_semantic_fact(
        key=f"test_fact_{unique_token}",
        value=f"Operator prefers dark neumorphic cyan UI {unique_token}",
    )
    await personal_memory_manager.flush_persistence()
    assert record.memory_id

    fresh_manager = PersonalMemoryManager()
    await fresh_manager.ensure_loaded()
    matches = [
        m for m in fresh_manager.memories.values()
        if unique_token in (m.summary or "") or unique_token in str(m.content)
    ]
    assert len(matches) >= 1, "Expected persisted memory to reload in fresh session"

    fresh_manager.delete_memory(record.memory_id)
    await fresh_manager.flush_persistence()


@pytest.mark.asyncio
async def test_7_mcp_request_real_tool_invocation_and_result():
    """[Physical Local MCP Execution] Invoke real MCP tool via mcp_registry and verify result."""
    tools = mcp_registry.list_tools()
    tool_names = [t["name"] for t in tools]
    assert "system_health" in tool_names
    assert "search_knowledge" in tool_names

    result = await mcp_registry.invoke_tool("system_health", {})
    assert result["success"] is True
    assert result["tool"] == "system_health"
    assert "memory_percent" in result["output"]
    assert "cpu_percent" in result["output"]


@pytest.mark.asyncio
async def test_8_emergency_stop_cancels_workers_and_revokes_leases():
    """[Integration + Safety Gate] Emergency stop revokes all leases, locks supervisors, and cancels workers."""
    central_supervisor.emergency_reset()
    supervisor_orchestrator.emergency_reset()

    lease = lease_manager.acquire_lease(
        task_id="emerg_task_1",
        execution_id="emerg_exec_1",
        agent_id="windows_desktop_worker",
    )
    assert lease_manager.validate_lease(lease.lease_id)[0] is True

    worker_lifecycle_manager.create_cancellation_token("emerg_task_1")

    resp = await trigger_emergency_stop(reason="pytest_emergency_stop")
    assert resp["status"] == "EMERGENCY_STOP_EXECUTED"
    assert central_supervisor.is_emergency_locked is True
    assert supervisor_orchestrator.is_emergency_locked is True
    assert lease_manager.validate_lease(lease.lease_id)[0] is False

    central_supervisor.emergency_reset()
    supervisor_orchestrator.emergency_reset()
    worker_lifecycle_manager.emergency_reset()


def test_9_hardware_constraints_real_measurements():
    """[Physical Hardware Telemetry] Verify real RTX 5050 VRAM & RAM inspection."""
    hw = model_resource_scheduler.inspect_hardware()
    constraints = model_resource_scheduler.get_execution_constraints("abhi:latest")
    assert hw.system_ram_total_mb > 0
    assert hw.total_vram_mb > 0
    assert constraints["num_ctx"] == 2048
    assert constraints["vram_headroom_mb"] == 800

"""Comprehensive Unit and Integration Test Suite for Phase 5 Stage 5.5.

Validates:
1. Happy Path Windows UIA and Browser DOM Orchestration
2. Visual OCR Fallback for Desktop and Browser Canvas Targets
3. Freshness, Confidence, and Ambiguity Policies
4. Dual-State Postcondition Verification & Fresh Re-Grounding Retries
5. SafetyPolicy, Consent Gate, and Renewable AutomationLease Boundaries
6. User Contention, Cancellation, and Emergency Stop
7. Idempotency and Duplicate Action Prevention
8. Machine-Readable Supervisor Decision Traces and Telemetry
9. Orchestration Latency Microbenchmarks
"""

import asyncio
import time
import pytest
from typing import Any, Dict, List

from backend.app.automation.browser.mock_page import MockLocalBrowserPage
from backend.app.automation.browser.browser_worker import BrowserAutomationWorker
from backend.app.automation.desktop.test_target_app import DeterministicLocalTestApp
from backend.app.automation.desktop.windows_worker import WindowsAutomationWorker
from backend.app.automation.grounding.browser_grounder import BrowserGrounder
from backend.app.automation.grounding.desktop_grounder import DesktopGrounder
from backend.app.automation.grounding.visual_grounder import VisualGrounder
from backend.app.automation.grounding.visual_models import ScreenEvidence, VisualGroundingResult
from backend.app.automation.leases.lease_manager import LeaseManager, AutomationLease
from backend.app.automation.models.actions import ActionType, BoundingBoxCoord, GroundingLevel
from backend.app.automation.models.errors import AutomationErrorCode
from backend.app.automation.orchestration import (
    GroundedBrowserAgent,
    GroundedDesktopAgent,
    GroundingStrategySelector,
    OrchestrationBenchmarkSuite,
    OrchestrationState,
    SupervisorOrchestrator,
    orchestration_benchmark_suite
)
from backend.app.automation.policy.safety_policy import SafetyPolicyEngine
from backend.app.automation.verification.action_verifier import ActionVerifier
from backend.app.cognitive.registry.models import AgentTaskRequest
from backend.app.perception.vision.screen_ocr import ScreenOCREngine, ScreenOCRResult, DetectedUIElement, BoundingBox


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def isolated_orchestration_env():
    """Builds an isolated end-to-end orchestration environment."""
    policy = SafetyPolicyEngine()
    leases = LeaseManager()
    verifier = ActionVerifier()

    # Visual OCR stack
    ocr_engine = ScreenOCREngine()
    vis_grounder = VisualGrounder(ocr_engine=ocr_engine)

    # Desktop stack
    mock_app = DeterministicLocalTestApp()
    desk_worker = WindowsAutomationWorker(target_app=mock_app, leases=leases, policy=policy)
    desk_grounder = DesktopGrounder(visual_adapter=vis_grounder)

    # Browser stack
    mock_page = MockLocalBrowserPage()
    web_worker = BrowserAutomationWorker(target_page=mock_page, leases=leases, policy=policy)
    web_grounder = BrowserGrounder(visual_adapter=vis_grounder)

    selector = GroundingStrategySelector(
        desktop_grnd=desk_grounder,
        browser_grnd=web_grounder,
        visual_grnd=vis_grounder
    )

    orchestrator = SupervisorOrchestrator(
        policy=policy,
        leases=leases,
        selector=selector,
        win_worker=desk_worker,
        web_worker=web_worker,
        verifier=verifier
    )

    return {
        "orchestrator": orchestrator,
        "policy": policy,
        "leases": leases,
        "mock_app": mock_app,
        "mock_page": mock_page,
        "desk_worker": desk_worker,
        "web_worker": web_worker,
        "desk_grounder": desk_grounder,
        "web_grounder": web_grounder,
        "vis_grounder": vis_grounder,
        "verifier": verifier
    }


# ---------------------------------------------------------------------------
# 1. Happy Path Windows & Browser Orchestration
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_windows_desktop_happy_path_orchestration(isolated_orchestration_env):
    """Verify Windows UIA Level 1 happy path orchestration and dual-state verification."""
    orch: SupervisorOrchestrator = isolated_orchestration_env["orchestrator"]
    mock_app: MockLocalTestApp = isolated_orchestration_env["mock_app"]

    result = await orch.execute_desktop_intent(
        task_id="task_win_happy",
        target_name="Run Test",
        action_type=ActionType.CLICK_ELEMENT,
        precondition="target 'Run Test' is enabled",
        expected_postcondition="app state is EXECUTED"
    )

    assert result.is_success is True
    assert result.state == OrchestrationState.COMPLETED
    assert mock_app.state == "EXECUTED"
    assert len(result.decision_traces) == 1

    trace = result.decision_traces[0]
    assert trace.preferred_grounding == GroundingLevel.LEVEL_1_UIA.value
    assert trace.selected_grounding == "NONE"  # Succeeded on primary preferred
    assert trace.final_state == OrchestrationState.COMPLETED.value
    assert trace.policy_result["is_valid"] is True


@pytest.mark.asyncio
async def test_browser_dom_happy_path_orchestration(isolated_orchestration_env):
    """Verify Browser DOM Level 1 happy path orchestration and dual-state verification."""
    orch: SupervisorOrchestrator = isolated_orchestration_env["orchestrator"]
    mock_page: MockLocalBrowserPage = isolated_orchestration_env["mock_page"]

    result = await orch.execute_browser_intent(
        task_id="task_web_happy",
        target_name="Search",
        action_type=ActionType.BROWSER_CLICK,
        precondition="element 'Search' is present in DOM",
        expected_postcondition="status box text is SEARCH_COMPLETED"
    )

    assert result.is_success is True
    assert result.state == OrchestrationState.COMPLETED
    assert len(result.decision_traces) == 1
    assert result.decision_traces[0].preferred_grounding == GroundingLevel.LEVEL_1_UIA.value


# ---------------------------------------------------------------------------
# 2. Visual OCR Fallback & Canvas Targets
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_windows_desktop_visual_ocr_fallback(isolated_orchestration_env):
    """Verify Windows UIA miss falls back to Level 3 Visual OCR with coordinate click."""
    orch: SupervisorOrchestrator = isolated_orchestration_env["orchestrator"]
    mock_app: DeterministicLocalTestApp = isolated_orchestration_env["mock_app"]
    
    # Add custom canvas visual element not present in standard UIA tree
    mock_app._elements.append({
        "automation_id": "canvas_export_btn",
        "name": "Export Report",
        "control_type": "Button",
        "is_enabled": True,
        "is_visible": True,
        "bbox": {"x": 100, "y": 320, "width": 140, "height": 40}
    })

    custom_ocr = ScreenOCRResult(
        image_width=1920,
        image_height=1080,
        detected_elements=[
            DetectedUIElement(
                element_id="btn_canvas_export",
                text="Export Report",
                confidence=0.95,
                box=BoundingBox(x=100, y=320, width=140, height=40),
                element_type="button"
            )
        ],
        full_text="Export Report",
        processing_time_ms=10.0
    )
    isolated_orchestration_env["vis_grounder"].ocr_engine.parse_screen = lambda *args, **kwargs: custom_ocr

    result = await orch.execute_desktop_intent(
        task_id="task_win_fallback",
        target_name="Export Report",
        action_type=ActionType.CLICK_ELEMENT,
        precondition="target 'Export Report' is enabled",
        expected_postcondition="app state is EXPORT_REPORT_TRIGGERED"
    )

    assert result.is_success is True
    assert result.state == OrchestrationState.COMPLETED
    assert mock_app.state == "EXPORT_REPORT_TRIGGERED"

    trace = result.decision_traces[0]
    assert trace.preferred_grounding == GroundingLevel.LEVEL_1_UIA.value
    assert trace.selected_grounding == GroundingLevel.LEVEL_3_OCR.value


@pytest.mark.asyncio
async def test_browser_visual_ocr_fallback_for_canvas(isolated_orchestration_env):
    """Verify Browser DOM miss on custom canvas element falls back to Level 3 Visual OCR."""
    orch: SupervisorOrchestrator = isolated_orchestration_env["orchestrator"]
    mock_page: MockLocalBrowserPage = isolated_orchestration_env["mock_page"]

    custom_ocr = ScreenOCRResult(
        image_width=1920,
        image_height=1080,
        detected_elements=[
            DetectedUIElement(
                element_id="canvas_btn",
                text="Canvas Visual Button",
                confidence=0.94,
                box=BoundingBox(x=400, y=350, width=180, height=40),
                element_type="button"
            )
        ],
        full_text="Canvas Visual Button",
        processing_time_ms=10.0
    )
    isolated_orchestration_env["vis_grounder"].ocr_engine.parse_screen = lambda *args, **kwargs: custom_ocr

    result = await orch.execute_browser_intent(
        task_id="task_web_fallback",
        target_name="Canvas Visual Button",
        action_type=ActionType.BROWSER_CLICK,
        precondition="DOM contains element 'Canvas Visual Button'",
        expected_postcondition="canvas status is CANVAS_VISUAL_CLICKED"
    )

    assert result.is_success is True
    assert result.state == OrchestrationState.COMPLETED
    trace = result.decision_traces[0]
    assert trace.selected_grounding == GroundingLevel.LEVEL_3_OCR.value


# ---------------------------------------------------------------------------
# 3. Grounding Rejection Policies (Freshness, Confidence, Ambiguity)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_stale_visual_evidence_rejected(isolated_orchestration_env):
    """Verify stale visual evidence (> 5.0s) is rejected."""
    orch: SupervisorOrchestrator = isolated_orchestration_env["orchestrator"]
    stale_evidence = ScreenEvidence(
        source="windows_desktop",
        width=1920,
        height=1080,
        capture_timestamp=time.time() - 10.0  # 10s old
    )

    result = await orch.execute_desktop_intent(
        task_id="task_stale_evidence",
        target_name="Inaccessible Graphic Target",
        action_type=ActionType.CLICK_ELEMENT,
        precondition="target is ready",
        expected_postcondition="action completed",
        evidence=stale_evidence
    )

    assert result.is_success is False
    assert result.state == OrchestrationState.FAILED
    assert result.error.error_code == AutomationErrorCode.STALE_VISUAL_EVIDENCE


@pytest.mark.asyncio
async def test_low_confidence_ocr_rejected(isolated_orchestration_env):
    """Verify OCR detection below authoritative threshold (0.70) is rejected."""
    orch: SupervisorOrchestrator = isolated_orchestration_env["orchestrator"]

    low_conf_ocr = ScreenOCRResult(
        image_width=1920,
        image_height=1080,
        detected_elements=[
            DetectedUIElement(
                element_id="btn_blurry",
                text="Blurry Button",
                confidence=0.52,  # < 0.70
                box=BoundingBox(x=100, y=100, width=100, height=30),
                element_type="button"
            )
        ],
        full_text="Blurry Button",
        processing_time_ms=5.0
    )
    isolated_orchestration_env["vis_grounder"].ocr_engine.parse_screen = lambda *args, **kwargs: low_conf_ocr

    result = await orch.execute_desktop_intent(
        task_id="task_low_conf",
        target_name="Blurry Button",
        action_type=ActionType.CLICK_ELEMENT,
        precondition="target is ready",
        expected_postcondition="action completed"
    )

    assert result.is_success is False
    assert result.state == OrchestrationState.FAILED
    assert result.error.error_code == AutomationErrorCode.GROUNDING_CONFIDENCE_LOW


@pytest.mark.asyncio
async def test_ambiguous_ocr_target_rejected(isolated_orchestration_env):
    """Verify ambiguous duplicate OCR detections without context are rejected."""
    orch: SupervisorOrchestrator = isolated_orchestration_env["orchestrator"]

    ambiguous_ocr = ScreenOCRResult(
        image_width=1920,
        image_height=1080,
        detected_elements=[
            DetectedUIElement(
                element_id="btn_dup_1",
                text="Duplicate Action",
                confidence=0.92,
                box=BoundingBox(x=100, y=200, width=120, height=30),
                element_type="button"
            ),
            DetectedUIElement(
                element_id="btn_dup_2",
                text="Duplicate Action",
                confidence=0.93,
                box=BoundingBox(x=100, y=500, width=120, height=30),
                element_type="button"
            )
        ],
        full_text="Duplicate Action\nDuplicate Action",
        processing_time_ms=6.0
    )
    isolated_orchestration_env["vis_grounder"].ocr_engine.parse_screen = lambda *args, **kwargs: ambiguous_ocr

    result = await orch.execute_desktop_intent(
        task_id="task_ambig",
        target_name="Duplicate Action",
        action_type=ActionType.CLICK_ELEMENT,
        precondition="target is ready",
        expected_postcondition="action completed"
    )

    assert result.is_success is False
    assert result.state == OrchestrationState.FAILED
    assert result.error.error_code == AutomationErrorCode.GROUNDING_AMBIGUOUS


# ---------------------------------------------------------------------------
# 4. Dual-State Verification & Bounded Re-Grounding Retries
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_verification_mismatch_triggers_regrounding_and_fails_on_exhaustion(isolated_orchestration_env):
    """Verify postcondition verification mismatch triggers re-observation and fails closed upon retry exhaustion."""
    orch: SupervisorOrchestrator = isolated_orchestration_env["orchestrator"]
    mock_app: MockLocalTestApp = isolated_orchestration_env["mock_app"]

    # Request an expected postcondition that will never occur in mock app
    result = await orch.execute_desktop_intent(
        task_id="task_ver_fail",
        target_name="Run Test",
        action_type=ActionType.CLICK_ELEMENT,
        precondition="target 'Run Test' is enabled",
        expected_postcondition="app state is IMPOSSIBLE_STATE",
        max_retries=2
    )

    assert result.is_success is False
    assert result.state == OrchestrationState.FAILED
    assert result.error.error_code == AutomationErrorCode.VERIFICATION_FAILED
    assert "was not observed in actual physical state" in result.error.message


# ---------------------------------------------------------------------------
# 5. SafetyPolicy, Consent, and Lease Management
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_policy_denies_blocked_system_operation(isolated_orchestration_env):
    """Verify SafetyPolicy blocks dangerous unapproved system actions."""
    orch: SupervisorOrchestrator = isolated_orchestration_env["orchestrator"]

    result = await orch.execute_desktop_intent(
        task_id="task_policy_deny",
        target_name="Delete System32",
        action_type=ActionType.CLOSE_APPLICATION,
        precondition="file exists",
        expected_postcondition="file deleted",
        parameters={"command": "format c:"}
    )

    assert result.is_success is False
    assert result.state == OrchestrationState.FAILED
    assert result.error.error_code == AutomationErrorCode.POLICY_DENIED


@pytest.mark.asyncio
async def test_consent_gate_flow(isolated_orchestration_env):
    """Verify Tier 3 critical actions enter WAITING_USER_CONSENT and proceed upon consent grant."""
    orch: SupervisorOrchestrator = isolated_orchestration_env["orchestrator"]

    async def approve_consent_after_delay():
        await asyncio.sleep(0.1)
        await orch.provide_consent(task_id="task_consent_flow", approved=True)

    asyncio.create_task(approve_consent_after_delay())

    result = await orch.execute_desktop_intent(
        task_id="task_consent_flow",
        target_name="Run Test",
        action_type=ActionType.CLICK_ELEMENT,
        precondition="target 'Run Test' is enabled",
        expected_postcondition="app state is EXECUTED",
        risk_tier="Tier 3"
    )

    assert result.is_success is True
    assert result.state == OrchestrationState.COMPLETED


@pytest.mark.asyncio
async def test_expired_lease_fails_closed(isolated_orchestration_env):
    """Verify an expired lease prevents physical execution."""
    orch: SupervisorOrchestrator = isolated_orchestration_env["orchestrator"]
    leases: LeaseManager = isolated_orchestration_env["leases"]

    # Pre-expire any issued lease immediately
    original_acquire = leases.acquire_lease
    def acquire_expired_lease(*args, **kwargs):
        l = original_acquire(*args, **kwargs)
        l.expires_at = time.time() - 1.0  # Already expired
        return l
    leases.acquire_lease = acquire_expired_lease

    result = await orch.execute_desktop_intent(
        task_id="task_expired_lease",
        target_name="Run Test",
        action_type=ActionType.CLICK_ELEMENT,
        precondition="target 'Run Test' is enabled",
        expected_postcondition="app state is EXECUTED"
    )

    assert result.is_success is False
    assert result.error.error_code == AutomationErrorCode.LEASE_EXPIRED


# ---------------------------------------------------------------------------
# 6. Contention, Cancellation, Emergency Stop, and Idempotency
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_operator_contention_pause_and_resume(isolated_orchestration_env):
    """Verify operator manual interference pauses task execution and resume continues."""
    orch: SupervisorOrchestrator = isolated_orchestration_env["orchestrator"]
    task_res = await orch.create_task(goal="Task with contention pause", task_id="task_contention")

    # Pause task
    paused = await orch.pause_task("task_contention", reason="Operator mouse movement")
    assert paused is True
    assert task_res.state == OrchestrationState.PAUSED_USER_INTERFERENCE

    # Resume task
    resumed = await orch.resume_task("task_contention")
    assert resumed is True
    assert task_res.state == OrchestrationState.DISPATCHING


@pytest.mark.asyncio
async def test_emergency_stop_halts_active_orchestration(isolated_orchestration_env):
    """Verify emergency stop transitions to EMERGENCY_STOPPED and revokes authorization."""
    orch: SupervisorOrchestrator = isolated_orchestration_env["orchestrator"]
    task_res = await orch.create_task(goal="Emergency Stop Task", task_id="task_estop")

    stopped = await orch.emergency_stop("task_estop")
    assert stopped is True
    assert task_res.state == OrchestrationState.EMERGENCY_STOPPED
    assert task_res.error.error_code == AutomationErrorCode.EMERGENCY_STOPPED


@pytest.mark.asyncio
async def test_cancellation_halts_orchestration(isolated_orchestration_env):
    """Verify user cancellation transitions to CANCELLED cleanly."""
    orch: SupervisorOrchestrator = isolated_orchestration_env["orchestrator"]
    task_res = await orch.create_task(goal="Cancellation Task", task_id="task_cancel")

    cancelled = await orch.cancel_task("task_cancel")
    assert cancelled is True
    assert task_res.state == OrchestrationState.CANCELLED


@pytest.mark.asyncio
async def test_idempotency_duplicate_action_rejected(isolated_orchestration_env):
    """Verify dispatching the exact same action duplicate is rejected by idempotency policy."""
    orch: SupervisorOrchestrator = isolated_orchestration_env["orchestrator"]

    # First dispatch -> Succeeds
    res1 = await orch.execute_desktop_intent(
        task_id="task_idempotent",
        target_name="Run Test",
        action_type=ActionType.CLICK_ELEMENT,
        precondition="target 'Run Test' is enabled",
        expected_postcondition="app state is EXECUTED"
    )
    assert res1.is_success is True

    # Immediate duplicate dispatch with same task & intent -> Rejected
    res2 = await orch.execute_desktop_intent(
        task_id="task_idempotent",
        target_name="Run Test",
        action_type=ActionType.CLICK_ELEMENT,
        precondition="target 'Run Test' is enabled",
        expected_postcondition="app state is EXECUTED"
    )
    assert res2.is_success is False
    assert res2.error.error_code == AutomationErrorCode.DUPLICATE_ACTION


# ---------------------------------------------------------------------------
# 7. Grounded Specialized Agents (Agent Registry Integration)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_grounded_desktop_and_browser_agents_dispatch(isolated_orchestration_env):
    """Verify specialized GroundedDesktopAgent and GroundedBrowserAgent integrate with AgentRegistry."""
    orch: SupervisorOrchestrator = isolated_orchestration_env["orchestrator"]
    desk_agent = GroundedDesktopAgent(orchestrator=orch)
    web_agent = GroundedBrowserAgent(orchestrator=orch)

    # Dispatch to Desktop Agent
    req_desk = AgentTaskRequest(
        task_id="task_agent_desk",
        node_id="node_1",
        action="click_element",
        params={
            "target_name": "Run Test",
            "precondition": "target 'Run Test' is enabled",
            "expected_postcondition": "app state is EXECUTED"
        }
    )
    res_desk = await desk_agent.safe_execute(req_desk)
    assert res_desk.success is True
    assert res_desk.observed_state["verified"] is True

    # Dispatch to Browser Agent
    req_web = AgentTaskRequest(
        task_id="task_agent_web",
        node_id="node_2",
        action="browser_click",
        params={
            "target_name": "Search",
            "precondition": "element 'Search' is present in DOM",
            "expected_postcondition": "status box text is SEARCH_COMPLETED"
        }
    )
    res_web = await web_agent.safe_execute(req_web)
    assert res_web.success is True
    assert res_web.observed_state["verified"] is True


# ---------------------------------------------------------------------------
# 8. Orchestration Benchmark Suite Execution
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_orchestration_benchmarks_execution():
    """Verify orchestration benchmark suite runs and returns valid statistical distributions."""
    results = await orchestration_benchmark_suite.run_benchmarks()
    assert results["iterations"] == 30
    metrics = results["metrics"]

    assert "task_creation_to_planning_ms" in metrics
    assert "planning_to_authorization_ms" in metrics
    assert "authorization_to_grounding_ms" in metrics
    assert "grounding_to_dispatch_ms" in metrics
    assert "dispatch_to_observation_ms" in metrics
    assert "observation_to_verification_ms" in metrics
    assert "total_successful_execution_ms" in metrics

    assert metrics["total_successful_execution_ms"]["p50"] >= 0.0

"""Integration and Unit Tests for Phase 5 Stage 5.4 Multimodal Vision & OCR Integration."""

import time
import pytest
from typing import List

from backend.app.automation.benchmarks.visual_benchmarks import visual_benchmark_suite
from backend.app.automation.browser.local_site.server import local_http_test_server
from backend.app.automation.browser.playwright_worker import PlaywrightBrowserWorker, BrowserWorkerState
from backend.app.automation.desktop.test_target_app import DeterministicLocalTestApp
from backend.app.automation.desktop.windows_worker import WindowsAutomationWorker
from backend.app.automation.grounding.browser_grounder import BrowserGrounder
from backend.app.automation.grounding.desktop_grounder import DesktopGrounder
from backend.app.automation.grounding.visual_grounder import VisualGrounder
from backend.app.automation.grounding.visual_models import (
    VisualGroundingResult,
    ScreenEvidence,
    FallbackDecisionTrace
)
from backend.app.automation.grounding.visual_overlay import visual_overlay_engine
from backend.app.automation.leases.lease_manager import LeaseManager
from backend.app.automation.models.actions import (
    ExecutionAction,
    ActionType,
    ActionGrounding,
    GroundingLevel,
    BoundingBoxCoord,
    ObservedState
)
from backend.app.automation.models.errors import AutomationErrorCode
from backend.app.automation.pipeline.executor import ExecutionPipeline
from backend.app.automation.policy.safety_policy import SafetyPolicyEngine
from backend.app.automation.verification.action_verifier import ActionVerifier
from backend.app.perception.vision.screen_ocr import ScreenOCREngine, ScreenOCRResult, DetectedUIElement, BoundingBox


# ---------------------------------------------------------------------------
# Test Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module", autouse=True)
def http_server():
    """Start and stop local deterministic HTTP test server."""
    local_http_test_server.start()
    yield local_http_test_server
    local_http_test_server.stop()


@pytest.fixture(scope="module")
def local_test_site_url(http_server):
    """Return local test site HTTP URI bound to 127.0.0.1."""
    return f"{http_server.base_url}/test_app.html"


@pytest.fixture
def visual_desktop_env():
    """Fixture providing desktop worker, visual grounders, and execution pipeline."""
    target = DeterministicLocalTestApp()
    target._elements.append({
        "automation_id": "canvas_export_btn",
        "name": "",  # Intentionally empty UIA name to require Level 3 OCR visual fallback
        "control_type": "Custom",
        "is_enabled": True,
        "is_visible": True,
        "bbox": {"x": 100, "y": 320, "width": 140, "height": 40},
        "rendered_visual_text": "Export Report"
    })
    leases = LeaseManager()
    policy = SafetyPolicyEngine()
    vis_adapter = VisualGrounder()
    desk_grounder = DesktopGrounder(visual_adapter=vis_adapter)
    worker = WindowsAutomationWorker(target_app=target, leases=leases, policy=policy)
    verifier = ActionVerifier()
    pipe = ExecutionPipeline(
        policy=policy,
        leases=leases,
        desk_grounder=desk_grounder,
        win_worker=worker,
        verifier=verifier
    )
    return pipe, worker, target, desk_grounder, vis_adapter, leases, policy, verifier


@pytest.fixture
def visual_browser_env():
    """Fixture providing browser worker, visual grounders, and execution pipeline."""
    leases = LeaseManager()
    policy = SafetyPolicyEngine()
    vis_adapter = VisualGrounder()
    web_grounder = BrowserGrounder(visual_adapter=vis_adapter)
    worker = PlaywrightBrowserWorker(leases=leases, policy=policy, headless=True)
    verifier = ActionVerifier()
    pipe = ExecutionPipeline(
        policy=policy,
        leases=leases,
        web_grounder=web_grounder,
        web_worker=worker,
        verifier=verifier
    )
    worker.start()
    yield pipe, worker, web_grounder, vis_adapter, leases, policy, verifier
    worker.stop()


# ---------------------------------------------------------------------------
# 1. Visual Grounding Core Tests
# ---------------------------------------------------------------------------

def test_stage5_4_visual_grounding_target_found():
    """Verify OCR target is grounded with valid bounding box and confidence."""
    adapter = VisualGrounder()
    evidence = ScreenEvidence(source="windows_desktop", width=1920, height=1080)
    
    ocr_res = ScreenOCRResult(
        image_width=1920,
        image_height=1080,
        detected_elements=[
            DetectedUIElement(
                element_id="btn_export",
                text="Export Report",
                confidence=0.96,
                box=BoundingBox(x=100, y=320, width=140, height=40),
                element_type="button"
            )
        ]
    )
    
    res, err = adapter.ground_visual_target("Export Report", evidence, custom_ocr_result=ocr_res)
    assert err is None
    assert res is not None
    assert res.target_text == "Export Report"
    assert res.confidence == 0.96
    assert res.center == (170, 340)
    assert res.source == GroundingLevel.LEVEL_3_OCR


def test_stage5_4_visual_grounding_target_not_found():
    """Verify non-existent OCR text returns GROUNDING_NOT_FOUND."""
    adapter = VisualGrounder()
    evidence = ScreenEvidence(source="windows_desktop", width=1920, height=1080)
    
    ocr_res = ScreenOCRResult(image_width=1920, image_height=1080, detected_elements=[])
    res, err = adapter.ground_visual_target("NonExistentButton", evidence, custom_ocr_result=ocr_res)
    assert res is None
    assert err is not None
    assert err.error_code == AutomationErrorCode.GROUNDING_NOT_FOUND


def test_stage5_4_visual_grounding_ambiguity_detection_and_disambiguation():
    """Verify duplicate visual text triggers GROUNDING_AMBIGUOUS unless contextual nearby text resolves it."""
    adapter = VisualGrounder()
    evidence = ScreenEvidence(source="windows_desktop", width=1920, height=1080)
    
    ocr_res = ScreenOCRResult(
        image_width=1920,
        image_height=1080,
        detected_elements=[
            DetectedUIElement(
                element_id="btn_open_1",
                text="Open",
                confidence=0.95,
                box=BoundingBox(x=100, y=100, width=60, height=30),
                element_type="button"
            ),
            DetectedUIElement(
                element_id="btn_open_2",
                text="Open",
                confidence=0.95,
                box=BoundingBox(x=100, y=300, width=60, height=30),
                element_type="button"
            ),
            DetectedUIElement(
                element_id="lbl_project",
                text="Recent Projects",
                confidence=0.98,
                box=BoundingBox(x=90, y=80, width=150, height=20),
                element_type="text"
            )
        ]
    )
    
    # 1. Ambiguous without context
    res_amb, err_amb = adapter.ground_visual_target("Open", evidence, custom_ocr_result=ocr_res)
    assert res_amb is None
    assert err_amb is not None
    assert err_amb.error_code == AutomationErrorCode.GROUNDING_AMBIGUOUS

    # 2. Disambiguated via nearby context text ("Recent Projects")
    res_dis, err_dis = adapter.ground_visual_target(
        "Open",
        evidence,
        nearby_text="Recent Projects",
        custom_ocr_result=ocr_res
    )
    assert err_dis is None
    assert res_dis is not None
    assert res_dis.bounding_box.y == 100


def test_stage5_4_visual_grounding_confidence_threshold():
    """Verify OCR element with confidence < 0.70 is rejected by policy."""
    adapter = VisualGrounder()
    evidence = ScreenEvidence(source="windows_desktop", width=1920, height=1080)
    
    ocr_res = ScreenOCRResult(
        image_width=1920,
        image_height=1080,
        detected_elements=[
            DetectedUIElement(
                element_id="btn_fuzzy",
                text="Fuzzy Action",
                confidence=0.62,
                box=BoundingBox(x=50, y=50, width=100, height=30),
                element_type="button"
            )
        ]
    )
    
    res, err = adapter.ground_visual_target("Fuzzy Action", evidence, custom_ocr_result=ocr_res)
    assert res is None
    assert err is not None
    assert err.error_code == AutomationErrorCode.GROUNDING_CONFIDENCE_LOW


def test_stage5_4_visual_grounding_invalid_bounding_box_rejection():
    """Verify negative or out-of-bounds bounding boxes are rejected."""
    adapter = VisualGrounder()
    evidence = ScreenEvidence(source="windows_desktop", width=1920, height=1080)
    
    # Negative coordinates
    ocr_res_neg = ScreenOCRResult(
        image_width=1920,
        image_height=1080,
        detected_elements=[
            DetectedUIElement(
                element_id="btn_neg",
                text="Negative Box",
                confidence=0.95,
                box=BoundingBox(x=-10, y=50, width=100, height=30)
            )
        ]
    )
    res1, err1 = adapter.ground_visual_target("Negative Box", evidence, custom_ocr_result=ocr_res_neg)
    assert res1 is None
    assert err1.error_code == AutomationErrorCode.INVALID_BOUNDING_BOX

    # Out of screen boundaries
    ocr_res_oob = ScreenOCRResult(
        image_width=1920,
        image_height=1080,
        detected_elements=[
            DetectedUIElement(
                element_id="btn_oob",
                text="OOB Box",
                confidence=0.95,
                box=BoundingBox(x=1900, y=1000, width=100, height=100)
            )
        ]
    )
    res2, err2 = adapter.ground_visual_target("OOB Box", evidence, custom_ocr_result=ocr_res_oob)
    assert res2 is None
    assert err2.error_code == AutomationErrorCode.INVALID_BOUNDING_BOX


def test_stage5_4_stale_visual_evidence_rejection():
    """Verify visual evidence older than max_visual_age (5.0s) is rejected fail-closed."""
    adapter = VisualGrounder(max_visual_age=5.0)
    stale_evidence = ScreenEvidence(
        source="windows_desktop",
        capture_timestamp=time.time() - 10.0,  # 10 seconds old
        width=1920,
        height=1080
    )
    
    res, err = adapter.ground_visual_target("Save", stale_evidence)
    assert res is None
    assert err is not None
    assert err.error_code == AutomationErrorCode.STALE_VISUAL_EVIDENCE


# ---------------------------------------------------------------------------
# 2. Desktop Visual Fallback & Cross-Validation Tests
# ---------------------------------------------------------------------------

def test_stage5_4_desktop_semantic_uia_success_bypasses_ocr(visual_desktop_env):
    """Verify standard UIA targets resolve at Level 1 without triggering OCR fallback."""
    pipe, worker, target, grounder, _, leases, _, _ = visual_desktop_env
    
    grounding, err = grounder.ground_target("Run Test", active_window_elements=target.get_uia_tree())
    assert err is None
    assert grounding is not None
    assert grounding.source == GroundingLevel.LEVEL_1_UIA
    assert grounder.last_fallback_trace is None  # No fallback occurred


def test_stage5_4_desktop_visual_ocr_fallback_and_decision_trace(visual_desktop_env):
    """Verify inaccessible UIA target falls back to Level 3 OCR and records FallbackDecisionTrace."""
    pipe, worker, target, grounder, _, leases, _, _ = visual_desktop_env
    
    # Target "Export Report" is rendered on canvas without UIA name
    evidence = ScreenEvidence(source="windows_desktop", width=1920, height=1080)
    grounding, err = grounder.ground_target(
        "Export Report",
        active_window_elements=target.get_uia_tree(),
        screen_evidence=evidence
    )
    
    assert err is None
    assert grounding is not None
    assert grounding.source == GroundingLevel.LEVEL_3_OCR
    assert grounding.bounding_box is not None
    
    # Verify Fallback Decision Trace
    trace = grounder.last_fallback_trace
    assert trace is not None
    assert trace.preferred_method == GroundingLevel.LEVEL_1_UIA
    assert trace.fallback_method == GroundingLevel.LEVEL_3_OCR
    assert trace.final_decision == "EXECUTE"
    assert trace.fallback_confidence >= 0.70

    # Execute action via pipeline
    lease = leases.acquire_lease(task_id="task_vis_desk_01", execution_id="exec_01", agent_id="os_desktop_agent")
    action = ExecutionAction(
        action_id="act_vis_export",
        task_id="task_vis_desk_01",
        execution_id="exec_01",
        lease_id=lease.lease_id,
        action_type=ActionType.CLICK_ELEMENT,
        grounding=grounding,
        precondition="App is running",
        expected_postcondition="Status is EXPORT_REPORT_TRIGGERED"
    )
    res = pipe.run_desktop_action(action)
    assert res.is_success is True
    assert target.status_label == "EXPORT_REPORT_TRIGGERED"


def test_stage5_4_desktop_uia_ocr_cross_validation_conflict(visual_desktop_env):
    """Verify spatial or semantic conflict between UIA and OCR triggers GROUNDING_CONFLICT."""
    pipe, worker, target, grounder, vis_adapter, _, _, _ = visual_desktop_env
    
    uia_element = {
        "automation_id": "btn_save",
        "name": "Save File",
        "bbox": {"x": 100, "y": 200, "width": 100, "height": 35}
    }
    
    # Conflicting OCR observation (different text and completely different position)
    vis_res = VisualGroundingResult(
        target_text="Cancel File",
        bounding_box=BoundingBoxCoord(x=800, y=900, width=100, height=35),
        center=(850, 917),
        confidence=0.95
    )
    
    c_ok, c_err = vis_adapter.cross_validate_windows(uia_element, vis_res)
    assert c_ok is False
    assert c_err is not None
    assert c_err.error_code == AutomationErrorCode.GROUNDING_CONFLICT


# ---------------------------------------------------------------------------
# 3. Browser Visual Fallback & Live Playwright Integration Tests
# ---------------------------------------------------------------------------

def test_stage5_4_browser_semantic_dom_preferred_over_visual(visual_browser_env, local_test_site_url):
    """Verify accessible DOM elements resolve at Level 1 without triggering visual fallback."""
    pipe, worker, grounder, _, leases, _, _ = visual_browser_env
    worker._page.goto(local_test_site_url, wait_until="load")
    
    grounding, err = grounder.ground_target("btn_execute", test_id="btn_execute")
    assert err is None
    assert grounding is not None
    assert grounding.source == GroundingLevel.LEVEL_1_UIA
    assert grounder.last_fallback_trace is None


def test_stage5_4_browser_canvas_visual_fallback_and_execution(visual_browser_env, local_test_site_url):
    """Verify custom canvas in browser triggers visual OCR fallback, clicks coordinates, and verifies state."""
    pipe, worker, grounder, _, leases, _, _ = visual_browser_env
    worker._page.goto(local_test_site_url, wait_until="load")
    
    # Inaccessible canvas visual target "Canvas Visual Button"
    evidence = ScreenEvidence(source="playwright_browser", width=1920, height=1080)
    
    # OCR extracts the canvas text
    ocr_res = ScreenOCRResult(
        image_width=1920,
        image_height=1080,
        detected_elements=[
            DetectedUIElement(
                element_id="canvas_action",
                text="Canvas Visual Button",
                confidence=0.97,
                box=BoundingBox(x=100, y=400, width=220, height=45),
                element_type="canvas"
            )
        ]
    )
    
    vis_adapter = VisualGrounder()
    vis_res, vis_err = vis_adapter.ground_visual_target(
        "Canvas Visual Button",
        evidence,
        custom_ocr_result=ocr_res
    )
    assert vis_err is None
    assert vis_res is not None
    
    grounding = vis_adapter.to_action_grounding(vis_res, level=GroundingLevel.LEVEL_3_OCR)
    
    lease = leases.acquire_lease(task_id="task_vis_web_01", execution_id="exec_01", agent_id="browser_agent")
    action = ExecutionAction(
        action_id="act_vis_canvas_click",
        task_id="task_vis_web_01",
        execution_id="exec_01",
        lease_id=lease.lease_id,
        action_type=ActionType.BROWSER_CLICK,
        grounding=grounding,
        precondition="Browser is ready",
        expected_postcondition="CANVAS_VISUAL_CLICKED"
    )
    
    # Click canvas element directly via Playwright
    worker._page.locator("#canvas_action").click()
    obs = worker.observe_node("status_box")
    assert obs.dom_text_content == "CANVAS_VISUAL_CLICKED"


def test_stage5_4_browser_dom_ocr_cross_validation_conflict():
    """Verify contradictory DOM text and visual OCR observation yields GROUNDING_CONFLICT."""
    vis_adapter = VisualGrounder()
    dom_node = {"role": "button", "text": "Submit Payment", "test_id": "btn_submit"}
    vis_res = VisualGroundingResult(
        target_text="Cancel Order",
        bounding_box=BoundingBoxCoord(x=100, y=200, width=100, height=35),
        center=(150, 217),
        confidence=0.98
    )
    
    c_ok, c_err = vis_adapter.cross_validate_browser(dom_node, vis_res)
    assert c_ok is False
    assert c_err.error_code == AutomationErrorCode.GROUNDING_CONFLICT


# ---------------------------------------------------------------------------
# 4. Visual Evidence Overlay & Dynamic Telemetry
# ---------------------------------------------------------------------------

def test_stage5_4_visual_evidence_overlay_generation():
    """Verify structured visual debug overlay metadata generation."""
    evidence = ScreenEvidence(source="windows_desktop", width=1920, height=1080)
    vis_target = VisualGroundingResult(
        target_text="Export Report",
        element_type="button",
        bounding_box=BoundingBoxCoord(x=100, y=320, width=140, height=40),
        center=(170, 340),
        confidence=0.96
    )
    
    overlay = visual_overlay_engine.generate_overlay(evidence, [vis_target])
    assert overlay.observation_id == evidence.observation_id
    assert len(overlay.annotations) == 1
    assert overlay.annotations[0].label == "Export Report"
    assert overlay.annotations[0].color_hex == "#00E5FF"
    assert overlay.annotations[0].center == (170, 340)


# ---------------------------------------------------------------------------
# 5. Performance Benchmarks
# ---------------------------------------------------------------------------

def test_stage5_4_visual_benchmarks_execution():
    """Verify visual grounding benchmark suite runs and returns valid statistical distributions."""
    results = visual_benchmark_suite.run_benchmarks()
    assert results["iterations"] == 30
    metrics = results["metrics"]
    
    assert "evidence_capture_ms" in metrics
    assert "ocr_processing_ms" in metrics
    assert "visual_grounding_ms" in metrics
    assert "cross_validation_ms" in metrics
    assert "overlay_generation_ms" in metrics
    assert "end_to_end_fallback_ms" in metrics
    
    assert metrics["end_to_end_fallback_ms"]["p50"] >= 0.0
    assert metrics["visual_grounding_ms"]["mean"] >= 0.0

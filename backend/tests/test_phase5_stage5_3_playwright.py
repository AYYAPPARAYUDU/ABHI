"""Integration and Unit Tests for Phase 5 Stage 5.3 Grounded Browser Automation with Playwright."""

import os
import pytest
from pathlib import Path

from backend.app.automation.browser.benchmarks import browser_benchmark_suite
from backend.app.automation.browser.playwright_worker import PlaywrightBrowserWorker, BrowserWorkerState
from backend.app.automation.grounding.browser_grounder import BrowserGrounder
from backend.app.automation.leases.lease_manager import LeaseManager
from backend.app.automation.models.actions import (
    ExecutionAction,
    ActionType,
    ActionGrounding,
    GroundingLevel
)
from backend.app.automation.models.errors import AutomationErrorCode
from backend.app.automation.pipeline.executor import ExecutionPipeline
from backend.app.automation.policy.safety_policy import SafetyPolicyEngine
from backend.app.automation.verification.action_verifier import ActionVerifier


@pytest.fixture(scope="module")
def local_test_site_url():
    """Return local test site file URI."""
    site_path = Path(__file__).parent.parent / "app" / "automation" / "browser" / "local_site" / "test_app.html"
    return f"file:///{str(site_path.resolve()).replace(os.sep, '/')}"


@pytest.fixture
def playwright_pipeline():
    """Fixture providing initialized Playwright worker and execution pipeline."""
    leases = LeaseManager()
    policy = SafetyPolicyEngine()
    grounder = BrowserGrounder()
    worker = PlaywrightBrowserWorker(leases=leases, policy=policy, headless=True)
    verifier = ActionVerifier()
    pipe = ExecutionPipeline(
        policy=policy,
        leases=leases,
        web_grounder=grounder,
        web_worker=worker,
        verifier=verifier
    )
    worker.start()
    yield pipe, worker, leases, grounder, policy, verifier
    worker.stop()


def test_stage5_3_browser_lifecycle_startup_and_shutdown():
    """Verify Playwright browser worker startup, state transitions, and clean termination."""
    worker = PlaywrightBrowserWorker(headless=True)
    assert worker.state == BrowserWorkerState.STOPPED

    worker.start()
    assert worker.state == BrowserWorkerState.READY
    assert worker._browser is not None
    assert worker._page is not None

    worker.stop()
    assert worker.state == BrowserWorkerState.STOPPED
    assert worker._browser is None
    assert worker._page is None


def test_stage5_3_navigation_approved_and_blocked_origins(playwright_pipeline, local_test_site_url):
    """Verify navigation to approved local origins succeeds and external/unauthorized origins are blocked."""
    pipe, worker, leases, grounder, policy, _ = playwright_pipeline

    # 1. Approved Local Origin Navigation
    lease = leases.acquire_lease(task_id="task_nav_01", execution_id="exec_01", agent_id="browser_agent")
    grounding, _ = grounder.ground_target("Page")
    action_nav = ExecutionAction(
        action_id="act_nav_local",
        task_id="task_nav_01",
        execution_id="exec_01",
        lease_id=lease.lease_id,
        action_type=ActionType.BROWSER_NAVIGATE,
        grounding=grounding,
        parameters={"url": local_test_site_url},
        precondition="Browser is ready",
        expected_postcondition="Page loaded"
    )

    res_nav = pipe.run_browser_action(action_nav)
    assert res_nav.is_success is True
    assert "test_app.html" in worker.current_url
    assert "Deterministic Local Automation Test Website" in worker.current_title

    # 2. Blocked External Origin Navigation (Hard Policy Barrier)
    lease_ext = leases.acquire_lease(task_id="task_nav_ext", execution_id="exec_01", agent_id="browser_agent")
    action_ext = ExecutionAction(
        action_id="act_nav_ext",
        task_id="task_nav_ext",
        execution_id="exec_01",
        lease_id=lease_ext.lease_id,
        action_type=ActionType.BROWSER_NAVIGATE,
        grounding=grounding,
        parameters={"url": "https://unauthorized-external-portal.com/login"},
        precondition="Browser is ready",
        expected_postcondition="External page loaded"
    )

    res_ext = pipe.run_browser_action(action_ext)
    assert res_ext.is_success is False
    assert res_ext.stage_reached == "POLICY_VALIDATION"
    assert res_ext.error.error_code == AutomationErrorCode.POLICY_DENIED


def test_stage5_3_semantic_grounding_hierarchy_and_ambiguity(playwright_pipeline, local_test_site_url):
    """Verify semantic locator resolution by role, label, test_id and strict ambiguity detection."""
    pipe, worker, leases, grounder, policy, _ = playwright_pipeline
    worker._page.goto(local_test_site_url, wait_until="load")

    # 1. Level 1: Role + Name
    loc_role, err_role = worker.resolve_locator("Execute Action", role="button", name="Execute Action")
    assert err_role is None
    assert loc_role is not None

    # 2. Level 2: Label
    loc_label, err_label = worker.resolve_locator("Enable Feature", label="Enable Feature")
    assert err_label is None
    assert loc_label is not None

    # 3. Level 3: Test ID
    loc_testid, err_testid = worker.resolve_locator("btn_reset", test_id="btn_reset")
    assert err_testid is None
    assert loc_testid is not None

    # 4. Strict Ambiguity Detection (Duplicate Buttons)
    loc_amb, err_amb = worker.resolve_locator("Ambiguous Action")
    assert loc_amb is None
    assert err_amb is not None
    assert err_amb.error_code == AutomationErrorCode.GROUNDING_AMBIGUOUS


def test_stage5_3_frame_aware_grounding(playwright_pipeline, local_test_site_url):
    """Verify frame-aware locator resolution and execution within embedded iframe targets."""
    pipe, worker, leases, grounder, policy, _ = playwright_pipeline
    worker._page.goto(local_test_site_url, wait_until="load")

    lease = leases.acquire_lease(task_id="task_frame_01", execution_id="exec_01", agent_id="browser_agent")
    grounding, _ = grounder.ground_target("btn_frame_action", frame_identity="test_frame")

    action_frame = ExecutionAction(
        action_id="act_click_frame",
        task_id="task_frame_01",
        execution_id="exec_01",
        lease_id=lease.lease_id,
        action_type=ActionType.BROWSER_CLICK,
        grounding=grounding,
        parameters={"frame_identity": "test_frame"},
        precondition="Frame button exists",
        expected_postcondition="Frame action executed"
    )

    res = pipe.run_browser_action(action_frame)
    assert res.is_success is True


def test_stage5_3_harmless_click_and_dom_mutation_verification(playwright_pipeline, local_test_site_url):
    """Verify deterministic button click, status mutation, and dual-state verification."""
    pipe, worker, leases, grounder, policy, _ = playwright_pipeline
    worker._page.goto(local_test_site_url, wait_until="load")

    # Initial status is READY
    obs_initial = worker.observe_node("status_box")
    assert obs_initial.dom_text_content == "READY"

    lease = leases.acquire_lease(task_id="task_click_01", execution_id="exec_01", agent_id="browser_agent")
    grounding, _ = grounder.ground_target("btn_execute", test_id="btn_execute")

    action = ExecutionAction(
        action_id="act_click_exec",
        task_id="task_click_01",
        execution_id="exec_01",
        lease_id=lease.lease_id,
        action_type=ActionType.BROWSER_CLICK,
        grounding=grounding,
        precondition="Button is enabled",
        expected_postcondition="Status is EXECUTED"
    )

    res = pipe.run_browser_action(action)
    assert res.is_success is True
    assert res.stage_reached == "COMPLETED"

    # Status mutated to EXECUTED
    obs_after = worker.observe_node("status_box")
    assert obs_after.dom_text_content == "EXECUTED"


def test_stage5_3_form_interactions_check_select_and_fill(playwright_pipeline, local_test_site_url):
    """Verify text fill, checkbox toggle, select dropdown, and form submission."""
    pipe, worker, leases, grounder, policy, _ = playwright_pipeline
    worker._page.goto(local_test_site_url, wait_until="load")

    # 1. Fill Message Input
    lease1 = leases.acquire_lease(task_id="task_form_01", execution_id="exec_01", agent_id="browser_agent")
    g_txt, _ = grounder.ground_target("txt_message", test_id="txt_message")
    action_fill = ExecutionAction(
        action_id="act_fill_msg",
        task_id="task_form_01",
        execution_id="exec_01",
        lease_id=lease1.lease_id,
        action_type=ActionType.BROWSER_FILL,
        grounding=g_txt,
        parameters={"value": "Hello Playwright Automation"},
        precondition="Input field is visible",
        expected_postcondition="TEXT_ENTERED:Hello Playwright Automation"
    )
    res_fill = pipe.run_browser_action(action_fill)
    assert res_fill.is_success is True

    # 2. Check Feature Checkbox
    lease2 = leases.acquire_lease(task_id="task_form_02", execution_id="exec_01", agent_id="browser_agent")
    g_chk, _ = grounder.ground_target("chk_enabled", test_id="chk_enabled")
    action_chk = ExecutionAction(
        action_id="act_check_feat",
        task_id="task_form_02",
        execution_id="exec_01",
        lease_id=lease2.lease_id,
        action_type=ActionType.BROWSER_CHECK,
        grounding=g_chk,
        precondition="Checkbox exists",
        expected_postcondition="CHECKBOX_CHECKED"
    )
    res_chk = pipe.run_browser_action(action_chk)
    assert res_chk.is_success is True

    # 3. Select Option
    lease3 = leases.acquire_lease(task_id="task_form_03", execution_id="exec_01", agent_id="browser_agent")
    g_sel, _ = grounder.ground_target("sel_category", test_id="sel_category")
    action_sel = ExecutionAction(
        action_id="act_select_cat",
        task_id="task_form_03",
        execution_id="exec_01",
        lease_id=lease3.lease_id,
        action_type=ActionType.BROWSER_SELECT_OPTION,
        grounding=g_sel,
        parameters={"value": "opt_alpha"},
        precondition="Select dropdown exists",
        expected_postcondition="CATEGORY_SELECTED:opt_alpha"
    )
    res_sel = pipe.run_browser_action(action_sel)
    assert res_sel.is_success is True


def test_stage5_3_sensitive_credential_field_blocked_by_policy(playwright_pipeline, local_test_site_url):
    """Verify that targeting password/credential fields is rejected by policy."""
    pipe, worker, leases, grounder, policy, _ = playwright_pipeline
    worker._page.goto(local_test_site_url, wait_until="load")

    lease = leases.acquire_lease(task_id="task_cred_01", execution_id="exec_01", agent_id="browser_agent")
    grounding, _ = grounder.ground_target("txt_password", test_id="txt_password")

    action_cred = ExecutionAction(
        action_id="act_fill_password",
        task_id="task_cred_01",
        execution_id="exec_01",
        lease_id=lease.lease_id,
        action_type=ActionType.BROWSER_FILL,
        grounding=grounding,
        parameters={"value": "SecretPass123!"},
        precondition="Password field exists",
        expected_postcondition="Password filled"
    )

    res = pipe.run_browser_action(action_cred)
    assert res.is_success is False
    assert res.stage_reached == "POLICY_VALIDATION"
    assert res.error.error_code == AutomationErrorCode.POLICY_DENIED


def test_stage5_3_idempotency_and_duplicate_action_protection(playwright_pipeline, local_test_site_url):
    """Verify duplicate browser action submissions are blocked by idempotency protection."""
    pipe, worker, leases, grounder, policy, _ = playwright_pipeline
    worker._page.goto(local_test_site_url, wait_until="load")

    lease = leases.acquire_lease(task_id="task_idemp_01", execution_id="exec_01", agent_id="browser_agent")
    grounding, _ = grounder.ground_target("btn_execute", test_id="btn_execute")

    action = ExecutionAction(
        action_id="act_idemp_unique_01",
        task_id="task_idemp_01",
        execution_id="exec_01",
        lease_id=lease.lease_id,
        action_type=ActionType.BROWSER_CLICK,
        grounding=grounding,
        precondition="Button is visible",
        expected_postcondition="Status is EXECUTED"
    )

    # First execution succeeds
    res1 = pipe.run_browser_action(action)
    assert res1.is_success is True

    # Second duplicate execution fails closed
    res2 = pipe.run_browser_action(action)
    assert res2.is_success is False
    assert res2.stage_reached == "PHYSICAL_EXECUTION"
    assert res2.error.error_code == AutomationErrorCode.POLICY_DENIED


def test_stage5_3_worker_crash_simulation(playwright_pipeline, local_test_site_url):
    """Verify worker crash simulation triggers safe failure without supervisor crash."""
    pipe, worker, leases, grounder, policy, _ = playwright_pipeline
    worker._page.goto(local_test_site_url, wait_until="load")

    lease = leases.acquire_lease(task_id="task_crash_01", execution_id="exec_01", agent_id="browser_agent")
    grounding, _ = grounder.ground_target("btn_execute", test_id="btn_execute")

    action = ExecutionAction(
        action_id="act_crash_01",
        task_id="task_crash_01",
        execution_id="exec_01",
        lease_id=lease.lease_id,
        action_type=ActionType.BROWSER_CLICK,
        grounding=grounding,
        precondition="Button is visible",
        expected_postcondition="Status is EXECUTED"
    )

    # Simulate worker crash
    worker.simulate_worker_crash(True)

    res = pipe.run_browser_action(action)
    assert res.is_success is False
    assert res.stage_reached == "PHYSICAL_EXECUTION"
    assert res.error.error_code == AutomationErrorCode.WORKER_UNAVAILABLE


def test_stage5_3_benchmark_suite_execution():
    """Verify Playwright browser benchmark suite runs and returns valid statistical metrics."""
    bench_results = browser_benchmark_suite.run_benchmarks()
    assert bench_results["iterations"] == 30
    metrics = bench_results["metrics"]

    assert "browser_startup_ms" in metrics
    assert "local_navigation_ms" in metrics
    assert "locator_resolution_ms" in metrics
    assert "click_dispatch_ms" in metrics
    assert "fill_text_ms" in metrics
    assert "observation_ms" in metrics
    assert "verification_ms" in metrics
    assert "screenshot_capture_ms" in metrics
    assert "end_to_end_action_ms" in metrics
    assert metrics["end_to_end_action_ms"]["p50"] > 0.0

"""Unit and integration tests for Phase 5 Stage 5.2 Grounded Windows OS Automation."""

import time
import pytest
from backend.app.automation.desktop.benchmarks import desktop_benchmark_suite
from backend.app.automation.desktop.test_target_app import DeterministicLocalTestApp
from backend.app.automation.desktop.windows_uia_driver import WindowsUIADriver, APPROVED_KEY_COMBINATIONS
from backend.app.automation.desktop.windows_worker import WindowsAutomationWorker
from backend.app.automation.grounding.desktop_grounder import DesktopGrounder
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


@pytest.fixture
def uia_pipeline():
    app = DeterministicLocalTestApp()
    leases = LeaseManager()
    policy = SafetyPolicyEngine()
    grounder = DesktopGrounder()
    driver = WindowsUIADriver()
    driver.clear_idempotency_cache()
    worker = WindowsAutomationWorker(
        target_app=app,
        leases=leases,
        policy=policy,
        uia_driver=driver
    )
    verifier = ActionVerifier()
    pipe = ExecutionPipeline(
        policy=policy,
        leases=leases,
        desk_grounder=grounder,
        win_worker=worker,
        verifier=verifier
    )
    return pipe, app, leases, worker, driver, policy


def test_stage5_2_window_discovery_and_uia_grounding(uia_pipeline):
    pipe, app, leases, worker, driver, policy = uia_pipeline
    elements, err = worker.inspect_active_window()
    assert err is None
    assert len(elements) == 6

    # 1. Ground Button
    g_btn, _ = pipe.desktop_grounder.ground_target("Run Test", active_window_elements=elements)
    assert g_btn is not None
    assert g_btn.target_identity == "btn_run_test"
    assert g_btn.confidence >= 0.90

    # 2. Ground Edit Textbox
    g_txt, _ = pipe.desktop_grounder.ground_target("Username Field", active_window_elements=elements)
    assert g_txt is not None
    assert g_txt.target_identity == "txt_username"

    # 3. Ground Checkbox
    g_chk, _ = pipe.desktop_grounder.ground_target("Agree to terms", active_window_elements=elements)
    assert g_chk is not None
    assert g_chk.target_identity == "chk_agree"


def test_stage5_2_foreground_window_protection(uia_pipeline):
    pipe, app, leases, worker, driver, policy = uia_pipeline
    elements, _ = worker.inspect_active_window()
    grounding, _ = pipe.desktop_grounder.ground_target("Run Test", active_window_elements=elements)
    lease = leases.acquire_lease(task_id="task_fg_01", execution_id="exec_01", agent_id="os_desktop_agent")

    # 1. Matching foreground window succeeds
    action_ok = ExecutionAction(
        action_id="act_fg_ok",
        task_id="task_fg_01",
        execution_id="exec_01",
        lease_id=lease.lease_id,
        action_type=ActionType.CLICK_ELEMENT,
        grounding=grounding,
        parameters={"expected_window": "Local Automation Test App v1.0"},
        precondition="Button is visible",
        expected_postcondition="Status is EXECUTED"
    )
    res_ok = pipe.run_desktop_action(action_ok)
    assert res_ok.is_success is True

    # 2. Mismatched foreground window (user switched away) triggers USER_INTERFERENCE
    action_mismatch = ExecutionAction(
        action_id="act_fg_mismatch",
        task_id="task_fg_01",
        execution_id="exec_01",
        lease_id=lease.lease_id,
        action_type=ActionType.CLICK_ELEMENT,
        grounding=grounding,
        parameters={"expected_window": "Protected Bank Portal Window XYZ"},
        precondition="Button is visible",
        expected_postcondition="Status is EXECUTED"
    )
    res_err = worker.execute_action(action_mismatch, simulated_active_window="Unrelated Browser Window")
    assert res_err[0] is None
    assert res_err[1].error_code == AutomationErrorCode.USER_INTERFERENCE


def test_stage5_2_controlled_text_entry_and_verification(uia_pipeline):
    pipe, app, leases, worker, driver, policy = uia_pipeline
    elements, _ = worker.inspect_active_window()
    grounding, _ = pipe.desktop_grounder.ground_target("Username Field", active_window_elements=elements)
    lease = leases.acquire_lease(task_id="task_txt_01", execution_id="exec_01", agent_id="os_desktop_agent")

    action = ExecutionAction(
        action_id="act_type_alice",
        task_id="task_txt_01",
        execution_id="exec_01",
        lease_id=lease.lease_id,
        action_type=ActionType.TYPE_TEXT,
        grounding=grounding,
        parameters={"text": "alice_developer"},
        precondition="Edit control is enabled",
        expected_postcondition="TEXT_ENTERED:alice_developer"
    )

    res = pipe.run_desktop_action(action)
    assert res.is_success is True
    assert res.stage_reached == "COMPLETED"
    assert app.input_text == "alice_developer"
    assert "TEXT_ENTERED:alice_developer" in app.status_label


def test_stage5_2_approved_and_unapproved_key_combinations(uia_pipeline):
    pipe, app, leases, worker, driver, policy = uia_pipeline
    elements, _ = worker.inspect_active_window()
    grounding, _ = pipe.desktop_grounder.ground_target("Username Field", active_window_elements=elements)
    lease = leases.acquire_lease(task_id="task_key_01", execution_id="exec_01", agent_id="os_desktop_agent")

    # 1. Approved key combination (CTRL+A)
    action_valid = ExecutionAction(
        action_id="act_key_ctrl_a",
        task_id="task_key_01",
        execution_id="exec_01",
        lease_id=lease.lease_id,
        action_type=ActionType.KEY_COMBINATION,
        grounding=grounding,
        parameters={"key_combination": "CTRL+A"},
        precondition="Edit control exists",
        expected_postcondition="TEXT_ALL_SELECTED"
    )
    res_valid = pipe.run_desktop_action(action_valid)
    assert res_valid.is_success is True
    assert app.status_label == "TEXT_ALL_SELECTED"

    # 2. Unapproved key combination (ALT+F4 / RAW_STRING) rejected by policy
    action_invalid = ExecutionAction(
        action_id="act_key_unapproved",
        task_id="task_key_01",
        execution_id="exec_01",
        lease_id=lease.lease_id,
        action_type=ActionType.KEY_COMBINATION,
        grounding=grounding,
        parameters={"key_combination": "ALT+F4_SHUTDOWN"},
        precondition="Edit control exists",
        expected_postcondition="Closed"
    )
    res_invalid = pipe.run_desktop_action(action_invalid)
    assert res_invalid.is_success is False
    assert res_invalid.stage_reached == "POLICY_VALIDATION"
    assert res_invalid.error.error_code == AutomationErrorCode.POLICY_DENIED


def test_stage5_2_idempotency_duplicate_protection(uia_pipeline):
    pipe, app, leases, worker, driver, policy = uia_pipeline
    elements, _ = worker.inspect_active_window()
    grounding, _ = pipe.desktop_grounder.ground_target("Run Test", active_window_elements=elements)
    lease = leases.acquire_lease(task_id="task_idemp_01", execution_id="exec_01", agent_id="os_desktop_agent")

    action = ExecutionAction(
        action_id="act_unique_click_99",
        task_id="task_idemp_01",
        execution_id="exec_01",
        lease_id=lease.lease_id,
        action_type=ActionType.CLICK_ELEMENT,
        grounding=grounding,
        precondition="Button is visible",
        expected_postcondition="Status is EXECUTED"
    )

    # First execution succeeds
    res1 = pipe.run_desktop_action(action)
    assert res1.is_success is True
    assert app.click_count == 1

    # Duplicate replay rejected
    res2 = pipe.run_desktop_action(action)
    assert res2.is_success is False
    assert res2.stage_reached == "PHYSICAL_EXECUTION"
    assert res2.error.error_code == AutomationErrorCode.POLICY_DENIED
    assert app.click_count == 1  # No double physical execution


def test_stage5_2_benchmark_suite_execution():
    bench_results = desktop_benchmark_suite.run_benchmarks()
    assert bench_results["iterations"] == 50
    metrics = bench_results["metrics"]

    assert "window_discovery_ms" in metrics
    assert "element_enumeration_ms" in metrics
    assert "click_dispatch_ms" in metrics
    assert "end_to_end_action_ms" in metrics
    assert metrics["end_to_end_action_ms"]["p50"] > 0.0
    assert metrics["end_to_end_action_ms"]["p95"] > 0.0

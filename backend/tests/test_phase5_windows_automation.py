"""Unit and integration tests for Phase 5 Stage 5.1 Windows Automation."""

import time
import pytest
from backend.app.automation.desktop.mock_target import MockLocalDesktopApp
from backend.app.automation.desktop.windows_worker import WindowsAutomationWorker
from backend.app.automation.grounding.desktop_grounder import DesktopGrounder
from backend.app.automation.leases.lease_manager import LeaseManager
from backend.app.automation.models.actions import (
    ExecutionAction,
    ActionType,
    ActionGrounding,
    GroundingLevel,
    BoundingBoxCoord
)
from backend.app.automation.models.errors import AutomationErrorCode
from backend.app.automation.pipeline.executor import ExecutionPipeline
from backend.app.automation.policy.safety_policy import SafetyPolicyEngine
from backend.app.automation.verification.action_verifier import ActionVerifier


@pytest.fixture
def win_pipeline():
    target = MockLocalDesktopApp()
    leases = LeaseManager()
    policy = SafetyPolicyEngine()
    grounder = DesktopGrounder()
    worker = WindowsAutomationWorker(target_app=target)
    verifier = ActionVerifier()
    pipe = ExecutionPipeline(
        policy=policy,
        leases=leases,
        desk_grounder=grounder,
        win_worker=worker,
        verifier=verifier
    )
    return pipe, target, leases, worker


def test_windows_discovery_and_semantic_targeting(win_pipeline):
    pipe, target, leases, worker = win_pipeline
    elements, err = worker.inspect_active_window()
    assert err is None
    assert len(elements) >= 5

    # Target Submit button
    grounding, g_err = pipe.desktop_grounder.ground_target(
        "Submit",
        preferred_level=GroundingLevel.LEVEL_1_UIA,
        active_window_elements=elements
    )
    assert g_err is None
    assert grounding is not None
    assert grounding.source == GroundingLevel.LEVEL_1_UIA
    assert grounding.target_identity == "btn_submit"
    assert grounding.confidence >= 0.90


def test_windows_harmless_click_and_dual_state_verification(win_pipeline):
    pipe, target, leases, worker = win_pipeline
    elements, _ = worker.inspect_active_window()
    grounding, _ = pipe.desktop_grounder.ground_target("Submit", active_window_elements=elements)

    lease = leases.acquire_lease(task_id="task_win_01", execution_id="exec_01", agent_id="os_desktop_agent")

    action = ExecutionAction(
        action_id="act_win_click_01",
        task_id="task_win_01",
        execution_id="exec_01",
        lease_id=lease.lease_id,
        action_type=ActionType.CLICK_ELEMENT,
        grounding=grounding,
        precondition="Button 'Submit' exists and is enabled",
        expected_postcondition="Status is SUBMITTED_SUCCESS"
    )

    res = pipe.run_desktop_action(action)
    assert res.is_success is True
    assert res.stage_reached == "COMPLETED"
    assert res.verification.is_verified is True
    assert target.status_label == "SUBMITTED_SUCCESS"
    assert target.click_count == 1


def test_windows_precondition_failure_disabled_element(win_pipeline):
    pipe, target, leases, worker = win_pipeline
    elements, _ = worker.inspect_active_window()
    grounding, _ = pipe.desktop_grounder.ground_target("Disabled Action", active_window_elements=elements)

    lease = leases.acquire_lease(task_id="task_win_02", execution_id="exec_02", agent_id="os_desktop_agent")

    action = ExecutionAction(
        action_id="act_win_disabled",
        task_id="task_win_02",
        execution_id="exec_02",
        lease_id=lease.lease_id,
        action_type=ActionType.CLICK_ELEMENT,
        grounding=grounding,
        precondition="Button 'Disabled Action' is enabled",
        expected_postcondition="Action executed"
    )

    res = pipe.run_desktop_action(action)
    assert res.is_success is False
    assert res.stage_reached == "PRECONDITION_VERIFICATION"
    assert res.error.error_code == AutomationErrorCode.PRECONDITION_FAILED


def test_windows_expired_lease_rejection(win_pipeline):
    pipe, target, leases, worker = win_pipeline
    elements, _ = worker.inspect_active_window()
    grounding, _ = pipe.desktop_grounder.ground_target("Submit", active_window_elements=elements)

    lease = leases.acquire_lease(
        task_id="task_win_03",
        execution_id="exec_03",
        agent_id="os_desktop_agent",
        initial_ttl_seconds=0.05
    )
    time.sleep(0.1)  # Expire lease

    action = ExecutionAction(
        action_id="act_win_expired",
        task_id="task_win_03",
        execution_id="exec_03",
        lease_id=lease.lease_id,
        action_type=ActionType.CLICK_ELEMENT,
        grounding=grounding,
        precondition="Button exists",
        expected_postcondition="Status is SUBMITTED_SUCCESS"
    )

    res = pipe.run_desktop_action(action)
    assert res.is_success is False
    assert res.stage_reached == "LEASE_VALIDATION"
    assert res.error.error_code == AutomationErrorCode.LEASE_EXPIRED


def test_windows_worker_crash_handling(win_pipeline):
    pipe, target, leases, worker = win_pipeline
    elements, _ = worker.inspect_active_window()
    grounding, _ = pipe.desktop_grounder.ground_target("Submit", active_window_elements=elements)

    lease = leases.acquire_lease(task_id="task_win_04", execution_id="exec_04", agent_id="os_desktop_agent")

    # Simulate worker crash
    worker.simulate_worker_crash(True)

    action = ExecutionAction(
        action_id="act_win_crashed",
        task_id="task_win_04",
        execution_id="exec_04",
        lease_id=lease.lease_id,
        action_type=ActionType.CLICK_ELEMENT,
        grounding=grounding,
        precondition="Button exists",
        expected_postcondition="Status is SUBMITTED_SUCCESS"
    )

    res = pipe.run_desktop_action(action)
    assert res.is_success is False
    assert res.stage_reached == "PHYSICAL_EXECUTION"
    assert res.error.error_code == AutomationErrorCode.WORKER_UNAVAILABLE

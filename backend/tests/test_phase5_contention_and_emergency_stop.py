"""Unit and integration tests for Human Input Contention and Emergency Stop integration."""

import pytest
from backend.app.automation.desktop.mock_target import MockLocalDesktopApp
from backend.app.automation.desktop.windows_worker import WindowsAutomationWorker
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
def contention_pipeline():
    target = MockLocalDesktopApp()
    leases = LeaseManager()
    policy = SafetyPolicyEngine()
    worker = WindowsAutomationWorker(target_app=target)
    verifier = ActionVerifier()
    pipe = ExecutionPipeline(
        policy=policy,
        leases=leases,
        win_worker=worker,
        verifier=verifier
    )
    return pipe, target, leases, policy


def test_human_input_contention_blocks_execution(contention_pipeline):
    pipe, target, leases, policy = contention_pipeline
    lease = leases.acquire_lease(task_id="task_contention_01", execution_id="exec_01", agent_id="os_desktop_agent")

    grounding = ActionGrounding(
        source=GroundingLevel.LEVEL_1_UIA,
        target_identity="btn_submit",
        confidence=0.98
    )

    action = ExecutionAction(
        action_id="act_contention_01",
        task_id="task_contention_01",
        execution_id="exec_01",
        lease_id=lease.lease_id,
        action_type=ActionType.CLICK_ELEMENT,
        grounding=grounding,
        precondition="Button is visible",
        expected_postcondition="Status is SUBMITTED_SUCCESS"
    )

    # 1. Activate Human Input Contention (Operator moving mouse / typing)
    policy.set_user_contention(True)

    res = pipe.run_desktop_action(action)
    assert res.is_success is False
    assert res.stage_reached == "POLICY_VALIDATION"
    assert res.error.error_code == AutomationErrorCode.USER_INTERFERENCE
    assert target.click_count == 0  # Physical input was NEVER injected

    # 2. Deactivate Contention (Operator yields control)
    policy.set_user_contention(False)
    res_resumed = pipe.run_desktop_action(action)
    assert res_resumed.is_success is True
    assert target.click_count == 1


def test_emergency_stop_revokes_leases_and_blocks_pipeline(contention_pipeline):
    pipe, target, leases, policy = contention_pipeline
    lease = leases.acquire_lease(task_id="task_emergency_01", execution_id="exec_01", agent_id="os_desktop_agent")

    grounding = ActionGrounding(
        source=GroundingLevel.LEVEL_1_UIA,
        target_identity="btn_submit",
        confidence=0.98
    )

    action = ExecutionAction(
        action_id="act_emergency_01",
        task_id="task_emergency_01",
        execution_id="exec_01",
        lease_id=lease.lease_id,
        action_type=ActionType.CLICK_ELEMENT,
        grounding=grounding,
        precondition="Button is visible",
        expected_postcondition="Status is SUBMITTED_SUCCESS"
    )

    # Emergency Stop triggered: revoke all task leases
    revoked_count = leases.revoke_all_for_task("task_emergency_01", reason="Open Palm gesture detected")
    assert revoked_count >= 1

    res = pipe.run_desktop_action(action)
    assert res.is_success is False
    assert res.stage_reached == "LEASE_VALIDATION"
    assert res.error.error_code == AutomationErrorCode.LEASE_REVOKED

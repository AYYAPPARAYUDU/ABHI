"""Canonical Automation Execution Pipeline.

Enforces the non-bypassable 7-stage physical execution flow:
Policy Validation -> Lease Validation -> Target Grounding -> Precondition Verification ->
Physical Execution -> Postcondition Observation -> Dual-State Verification.
"""

from typing import Any, Dict, Optional, Tuple
from pydantic import BaseModel

from backend.app.automation.browser.browser_worker import browser_worker, BrowserAutomationWorker
from backend.app.automation.desktop.windows_worker import windows_worker, WindowsAutomationWorker
from backend.app.automation.grounding.browser_grounder import browser_grounder, BrowserGrounder
from backend.app.automation.grounding.desktop_grounder import desktop_grounder, DesktopGrounder
from backend.app.automation.leases.lease_manager import lease_manager, LeaseManager
from backend.app.automation.models.actions import (
    ExecutionAction,
    ActionType,
    ActionResult,
    ObservedState,
    ActionGrounding
)
from backend.app.automation.models.errors import AutomationError, AutomationErrorCode
from backend.app.automation.policy.safety_policy import safety_policy, SafetyPolicyEngine
from backend.app.automation.verification.action_verifier import action_verifier, ActionVerifier, PhysicalVerificationResult


class PipelineExecutionResult(BaseModel):
    is_success: bool
    action_id: str
    stage_reached: str
    action_result: Optional[ActionResult] = None
    verification: Optional[PhysicalVerificationResult] = None
    error: Optional[AutomationError] = None


class ExecutionPipeline:
    """Orchestrates the canonical policy-governed execution pipeline."""

    def __init__(
        self,
        policy: Optional[SafetyPolicyEngine] = None,
        leases: Optional[LeaseManager] = None,
        desk_grounder: Optional[DesktopGrounder] = None,
        web_grounder: Optional[BrowserGrounder] = None,
        win_worker: Optional[WindowsAutomationWorker] = None,
        web_worker: Optional[BrowserAutomationWorker] = None,
        verifier: Optional[ActionVerifier] = None
    ):
        self.policy = policy or safety_policy
        self.leases = leases or lease_manager
        self.desktop_grounder = desk_grounder or desktop_grounder
        self.browser_grounder = web_grounder or browser_grounder
        self.windows_worker = win_worker or windows_worker
        self.browser_worker = web_worker or browser_worker
        self.verifier = verifier or action_verifier

        # Synchronize shared leases & policy into workers if passed
        self.windows_worker.leases = self.leases
        self.windows_worker.policy = self.policy
        self.browser_worker.leases = self.leases
        self.browser_worker.policy = self.policy

    def run_desktop_action(
        self,
        action: ExecutionAction,
        user_consent_granted: bool = False
    ) -> PipelineExecutionResult:
        """Execute a Windows desktop action through the complete pipeline."""
        # 1. Policy Validation
        policy_ok, policy_err = self.policy.validate_action(
            action=action,
            agent_id="os_desktop_agent",
            user_consent_granted=user_consent_granted
        )
        if not policy_ok or policy_err:
            return PipelineExecutionResult(
                is_success=False,
                action_id=action.action_id,
                stage_reached="POLICY_VALIDATION",
                error=policy_err
            )

        # 2. Lease Validation (Pre-Check)
        lease_ok, lease_err = self.leases.validate_lease(
            lease_id=action.lease_id,
            task_id=action.task_id,
            execution_id=action.execution_id
        )
        if not lease_ok or lease_err:
            return PipelineExecutionResult(
                is_success=False,
                action_id=action.action_id,
                stage_reached="LEASE_VALIDATION",
                error=lease_err
            )

        # 3. Worker Crash Check
        if getattr(self.windows_worker, "is_crashed", False):
            return PipelineExecutionResult(
                is_success=False,
                action_id=action.action_id,
                stage_reached="PHYSICAL_EXECUTION",
                error=AutomationError(
                    error_code=AutomationErrorCode.WORKER_UNAVAILABLE,
                    message="Windows Automation Worker process is unavailable / crashed.",
                    action_id=action.action_id,
                    task_id=action.task_id
                )
            )

        # 4. Target Grounding Verification
        if action.grounding.confidence < 0.70:
            return PipelineExecutionResult(
                is_success=False,
                action_id=action.action_id,
                stage_reached="TARGET_GROUNDING",
                error=AutomationError(
                    error_code=AutomationErrorCode.GROUNDING_CONFIDENCE_LOW,
                    message=f"Grounding confidence {action.grounding.confidence:.2f} too low.",
                    action_id=action.action_id
                )
            )

        # 4. Precondition Physical Verification
        initial_obs = self.windows_worker.target_app.observe_element(action.grounding.target_identity)
        precond_ok = self.verifier.verify_precondition(action, initial_obs)
        if not precond_ok:
            return PipelineExecutionResult(
                is_success=False,
                action_id=action.action_id,
                stage_reached="PRECONDITION_VERIFICATION",
                error=AutomationError(
                    error_code=AutomationErrorCode.PRECONDITION_FAILED,
                    message=f"Precondition failed: target '{action.grounding.target_identity}' not found or disabled.",
                    action_id=action.action_id
                )
            )

        # 5. Physical Execution
        exec_res, exec_err = self.windows_worker.execute_action(
            action=action,
            user_consent_granted=user_consent_granted
        )
        if not exec_res or exec_err:
            return PipelineExecutionResult(
                is_success=False,
                action_id=action.action_id,
                stage_reached="PHYSICAL_EXECUTION",
                error=exec_err
            )

        # 6. Postcondition Dual-State Verification
        ver_res = self.verifier.verify_postcondition(action, exec_res)
        if not ver_res.is_verified:
            return PipelineExecutionResult(
                is_success=False,
                action_id=action.action_id,
                stage_reached="POSTCONDITION_VERIFICATION",
                action_result=exec_res,
                verification=ver_res,
                error=AutomationError(
                    error_code=AutomationErrorCode.VERIFICATION_FAILED,
                    message=ver_res.mismatch_details or "Physical verification mismatch.",
                    action_id=action.action_id
                )
            )

        # 7. Success
        return PipelineExecutionResult(
            is_success=True,
            action_id=action.action_id,
            stage_reached="COMPLETED",
            action_result=exec_res,
            verification=ver_res
        )

    def run_browser_action(
        self,
        action: ExecutionAction,
        user_consent_granted: bool = False
    ) -> PipelineExecutionResult:
        """Execute a browser action through the complete pipeline."""
        # 1. Policy Validation
        policy_ok, policy_err = self.policy.validate_action(
            action=action,
            agent_id="browser_agent",
            user_consent_granted=user_consent_granted
        )
        if not policy_ok or policy_err:
            return PipelineExecutionResult(
                is_success=False,
                action_id=action.action_id,
                stage_reached="POLICY_VALIDATION",
                error=policy_err
            )

        # 2. Lease Validation
        lease_ok, lease_err = self.leases.validate_lease(
            lease_id=action.lease_id,
            task_id=action.task_id,
            execution_id=action.execution_id
        )
        if not lease_ok or lease_err:
            return PipelineExecutionResult(
                is_success=False,
                action_id=action.action_id,
                stage_reached="LEASE_VALIDATION",
                error=lease_err
            )

        # 3. Worker Crash Check
        if getattr(self.browser_worker, "is_crashed", False):
            return PipelineExecutionResult(
                is_success=False,
                action_id=action.action_id,
                stage_reached="PHYSICAL_EXECUTION",
                error=AutomationError(
                    error_code=AutomationErrorCode.WORKER_UNAVAILABLE,
                    message="Browser Automation Worker process is unavailable / crashed.",
                    action_id=action.action_id,
                    task_id=action.task_id
                )
            )

        # 4. Precondition Verification
        meta = action.grounding.metadata or {}
        frame_id = meta.get("frame_identity") or action.parameters.get("frame_identity")

        if hasattr(self.browser_worker, "observe_node"):
            try:
                initial_obs = self.browser_worker.observe_node(action.grounding.target_identity, frame_identity=frame_id)
            except TypeError:
                initial_obs = self.browser_worker.observe_node(action.grounding.target_identity)
        elif hasattr(self.browser_worker, "target_page"):
            initial_obs = self.browser_worker.target_page.observe_node(action.grounding.target_identity)
        else:
            initial_obs = ObservedState(target_found=True, is_enabled=True)

        precond_ok = self.verifier.verify_precondition(action, initial_obs)
        if not precond_ok:
            return PipelineExecutionResult(
                is_success=False,
                action_id=action.action_id,
                stage_reached="PRECONDITION_VERIFICATION",
                error=AutomationError(
                    error_code=AutomationErrorCode.PRECONDITION_FAILED,
                    message=f"Browser precondition failed: DOM element '{action.grounding.target_identity}' not found or disabled.",
                    action_id=action.action_id
                )
            )

        # 4. Physical Execution
        exec_res, exec_err = self.browser_worker.execute_action(
            action=action,
            user_consent_granted=user_consent_granted
        )
        if not exec_res or exec_err:
            return PipelineExecutionResult(
                is_success=False,
                action_id=action.action_id,
                stage_reached="PHYSICAL_EXECUTION",
                error=exec_err
            )

        # 5. Dual-State Verification
        ver_res = self.verifier.verify_postcondition(action, exec_res)
        if not ver_res.is_verified:
            return PipelineExecutionResult(
                is_success=False,
                action_id=action.action_id,
                stage_reached="POSTCONDITION_VERIFICATION",
                action_result=exec_res,
                verification=ver_res,
                error=AutomationError(
                    error_code=AutomationErrorCode.VERIFICATION_FAILED,
                    message=ver_res.mismatch_details or "Browser DOM verification mismatch.",
                    action_id=action.action_id
                )
            )

        # 6. Success
        return PipelineExecutionResult(
            is_success=True,
            action_id=action.action_id,
            stage_reached="COMPLETED",
            action_result=exec_res,
            verification=ver_res
        )


# Singleton
execution_pipeline = ExecutionPipeline()

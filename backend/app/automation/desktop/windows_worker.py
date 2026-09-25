"""Windows OS Desktop Automation Worker Boundary.

Executes grounded desktop actions (UIA, Native accessibility, OCR coordinates)
within a dedicated worker boundary with fail-closed safety lease enforcement.
"""

import time
from typing import Any, Dict, List, Optional, Tuple
from backend.app.automation.desktop.mock_target import local_test_desktop_app, MockLocalDesktopApp
from backend.app.automation.leases.lease_manager import lease_manager, LeaseManager
from backend.app.automation.models.actions import (
    ExecutionAction,
    ActionType,
    ActionResult,
    ObservedState,
    GroundingLevel
)
from backend.app.automation.models.errors import AutomationError, AutomationErrorCode
from backend.app.automation.policy.safety_policy import safety_policy, SafetyPolicyEngine


class WindowsAutomationWorker:
    """Isolated worker boundary for Windows desktop automation."""

    def __init__(
        self,
        target_app: Optional[MockLocalDesktopApp] = None,
        leases: Optional[LeaseManager] = None,
        policy: Optional[SafetyPolicyEngine] = None
    ):
        self.target_app = target_app or local_test_desktop_app
        self.leases = leases or lease_manager
        self.policy = policy or safety_policy
        self.is_crashed = False

    def simulate_worker_crash(self, crashed: bool = True) -> None:
        """Simulate unexpected worker process crash for testing fault isolation."""
        self.is_crashed = crashed

    def inspect_active_window(self) -> Tuple[List[Dict[str, Any]], Optional[AutomationError]]:
        """Return the semantic UIA tree of the active window."""
        if self.is_crashed:
            return [], AutomationError(
                error_code=AutomationErrorCode.WORKER_UNAVAILABLE,
                message="Windows Automation Worker process has terminated unexpectedly."
            )
        return self.target_app.get_element_tree(), None

    def execute_action(
        self,
        action: ExecutionAction,
        user_consent_granted: bool = False
    ) -> Tuple[Optional[ActionResult], Optional[AutomationError]]:
        """Execute a grounded action with strict lease and contention validation."""
        start_ts = time.perf_counter()

        # 1. Worker crash check
        if self.is_crashed:
            return None, AutomationError(
                error_code=AutomationErrorCode.WORKER_UNAVAILABLE,
                message="Windows Automation Worker process is unavailable / crashed.",
                action_id=action.action_id,
                task_id=action.task_id
            )

        # 2. Safety Policy Validation
        policy_ok, policy_err = self.policy.validate_action(
            action=action,
            agent_id="os_desktop_agent",
            user_consent_granted=user_consent_granted
        )
        if not policy_ok or policy_err:
            return None, policy_err

        # 3. Lease Validation & Atomic Consumption
        lease_ok, lease_err = self.leases.consume_action(
            lease_id=action.lease_id,
            action_id=action.action_id
        )
        if not lease_ok or lease_err:
            return None, lease_err

        # 4. Physical Action Dispatch
        target_id = action.grounding.target_identity
        action_success = False

        if action.action_type == ActionType.CLICK_ELEMENT:
            action_success = self.target_app.click(target_id)
        elif action.action_type == ActionType.TYPE_TEXT:
            text_to_type = action.parameters.get("text", "")
            action_success = self.target_app.type_text(target_id, text_to_type)
        elif action.action_type == ActionType.FOCUS_WINDOW:
            self.target_app.is_focused = True
            action_success = True
        elif action.action_type == ActionType.SCREENSHOT:
            action_success = True
        else:
            action_success = self.target_app.click(target_id)

        # 5. Observe Physical Postcondition
        observed = self.target_app.observe_element(target_id)
        duration_ms = (time.perf_counter() - start_ts) * 1000.0

        result = ActionResult(
            success=action_success,
            action_id=action.action_id,
            execution_duration_ms=round(duration_ms, 2),
            observed_state=observed,
            error=None if action_success else f"Action {action.action_type} failed on target {target_id}"
        )
        return result, None


# Singleton
windows_worker = WindowsAutomationWorker()

"""Windows OS Desktop Automation Worker Boundary.

Executes grounded desktop actions (UIA, Native accessibility, OCR coordinates)
within a dedicated worker boundary with fail-closed safety lease enforcement,
foreground window verification, approved key combinations, and idempotency protection.
"""

import time
from typing import Any, Dict, List, Optional, Tuple
from backend.app.automation.desktop.mock_target import MockLocalDesktopApp
from backend.app.automation.desktop.test_target_app import DeterministicLocalTestApp, local_deterministic_app
from backend.app.automation.desktop.windows_uia_driver import windows_uia_driver, WindowsUIADriver
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
from backend.app.core.logging import logger


class WindowsAutomationWorker:
    """Isolated worker boundary for Windows desktop automation."""

    def __init__(
        self,
        target_app: Optional[DeterministicLocalTestApp] = None,
        leases: Optional[LeaseManager] = None,
        policy: Optional[SafetyPolicyEngine] = None,
        uia_driver: Optional[WindowsUIADriver] = None
    ):
        self.target_app = target_app or local_deterministic_app
        self.leases = leases or lease_manager
        self.policy = policy or safety_policy
        self.uia_driver = uia_driver or windows_uia_driver
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
        return self.target_app.get_uia_tree(), None

    def execute_action(
        self,
        action: ExecutionAction,
        user_consent_granted: bool = False,
        simulated_active_window: Optional[str] = None
    ) -> Tuple[Optional[ActionResult], Optional[AutomationError]]:
        """Execute a grounded action with strict lease, contention, and foreground validation."""
        start_ts = time.perf_counter()

        # 1. Worker Crash Check
        if self.is_crashed:
            return None, AutomationError(
                error_code=AutomationErrorCode.WORKER_UNAVAILABLE,
                message="Windows Automation Worker process is unavailable / crashed.",
                action_id=action.action_id,
                task_id=action.task_id
            )

        # 2. Idempotency Protection Check
        idempotent_ok, idemp_err = self.uia_driver.check_idempotency(
            task_id=action.task_id,
            execution_id=action.execution_id,
            action_id=action.action_id
        )
        if not idempotent_ok or idemp_err:
            return None, idemp_err

        # 3. Foreground Window Context Verification
        expected_window = action.parameters.get("expected_window", getattr(self.target_app, "window_title", "Local Automation Test App v1.0"))
        active_window = simulated_active_window
        if active_window is None:
            if getattr(self.target_app, "is_focused", False):
                active_window = getattr(self.target_app, "window_title", "Local Automation Test App v1.0")
            else:
                active_window = self.uia_driver.get_foreground_window_title()

        fg_ok, fg_err = self.uia_driver.verify_foreground_context(
            expected_window_title=expected_window,
            current_title=active_window
        )
        if not fg_ok or fg_err:
            return None, fg_err

        # 4. Safety Policy Validation
        policy_ok, policy_err = self.policy.validate_action(
            action=action,
            agent_id="os_desktop_agent",
            user_consent_granted=user_consent_granted
        )
        if not policy_ok or policy_err:
            return None, policy_err

        # 5. Lease Validation & Atomic Action Consumption
        lease_ok, lease_err = self.leases.consume_action(
            lease_id=action.lease_id,
            action_id=action.action_id
        )
        if not lease_ok or lease_err:
            return None, lease_err

        # 6. Action Type Dispatch & Execution
        target_id = action.grounding.target_identity
        action_success = False

        if action.action_type == ActionType.CLICK_ELEMENT:
            if action.grounding.source in [GroundingLevel.LEVEL_3_OCR, GroundingLevel.LEVEL_4_COORDINATES] and action.grounding.bounding_box:
                cx = action.grounding.bounding_box.center_x
                cy = action.grounding.bounding_box.center_y
                if hasattr(self.target_app, "click_coordinate"):
                    action_success = self.target_app.click_coordinate(cx, cy)
                else:
                    action_success = self.target_app.click(target_id)
            else:
                action_success = self.target_app.click(target_id)

        elif action.action_type == ActionType.TYPE_TEXT:
            text_to_type = action.parameters.get("text", "")
            action_success = self.target_app.type_text(target_id, text_to_type)

        elif action.action_type == ActionType.KEY_COMBINATION:
            key_combo = action.parameters.get("key_combination", "")
            key_ok, key_err = self.uia_driver.validate_key_combination(key_combo)
            if not key_ok or key_err:
                return None, key_err
            action_success = self.target_app.send_key_combination(target_id, key_combo)

        elif action.action_type == ActionType.FOCUS_WINDOW:
            self.target_app.is_focused = True
            action_success = True

        elif action.action_type == ActionType.SCREENSHOT:
            action_success = True

        else:
            action_success = self.target_app.click(target_id)

        # 7. Record Execution for Idempotency
        if action_success:
            self.uia_driver.record_action_executed(
                task_id=action.task_id,
                execution_id=action.execution_id,
                action_id=action.action_id
            )

        # 8. Observe Physical Postcondition
        observed = self.target_app.observe_element(target_id)
        duration_ms = (time.perf_counter() - start_ts) * 1000.0

        result = ActionResult(
            success=action_success,
            action_id=action.action_id,
            execution_duration_ms=round(duration_ms, 2),
            observed_state=observed,
            error=None if action_success else f"Action {action.action_type} failed on target '{target_id}'"
        )
        return result, None


# Singleton
windows_worker = WindowsAutomationWorker()

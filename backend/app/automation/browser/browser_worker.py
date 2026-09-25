"""Browser Automation Worker Boundary.

Executes grounded Playwright browser interactions with lease validation and DOM verification.
"""

import time
from typing import Any, Dict, List, Optional, Tuple
from backend.app.automation.browser.mock_page import local_test_browser_page, MockLocalBrowserPage
from backend.app.automation.leases.lease_manager import lease_manager, LeaseManager
from backend.app.automation.models.actions import (
    ExecutionAction,
    ActionType,
    ActionResult,
    ObservedState
)
from backend.app.automation.models.errors import AutomationError, AutomationErrorCode
from backend.app.automation.policy.safety_policy import safety_policy, SafetyPolicyEngine


class BrowserAutomationWorker:
    """Isolated worker boundary for Playwright browser automation."""

    def __init__(
        self,
        target_page: Optional[MockLocalBrowserPage] = None,
        leases: Optional[LeaseManager] = None,
        policy: Optional[SafetyPolicyEngine] = None
    ):
        self.target_page = target_page or local_test_browser_page
        self.leases = leases or lease_manager
        self.policy = policy or safety_policy
        self.is_crashed = False

    def simulate_worker_crash(self, crashed: bool = True) -> None:
        """Simulate unexpected browser worker crash for fault isolation testing."""
        self.is_crashed = crashed

    def inspect_dom(self) -> Tuple[List[Dict[str, Any]], Optional[AutomationError]]:
        """Return the semantic DOM snapshot of the current page."""
        if self.is_crashed:
            return [], AutomationError(
                error_code=AutomationErrorCode.WORKER_UNAVAILABLE,
                message="Browser Automation Worker process has terminated unexpectedly."
            )
        return self.target_page.get_dom_snapshot(), None

    def observe_node(self, target_identity: str) -> ObservedState:
        """Observe physical state of target node."""
        if self.is_crashed:
            return ObservedState(target_found=False, window_title="Worker Unavailable")
        return self.target_page.observe_node(target_identity)

    def execute_action(
        self,
        action: ExecutionAction,
        user_consent_granted: bool = False
    ) -> Tuple[Optional[ActionResult], Optional[AutomationError]]:
        """Execute a grounded browser action with lease and safety validation."""
        start_ts = time.perf_counter()

        # 1. Worker crash check
        if self.is_crashed:
            return None, AutomationError(
                error_code=AutomationErrorCode.WORKER_UNAVAILABLE,
                message="Browser Automation Worker process is unavailable / crashed.",
                action_id=action.action_id,
                task_id=action.task_id
            )

        # 2. Safety Policy Validation
        policy_ok, policy_err = self.policy.validate_action(
            action=action,
            agent_id="browser_agent",
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

        if action.action_type == ActionType.BROWSER_CLICK:
            action_success = self.target_page.click(target_id)
        elif action.action_type == ActionType.BROWSER_FILL:
            val = action.parameters.get("value", "")
            action_success = self.target_page.fill(target_id, val)
        elif action.action_type == ActionType.BROWSER_NAVIGATE:
            url = action.parameters.get("url", "http://localhost:8080/test-suite")
            self.target_page.url = url
            action_success = True
        elif action.action_type == ActionType.BROWSER_SCREENSHOT:
            action_success = True
        else:
            action_success = self.target_page.click(target_id)

        # 5. Observe Physical Postcondition
        observed = self.target_page.observe_node(target_id)
        duration_ms = (time.perf_counter() - start_ts) * 1000.0

        result = ActionResult(
            success=action_success,
            action_id=action.action_id,
            execution_duration_ms=round(duration_ms, 2),
            observed_state=observed,
            error=None if action_success else f"Browser action {action.action_type} failed on node {target_id}"
        )
        return result, None


# Singleton
browser_worker = BrowserAutomationWorker()

"""Automation Safety & Capability Policy Engine.

Enforces execution barriers, risk tiers, and capability permissions to prevent
unauthorized or destructive actions against the Windows desktop and browser.
"""

from typing import Any, Dict, List, Optional, Set, Tuple
from backend.app.automation.models.actions import ExecutionAction, ActionType, GroundingLevel
from backend.app.automation.models.errors import AutomationError, AutomationErrorCode


class SafetyPolicyEngine:
    """Evaluates proposed execution actions against safety rules and human consent gates."""

    # Explicitly forbidden system actions (Hard barrier)
    FORBIDDEN_KEYWORDS = [
        "format c:", "rmdir /s", "del /f /s /q c:", "reg delete", "net user",
        "drop database", "sudo rm", "disable firewall", "uac bypass"
    ]

    # Permitted capabilities per agent role
    AGENT_CAPABILITIES: Dict[str, Set[str]] = {
        "os_desktop_agent": {
            "DESKTOP_UI_CONTROL", "WINDOW_MANAGEMENT", "SCREENSHOT", "LOCAL_TEST_APP"
        },
        "browser_agent": {
            "BROWSER_DOM_CONTROL", "BROWSER_NAVIGATION", "BROWSER_SCREENSHOT", "LOCAL_TEST_PAGE"
        },
        "coding_agent": {
            "WORKSPACE_FILE_READ", "WORKSPACE_FILE_WRITE", "LOCAL_TEST"
        },
        "general_supervisor": {
            "TASK_PLANNING", "AGENT_DISPATCH", "EMERGENCY_STOP"
        }
    }

    def __init__(self):
        self._user_contention_active = False

    def set_user_contention(self, active: bool) -> None:
        """Set whether human input contention is currently active."""
        self._user_contention_active = active

    @property
    def is_user_contention_active(self) -> bool:
        return self._user_contention_active

    def validate_action(
        self,
        action: ExecutionAction,
        agent_id: str,
        user_consent_granted: bool = False
    ) -> Tuple[bool, Optional[AutomationError]]:
        """Evaluate if an action is safe and permitted to enter the execution pipeline."""
        # 1. Check Human Input Contention Barrier
        if self._user_contention_active:
            return False, AutomationError(
                error_code=AutomationErrorCode.USER_INTERFERENCE,
                message="Physical action blocked: Human user is actively interacting with the system.",
                action_id=action.action_id,
                task_id=action.task_id,
                lease_id=action.lease_id
            )

        # 2. Check Grounding Confidence and Source Policy
        if action.grounding.confidence < 0.70:
            return False, AutomationError(
                error_code=AutomationErrorCode.GROUNDING_CONFIDENCE_LOW,
                message=f"Grounding confidence {action.grounding.confidence:.2f} is below minimum 0.70 threshold.",
                action_id=action.action_id,
                task_id=action.task_id,
                lease_id=action.lease_id
            )

        # Level 4 raw coordinates requires explicit visual pre/post verification
        if action.grounding.source == GroundingLevel.LEVEL_4_COORDINATES:
            if not action.precondition or not action.expected_postcondition:
                return False, AutomationError(
                    error_code=AutomationErrorCode.POLICY_DENIED,
                    message="Level 4 coordinate actions strictly require explicit pre/post visual verification.",
                    action_id=action.action_id,
                    task_id=action.task_id
                )

        # 3. Check for Destructive / Prohibited Keywords in parameters
        params_str = str(action.parameters).lower()
        for forbidden in self.FORBIDDEN_KEYWORDS:
            if forbidden in params_str:
                return False, AutomationError(
                    error_code=AutomationErrorCode.POLICY_DENIED,
                    message=f"Action contains prohibited destructive pattern '{forbidden}'.",
                    action_id=action.action_id,
                    task_id=action.task_id
                )

        # 4. Check Risk Tier & Human Consent Gate
        if action.risk_tier in ["Tier 3", "Tier 4", "CRITICAL", "HIGH"]:
            if not user_consent_granted:
                return False, AutomationError(
                    error_code=AutomationErrorCode.CONSENT_REQUIRED,
                    message=f"Action '{action.action_type}' is classified as {action.risk_tier} and requires human consent.",
                    action_id=action.action_id,
                    task_id=action.task_id,
                    lease_id=action.lease_id
                )

        return True, None


# Singleton
safety_policy = SafetyPolicyEngine()

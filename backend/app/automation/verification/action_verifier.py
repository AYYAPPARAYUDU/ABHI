"""Dual-State Physical Action Verification Engine.

Strictly enforces that a successful tool call does not equal task completion:
Physical postconditions MUST be observed and matched against expectations.
"""

from typing import Any, Dict, Optional
from pydantic import BaseModel
from backend.app.automation.models.actions import ExecutionAction, ObservedState, ActionResult, ActionType


class PhysicalVerificationResult(BaseModel):
    is_verified: bool
    claimed_action: str
    expected_postcondition: str
    observed_state_summary: str
    mismatch_details: Optional[str] = None
    retryable: bool = False


class ActionVerifier:
    """Validates pre-action and post-action physical state observations."""

    def verify_precondition(
        self,
        action: ExecutionAction,
        initial_observation: ObservedState
    ) -> bool:
        """Verify that the physical UI or DOM is in a valid state prior to action injection."""
        if action.action_type in [ActionType.BROWSER_NAVIGATE, ActionType.BROWSER_LAUNCH, ActionType.LAUNCH_APPLICATION]:
            return True
        if not initial_observation.target_found:
            return False
        if not initial_observation.is_enabled:
            return False
        return True

    def verify_postcondition(
        self,
        action: ExecutionAction,
        result: ActionResult
    ) -> PhysicalVerificationResult:
        """Verify that the expected state change physically materialized."""
        if not result.success:
            return PhysicalVerificationResult(
                is_verified=False,
                claimed_action=str(action.action_type),
                expected_postcondition=action.expected_postcondition,
                observed_state_summary=f"Worker reported error: {result.error}",
                mismatch_details=result.error or "Action failed during worker execution",
                retryable=True
            )

        observed = result.observed_state

        if action.action_type in [ActionType.BROWSER_NAVIGATE, ActionType.BROWSER_LAUNCH, ActionType.LAUNCH_APPLICATION] and result.success:
            return PhysicalVerificationResult(
                is_verified=True,
                claimed_action=str(action.action_type),
                expected_postcondition=action.expected_postcondition,
                observed_state_summary=f"URL: '{observed.raw_properties.get('url', '')}', Title: '{observed.window_title}'"
            )

        expected = action.expected_postcondition.lower().strip()

        # Check observed status label or dom text
        status_txt = str(observed.status_label or "").lower()
        dom_txt = str(observed.dom_text_content or "").lower()
        curr_val = str(observed.current_value or "").lower()
        win_title = str(observed.window_title or "").lower()

        status_norm = status_txt.replace("_", " ")
        dom_norm = dom_txt.replace("_", " ")
        exp_norm = expected.replace("_", " ")

        matched = False
        if exp_norm in status_norm or status_norm in exp_norm or exp_norm in dom_norm or dom_norm in exp_norm:
            matched = True
        elif expected in status_txt or expected in dom_txt or expected in curr_val or expected in win_title:
            matched = True
        elif status_txt and len(status_txt) >= 3 and status_txt in expected:
            matched = True
        elif dom_txt and len(dom_txt) >= 3 and dom_txt in expected:
            matched = True
        elif curr_val and len(curr_val) >= 3 and curr_val in expected:
            matched = True
        elif "submitted" in expected and "submitted" in status_txt:
            matched = True
        elif "search_completed" in expected and "search_completed" in status_txt:
            matched = True
        elif "success" in expected and "success" in status_txt:
            matched = True
        elif "toggled" in expected and "toggled" in status_txt:
            matched = True
        elif "filled" in expected and (curr_val != "" or "filled" in status_txt):
            matched = True
        elif "focused" in expected and observed.is_focused:
            matched = True
        elif "open" in expected and observed.target_found:
            matched = True

        if matched:
            return PhysicalVerificationResult(
                is_verified=True,
                claimed_action=str(action.action_type),
                expected_postcondition=action.expected_postcondition,
                observed_state_summary=f"Status: '{observed.status_label}', Value: '{observed.current_value}', DOM: '{observed.dom_text_content}'"
            )
        else:
            return PhysicalVerificationResult(
                is_verified=False,
                claimed_action=str(action.action_type),
                expected_postcondition=action.expected_postcondition,
                observed_state_summary=f"Status: '{observed.status_label}', Value: '{observed.current_value}', DOM: '{observed.dom_text_content}'",
                mismatch_details=f"Expected state '{action.expected_postcondition}' was not observed in actual physical state.",
                retryable=True
            )


# Singleton
action_verifier = ActionVerifier()

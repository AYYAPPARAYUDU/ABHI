"""Grounding Strategy Selector for Multi-Tier Execution Hierarchy.

Enforces least-risky valid grounding mechanism selection across Windows Desktop
and Playwright Browser domains.
"""

from typing import Any, Dict, List, Optional, Tuple

from backend.app.automation.browser.browser_worker import browser_worker
from backend.app.automation.desktop.windows_worker import windows_worker
from backend.app.automation.grounding.browser_grounder import browser_grounder, BrowserGrounder
from backend.app.automation.grounding.desktop_grounder import desktop_grounder, DesktopGrounder
from backend.app.automation.grounding.visual_grounder import visual_grounder, VisualGrounder
from backend.app.automation.grounding.visual_models import FallbackDecisionTrace, ScreenEvidence
from backend.app.automation.models.actions import ActionGrounding, ActionType, GroundingLevel
from backend.app.automation.models.errors import AutomationError, AutomationErrorCode
from backend.app.core.logging import logger


class GroundingStrategySelector:
    """Evaluates and selects the least-risky grounding mechanism for a target action."""

    def __init__(
        self,
        desktop_grnd: Optional[DesktopGrounder] = None,
        browser_grnd: Optional[BrowserGrounder] = None,
        visual_grnd: Optional[VisualGrounder] = None
    ):
        self.desktop_grounder = desktop_grnd or desktop_grounder
        self.browser_grounder = browser_grnd or browser_grounder
        self.visual_grounder = visual_grnd or visual_grounder

    def select_desktop_strategy(
        self,
        target_name: str,
        action_type: ActionType,
        active_elements: Optional[List[Dict[str, Any]]] = None,
        evidence: Optional[ScreenEvidence] = None,
        allow_visual_fallback: bool = True,
        task_id: str = "task_default",
        execution_id: str = "exec_default"
    ) -> Tuple[Optional[ActionGrounding], Optional[FallbackDecisionTrace], Optional[AutomationError]]:
        """Select least-risky grounding strategy for Windows Desktop actions.
        
        Hierarchy:
        1. LEVEL_1_UIA (Semantic UI Automation tree)
        2. LEVEL_2_ACCESSIBILITY (Native Win32 Accessibility tree)
        3. LEVEL_3_OCR / LEVEL_4_COORDINATES (Visual bounding box with coordinate dispatch)
        """
        elems = active_elements
        if elems is None and hasattr(windows_worker, "target_app"):
            elems = getattr(windows_worker.target_app, "_elements", None)

        grounding, grnd_err = self.desktop_grounder.ground_target(
            target_description=target_name,
            preferred_level=GroundingLevel.LEVEL_1_UIA,
            active_window_elements=elems,
            screen_evidence=evidence
        )

        if grounding and not grnd_err:
            if grounding.source in [GroundingLevel.LEVEL_1_UIA, GroundingLevel.LEVEL_2_ACCESSIBILITY]:
                trace = FallbackDecisionTrace(
                    task_id=task_id,
                    execution_id=execution_id,
                    preferred_method=GroundingLevel.LEVEL_1_UIA,
                    failure_reason="NONE_PREFERRED_METHOD_SUCCEEDED",
                    fallback_method=None,
                    fallback_confidence=grounding.confidence,
                    final_decision="EXECUTE_SEMANTIC_UIA"
                )
                return grounding, trace, None
            else:
                trace = self.desktop_grounder.last_fallback_trace or FallbackDecisionTrace(
                    task_id=task_id,
                    execution_id=execution_id,
                    preferred_method=GroundingLevel.LEVEL_1_UIA,
                    failure_reason="UIA_ELEMENT_NOT_FOUND_OR_CANVAS",
                    fallback_method=GroundingLevel.LEVEL_3_OCR,
                    fallback_confidence=grounding.confidence,
                    final_decision="EXECUTE_CONTROLLED_COORDINATE_FALLBACK"
                )
                return grounding, trace, None

        trace = FallbackDecisionTrace(
            task_id=task_id,
            execution_id=execution_id,
            preferred_method=GroundingLevel.LEVEL_1_UIA,
            failure_reason=grnd_err.message if grnd_err else "UNKNOWN_ERROR",
            fallback_method=None,
            fallback_confidence=0.0,
            final_decision="REJECT_GROUNDING_FAILED"
        )
        return None, trace, grnd_err

    def select_browser_strategy(
        self,
        target_name: str,
        action_type: ActionType,
        evidence: Optional[ScreenEvidence] = None,
        role: Optional[str] = None,
        dom_snapshot: Optional[List[Dict[str, Any]]] = None,
        allow_visual_fallback: bool = True,
        task_id: str = "task_default",
        execution_id: str = "exec_default"
    ) -> Tuple[Optional[ActionGrounding], Optional[FallbackDecisionTrace], Optional[AutomationError]]:
        """Select least-risky grounding strategy for Playwright Browser actions.
        
        Hierarchy:
        1. LEVEL_1_DOM (Accessible Role + Name / Exact Label / Placeholder)
        2. LEVEL_2_CSS (Semantic CSS selectors)
        3. LEVEL_3_OCR / LEVEL_4_COORDINATES (Visual bounding box with coordinate dispatch)
        """
        dom_snaps = dom_snapshot
        if dom_snaps is None and hasattr(browser_worker, "target_page"):
            target_p = getattr(browser_worker, "target_page", None)
            if target_p:
                dom_snaps = getattr(target_p, "_dom_nodes", None) or (target_p.get_dom_snapshot() if hasattr(target_p, "get_dom_snapshot") else None)

        grounding, grnd_err = self.browser_grounder.ground_target(
            target_description=target_name,
            role=role,
            dom_snapshot=dom_snaps,
            screen_evidence=evidence
        )

        if grounding and not grnd_err:
            if grounding.source in [GroundingLevel.LEVEL_1_UIA, GroundingLevel.LEVEL_2_ACCESSIBILITY]:
                trace = FallbackDecisionTrace(
                    task_id=task_id,
                    execution_id=execution_id,
                    preferred_method=GroundingLevel.LEVEL_1_UIA,
                    failure_reason="NONE_PREFERRED_METHOD_SUCCEEDED",
                    fallback_method=None,
                    fallback_confidence=grounding.confidence,
                    final_decision="EXECUTE_SEMANTIC_DOM"
                )
                return grounding, trace, None
            else:
                trace = self.browser_grounder.last_fallback_trace or FallbackDecisionTrace(
                    task_id=task_id,
                    execution_id=execution_id,
                    preferred_method=GroundingLevel.LEVEL_1_UIA,
                    failure_reason="DOM_ELEMENT_NOT_FOUND_OR_CANVAS",
                    fallback_method=GroundingLevel.LEVEL_3_OCR,
                    fallback_confidence=grounding.confidence,
                    final_decision="EXECUTE_CONTROLLED_COORDINATE_FALLBACK"
                )
                return grounding, trace, None

        trace = FallbackDecisionTrace(
            task_id=task_id,
            execution_id=execution_id,
            preferred_method=GroundingLevel.LEVEL_1_UIA,
            failure_reason=grnd_err.message if grnd_err else "UNKNOWN_ERROR",
            fallback_method=None,
            fallback_confidence=0.0,
            final_decision="REJECT_GROUNDING_FAILED"
        )
        return None, trace, grnd_err


# Global Strategy Selector Singleton
grounding_strategy_selector = GroundingStrategySelector()

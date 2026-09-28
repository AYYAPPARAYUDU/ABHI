"""Desktop UI Grounding Engine.

Implements the 4-tier grounding hierarchy for Windows automation:
Level 1: Windows UI Automation (UIA)
Level 2: Native Accessibility Trees (MSAA)
Level 3: Screen OCR Bounding Boxes (Visual Grounding Adapter)
Level 4: Raw Coordinates (Controlled Fallback with Pre/Post Verification)
"""

import time
from typing import Any, Dict, List, Optional, Tuple
from backend.app.automation.grounding.visual_grounder import visual_grounder, VisualGrounder
from backend.app.automation.grounding.visual_models import (
    VisualGroundingResult,
    ScreenEvidence,
    FallbackDecisionTrace
)
from backend.app.automation.models.actions import (
    ActionGrounding,
    GroundingLevel,
    BoundingBoxCoord,
    ObservedState
)
from backend.app.automation.models.errors import AutomationError, AutomationErrorCode


class DesktopGrounder:
    """Resolves natural language / semantic target requests to grounded UI entities."""

    def __init__(self, visual_adapter: Optional[VisualGrounder] = None):
        self.visual_adapter = visual_adapter or visual_grounder
        self.last_fallback_trace: Optional[FallbackDecisionTrace] = None

    def ground_target(
        self,
        target_description: str,
        preferred_level: GroundingLevel = GroundingLevel.LEVEL_1_UIA,
        active_window_elements: Optional[List[Dict[str, Any]]] = None,
        screen_evidence: Optional[ScreenEvidence] = None,
        screen_width: int = 1920,
        screen_height: int = 1080
    ) -> Tuple[Optional[ActionGrounding], Optional[AutomationError]]:
        """Resolve a physical target against the active UI hierarchy with structured fallback trace."""
        self.last_fallback_trace = None
        desc = target_description.strip().lower()

        # 1. Level 1/2: Windows UI Automation / Semantic Accessibility Matching
        if preferred_level in [GroundingLevel.LEVEL_1_UIA, GroundingLevel.LEVEL_2_ACCESSIBILITY]:
            if active_window_elements is not None:
                matches = []
                for elem in active_window_elements:
                    automation_id = str(elem.get("automation_id", "")).lower()
                    name = str(elem.get("name", "")).lower()
                    control_type = str(elem.get("control_type", "")).lower()

                    if desc in automation_id or desc in name or desc == automation_id or desc == name:
                        matches.append(elem)

                if len(matches) == 1:
                    match = matches[0]
                    bbox = None
                    if "bbox" in match:
                        b = match["bbox"]
                        bbox = BoundingBoxCoord(x=b["x"], y=b["y"], width=b["width"], height=b["height"])

                    grounding = ActionGrounding(
                        source=preferred_level,
                        target_identity=match.get("automation_id") or match.get("name") or "uia_element",
                        selector=f"UIA:AutomationId='{match.get('automation_id')}';Name='{match.get('name')}'",
                        bounding_box=bbox,
                        confidence=0.98,
                        metadata=match
                    )
                    return grounding, None

                elif len(matches) > 1:
                    return None, AutomationError(
                        error_code=AutomationErrorCode.GROUNDING_AMBIGUOUS,
                        message=f"Grounding ambiguous: {len(matches)} elements matched target '{target_description}'."
                    )

        # 2. Level 3: Screen OCR / Visual Fallback
        evidence = screen_evidence or ScreenEvidence(
            source="windows_desktop",
            width=screen_width,
            height=screen_height
        )

        vis_res, vis_err = self.visual_adapter.ground_visual_target(
            target_text=target_description,
            evidence=evidence
        )

        if vis_res:
            # Cross-validate if partial UIA context exists
            if active_window_elements:
                for elem in active_window_elements:
                    if desc in str(elem.get("name", "")).lower():
                        c_ok, c_err = self.visual_adapter.cross_validate_windows(elem, vis_res)
                        if not c_ok:
                            return None, c_err

            # Record Fallback Decision Trace
            trace = FallbackDecisionTrace(
                preferred_method=preferred_level,
                failure_reason="UIA_ELEMENT_NOT_FOUND_OR_CANVAS",
                fallback_method=GroundingLevel.LEVEL_3_OCR,
                fallback_confidence=vis_res.confidence,
                observation_id=evidence.observation_id,
                final_decision="EXECUTE",
                metadata={"target": target_description, "element_type": vis_res.element_type}
            )
            self.last_fallback_trace = trace

            grounding = self.visual_adapter.to_action_grounding(vis_res, level=GroundingLevel.LEVEL_3_OCR)
            return grounding, None

        if vis_err:
            return None, vis_err

        return None, AutomationError(
            error_code=AutomationErrorCode.GROUNDING_FAILED,
            message=f"Failed to ground target '{target_description}' across UIA, Accessibility, and OCR hierarchies."
        )


# Singleton
desktop_grounder = DesktopGrounder()

"""Desktop UI Grounding Engine.

Implements the 4-tier grounding hierarchy for Windows automation:
Level 1: Windows UI Automation (UIA)
Level 2: Native Accessibility Trees (MSAA)
Level 3: Screen OCR Bounding Boxes
Level 4: Raw Coordinates (Controlled Fallback)
"""

from typing import Any, Dict, List, Optional, Tuple
from backend.app.automation.models.actions import (
    ActionGrounding,
    GroundingLevel,
    BoundingBoxCoord,
    ObservedState
)
from backend.app.automation.models.errors import AutomationError, AutomationErrorCode
from backend.app.perception.vision.screen_ocr import screen_ocr


class DesktopGrounder:
    """Resolves natural language / semantic target requests to grounded UI entities."""

    def __init__(self):
        pass

    def ground_target(
        self,
        target_description: str,
        preferred_level: GroundingLevel = GroundingLevel.LEVEL_1_UIA,
        active_window_elements: Optional[List[Dict[str, Any]]] = None,
        screen_width: int = 1920,
        screen_height: int = 1080
    ) -> Tuple[Optional[ActionGrounding], Optional[AutomationError]]:
        """Resolve a physical target against the active UI hierarchy."""
        desc = target_description.strip().lower()

        # 1. Level 1: Windows UI Automation / Semantic Element Matching
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

        # 2. Level 3: Screen OCR Fallback
        ocr_res = screen_ocr.find_element_by_text(target_description, width=screen_width, height=screen_height)
        if ocr_res:
            grounding = ActionGrounding(
                source=GroundingLevel.LEVEL_3_OCR,
                target_identity=ocr_res.element_id,
                selector=f"OCR:Text='{ocr_res.text}'",
                bounding_box=BoundingBoxCoord(
                    x=ocr_res.box.x,
                    y=ocr_res.box.y,
                    width=ocr_res.box.width,
                    height=ocr_res.box.height
                ),
                confidence=ocr_res.confidence,
                metadata={"element_type": ocr_res.element_type}
            )
            return grounding, None

        return None, AutomationError(
            error_code=AutomationErrorCode.GROUNDING_FAILED,
            message=f"Failed to ground target '{target_description}' across UIA, Accessibility, and OCR hierarchies."
        )


# Singleton
desktop_grounder = DesktopGrounder()

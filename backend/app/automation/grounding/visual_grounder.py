"""Visual Grounding Adapter for Stage 5 Automation.

Integrates ScreenOCREngine with Windows and Browser automation pipelines,
enforcing strict freshness, bounding box sanity, confidence thresholds,
contextual disambiguation, and cross-validation against semantic UIA/DOM trees.
"""

import time
from typing import Any, Dict, List, Optional, Tuple

from backend.app.automation.grounding.visual_models import (
    VisualGroundingResult,
    ScreenEvidence,
    FallbackDecisionTrace
)
from backend.app.automation.models.actions import (
    ActionGrounding,
    GroundingLevel,
    BoundingBoxCoord
)
from backend.app.automation.models.errors import AutomationError, AutomationErrorCode
from backend.app.perception.vision.screen_ocr import (
    screen_ocr,
    ScreenOCREngine,
    DetectedUIElement,
    ScreenOCRResult
)


class VisualGrounder:
    """Adapts multimodal visual perception (OCR/Screenshots) into authoritative Stage 5 Grounding."""

    DEFAULT_MAX_VISUAL_AGE_SECONDS: float = 5.0
    CONFIDENCE_THRESHOLD: float = 0.70

    def __init__(self, ocr_engine: Optional[ScreenOCREngine] = None, max_visual_age: float = DEFAULT_MAX_VISUAL_AGE_SECONDS):
        self.ocr = ocr_engine or screen_ocr
        self.max_visual_age = max_visual_age

    def validate_bounding_box(
        self,
        box: BoundingBoxCoord,
        screen_width: int,
        screen_height: int
    ) -> Tuple[bool, Optional[AutomationError]]:
        """Verify bounding box is strictly within display coordinates."""
        if box.x < 0 or box.y < 0:
            return False, AutomationError(
                error_code=AutomationErrorCode.INVALID_BOUNDING_BOX,
                message=f"Invalid bounding box: negative coordinates (x={box.x}, y={box.y})."
            )
        if box.width <= 0 or box.height <= 0:
            return False, AutomationError(
                error_code=AutomationErrorCode.INVALID_BOUNDING_BOX,
                message=f"Invalid bounding box: non-positive dimensions (w={box.width}, h={box.height})."
            )
        if (box.x + box.width) > screen_width or (box.y + box.height) > screen_height:
            return False, AutomationError(
                error_code=AutomationErrorCode.INVALID_BOUNDING_BOX,
                message=f"Invalid bounding box: extends beyond screen boundaries (x+w={box.x+box.width}>{screen_width} or y+h={box.y+box.height}>{screen_height})."
            )
        return True, None

    def ground_visual_target(
        self,
        target_text: str,
        evidence: ScreenEvidence,
        element_type: Optional[str] = None,
        expected_window: Optional[str] = None,
        nearby_text: Optional[str] = None,
        region_bounds: Optional[BoundingBoxCoord] = None,
        custom_ocr_result: Optional[ScreenOCRResult] = None
    ) -> Tuple[Optional[VisualGroundingResult], Optional[AutomationError]]:
        """Resolve a semantic text query to physical coordinates from visual evidence."""
        # 1. Freshness Check
        if not evidence.is_fresh(self.max_visual_age):
            age = round(time.time() - evidence.capture_timestamp, 2)
            return None, AutomationError(
                error_code=AutomationErrorCode.STALE_VISUAL_EVIDENCE,
                message=f"Visual evidence is stale: age {age}s exceeds maximum {self.max_visual_age}s limit."
            )

        # 2. Extract OCR Tokens
        if custom_ocr_result:
            ocr_res = custom_ocr_result
        else:
            ocr_res = self.ocr.parse_screen(
                image_bytes=evidence.image_bytes,
                width=evidence.width,
                height=evidence.height
            )

        q = target_text.strip().lower()
        matching_elements: List[DetectedUIElement] = []

        for elem in ocr_res.detected_elements:
            elem_text = elem.text.strip().lower()
            if q in elem_text or elem_text == q:
                matching_elements.append(elem)

        if not matching_elements:
            return None, AutomationError(
                error_code=AutomationErrorCode.GROUNDING_NOT_FOUND,
                message=f"Visual grounding not found: No OCR text matching '{target_text}'."
            )

        # 3. Disambiguation if multiple matches found
        if len(matching_elements) > 1:
            filtered = list(matching_elements)

            # Filter by element type
            if element_type:
                typed = [e for e in filtered if e.element_type.lower() == element_type.lower()]
                if typed:
                    filtered = typed

            # Filter by region bounds
            if region_bounds:
                bounded = [
                    e for e in filtered
                    if (region_bounds.x <= e.box.x <= region_bounds.x + region_bounds.width and
                        region_bounds.y <= e.box.y <= region_bounds.y + region_bounds.height)
                ]
                if bounded:
                    filtered = bounded

            # Filter by nearby context text
            if nearby_text:
                n_text = nearby_text.lower()
                nearby_candidates = [
                    other for other in ocr_res.detected_elements
                    if n_text in other.text.lower()
                ]
                if nearby_candidates:
                    # Select the candidate in filtered with minimum Manhattan distance to any nearby candidate
                    def min_dist(e):
                        return min(
                            abs(e.box.center_x - nc.box.center_x) + abs(e.box.center_y - nc.box.center_y)
                            for nc in nearby_candidates
                            if nc.element_id != e.element_id
                        )
                    min_elem = min(filtered, key=min_dist)
                    filtered = [min_elem]

            if len(filtered) == 1:
                selected_elem = filtered[0]
            else:
                return None, AutomationError(
                    error_code=AutomationErrorCode.GROUNDING_AMBIGUOUS,
                    message=f"Visual grounding ambiguous: {len(filtered)} visual elements matched '{target_text}'. Cannot safely resolve unique target."
                )
        else:
            selected_elem = matching_elements[0]

        # 4. Confidence Validation
        if selected_elem.confidence < self.CONFIDENCE_THRESHOLD:
            return None, AutomationError(
                error_code=AutomationErrorCode.GROUNDING_CONFIDENCE_LOW,
                message=f"Visual grounding confidence {selected_elem.confidence:.2f} is below required threshold ({self.CONFIDENCE_THRESHOLD:.2f})."
            )

        # 5. Bounding Box Geometry Sanity
        bbox = BoundingBoxCoord(
            x=selected_elem.box.x,
            y=selected_elem.box.y,
            width=selected_elem.box.width,
            height=selected_elem.box.height
        )
        box_ok, box_err = self.validate_bounding_box(bbox, evidence.width, evidence.height)
        if not box_ok or box_err:
            return None, box_err

        # 6. Construct Structured Result
        res = VisualGroundingResult(
            source=GroundingLevel.LEVEL_3_OCR,
            target_text=selected_elem.text,
            element_type=selected_elem.element_type,
            bounding_box=bbox,
            center=(bbox.center_x, bbox.center_y),
            confidence=selected_elem.confidence,
            screen_id=evidence.screen_id,
            capture_timestamp=evidence.capture_timestamp,
            evidence_reference=evidence.artifact_reference,
            metadata={
                "observation_id": evidence.observation_id,
                "element_id": selected_elem.element_id,
                "screen_source": evidence.source
            }
        )
        return res, None

    def to_action_grounding(
        self,
        visual_result: VisualGroundingResult,
        level: GroundingLevel = GroundingLevel.LEVEL_3_OCR
    ) -> ActionGrounding:
        """Convert VisualGroundingResult into canonical ActionGrounding envelope."""
        return ActionGrounding(
            source=level,
            target_identity=visual_result.target_text,
            selector=f"VISUAL:OCR='{visual_result.target_text}';Center=({visual_result.center[0]},{visual_result.center[1]})",
            bounding_box=visual_result.bounding_box,
            confidence=visual_result.confidence,
            timestamp=visual_result.capture_timestamp,
            metadata=visual_result.metadata
        )

    def cross_validate_windows(
        self,
        uia_element: Dict[str, Any],
        visual_result: VisualGroundingResult
    ) -> Tuple[bool, Optional[AutomationError]]:
        """Cross-validate semantic Windows UIA element against visual OCR observation."""
        uia_name = str(uia_element.get("name", "")).lower()
        vis_text = visual_result.target_text.lower()

        # Semantic name comparison
        if uia_name and vis_text not in uia_name and uia_name not in vis_text:
            return False, AutomationError(
                error_code=AutomationErrorCode.GROUNDING_CONFLICT,
                message=f"Grounding conflict: UIA element '{uia_name}' contradicts OCR observation '{vis_text}'."
            )

        # Spatial comparison if UIA bbox is present
        if "bbox" in uia_element:
            b = uia_element["bbox"]
            uia_center_x = b["x"] + b["width"] // 2
            uia_center_y = b["y"] + b["height"] // 2
            dist = abs(uia_center_x - visual_result.center[0]) + abs(uia_center_y - visual_result.center[1])
            if dist > 150:  # Significant spatial divergence
                return False, AutomationError(
                    error_code=AutomationErrorCode.GROUNDING_CONFLICT,
                    message=f"Grounding conflict: Spatial divergence {dist}px between UIA center ({uia_center_x}, {uia_center_y}) and Visual center {visual_result.center}."
                )

        return True, None

    def cross_validate_browser(
        self,
        dom_node: Dict[str, Any],
        visual_result: VisualGroundingResult
    ) -> Tuple[bool, Optional[AutomationError]]:
        """Cross-validate browser DOM element against visual OCR observation."""
        dom_text = str(dom_node.get("text", "") or dom_node.get("aria_label", "")).lower()
        vis_text = visual_result.target_text.lower()

        if dom_text and vis_text not in dom_text and dom_text not in vis_text:
            return False, AutomationError(
                error_code=AutomationErrorCode.GROUNDING_CONFLICT,
                message=f"Grounding conflict: DOM text '{dom_text}' contradicts OCR observation '{vis_text}'."
            )

        return True, None


# Global visual grounder singleton
visual_grounder = VisualGrounder()

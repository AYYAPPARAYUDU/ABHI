"""Browser DOM & Accessibility Grounding Engine.

Resolves browser targets using Playwright's semantic grounding hierarchy:
Level 1: Accessible role + name
Level 2: Accessible label
Level 3: Test-ID, placeholder, text attributes
Level 4: Controlled CSS selector / Visual OCR Fallback
Strict ambiguity detection: Returns GROUNDING_AMBIGUOUS if multiple elements match.
"""

import time
from typing import Any, Dict, List, Optional, Tuple

from backend.app.automation.grounding.visual_grounder import visual_grounder, VisualGrounder
from backend.app.automation.grounding.visual_models import (
    VisualGroundingResult,
    ScreenEvidence,
    FallbackDecisionTrace
)
from backend.app.automation.models.actions import ActionGrounding, GroundingLevel, BoundingBoxCoord
from backend.app.automation.models.errors import AutomationError, AutomationErrorCode


class BrowserGrounder:
    """Grounds browser interactions via Playwright role, accessibility, text, test-ID locators and visual fallback."""

    def __init__(self, visual_adapter: Optional[VisualGrounder] = None):
        self.visual_adapter = visual_adapter or visual_grounder
        self.last_fallback_trace: Optional[FallbackDecisionTrace] = None

    def ground_target(
        self,
        target_description: str,
        role: Optional[str] = None,
        name: Optional[str] = None,
        label: Optional[str] = None,
        placeholder: Optional[str] = None,
        test_id: Optional[str] = None,
        frame_identity: Optional[str] = None,
        dom_snapshot: Optional[List[Dict[str, Any]]] = None,
        screen_evidence: Optional[ScreenEvidence] = None,
        screen_width: int = 1920,
        screen_height: int = 1080
    ) -> Tuple[Optional[ActionGrounding], Optional[AutomationError]]:
        """Resolve a browser target into a canonical ActionGrounding object with fallback tracking."""
        self.last_fallback_trace = None

        # 1. If explicit semantic parameters are provided
        metadata: Dict[str, Any] = {
            "role": role,
            "name": name,
            "label": label,
            "placeholder": placeholder,
            "test_id": test_id,
            "frame_identity": frame_identity
        }

        if test_id:
            return ActionGrounding(
                source=GroundingLevel.LEVEL_1_UIA,
                target_identity=test_id,
                selector=f"[data-testid='{test_id}']",
                confidence=0.99,
                metadata=metadata
            ), None

        if role:
            selector = f"role={role}[name='{name}']" if name else f"role={role}"
            return ActionGrounding(
                source=GroundingLevel.LEVEL_1_UIA,
                target_identity=name or role,
                selector=selector,
                confidence=0.98,
                metadata=metadata
            ), None

        if label:
            return ActionGrounding(
                source=GroundingLevel.LEVEL_1_UIA,
                target_identity=label,
                selector=f"label={label}",
                confidence=0.97,
                metadata=metadata
            ), None

        if placeholder:
            return ActionGrounding(
                source=GroundingLevel.LEVEL_1_UIA,
                target_identity=placeholder,
                selector=f"placeholder={placeholder}",
                confidence=0.95,
                metadata=metadata
            ), None

        # 2. If DOM snapshot is provided, resolve against snapshot
        if dom_snapshot is not None:
            dom_res, dom_err = self.ground_dom_element(target_description, dom_snapshot=dom_snapshot)
            if dom_res:
                return dom_res, None
            if dom_err and dom_err.error_code == AutomationErrorCode.GROUNDING_AMBIGUOUS:
                return None, dom_err

        # 3. Visual OCR Fallback if semantic DOM grounding was not matched or target is canvas/custom
        if screen_evidence is not None:
            vis_res, vis_err = self.visual_adapter.ground_visual_target(
                target_text=target_description,
                evidence=screen_evidence
            )
            if vis_res:
                # Cross-validate if partial DOM context exists
                if dom_snapshot:
                    for node in dom_snapshot:
                        if target_description.lower() in str(node.get("text", "")).lower():
                            c_ok, c_err = self.visual_adapter.cross_validate_browser(node, vis_res)
                            if not c_ok:
                                return None, c_err

                # Record Fallback Decision Trace
                trace = FallbackDecisionTrace(
                    preferred_method=GroundingLevel.LEVEL_1_UIA,
                    failure_reason="DOM_ELEMENT_NOT_ACCESSIBLE_OR_CANVAS",
                    fallback_method=GroundingLevel.LEVEL_3_OCR,
                    fallback_confidence=vis_res.confidence,
                    observation_id=screen_evidence.observation_id,
                    final_decision="EXECUTE",
                    metadata={"target": target_description, "element_type": vis_res.element_type}
                )
                self.last_fallback_trace = trace

                grounding = self.visual_adapter.to_action_grounding(vis_res, level=GroundingLevel.LEVEL_3_OCR)
                return grounding, None

            if vis_err:
                return None, vis_err

        # 4. Default fallback by target_description
        target_clean = target_description.strip()
        selector = f"#{target_clean}" if not (target_clean.startswith("#") or "[" in target_clean) else target_clean
        return ActionGrounding(
            source=GroundingLevel.LEVEL_1_UIA,
            target_identity=target_clean,
            selector=selector,
            confidence=0.95,
            metadata=metadata
        ), None

    def ground_dom_element(
        self,
        target_description: str,
        dom_snapshot: Optional[List[Dict[str, Any]]] = None
    ) -> Tuple[Optional[ActionGrounding], Optional[AutomationError]]:
        """Resolve a web target selector against a DOM tree snapshot."""
        desc = target_description.strip().lower()

        if dom_snapshot is not None:
            matches = []
            for node in dom_snapshot:
                role = str(node.get("role", "")).lower()
                text = str(node.get("text", "")).lower()
                test_id = str(node.get("test_id", "")).lower()
                aria_label = str(node.get("aria_label", "")).lower()
                tag = str(node.get("tag", "")).lower()

                if desc in text or desc in test_id or desc in aria_label or desc == role:
                    matches.append(node)

            if len(matches) == 1:
                match = matches[0]
                selector = f"role={match.get('role', 'button')}[name='{match.get('text', '')}']" if match.get("role") else f"[data-testid='{match.get('test_id', '')}']"
                grounding = ActionGrounding(
                    source=GroundingLevel.LEVEL_1_UIA,
                    target_identity=match.get("test_id") or match.get("text") or "dom_node",
                    selector=selector,
                    confidence=0.99,
                    metadata=match
                )
                return grounding, None

            elif len(matches) > 1:
                return None, AutomationError(
                    error_code=AutomationErrorCode.GROUNDING_AMBIGUOUS,
                    message=f"Browser grounding ambiguous: {len(matches)} DOM nodes matched '{target_description}'. Unique locator required."
                )

        return None, AutomationError(
            error_code=AutomationErrorCode.GROUNDING_FAILED,
            message=f"Failed to locate DOM element matching '{target_description}'."
        )


# Singleton
browser_grounder = BrowserGrounder()

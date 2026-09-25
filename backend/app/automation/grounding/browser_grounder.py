"""Browser DOM & Accessibility Grounding Engine."""

from typing import Any, Dict, List, Optional, Tuple
from backend.app.automation.models.actions import ActionGrounding, GroundingLevel, BoundingBoxCoord
from backend.app.automation.models.errors import AutomationError, AutomationErrorCode


class BrowserGrounder:
    """Grounds browser interactions via Playwright role, accessibility, text, and test-ID locators."""

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

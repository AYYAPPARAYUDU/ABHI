"""Automation Grounding Package."""

from backend.app.automation.grounding.desktop_grounder import DesktopGrounder, desktop_grounder
from backend.app.automation.grounding.browser_grounder import BrowserGrounder, browser_grounder
from backend.app.automation.grounding.visual_grounder import VisualGrounder, visual_grounder
from backend.app.automation.grounding.visual_models import (
    VisualGroundingResult,
    ScreenEvidence,
    FallbackDecisionTrace
)
from backend.app.automation.grounding.visual_overlay import (
    VisualOverlayEngine,
    visual_overlay_engine,
    VisualEvidenceOverlay,
    OverlayAnnotation
)

__all__ = [
    "DesktopGrounder",
    "desktop_grounder",
    "BrowserGrounder",
    "browser_grounder",
    "VisualGrounder",
    "visual_grounder",
    "VisualGroundingResult",
    "ScreenEvidence",
    "FallbackDecisionTrace",
    "VisualOverlayEngine",
    "visual_overlay_engine",
    "VisualEvidenceOverlay",
    "OverlayAnnotation"
]

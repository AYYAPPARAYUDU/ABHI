"""Dynamic Visual Evidence Overlay Generator.

Constructs lightweight structured bounding box overlays and metadata
for debugging, visual verification, and frontend rendering without raw streaming overhead.
"""

import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from backend.app.automation.grounding.visual_models import VisualGroundingResult, ScreenEvidence
from backend.app.automation.models.actions import BoundingBoxCoord


class OverlayAnnotation(BaseModel):
    """Structured bounding box overlay annotation for a visual UI entity."""
    element_id: str
    label: str
    element_type: str
    box: BoundingBoxCoord
    center: tuple[int, int]
    confidence: float
    source: str
    color_hex: str = "#00E5FF"  # High-visibility neon cyan default
    timestamp: float = Field(default_factory=time.time)


class VisualEvidenceOverlay(BaseModel):
    """Full overlay metadata container for a visual observation."""
    observation_id: str
    screen_id: str
    width: int
    height: int
    capture_timestamp: float
    annotations: List[OverlayAnnotation] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class VisualOverlayEngine:
    """Generates structured visual debug and verification overlays."""

    COLOR_MAP = {
        "button": "#00E5FF",      # Cyan
        "input": "#76FF03",       # Neon Green
        "canvas": "#FFD600",      # Amber
        "text": "#E0E0E0",        # Light Gray
        "link": "#2979FF",        # Blue
        "icon": "#FF4081",        # Pink
        "conflict": "#FF1744"     # Red
    }

    def generate_overlay(
        self,
        evidence: ScreenEvidence,
        grounding_results: List[VisualGroundingResult],
        conflict: bool = False
    ) -> VisualEvidenceOverlay:
        """Create structured overlay object from evidence and resolved visual targets."""
        annotations = []
        for res in grounding_results:
            color = self.COLOR_MAP["conflict"] if conflict else self.COLOR_MAP.get(res.element_type.lower(), "#00E5FF")
            annotations.append(
                OverlayAnnotation(
                    element_id=res.metadata.get("element_id", f"vis_{res.target_text}"),
                    label=res.target_text,
                    element_type=res.element_type,
                    box=res.bounding_box,
                    center=res.center,
                    confidence=res.confidence,
                    source=str(res.source),
                    color_hex=color,
                    timestamp=res.capture_timestamp
                )
            )

        return VisualEvidenceOverlay(
            observation_id=evidence.observation_id,
            screen_id=evidence.screen_id,
            width=evidence.width,
            height=evidence.height,
            capture_timestamp=evidence.capture_timestamp,
            annotations=annotations,
            metadata={
                "retention_policy": evidence.retention_policy,
                "has_conflicts": conflict
            }
        )


# Global overlay singleton
visual_overlay_engine = VisualOverlayEngine()

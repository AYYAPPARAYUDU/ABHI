"""Visual Grounding, Evidence, and Fallback Decision Trace Models.

Enforces structured visual observations, freshness constraints, and fallback traces
for Phase 5 Stage 5.4 Multimodal Vision & OCR Integration.
"""

import time
import uuid
from typing import Any, Dict, Optional, Tuple
from pydantic import BaseModel, Field, field_validator

from backend.app.automation.models.actions import BoundingBoxCoord, GroundingLevel


class VisualGroundingResult(BaseModel):
    """Structured result returned by visual grounding adapter."""
    source: GroundingLevel = GroundingLevel.LEVEL_3_OCR
    target_text: str
    element_type: str = "text"  # "button", "input", "link", "text", "canvas", "icon"
    bounding_box: BoundingBoxCoord
    center: Tuple[int, int]
    confidence: float = Field(..., ge=0.0, le=1.0)
    screen_id: str = "primary_display"
    capture_timestamp: float = Field(default_factory=time.time)
    evidence_reference: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("confidence")
    @classmethod
    def validate_confidence(cls, v: float) -> float:
        if v < 0.70:
            raise ValueError(f"Visual grounding confidence {v:.2f} is below allowable threshold (0.70)")
        return v


class ScreenEvidence(BaseModel):
    """Bounded screenshot/evidence abstraction with retention controls."""
    observation_id: str = Field(default_factory=lambda: f"obs_{uuid.uuid4().hex[:12]}")
    capture_timestamp: float = Field(default_factory=time.time)
    screen_id: str = "primary_display"
    width: int = 1920
    height: int = 1080
    source: str = "windows_desktop"  # "windows_desktop" | "playwright_browser" | "mock_screen"
    artifact_reference: Optional[str] = None
    retention_policy: str = "EPHEMERAL"  # "EPHEMERAL" | "VERIFICATION_AUDIT" | "DEBUG_SAVED"
    image_bytes: Optional[bytes] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def is_fresh(self, max_visual_age_seconds: float = 5.0) -> bool:
        """Check if screenshot was captured within the allowed freshness window."""
        return (time.time() - self.capture_timestamp) <= max_visual_age_seconds


class FallbackDecisionTrace(BaseModel):
    """Authoritative audit record detailing why semantic grounding transitioned to visual fallback."""
    preferred_method: GroundingLevel
    failure_reason: str
    fallback_method: GroundingLevel
    fallback_confidence: float
    observation_id: str
    final_decision: str  # "EXECUTE" | "REJECT" | "RE_GROUND"
    timestamp: float = Field(default_factory=time.time)
    metadata: Dict[str, Any] = Field(default_factory=dict)

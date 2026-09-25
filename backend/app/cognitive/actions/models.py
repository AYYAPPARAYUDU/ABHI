"""Canonical Desktop & Browser Action Schema and Grounding Models."""

from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field, field_validator


class GroundingLevel(str, Enum):
    LEVEL_1_UIA = "LEVEL_1_UIA"                     # Windows UI Automation / Playwright DOM Locators
    LEVEL_2_ACCESSIBILITY = "LEVEL_2_ACCESSIBILITY" # Native Win32 Accessibility Trees
    LEVEL_3_OCR = "LEVEL_3_OCR"                     # Visual Screen OCR Bounding Boxes
    LEVEL_4_COORDINATES = "LEVEL_4_COORDINATES"     # Strict fallback with visual confirmation only


class ActionType(str, Enum):
    LAUNCH_APP = "LAUNCH_APP"
    FOCUS_WINDOW = "FOCUS_WINDOW"
    CLICK_ELEMENT = "CLICK_ELEMENT"
    TYPE_TEXT = "TYPE_TEXT"
    KEY_COMBINATION = "KEY_COMBINATION"
    SCROLL = "SCROLL"
    DRAG_AND_DROP = "DRAG_AND_DROP"
    CLOSE_APP = "CLOSE_APP"
    BROWSER_NAVIGATE = "BROWSER_NAVIGATE"
    BROWSER_CLICK = "BROWSER_CLICK"
    BROWSER_FILL = "BROWSER_FILL"
    BROWSER_SCREENSHOT = "BROWSER_SCREENSHOT"


class BoundingBoxCoord(BaseModel):
    x: int
    y: int
    width: int
    height: int


class ActionGrounding(BaseModel):
    source: GroundingLevel
    selector: Optional[str] = None
    bounding_box: Optional[BoundingBoxCoord] = None
    confidence: float = Field(..., ge=0.0, le=1.0)

    @field_validator("confidence")
    @classmethod
    def validate_confidence(cls, v: float, info: Any) -> float:
        if v < 0.70:
            raise ValueError(f"Grounding confidence {v:.2f} is below minimum allowable threshold (0.70)")
        return v


class DesktopAction(BaseModel):
    """Canonical physical desktop and browser automation action envelope."""
    action_id: str
    task_id: str
    lease_id: str
    action_type: ActionType
    grounding: ActionGrounding
    parameters: Dict[str, Any] = Field(default_factory=dict)
    precondition: str = Field(..., description="Mandatory expected precondition check")
    expected_postcondition: str = Field(..., description="Mandatory expected physical postcondition state")
    timeout_ms: int = Field(default=5000, ge=100, le=60000)

    @field_validator("precondition")
    @classmethod
    def validate_precondition_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Action precondition must not be empty.")
        return v

    @field_validator("expected_postcondition")
    @classmethod
    def validate_postcondition_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Action expected_postcondition must not be empty.")
        return v

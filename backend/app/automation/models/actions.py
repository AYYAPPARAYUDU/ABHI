"""Canonical Action, Grounding, and Observation Models."""

import time
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class GroundingLevel(str, Enum):
    LEVEL_1_UIA = "LEVEL_1_UIA"                     # Windows UI Automation / Playwright DOM Locators
    LEVEL_2_ACCESSIBILITY = "LEVEL_2_ACCESSIBILITY" # Native Win32 Accessibility Trees
    LEVEL_3_OCR = "LEVEL_3_OCR"                     # Visual Screen OCR Bounding Boxes
    LEVEL_4_COORDINATES = "LEVEL_4_COORDINATES"     # Strict fallback with visual confirmation only


class ActionType(str, Enum):
    # Desktop Actions
    LAUNCH_APPLICATION = "LAUNCH_APPLICATION"
    CLOSE_APPLICATION = "CLOSE_APPLICATION"
    FOCUS_WINDOW = "FOCUS_WINDOW"
    INSPECT_WINDOW = "INSPECT_WINDOW"
    CLICK_ELEMENT = "CLICK_ELEMENT"
    TYPE_TEXT = "TYPE_TEXT"
    KEY_COMBINATION = "KEY_COMBINATION"
    SCROLL = "SCROLL"
    DRAG_AND_DROP = "DRAG_AND_DROP"
    SCREENSHOT = "SCREENSHOT"
    
    # Browser Actions
    BROWSER_LAUNCH = "BROWSER_LAUNCH"
    BROWSER_NAVIGATE = "BROWSER_NAVIGATE"
    BROWSER_INSPECT_DOM = "BROWSER_INSPECT_DOM"
    BROWSER_CLICK = "BROWSER_CLICK"
    BROWSER_FILL = "BROWSER_FILL"
    BROWSER_PRESS_KEY = "BROWSER_PRESS_KEY"
    BROWSER_SCREENSHOT = "BROWSER_SCREENSHOT"
    BROWSER_VERIFY_DOM = "BROWSER_VERIFY_DOM"


class BoundingBoxCoord(BaseModel):
    x: int
    y: int
    width: int
    height: int

    @property
    def center_x(self) -> int:
        return self.x + self.width // 2

    @property
    def center_y(self) -> int:
        return self.y + self.height // 2


class ActionGrounding(BaseModel):
    source: GroundingLevel
    target_identity: str = Field(..., description="Unique selector, AutomationId, name, or DOM locator")
    selector: Optional[str] = None
    bounding_box: Optional[BoundingBoxCoord] = None
    confidence: float = Field(..., ge=0.0, le=1.0)
    timestamp: float = Field(default_factory=time.time)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("confidence")
    @classmethod
    def validate_confidence(cls, v: float) -> float:
        if v < 0.70:
            raise ValueError(f"Grounding confidence {v:.2f} is below allowable threshold (0.70)")
        return v


class ExecutionAction(BaseModel):
    """Canonical physical execution action envelope."""
    action_id: str
    task_id: str
    execution_id: str
    lease_id: str
    action_type: ActionType
    grounding: ActionGrounding
    parameters: Dict[str, Any] = Field(default_factory=dict)
    precondition: str = Field(..., description="Mandatory expected precondition check")
    expected_postcondition: str = Field(..., description="Mandatory expected physical postcondition state")
    timeout_ms: int = Field(default=5000, ge=100, le=60000)
    risk_tier: str = "Tier 1"

    @field_validator("precondition")
    @classmethod
    def validate_precondition_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Action precondition must not be empty.")
        return v

    @field_validator("expected_postcondition")
    @classmethod
    def validate_postcondition_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Action expected_postcondition must not be empty.")
        return v


class ObservedState(BaseModel):
    """Physical state observed from the target application or DOM before/after execution."""
    target_found: bool = False
    is_enabled: bool = False
    is_focused: bool = False
    window_title: Optional[str] = None
    current_value: Optional[str] = None
    status_label: Optional[str] = None
    dom_text_content: Optional[str] = None
    bounding_box: Optional[BoundingBoxCoord] = None
    raw_properties: Dict[str, Any] = Field(default_factory=dict)
    timestamp: float = Field(default_factory=time.time)


class ActionResult(BaseModel):
    """Result returned by worker execution."""
    success: bool
    action_id: str
    execution_duration_ms: float
    observed_state: ObservedState
    error: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)

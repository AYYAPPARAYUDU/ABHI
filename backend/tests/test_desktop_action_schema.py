"""Unit tests for DesktopAction and ActionGrounding schema validation."""

import pytest
from pydantic import ValidationError
from backend.app.cognitive.actions.models import (
    DesktopAction,
    ActionGrounding,
    GroundingLevel,
    ActionType,
    BoundingBoxCoord
)


def test_valid_desktop_action():
    action = DesktopAction(
        action_id="act_001",
        task_id="task_100",
        lease_id="lease_500",
        action_type=ActionType.CLICK_ELEMENT,
        grounding=ActionGrounding(
            source=GroundingLevel.LEVEL_1_UIA,
            selector="btn_submit_order",
            bounding_box=BoundingBoxCoord(x=150, y=300, width=80, height=40),
            confidence=0.95
        ),
        parameters={"click_type": "left_single"},
        precondition="Window 'Order System' is active and focused",
        expected_postcondition="Dialog 'Order Submitted' is visible"
    )
    assert action.action_id == "act_001"
    assert action.grounding.source == GroundingLevel.LEVEL_1_UIA
    assert action.grounding.confidence == 0.95


def test_missing_precondition_rejection():
    with pytest.raises(ValidationError):
        DesktopAction(
            action_id="act_002",
            task_id="task_100",
            lease_id="lease_500",
            action_type=ActionType.TYPE_TEXT,
            grounding=ActionGrounding(
                source=GroundingLevel.LEVEL_3_OCR,
                confidence=0.88
            ),
            precondition="   ",  # Blank precondition is strictly invalid
            expected_postcondition="Text inserted"
        )


def test_low_confidence_rejection():
    with pytest.raises(ValidationError):
        DesktopAction(
            action_id="act_003",
            task_id="task_100",
            lease_id="lease_500",
            action_type=ActionType.CLICK_ELEMENT,
            grounding=ActionGrounding(
                source=GroundingLevel.LEVEL_3_OCR,
                confidence=0.55  # Below threshold 0.70
            ),
            precondition="Button is visible",
            expected_postcondition="Page loaded"
        )

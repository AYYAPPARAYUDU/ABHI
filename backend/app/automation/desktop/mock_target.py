"""Safe Local Deterministic Test Target for Windows Desktop Automation."""

from typing import Any, Dict, List, Optional
from backend.app.automation.models.actions import ObservedState, BoundingBoxCoord


class MockLocalDesktopApp:
    """A safe, fully deterministic in-memory local desktop application test target."""

    def __init__(self, title: str = "Local Automation Test App v1.0"):
        self.title = title
        self.is_running = True
        self.is_focused = True
        self.status_label = "READY"
        self.input_text = ""
        self.checkbox_checked = False
        self.click_count = 0
        self.last_clicked_id: Optional[str] = None

        self._elements = [
            {
                "automation_id": "btn_submit",
                "name": "Submit",
                "control_type": "Button",
                "is_enabled": True,
                "bbox": {"x": 100, "y": 200, "width": 100, "height": 35}
            },
            {
                "automation_id": "btn_cancel",
                "name": "Cancel",
                "control_type": "Button",
                "is_enabled": True,
                "bbox": {"x": 220, "y": 200, "width": 100, "height": 35}
            },
            {
                "automation_id": "btn_disabled",
                "name": "Disabled Action",
                "control_type": "Button",
                "is_enabled": False,
                "bbox": {"x": 340, "y": 200, "width": 120, "height": 35}
            },
            {
                "automation_id": "txt_username",
                "name": "Username",
                "control_type": "Edit",
                "is_enabled": True,
                "bbox": {"x": 100, "y": 120, "width": 250, "height": 30}
            },
            {
                "automation_id": "chk_agree",
                "name": "Agree to terms",
                "control_type": "CheckBox",
                "is_enabled": True,
                "bbox": {"x": 100, "y": 160, "width": 20, "height": 20}
            },
            {
                "automation_id": "lbl_status",
                "name": "Status Label",
                "control_type": "Text",
                "is_enabled": True,
                "bbox": {"x": 100, "y": 260, "width": 300, "height": 25}
            }
        ]

    def get_element_tree(self) -> List[Dict[str, Any]]:
        """Return the UIA accessibility tree of the mock target."""
        return self._elements

    def observe_element(self, element_id: str) -> ObservedState:
        """Observe the physical state of a UI control."""
        for elem in self._elements:
            if elem["automation_id"] == element_id or elem["name"].lower() == element_id.lower():
                b = elem["bbox"]
                current_val = self.input_text if elem["automation_id"] == "txt_username" else None
                return ObservedState(
                    target_found=True,
                    is_enabled=elem["is_enabled"],
                    is_focused=self.is_focused,
                    window_title=self.title,
                    current_value=current_val,
                    status_label=self.status_label,
                    bounding_box=BoundingBoxCoord(x=b["x"], y=b["y"], width=b["width"], height=b["height"]),
                    raw_properties=elem
                )
        return ObservedState(target_found=False, window_title=self.title, status_label=self.status_label)

    def click(self, element_id: str) -> bool:
        """Perform a click on a grounded element."""
        obs = self.observe_element(element_id)
        if not obs.target_found or not obs.is_enabled:
            return False

        self.click_count += 1
        self.last_clicked_id = element_id

        if element_id == "btn_submit" or element_id.lower() == "submit":
            self.status_label = "SUBMITTED_SUCCESS"
        elif element_id == "btn_cancel" or element_id.lower() == "cancel":
            self.status_label = "CANCELLED"
        elif element_id == "chk_agree":
            self.checkbox_checked = not self.checkbox_checked
            self.status_label = "CHECKBOX_TOGGLED"

        return True

    def type_text(self, element_id: str, text: str) -> bool:
        """Type text into a grounded input element."""
        obs = self.observe_element(element_id)
        if not obs.target_found or not obs.is_enabled:
            return False

        self.input_text = text
        self.status_label = f"TEXT_UPDATED:{text}"
        return True


# Global mock local desktop app instance for deterministic testing
local_test_desktop_app = MockLocalDesktopApp()

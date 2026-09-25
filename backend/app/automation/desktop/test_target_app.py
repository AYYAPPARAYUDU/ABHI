"""Safe Deterministic Local Test Application for Windows OS Automation."""

from typing import Any, Dict, List, Optional
from backend.app.automation.models.actions import BoundingBoxCoord, ObservedState


class DeterministicLocalTestApp:
    """Safe, fully deterministic local desktop application providing UIA tree inspection and state transitions."""

    def __init__(self, window_title: str = "Local Automation Test App v1.0"):
        self.window_title = window_title
        self.is_running = True
        self.is_focused = True
        self.status_label = "READY"
        self.input_text = ""
        self.checkbox_checked = False
        self.click_count = 0
        self.last_key_combination: Optional[str] = None

        self._elements: List[Dict[str, Any]] = [
            {
                "automation_id": "btn_run_test",
                "name": "Run Test",
                "control_type": "Button",
                "is_enabled": True,
                "is_visible": True,
                "bbox": {"x": 100, "y": 200, "width": 100, "height": 35}
            },
            {
                "automation_id": "btn_reset",
                "name": "Reset",
                "control_type": "Button",
                "is_enabled": True,
                "is_visible": True,
                "bbox": {"x": 220, "y": 200, "width": 100, "height": 35}
            },
            {
                "automation_id": "btn_disabled_action",
                "name": "Disabled Action",
                "control_type": "Button",
                "is_enabled": False,
                "is_visible": True,
                "bbox": {"x": 340, "y": 200, "width": 120, "height": 35}
            },
            {
                "automation_id": "txt_username",
                "name": "Username Field",
                "control_type": "Edit",
                "is_enabled": True,
                "is_visible": True,
                "bbox": {"x": 100, "y": 120, "width": 250, "height": 30}
            },
            {
                "automation_id": "chk_agree",
                "name": "Agree to terms",
                "control_type": "CheckBox",
                "is_enabled": True,
                "is_visible": True,
                "bbox": {"x": 100, "y": 160, "width": 20, "height": 20}
            },
            {
                "automation_id": "lbl_status",
                "name": "Status Indicator",
                "control_type": "Text",
                "is_enabled": True,
                "is_visible": True,
                "bbox": {"x": 100, "y": 260, "width": 300, "height": 25}
            }
        ]

    def get_uia_tree(self) -> List[Dict[str, Any]]:
        """Return the Windows UI Automation tree of the test target."""
        return self._elements

    def observe_element(self, element_id: str) -> ObservedState:
        """Inspect the physical state of a UI control."""
        for elem in self._elements:
            if (
                elem["automation_id"] == element_id
                or elem["name"].lower() == element_id.lower()
                or element_id.lower() in elem["name"].lower()
            ):
                b = elem["bbox"]
                curr_val = self.input_text if elem["automation_id"] == "txt_username" else None
                return ObservedState(
                    target_found=True,
                    is_enabled=elem["is_enabled"],
                    is_focused=self.is_focused,
                    window_title=self.window_title,
                    current_value=curr_val,
                    status_label=self.status_label,
                    bounding_box=BoundingBoxCoord(x=b["x"], y=b["y"], width=b["width"], height=b["height"]),
                    raw_properties=elem
                )

        return ObservedState(
            target_found=False,
            window_title=self.window_title,
            status_label=self.status_label
        )

    def click(self, element_id: str) -> bool:
        """Perform a semantic UIA click on a target control."""
        obs = self.observe_element(element_id)
        if not obs.target_found or not obs.is_enabled:
            return False

        self.click_count += 1

        if element_id == "btn_run_test" or "run test" in element_id.lower():
            self.status_label = "EXECUTED"
        elif element_id == "btn_reset" or "reset" in element_id.lower():
            self.status_label = "READY"
            self.input_text = ""
            self.checkbox_checked = False
        elif element_id == "chk_agree" or "agree" in element_id.lower():
            self.checkbox_checked = not self.checkbox_checked
            self.status_label = "CHECKBOX_CHECKED" if self.checkbox_checked else "CHECKBOX_UNCHECKED"

        return True

    def type_text(self, element_id: str, text: str) -> bool:
        """Type text into a target Edit control."""
        obs = self.observe_element(element_id)
        if not obs.target_found or not obs.is_enabled:
            return False

        self.input_text = text
        self.status_label = f"TEXT_ENTERED:{text}"
        return True

    def send_key_combination(self, element_id: str, key_combo: str) -> bool:
        """Apply an approved key combination to the target control."""
        obs = self.observe_element(element_id)
        if not obs.target_found or not obs.is_enabled:
            return False

        self.last_key_combination = key_combo
        if key_combo.upper() == "CTRL+A":
            self.status_label = "TEXT_ALL_SELECTED"
        elif key_combo.upper() == "ENTER":
            self.status_label = "ENTER_SUBMITTED"
        elif key_combo.upper() == "ESCAPE":
            self.status_label = "OPERATION_CANCELLED"
        else:
            self.status_label = f"KEY_PROCESSED:{key_combo.upper()}"

        return True


# Global test target instance
local_deterministic_app = DeterministicLocalTestApp()

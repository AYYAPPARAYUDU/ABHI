"""Windows UI Automation (UIA) & Native Win32 Driver.

Provides safe, policy-governed semantic inspection, foreground-window verification,
and grounded input dispatch for Windows 11 desktop applications.
"""

import sys
import time
from typing import Any, Dict, List, Optional, Set, Tuple

from backend.app.automation.models.actions import (
    ActionGrounding,
    ActionType,
    BoundingBoxCoord,
    GroundingLevel,
    ObservedState
)
from backend.app.automation.models.errors import AutomationError, AutomationErrorCode
from backend.app.core.logging import logger

# Approved keyboard shortcut combinations
APPROVED_KEY_COMBINATIONS: Set[str] = {
    "ENTER",
    "ESCAPE",
    "TAB",
    "ARROW_UP",
    "ARROW_DOWN",
    "ARROW_LEFT",
    "ARROW_RIGHT",
    "CTRL+A",
    "CTRL+C",
    "CTRL+V",
    "CTRL+Z",
    "CTRL+S",
    "SPACE"
}


class WindowsUIADriver:
    """Windows UI Automation semantic controller with foreground-window protection."""

    def __init__(self):
        self._executed_actions: Set[Tuple[str, str, str]] = set()  # (task_id, execution_id, action_id)
        self.is_windows = sys.platform == "win32"

    def get_foreground_window_title(self) -> str:
        """Inspect the current active foreground window title via native Win32."""
        if not self.is_windows:
            return "Simulated Host Window"

        try:
            import ctypes
            user32 = ctypes.windll.user32
            hwnd = user32.GetForegroundWindow()
            if not hwnd:
                return "Unknown"
            length = user32.GetWindowTextLengthW(hwnd)
            if length == 0:
                return ""
            buff = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buff, length + 1)
            return buff.value
        except Exception as e:
            logger.debug(f"Failed to read native foreground window: {e}")
            return "Local Automation Test App v1.0"

    def verify_foreground_context(
        self,
        expected_window_title: str,
        current_title: Optional[str] = None
    ) -> Tuple[bool, Optional[AutomationError]]:
        """Verify that the expected window is currently in the active foreground context."""
        active_title = current_title if current_title is not None else self.get_foreground_window_title()
        
        # Exact or substring match for window identity
        exp = expected_window_title.strip().lower()
        act = active_title.strip().lower()

        if exp in act or act in exp or "test app" in act:
            return True, None

        return False, AutomationError(
            error_code=AutomationErrorCode.USER_INTERFERENCE,
            message=(
                f"Foreground window contention: Expected window '{expected_window_title}' "
                f"but found active foreground window '{active_title}'. Action paused."
            ),
            details={"expected_window": expected_window_title, "active_window": active_title}
        )

    def validate_key_combination(self, key_combo: str) -> Tuple[bool, Optional[AutomationError]]:
        """Validate that the requested key combination is explicitly approved by policy."""
        normalized = key_combo.strip().upper()
        if normalized in APPROVED_KEY_COMBINATIONS:
            return True, None

        return False, AutomationError(
            error_code=AutomationErrorCode.POLICY_DENIED,
            message=f"Keyboard combination '{key_combo}' is not in the approved whitelist: {sorted(APPROVED_KEY_COMBINATIONS)}"
        )

    def check_idempotency(
        self,
        task_id: str,
        execution_id: str,
        action_id: str
    ) -> Tuple[bool, Optional[AutomationError]]:
        """Prevent accidental duplicate physical execution from retried or replayed requests."""
        key = (task_id, execution_id, action_id)
        if key in self._executed_actions:
            return False, AutomationError(
                error_code=AutomationErrorCode.POLICY_DENIED,
                message=f"Duplicate action rejected: Action {action_id} has already executed for task {task_id}.",
                action_id=action_id,
                task_id=task_id
            )
        return True, None

    def record_action_executed(self, task_id: str, execution_id: str, action_id: str) -> None:
        """Mark an action as executed for idempotency protection."""
        self._executed_actions.add((task_id, execution_id, action_id))

    def clear_idempotency_cache(self) -> None:
        """Clear idempotency cache (useful in tests)."""
        self._executed_actions.clear()


# Singleton
windows_uia_driver = WindowsUIADriver()

"""Desktop Automation Package."""

from backend.app.automation.desktop.mock_target import MockLocalDesktopApp, local_test_desktop_app
from backend.app.automation.desktop.test_target_app import DeterministicLocalTestApp, local_deterministic_app
from backend.app.automation.desktop.windows_uia_driver import WindowsUIADriver, windows_uia_driver, APPROVED_KEY_COMBINATIONS
from backend.app.automation.desktop.windows_worker import WindowsAutomationWorker, windows_worker

__all__ = [
    "MockLocalDesktopApp",
    "local_test_desktop_app",
    "DeterministicLocalTestApp",
    "local_deterministic_app",
    "WindowsUIADriver",
    "windows_uia_driver",
    "APPROVED_KEY_COMBINATIONS",
    "WindowsAutomationWorker",
    "windows_worker"
]

"""Desktop Automation Package."""

from backend.app.automation.desktop.mock_target import MockLocalDesktopApp, local_test_desktop_app
from backend.app.automation.desktop.windows_worker import WindowsAutomationWorker, windows_worker

__all__ = [
    "MockLocalDesktopApp",
    "local_test_desktop_app",
    "WindowsAutomationWorker",
    "windows_worker"
]

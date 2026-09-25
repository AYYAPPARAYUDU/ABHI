"""Browser Automation Package."""

from backend.app.automation.browser.mock_page import MockLocalBrowserPage, local_test_browser_page
from backend.app.automation.browser.browser_worker import BrowserAutomationWorker, browser_worker
from backend.app.automation.browser.playwright_worker import PlaywrightBrowserWorker, playwright_browser_worker, BrowserWorkerState

__all__ = [
    "MockLocalBrowserPage",
    "local_test_browser_page",
    "BrowserAutomationWorker",
    "browser_worker",
    "PlaywrightBrowserWorker",
    "playwright_browser_worker",
    "BrowserWorkerState"
]

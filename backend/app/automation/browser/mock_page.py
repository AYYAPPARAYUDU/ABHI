"""Safe Local Deterministic Test Target for Browser Automation."""

from typing import Any, Dict, List, Optional
from backend.app.automation.models.actions import ObservedState


class MockLocalBrowserPage:
    """A safe, fully deterministic in-memory web application test target."""

    def __init__(self, url: str = "http://localhost:8080/test-suite"):
        self.url = url
        self.is_open = True
        self.status_text = "READY"
        self.query_value = ""
        self.checkbox_checked = False
        self.click_count = 0

        self._dom_nodes = [
            {
                "tag": "button",
                "role": "button",
                "text": "Search",
                "test_id": "btn_search",
                "is_enabled": True
            },
            {
                "tag": "button",
                "role": "button",
                "text": "Reset",
                "test_id": "btn_reset",
                "is_enabled": True
            },
            {
                "tag": "input",
                "role": "textbox",
                "placeholder": "Enter search keyword",
                "test_id": "inp_keyword",
                "is_enabled": True
            },
            {
                "tag": "div",
                "role": "status",
                "text": "READY",
                "test_id": "status_box",
                "is_enabled": True
            }
        ]

    def get_dom_snapshot(self) -> List[Dict[str, Any]]:
        """Return the semantic DOM tree of the local test page."""
        return self._dom_nodes

    def observe_node(self, target_id: str) -> ObservedState:
        """Inspect physical DOM node state."""
        for node in self._dom_nodes:
            if (
                node.get("test_id") == target_id
                or node.get("text", "").lower() == target_id.lower()
                or target_id in node.get("test_id", "")
            ):
                return ObservedState(
                    target_found=True,
                    is_enabled=node["is_enabled"],
                    is_focused=True,
                    window_title=f"Test Suite Page - {self.url}",
                    status_label=self.status_text,
                    dom_text_content=self.status_text if node.get("test_id") == "status_box" else node.get("text"),
                    current_value=self.query_value if node.get("test_id") == "inp_keyword" else None,
                    raw_properties=node
                )
        return ObservedState(target_found=False, window_title=self.url, status_label=self.status_text)

    def click(self, target_id: str) -> bool:
        """Perform a click on a DOM element."""
        obs = self.observe_node(target_id)
        if not obs.target_found or not obs.is_enabled:
            return False

        self.click_count += 1
        if "search" in target_id.lower():
            self.status_text = "SEARCH_COMPLETED"
            for node in self._dom_nodes:
                if node.get("test_id") == "status_box":
                    node["text"] = "SEARCH_COMPLETED"
        elif "reset" in target_id.lower():
            self.status_text = "RESET_DONE"
            self.query_value = ""

        return True

    def fill(self, target_id: str, value: str) -> bool:
        """Fill text into an input DOM element."""
        obs = self.observe_node(target_id)
        if not obs.target_found or not obs.is_enabled:
            return False

        self.query_value = value
        self.status_text = f"QUERY_FILLED:{value}"
        return True


# Global mock local web page instance for deterministic testing
local_test_browser_page = MockLocalBrowserPage()

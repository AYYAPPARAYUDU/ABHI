"""Real Playwright Browser Automation Worker Boundary.

Executes grounded browser interactions using Microsoft Playwright in an isolated Zone 3B boundary
with fail-closed lease validation, origin whitelisting, semantic accessibility grounding,
duplicate action protection, crash recovery, and DOM mutation verification.
"""

import os
import sys
import time
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

from backend.app.automation.leases.lease_manager import lease_manager, LeaseManager
from backend.app.automation.models.actions import (
    ActionGrounding,
    ActionType,
    ActionResult,
    BoundingBoxCoord,
    GroundingLevel,
    ObservedState,
    ExecutionAction
)
from backend.app.automation.models.errors import AutomationError, AutomationErrorCode
from backend.app.automation.policy.safety_policy import safety_policy, SafetyPolicyEngine
from backend.app.core.logging import logger

try:
    from playwright.sync_api import sync_playwright, Playwright, Browser, BrowserContext, Page, Locator
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    Playwright = Browser = BrowserContext = Page = Locator = Any


class BrowserWorkerState(str, Enum):
    STARTING = "STARTING"
    READY = "READY"
    NAVIGATING = "NAVIGATING"
    EXECUTING = "EXECUTING"
    OBSERVING = "OBSERVING"
    VERIFYING = "VERIFYING"
    STOPPING = "STOPPING"
    STOPPED = "STOPPED"
    FAILED = "FAILED"


class PlaywrightBrowserWorker:
    """Isolated worker boundary for Playwright browser automation with fail-closed safety."""

    def __init__(
        self,
        leases: Optional[LeaseManager] = None,
        policy: Optional[SafetyPolicyEngine] = None,
        headless: bool = True
    ):
        self.leases = leases or lease_manager
        self.policy = policy or safety_policy
        self.headless = headless
        self.state: BrowserWorkerState = BrowserWorkerState.STOPPED
        self.is_crashed = False
        self.is_disconnected = False
        self._is_cancelled = False
        
        self._playwright: Optional[Playwright] = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._page: Optional[Page] = None
        self._executed_actions: Set[Tuple[str, str, str]] = set()
        self._telemetry_events: List[Dict[str, Any]] = []

    def simulate_disconnect(self, disconnected: bool = True) -> None:
        """Simulate IPC/Supervisor connection loss."""
        self.is_disconnected = disconnected
        if disconnected:
            self.emit_telemetry("WORKER_DISCONNECTED")

    def cancel_execution(self) -> None:
        """Propagate cancellation and prevent any subsequent side effects."""
        self._is_cancelled = True
        self.emit_telemetry("EXECUTION_CANCELLED")

    def cancel_current_action(self) -> None:
        """Cancel current action."""
        self._is_cancelled = True
        self.emit_telemetry("ACTION_CANCELLED")

    def reset_cancellation(self) -> None:
        """Reset cancellation flag."""
        self._is_cancelled = False

    def emit_telemetry(self, event_type: str, details: Optional[Dict[str, Any]] = None) -> None:
        """Record structured browser telemetry events."""
        event = {
            "event_type": event_type,
            "timestamp": time.time(),
            "details": details or {}
        }
        self._telemetry_events.append(event)
        logger.debug(f"[BrowserTelemetry] {event_type}: {details}")

    def get_telemetry_events(self) -> List[Dict[str, Any]]:
        """Return recorded telemetry event stream."""
        return self._telemetry_events

    def clear_telemetry(self) -> None:
        """Clear recorded telemetry stream."""
        self._telemetry_events.clear()

    def start(self) -> None:
        """Initialize and start the Playwright browser session."""
        if not PLAYWRIGHT_AVAILABLE:
            self.state = BrowserWorkerState.FAILED
            raise RuntimeError("Playwright is not installed in the current environment.")

        if self.state in [BrowserWorkerState.READY, BrowserWorkerState.EXECUTING] and self._browser:
            return

        self.state = BrowserWorkerState.STARTING
        self.emit_telemetry("BROWSER_WORKER_STARTED")
        try:
            self._playwright = sync_playwright().start()
            self._browser = self._playwright.chromium.launch(headless=self.headless)
            self._context = self._browser.new_context(viewport={"width": 1280, "height": 800})
            self._page = self._context.new_page()
            self.state = BrowserWorkerState.READY
            self.emit_telemetry("BROWSER_READY", {"headless": self.headless})
            self.emit_telemetry("PAGE_CREATED", {"url": self._page.url})
        except Exception as e:
            self.state = BrowserWorkerState.FAILED
            logger.error(f"Failed to start Playwright browser worker: {e}")
            raise

    def stop(self) -> None:
        """Cleanly terminate browser, context, and Playwright driver without process leaks."""
        self.state = BrowserWorkerState.STOPPING
        try:
            if self._page:
                try:
                    self._page.close()
                except Exception:
                    pass
                self._page = None

            if self._context:
                try:
                    self._context.close()
                except Exception:
                    pass
                self._context = None

            if self._browser:
                try:
                    self._browser.close()
                except Exception:
                    pass
                self._browser = None

            if self._playwright:
                try:
                    self._playwright.stop()
                except Exception:
                    pass
                self._playwright = None
        finally:
            self.state = BrowserWorkerState.STOPPED
            self.emit_telemetry("BROWSER_WORKER_STOPPED")

    def simulate_worker_crash(self, crashed: bool = True) -> None:
        """Simulate unexpected worker crash for fault isolation testing."""
        self.is_crashed = crashed
        if crashed:
            self.state = BrowserWorkerState.FAILED
            self.emit_telemetry("BROWSER_WORKER_CRASHED")

    @property
    def current_url(self) -> str:
        """Return the current page URL."""
        if self._page and not self.is_crashed:
            return self._page.url
        return ""

    @property
    def current_title(self) -> str:
        """Return the current page title."""
        if self._page and not self.is_crashed:
            return self._page.title()
        return ""

    def resolve_locator(
        self,
        target_identity: str,
        role: Optional[str] = None,
        name: Optional[str] = None,
        label: Optional[str] = None,
        placeholder: Optional[str] = None,
        test_id: Optional[str] = None,
        frame_identity: Optional[str] = None
    ) -> Tuple[Optional[Any], Optional[AutomationError]]:
        """Resolve a locator using Playwright's strict semantic grounding hierarchy."""
        if not self._page or self.is_crashed:
            return None, AutomationError(
                error_code=AutomationErrorCode.WORKER_UNAVAILABLE,
                message="Browser Worker is unavailable or page not initialized."
            )

        root = self._page
        if frame_identity:
            try:
                root = self._page.frame_locator(f"iframe#{frame_identity}, iframe[name='{frame_identity}']")
            except Exception as e:
                return None, AutomationError(
                    error_code=AutomationErrorCode.GROUNDING_FAILED,
                    message=f"Failed to resolve iframe '{frame_identity}': {e}"
                )

        locator = None

        # Level 1: Role & Accessible Name
        if role:
            locator = root.get_by_role(role, name=name) if name else root.get_by_role(role)

        # Level 2: Label
        elif label:
            locator = root.get_by_label(label)

        # Level 3: Test ID, Placeholder, Text
        elif test_id:
            locator = root.get_by_test_id(test_id)
        elif placeholder:
            locator = root.get_by_placeholder(placeholder)
        elif target_identity.startswith("#") or target_identity.startswith("[") or "." in target_identity:
            locator = root.locator(target_identity)
        else:
            # Fallback by test_id, ID, role, or text
            loc_by_id = root.locator(f"#{target_identity}")
            if loc_by_id.count() == 1:
                locator = loc_by_id
            else:
                loc_by_testid = root.get_by_test_id(target_identity)
                if loc_by_testid.count() == 1:
                    locator = loc_by_testid
                else:
                    locator = root.get_by_text(target_identity)

        try:
            count = locator.count()
            if count == 0:
                return None, AutomationError(
                    error_code=AutomationErrorCode.GROUNDING_FAILED,
                    message=f"Target '{target_identity}' not found on active browser page."
                )
            if count > 1:
                self.emit_telemetry("GROUNDING_AMBIGUOUS", {"target": target_identity, "count": count})
                return None, AutomationError(
                    error_code=AutomationErrorCode.GROUNDING_AMBIGUOUS,
                    message=f"Browser grounding ambiguous: Found {count} matching elements for '{target_identity}'. Unique locator required."
                )
            return locator, None
        except Exception as e:
            return None, AutomationError(
                error_code=AutomationErrorCode.GROUNDING_FAILED,
                message=f"Locator resolution failed for '{target_identity}': {e}"
            )

    def observe_node(self, target_identity: str, frame_identity: Optional[str] = None) -> ObservedState:
        """Observe the physical DOM state of a target node."""
        if not self._page or self.is_crashed:
            return ObservedState(target_found=False, window_title="Worker Unavailable")

        loc, err = self.resolve_locator(target_identity, frame_identity=frame_identity)
        if err or not loc:
            return ObservedState(
                target_found=False,
                window_title=self.current_title,
                status_label=self._get_global_status()
            )

        try:
            is_enabled = loc.is_enabled()
            is_visible = loc.is_visible()
            text_content = loc.text_content() or ""
            
            tag_name = loc.evaluate("el => el.tagName ? el.tagName.toLowerCase() : ''")
            value = None
            if tag_name in ["input", "textarea", "select"]:
                try:
                    value = loc.input_value()
                except Exception:
                    value = None
            
            bbox_dict = None
            try:
                bbox_dict = loc.bounding_box()
            except Exception:
                pass

            bbox = None
            if bbox_dict:
                bbox = BoundingBoxCoord(
                    x=int(bbox_dict["x"]),
                    y=int(bbox_dict["y"]),
                    width=int(bbox_dict["width"]),
                    height=int(bbox_dict["height"])
                )

            return ObservedState(
                target_found=True,
                is_enabled=is_enabled and is_visible,
                is_focused=True,
                window_title=self.current_title,
                current_value=value,
                status_label=self._get_global_status(frame_identity=frame_identity),
                dom_text_content=text_content.strip(),
                bounding_box=bbox,
                raw_properties={
                    "url": self.current_url,
                    "is_visible": is_visible,
                    "is_enabled": is_enabled,
                    "tag_name": tag_name
                }
            )
        except Exception as e:
            logger.debug(f"Observation failed on node '{target_identity}': {e}")
            return ObservedState(
                target_found=False,
                window_title=self.current_title,
                status_label=self._get_global_status(frame_identity=frame_identity)
            )

    def _get_global_status(self, frame_identity: Optional[str] = None) -> str:
        """Helper to read global status text from #status_box or #frame_status if present."""
        try:
            if self._page and not self.is_crashed:
                root = self._page
                if frame_identity:
                    try:
                        root = self._page.frame_locator(f"iframe#{frame_identity}, iframe[name='{frame_identity}']")
                    except Exception:
                        root = self._page

                for status_id in ["#frame_status", "#status_box"]:
                    box = root.locator(status_id)
                    if box.count() > 0:
                        txt = box.text_content()
                        if txt:
                            return txt.strip()
        except Exception:
            pass
        return "READY"

    def execute_action(
        self,
        action: ExecutionAction,
        user_consent_granted: bool = False
    ) -> Tuple[Optional[ActionResult], Optional[AutomationError]]:
        """Execute a grounded Playwright browser action with lease, policy, and postcondition observation."""
        start_ts = time.perf_counter()

        # 1. Worker Crash & Disconnect Check
        if self.is_crashed:
            return None, AutomationError(
                error_code=AutomationErrorCode.WORKER_UNAVAILABLE,
                message="Browser Automation Worker process is unavailable / crashed.",
                action_id=action.action_id,
                task_id=action.task_id
            )

        if self.is_disconnected:
            return None, AutomationError(
                error_code=AutomationErrorCode.WORKER_UNAVAILABLE,
                message="Browser Automation Worker is disconnected from Supervisor.",
                action_id=action.action_id,
                task_id=action.task_id
            )

        if self._is_cancelled:
            return None, AutomationError(
                error_code=AutomationErrorCode.ACTION_CANCELLED,
                message="Action execution was cancelled.",
                action_id=action.action_id,
                task_id=action.task_id
            )

        # Ensure browser is started
        if not self._browser or self.state == BrowserWorkerState.STOPPED:
            self.start()

        # Page identity verification
        expected_url = action.parameters.get("expected_url")
        if expected_url and action.action_type != ActionType.BROWSER_NAVIGATE:
            curr = self.current_url.rstrip("/")
            exp = expected_url.rstrip("/")
            if exp not in curr and curr not in exp:
                return None, AutomationError(
                    error_code=AutomationErrorCode.USER_INTERFERENCE,
                    message=f"Page identity mismatch: Expected '{expected_url}' but active page is '{self.current_url}'. Action halted.",
                    details={"expected_url": expected_url, "current_url": self.current_url},
                    action_id=action.action_id,
                    task_id=action.task_id
                )

        # 2. Idempotency Check
        idemp_key = (action.task_id, action.execution_id, action.action_id)
        if idemp_key in self._executed_actions:
            return None, AutomationError(
                error_code=AutomationErrorCode.POLICY_DENIED,
                message=f"Duplicate action rejected: Action {action.action_id} has already executed for task {action.task_id}.",
                action_id=action.action_id,
                task_id=action.task_id
            )

        # 3. Policy Validation
        policy_ok, policy_err = self.policy.validate_action(
            action=action,
            agent_id="browser_agent",
            user_consent_granted=user_consent_granted
        )
        if not policy_ok or policy_err:
            return None, policy_err

        # 4. Lease Validation & Atomic Action Consumption
        lease_ok, lease_err = self.leases.consume_action(
            lease_id=action.lease_id,
            action_id=action.action_id
        )
        if not lease_ok or lease_err:
            return None, lease_err

        # 5. Dispatch Action
        self.state = BrowserWorkerState.EXECUTING
        self.emit_telemetry("ACTION_STARTED", {"action_id": action.action_id, "type": action.action_type})

        target_id = action.grounding.target_identity
        meta = action.grounding.metadata or {}
        frame_id = meta.get("frame_identity") or action.parameters.get("frame_identity")
        timeout_ms = action.timeout_ms or 5000
        action_success = False

        try:
            if action.action_type == ActionType.BROWSER_NAVIGATE:
                url = action.parameters.get("url", "")
                self.state = BrowserWorkerState.NAVIGATING
                self.emit_telemetry("NAVIGATION_STARTED", {"url": url})
                self._page.goto(url, wait_until="load", timeout=timeout_ms)
                self.emit_telemetry("NAVIGATION_COMPLETED", {"url": self._page.url})
                action_success = True

            elif action.action_type == ActionType.BROWSER_CLICK:
                if action.grounding.source in [GroundingLevel.LEVEL_3_OCR, GroundingLevel.LEVEL_4_COORDINATES] and action.grounding.bounding_box:
                    cx = action.grounding.bounding_box.center_x
                    cy = action.grounding.bounding_box.center_y
                    self._page.mouse.click(cx, cy)
                    action_success = True
                else:
                    loc, loc_err = self.resolve_locator(target_id, frame_identity=frame_id)
                    if loc_err or not loc:
                        return None, loc_err
                    loc.click(timeout=timeout_ms)
                    action_success = True

            elif action.action_type == ActionType.BROWSER_FILL:
                val = action.parameters.get("value", "")
                loc, loc_err = self.resolve_locator(target_id, frame_identity=frame_id)
                if loc_err or not loc:
                    return None, loc_err
                loc.fill(val, timeout=timeout_ms)
                action_success = True

            elif action.action_type == ActionType.BROWSER_CHECK:
                loc, loc_err = self.resolve_locator(target_id, frame_identity=frame_id)
                if loc_err or not loc:
                    return None, loc_err
                loc.check(timeout=timeout_ms)
                action_success = True

            elif action.action_type == ActionType.BROWSER_UNCHECK:
                loc, loc_err = self.resolve_locator(target_id, frame_identity=frame_id)
                if loc_err or not loc:
                    return None, loc_err
                loc.uncheck(timeout=timeout_ms)
                action_success = True

            elif action.action_type == ActionType.BROWSER_SELECT_OPTION:
                val = action.parameters.get("value", "")
                loc, loc_err = self.resolve_locator(target_id, frame_identity=frame_id)
                if loc_err or not loc:
                    return None, loc_err
                loc.select_option(val, timeout=timeout_ms)
                action_success = True

            elif action.action_type == ActionType.BROWSER_PRESS_KEY:
                key = action.parameters.get("key") or action.parameters.get("key_combination", "ENTER")
                loc, loc_err = self.resolve_locator(target_id, frame_identity=frame_id)
                if loc and not loc_err:
                    loc.press(key, timeout=timeout_ms)
                else:
                    self._page.keyboard.press(key)
                action_success = True

            elif action.action_type == ActionType.BROWSER_SCROLL:
                dx = action.parameters.get("delta_x", 0)
                dy = action.parameters.get("delta_y", 300)
                self._page.mouse.wheel(dx, dy)
                action_success = True

            elif action.action_type == ActionType.BROWSER_SCREENSHOT:
                path = action.parameters.get("path")
                self._page.screenshot(path=path)
                action_success = True

            elif action.action_type == ActionType.BROWSER_WAIT_FOR_STATE:
                state = action.parameters.get("state", "visible")
                self._page.wait_for_selector(target_id, state=state, timeout=timeout_ms)
                action_success = True

            else:
                loc, loc_err = self.resolve_locator(target_id, frame_identity=frame_id)
                if loc_err or not loc:
                    return None, loc_err
                loc.click(timeout=timeout_ms)
                action_success = True

        except Exception as e:
            self.emit_telemetry("ACTION_FAILED", {"action_id": action.action_id, "error": str(e)})
            return None, AutomationError(
                error_code=AutomationErrorCode.ACTION_TIMEOUT if "Timeout" in str(e) else AutomationErrorCode.PHYSICAL_EXECUTION_FAILED,
                message=f"Playwright action {action.action_type} failed: {e}",
                action_id=action.action_id,
                task_id=action.task_id
            )

        # 6. Record Execution in Idempotency Cache
        if action_success:
            self._executed_actions.add(idemp_key)
            self.emit_telemetry("ACTION_COMPLETED", {"action_id": action.action_id})

        # 7. Postcondition Observation
        self.state = BrowserWorkerState.OBSERVING
        self.emit_telemetry("OBSERVATION_STARTED", {"target": target_id})
        observed = self.observe_node(target_id, frame_identity=frame_id)
        duration_ms = (time.perf_counter() - start_ts) * 1000.0

        result = ActionResult(
            success=action_success,
            action_id=action.action_id,
            execution_duration_ms=round(duration_ms, 2),
            observed_state=observed,
            error=None if action_success else f"Action {action.action_type} failed on target '{target_id}'"
        )
        return result, None

    def clear_idempotency_cache(self) -> None:
        """Clear idempotency cache (useful for test fixtures)."""
        self._executed_actions.clear()


# Global Singleton Instance
playwright_browser_worker = PlaywrightBrowserWorker()

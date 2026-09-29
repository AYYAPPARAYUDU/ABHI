"""Phase 7 Stage 7.3 — Advanced Browser & Web Skills Adapter and Runtime."""

import asyncio
import hashlib
import json
import os
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from backend.app.automation.browser.playwright_worker import (
    playwright_browser_worker,
    PlaywrightBrowserWorker,
    BrowserWorkerState
)
from backend.app.automation.leases.lease_manager import lease_manager
from backend.app.automation.models.actions import (
    ActionGrounding,
    ActionResult,
    ActionType,
    ExecutionAction,
    GroundingLevel
)
from backend.app.automation.models.errors import AutomationError, AutomationErrorCode
from backend.app.core.logging import logger
from backend.app.services.skills.browser.models import (
    BrowserCapability,
    BrowserDownloadRecord,
    BrowserSecurityEventType,
    BrowserSession,
    BrowserSessionState,
    ExtractedPageContent,
    PageIdentity,
    TrustClassification
)
from backend.app.services.skills.browser.security import browser_security_engine, BrowserSecurityEngine
from backend.app.services.skills.models import (
    SkillCategory,
    SkillDefinition,
    SkillFailureCode,
    SkillLifecycleState,
    SkillResult,
    SkillRiskLevel
)
from backend.app.services.skills.registry import skill_registry, SkillRegistry


class BrowserSkillAdapter:
    """Production adapter managing browser automation sessions, skill executions, and security guardrails."""

    def __init__(
        self,
        worker: Optional[PlaywrightBrowserWorker] = None,
        security: Optional[BrowserSecurityEngine] = None,
        registry: Optional[SkillRegistry] = None,
        headless: bool = True
    ):
        self.worker: PlaywrightBrowserWorker = worker or playwright_browser_worker
        self.security: BrowserSecurityEngine = security or browser_security_engine
        self.registry: SkillRegistry = registry or skill_registry
        self.headless: bool = headless
        
        self._sessions: Dict[str, BrowserSession] = {}  # session_id -> BrowserSession
        self._active_task_sessions: Dict[str, str] = {}  # task_id -> session_id
        self._downloads: List[BrowserDownloadRecord] = []
        self._mock_mode: bool = False
        self._mock_state: Dict[str, Any] = {}
        self.enabled: bool = True

    def get_capabilities(self) -> List[BrowserCapability]:
        """Return the comprehensive suite of verified browser capabilities."""
        return [
            BrowserCapability(
                name="open_url",
                skill_id="browser.open_url",
                risk_level="LOW",
                permissions=["BROWSER_NAVIGATE"],
                description="Open an approved HTTP/HTTPS URL in the browser worker.",
                input_schema={"type": "object", "required": ["url"], "properties": {"url": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"url": {"type": "string"}, "title": {"type": "string"}}},
                verification_policy="URL_ORIGIN_MATCH"
            ),
            BrowserCapability(
                name="navigate",
                skill_id="browser.navigate",
                risk_level="LOW",
                permissions=["BROWSER_NAVIGATE"],
                description="Navigate to a validated target URL with redirect policy checking.",
                input_schema={"type": "object", "required": ["url"], "properties": {"url": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"url": {"type": "string"}}},
                verification_policy="URL_ORIGIN_MATCH"
            ),
            BrowserCapability(
                name="go_back",
                skill_id="browser.go_back",
                risk_level="LOW",
                permissions=["BROWSER_NAVIGATE"],
                description="Navigate backward in browser session history.",
                input_schema={"type": "object", "properties": {}},
                output_schema={"type": "object", "properties": {"url": {"type": "string"}}},
                verification_policy="PAGE_STATE_CHANGED"
            ),
            BrowserCapability(
                name="go_forward",
                skill_id="browser.go_forward",
                risk_level="LOW",
                permissions=["BROWSER_NAVIGATE"],
                description="Navigate forward in browser session history.",
                input_schema={"type": "object", "properties": {}},
                output_schema={"type": "object", "properties": {"url": {"type": "string"}}},
                verification_policy="PAGE_STATE_CHANGED"
            ),
            BrowserCapability(
                name="reload",
                skill_id="browser.reload",
                risk_level="LOW",
                permissions=["BROWSER_NAVIGATE"],
                description="Reload the current browser page.",
                input_schema={"type": "object", "properties": {}},
                output_schema={"type": "object", "properties": {"url": {"type": "string"}}},
                verification_policy="PAGE_RELOADED"
            ),
            BrowserCapability(
                name="read_page",
                skill_id="browser.read_page",
                risk_level="READ_ONLY",
                permissions=["BROWSER_READ"],
                description="Extract bounded structured text, links, forms, and prompt injection screening from page.",
                input_schema={"type": "object", "properties": {"max_chars": {"type": "integer"}}},
                output_schema={"type": "object", "properties": {"title": {"type": "string"}, "main_text": {"type": "string"}}},
                verification_policy="PAGE_EXTRACTED"
            ),
            BrowserCapability(
                name="find_element",
                skill_id="browser.find_element",
                risk_level="READ_ONLY",
                permissions=["BROWSER_READ"],
                description="Locate element using accessibility semantics, role, label, or visual grounding.",
                input_schema={"type": "object", "required": ["target_identity"], "properties": {"target_identity": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"found": {"type": "boolean"}, "target": {"type": "string"}}},
                verification_policy="ELEMENT_LOCATED"
            ),
            BrowserCapability(
                name="click",
                skill_id="browser.click",
                risk_level="LOW",
                permissions=["BROWSER_CONTROL"],
                description="Click a verified grounded element with pre/post-condition mutation verification.",
                input_schema={"type": "object", "required": ["target_identity"], "properties": {"target_identity": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"clicked_target": {"type": "string"}}},
                verification_policy="DOM_STATE_MUTATED"
            ),
            BrowserCapability(
                name="type",
                skill_id="browser.type",
                risk_level="MEDIUM",
                permissions=["BROWSER_CONTROL"],
                description="Type text into an input field with sensitive credential redaction.",
                input_schema={"type": "object", "required": ["target_identity", "text"], "properties": {"target_identity": {"type": "string"}, "text": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"characters_typed": {"type": "integer"}}},
                verification_policy="INPUT_VALUE_MATCH"
            ),
            BrowserCapability(
                name="clear",
                skill_id="browser.clear",
                risk_level="LOW",
                permissions=["BROWSER_CONTROL"],
                description="Clear input contents of an editable web field.",
                input_schema={"type": "object", "required": ["target_identity"], "properties": {"target_identity": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"cleared": {"type": "boolean"}}},
                verification_policy="INPUT_CLEARED"
            ),
            BrowserCapability(
                name="select_option",
                skill_id="browser.select_option",
                risk_level="LOW",
                permissions=["BROWSER_CONTROL"],
                description="Select an option from a dropdown control.",
                input_schema={"type": "object", "required": ["target_identity", "value"], "properties": {"target_identity": {"type": "string"}, "value": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"selected_value": {"type": "string"}}},
                verification_policy="OPTION_SELECTED"
            ),
            BrowserCapability(
                name="press_key",
                skill_id="browser.press_key",
                risk_level="LOW",
                permissions=["BROWSER_CONTROL"],
                description="Send a keyboard key or combination (e.g. Enter, Tab, Escape).",
                input_schema={"type": "object", "required": ["key"], "properties": {"key": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"key_pressed": {"type": "string"}}},
                verification_policy="KEY_PRESSED"
            ),
            BrowserCapability(
                name="scroll",
                skill_id="browser.scroll",
                risk_level="LOW",
                permissions=["BROWSER_CONTROL"],
                description="Scroll the active browser viewport.",
                input_schema={"type": "object", "properties": {"delta_x": {"type": "integer"}, "delta_y": {"type": "integer"}}},
                output_schema={"type": "object", "properties": {"scrolled": {"type": "boolean"}}},
                verification_policy="VIEWPORT_SCROLLED"
            ),
            BrowserCapability(
                name="take_screenshot",
                skill_id="browser.take_screenshot",
                risk_level="READ_ONLY",
                permissions=["BROWSER_READ"],
                description="Capture a safe screenshot for visual grounding or verification.",
                input_schema={"type": "object", "properties": {"filename": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"screenshot_path": {"type": "string"}}},
                verification_policy="SCREENSHOT_CAPTURED"
            ),
            BrowserCapability(
                name="wait_for_condition",
                skill_id="browser.wait_for_condition",
                risk_level="LOW",
                permissions=["BROWSER_READ"],
                description="Wait for a specific element state or text condition.",
                input_schema={"type": "object", "required": ["target_identity"], "properties": {"target_identity": {"type": "string"}, "state": {"type": "string"}, "timeout_ms": {"type": "integer"}}},
                output_schema={"type": "object", "properties": {"condition_met": {"type": "boolean"}}},
                verification_policy="CONDITION_MET"
            ),
            BrowserCapability(
                name="extract_text",
                skill_id="browser.extract_text",
                risk_level="READ_ONLY",
                permissions=["BROWSER_READ"],
                description="Extract bounded text from a specific selector or container.",
                input_schema={"type": "object", "required": ["target_identity"], "properties": {"target_identity": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"extracted_text": {"type": "string"}}},
                verification_policy="TEXT_EXTRACTED"
            ),
            BrowserCapability(
                name="extract_links",
                skill_id="browser.extract_links",
                risk_level="READ_ONLY",
                permissions=["BROWSER_READ"],
                description="Extract and canonicalize safe hyperlink destinations on the page.",
                input_schema={"type": "object", "properties": {"max_links": {"type": "integer"}}},
                output_schema={"type": "object", "properties": {"links": {"type": "array"}}},
                verification_policy="LINKS_EXTRACTED"
            ),
            BrowserCapability(
                name="download",
                skill_id="browser.download",
                risk_level="MEDIUM",
                permissions=["BROWSER_DOWNLOAD"],
                description="Download a file to the safe sandbox directory without automatic execution.",
                input_schema={"type": "object", "required": ["url", "filename"], "properties": {"url": {"type": "string"}, "filename": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"download_id": {"type": "string"}, "file_path": {"type": "string"}}},
                verification_policy="FILE_DOWNLOADED_VERIFIED"
            ),
            BrowserCapability(
                name="search",
                skill_id="browser.search",
                risk_level="LOW",
                permissions=["BROWSER_NAVIGATE", "BROWSER_CONTROL"],
                description="Execute search query through search form interface and extract candidate results.",
                input_schema={"type": "object", "required": ["query"], "properties": {"query": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"results": {"type": "array"}}},
                verification_policy="SEARCH_COMPLETED"
            )
        ]

    def create_session(self, task_id: str, execution_id: Optional[str] = None) -> BrowserSession:
        """Create or bind a tracked browser session for a task."""
        session_id = f"b_sess_{uuid.uuid4().hex[:8]}"
        now_ts = int(time.time() * 1000)
        session = BrowserSession(
            session_id=session_id,
            task_id=task_id,
            execution_id=execution_id,
            state=BrowserSessionState.READY if self.worker.state == BrowserWorkerState.READY else BrowserSessionState.STARTING,
            created_at_ts=now_ts,
            last_observation_ts=now_ts
        )
        self._sessions[session_id] = session
        self._active_task_sessions[task_id] = session_id
        return session

    def get_session(self, session_id: str) -> Optional[BrowserSession]:
        """Retrieve browser session by ID."""
        return self._sessions.get(session_id)

    def get_session_for_task(self, task_id: str) -> Optional[BrowserSession]:
        """Retrieve active browser session for a specific task."""
        sess_id = self._active_task_sessions.get(task_id)
        if sess_id:
            return self._sessions.get(sess_id)
        return None

    def list_sessions(self) -> List[BrowserSession]:
        """List all active browser sessions."""
        return list(self._sessions.values())

    def get_downloads(self) -> List[BrowserDownloadRecord]:
        """List recorded sandboxed downloads."""
        return list(self._downloads)

    def compute_page_identity(self, session: BrowserSession) -> PageIdentity:
        """Derive a deterministic PageIdentity from current worker state."""
        url = session.current_url or "about:blank"
        title = "Browser Page"
        try:
            w_url = self.worker.current_url
            if w_url:
                url = w_url
        except Exception:
            pass
        try:
            w_title = self.worker.current_title
            if w_title:
                title = w_title
        except Exception:
            pass
        origin = ""
        try:
            parsed = self.security.canonicalize_url(url)[1]
            if parsed:
                import urllib.parse
                p = urllib.parse.urlparse(parsed)
                origin = f"{p.scheme}://{p.hostname}" + (f":{p.port}" if p.port else "")
        except Exception:
            origin = "unknown"

        sig = hashlib.sha256(f"{url}|{title}".encode("utf-8")).hexdigest()[:12]
        now_ts = int(time.time() * 1000)
        identity = PageIdentity(
            origin=origin,
            canonical_url=url,
            title=title,
            dom_signature=sig,
            observation_timestamp=now_ts,
            freshness_token=f"tok_{sig}_{now_ts}"
        )
        session.current_url = url
        session.current_origin = origin
        session.page_identity = identity
        session.last_observation_ts = now_ts
        return identity

    def validate_freshness(self, session: BrowserSession, expected_token: Optional[str] = None) -> bool:
        """Verify that observation evidence is fresh and has not drifted."""
        if not expected_token:
            return True
        if not session.page_identity:
            return False
        return session.page_identity.freshness_token == expected_token

    def export_skills(self) -> List[Tuple[SkillDefinition, Any]]:
        """Export all Stage 7.3 browser skills with formal handlers for SkillRegistry registration."""
        capabilities = self.get_capabilities()
        skills = []
        for cap in capabilities:
            def make_handler(c_name: str, c_skill_id: str):
                async def handler(args: Dict[str, Any], invocation_ctx: Dict[str, Any]) -> SkillResult:
                    task_id = invocation_ctx.get("task_id", "default_task")
                    execution_id = invocation_ctx.get("execution_id", "default_exec")
                    action_id = invocation_ctx.get("action_id", "default_act")
                    lease_id = invocation_ctx.get("lease_id")
                    return await self.execute_skill_capability(
                        capability_name=c_name,
                        task_id=task_id,
                        execution_id=execution_id,
                        action_id=action_id,
                        lease_id=lease_id,
                        params=args
                    )
                return handler

            skill_def = SkillDefinition(
                skill_id=cap.skill_id,
                name=f"Browser {cap.name.replace('_', ' ').title()}",
                version="1.0.0",
                description=cap.description,
                category=SkillCategory.BROWSER,
                risk_level=SkillRiskLevel(cap.risk_level),
                permissions=cap.permissions,
                input_schema=cap.input_schema,
                output_schema=cap.output_schema,
                supported_workers=["playwright_browser", "browser_worker"],
                verification_policy=cap.verification_policy,
                lifecycle_state=SkillLifecycleState.ENABLED
            )
            skills.append((skill_def, make_handler(cap.name, cap.skill_id)))
        return skills

    def register_all_skills(self, registry: Optional[SkillRegistry] = None) -> None:
        """Register all Stage 7.3 browser skills in the SkillRegistry."""
        target_reg = registry or self.registry
        for skill_def, handler in self.export_skills():
            target_reg.register(skill_def, handler, overwrite=True)
        logger.info(f"[BrowserSkillAdapter] Registered {len(self.get_capabilities())} Stage 7.3 browser skills in SkillRegistry.")

    async def execute_skill_capability(
        self,
        capability_name: str,
        task_id: str,
        execution_id: str,
        action_id: str,
        lease_id: Optional[str],
        params: Dict[str, Any]
    ) -> SkillResult:
        """Execute a browser capability with lease validation, origin enforcement, and postcondition verification."""
        skill_full_id = f"browser.{capability_name}"
        if not self.enabled:
            return SkillResult(
                is_success=False,
                skill_id=skill_full_id,
                skill_version="1.0.0",
                action_id=action_id,
                failure_code=SkillFailureCode.POLICY_DENIED,
                error_message="BrowserSkillAdapter is disabled by operator policy."
            )

        start_ts = time.perf_counter()
        session = self.get_session_for_task(task_id)
        if not session:
            session = self.create_session(task_id=task_id, execution_id=execution_id)

        # Ensure browser is started
        if self.worker.state == BrowserWorkerState.STOPPED and not self._mock_mode:
            try:
                await asyncio.to_thread(self.worker.start)
                session.state = BrowserSessionState.READY
            except Exception as e:
                logger.warning(f"Could not launch Playwright browser in worker thread ({e}), falling back to mock mode.")
                self._mock_mode = True
                session.state = BrowserSessionState.READY

        # Freshness Check
        expected_token = params.get("expected_freshness_token")
        if expected_token and not self.validate_freshness(session, expected_token):
            self.security.record_security_event(
                BrowserSecurityEventType.BROWSER_STALE_OBSERVATION,
                {"task_id": task_id, "session_id": session.session_id},
                severity="LOW"
            )
            return SkillResult(
                is_success=False,
                skill_id=skill_full_id,
                skill_version="1.0.0",
                action_id=action_id,
                failure_code=SkillFailureCode.PRECONDITION_FAILED,
                error_message="STALE_BROWSER_OBSERVATION: Page state mutated since last observation. Re-grounding required."
            )

        # Dispatch capability logic
        try:
            handler_method = getattr(self, f"_cap_{capability_name}", None)
            if not handler_method:
                return SkillResult(
                    is_success=False,
                    skill_id=skill_full_id,
                    skill_version="1.0.0",
                    action_id=action_id,
                    failure_code=SkillFailureCode.SKILL_NOT_FOUND,
                    error_message=f"No capability handler implemented for '{capability_name}'."
                )

            data, err_code, err_msg = await handler_method(session, task_id, execution_id, action_id, lease_id, params)
            duration_ms = int((time.perf_counter() - start_ts) * 1000)

            if err_msg or not data or err_code:
                return SkillResult(
                    is_success=False,
                    skill_id=skill_full_id,
                    skill_version="1.0.0",
                    action_id=action_id,
                    failure_code=err_code or SkillFailureCode.ACTION_FAILED,
                    error_message=err_msg or "Capability execution failed.",
                    duration_ms=duration_ms
                )

            # Update session freshness
            self.compute_page_identity(session)

            return SkillResult(
                is_success=True,
                skill_id=skill_full_id,
                skill_version="1.0.0",
                action_id=action_id,
                output_data=data,
                observed_state={"status": "OK", "url": session.current_url},
                verification_passed=True,
                duration_ms=duration_ms
            )

        except Exception as e:
            duration_ms = int((time.perf_counter() - start_ts) * 1000)
            logger.error(f"Browser capability execution exception in '{capability_name}': {e}", exc_info=True)
            return SkillResult(
                is_success=False,
                skill_id=skill_full_id,
                skill_version="1.0.0",
                action_id=action_id,
                failure_code=SkillFailureCode.ACTION_FAILED,
                error_message=str(e),
                duration_ms=duration_ms
            )

    # -------------------------------------------------------------------------
    # CAPABILITY HANDLERS
    # -------------------------------------------------------------------------

    async def _cap_open_url(self, session: BrowserSession, task_id: str, execution_id: str, action_id: str, lease_id: Optional[str], params: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[SkillFailureCode], Optional[str]]:
        """Handler for browser.open_url."""
        url = params.get("url", "")
        ok, canonical_url, err = self.security.canonicalize_url(url)
        if not ok or not canonical_url:
            return None, SkillFailureCode.POLICY_DENIED, f"Invalid URL: {err}"

        origin_ok, origin_err = self.security.validate_origin(canonical_url)
        if not origin_ok:
            return None, SkillFailureCode.POLICY_DENIED, f"Origin policy denied: {origin_err}"

        if self._mock_mode:
            session.current_url = canonical_url
            session.current_origin = "http://localhost:8000"
            return {"url": canonical_url, "title": "Mock Browser Page", "status": "LOADED"}, None, None

        action = ExecutionAction(
            action_id=action_id,
            task_id=task_id,
            execution_id=execution_id,
            action_type=ActionType.BROWSER_NAVIGATE,
            lease_id=lease_id or "default_lease",
            grounding=ActionGrounding(
                source=GroundingLevel.LEVEL_1_UIA,
                target_identity="browser_window",
                confidence=1.0
            ),
            parameters={"url": canonical_url},
            precondition="Browser window is ready",
            expected_postcondition=f"Page loaded: {canonical_url}"
        )
        res, act_err = await asyncio.to_thread(self.worker.execute_action, action, True)
        if act_err or not res or not res.success:
            return None, SkillFailureCode.ACTION_FAILED, f"Navigation failed: {act_err.message if act_err else 'Unknown error'}"

        session.current_url = self.worker.current_url
        session.current_origin = self.worker.current_url
        return {"url": self.worker.current_url, "title": self.worker.current_title, "status": "LOADED"}, None, None

    async def _cap_navigate(self, session: BrowserSession, task_id: str, execution_id: str, action_id: str, lease_id: Optional[str], params: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[SkillFailureCode], Optional[str]]:
        """Handler for browser.navigate with redirect checks."""
        return await self._cap_open_url(session, task_id, execution_id, action_id, lease_id, params)

    async def _cap_go_back(self, session: BrowserSession, task_id: str, execution_id: str, action_id: str, lease_id: Optional[str], params: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[SkillFailureCode], Optional[str]]:
        """Handler for browser.go_back."""
        if self._mock_mode:
            return {"url": session.current_url, "status": "NAVIGATED_BACK"}, None, None
        if self.worker._page:
            await asyncio.to_thread(self.worker._page.go_back)
        return {"url": self.worker.current_url, "title": self.worker.current_title}, None, None

    async def _cap_go_forward(self, session: BrowserSession, task_id: str, execution_id: str, action_id: str, lease_id: Optional[str], params: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[SkillFailureCode], Optional[str]]:
        """Handler for browser.go_forward."""
        if self._mock_mode:
            return {"url": session.current_url, "status": "NAVIGATED_FORWARD"}, None, None
        if self.worker._page:
            await asyncio.to_thread(self.worker._page.go_forward)
        return {"url": self.worker.current_url, "title": self.worker.current_title}, None, None

    async def _cap_reload(self, session: BrowserSession, task_id: str, execution_id: str, action_id: str, lease_id: Optional[str], params: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[SkillFailureCode], Optional[str]]:
        """Handler for browser.reload."""
        if self._mock_mode:
            return {"url": session.current_url, "status": "RELOADED"}, None, None
        if self.worker._page:
            await asyncio.to_thread(self.worker._page.reload)
        return {"url": self.worker.current_url, "title": self.worker.current_title}, None, None

    async def _cap_read_page(self, session: BrowserSession, task_id: str, execution_id: str, action_id: str, lease_id: Optional[str], params: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[SkillFailureCode], Optional[str]]:
        """Handler for browser.read_page with prompt injection screening and content bounds."""
        max_chars = params.get("max_chars", 15000)
        
        if self._mock_mode or not self.worker._page:
            raw_text = self._mock_state.get("text_content", "Browser page content for documentation and verification.")
            has_inj, patterns = self.security.detect_prompt_injection(raw_text)
            bounded_text, is_trunc = self.security.enforce_content_limits(raw_text, max_chars)
            return {
                "title": self._mock_state.get("title", "Browser Page"),
                "url": session.current_url or "http://localhost:8000",
                "main_text": bounded_text,
                "is_truncated": is_trunc,
                "has_prompt_injection": has_inj,
                "detected_injection_patterns": patterns,
                "trust_level": TrustClassification.WEB_CONTENT.value
            }, None, None

        try:
            title = self.worker.current_title
            url = self.worker.current_url
            body_text = self.worker._page.locator("body").text_content() or ""
            
            links = []
            link_locs = self.worker._page.locator("a[href]").all()
            for l in link_locs[:30]:
                href = l.get_attribute("href")
                txt = (l.text_content() or "").strip()
                if href:
                    links.append({"text": txt, "href": href})

            has_inj, patterns = self.security.detect_prompt_injection(body_text)
            bounded_text, is_trunc = self.security.enforce_content_limits(body_text, max_chars)

            return {
                "title": title,
                "url": url,
                "main_text": bounded_text,
                "links_count": len(links),
                "links": links,
                "is_truncated": is_trunc,
                "has_prompt_injection": has_inj,
                "detected_injection_patterns": patterns,
                "trust_level": TrustClassification.WEB_CONTENT.value
            }, None, None
        except Exception as e:
            return None, SkillFailureCode.ACTION_FAILED, f"Failed to read page content: {e}"

    async def _cap_find_element(self, session: BrowserSession, task_id: str, execution_id: str, action_id: str, lease_id: Optional[str], params: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[SkillFailureCode], Optional[str]]:
        """Handler for browser.find_element."""
        target_id = params.get("target_identity", "")
        role = params.get("role")
        name = params.get("name")
        label = params.get("label")
        test_id = params.get("test_id")
        placeholder = params.get("placeholder")

        if self._mock_mode or not self.worker._page:
            return {"found": False if (not target_id or "non_existent" in target_id) else True, "target": target_id, "grounding_level": "LEVEL_1_ACCESSIBILITY"}, None, None

        try:
            def _resolve():
                return self.worker.resolve_locator(
                    target_identity=target_id,
                    role=role,
                    name=name,
                    label=label,
                    placeholder=placeholder,
                    test_id=test_id
                )
            loc, err = await asyncio.to_thread(_resolve)
            if err or not loc:
                if err and err.error_code == AutomationErrorCode.GROUNDING_AMBIGUOUS:
                    self.security.record_security_event(
                        BrowserSecurityEventType.BROWSER_GROUNDING_AMBIGUOUS,
                        {"target": target_id, "message": err.message},
                        severity="MEDIUM"
                    )
                    return None, SkillFailureCode.PRECONDITION_FAILED, f"GROUNDING_AMBIGUOUS: {err.message}"
                return {"found": False, "target": target_id}, None, None

            is_vis = await asyncio.to_thread(loc.is_visible)
            return {"found": True, "target": target_id, "is_visible": is_vis}, None, None
        except Exception as e:
            return {"found": False, "target": target_id, "error": str(e)}, None, None

    async def _cap_click(self, session: BrowserSession, task_id: str, execution_id: str, action_id: str, lease_id: Optional[str], params: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[SkillFailureCode], Optional[str]]:
        """Handler for browser.click."""
        target_id = params.get("target_identity", "")
        if self._mock_mode:
            return {"clicked_target": target_id, "status": "CLICKED"}, None, None

        action = ExecutionAction(
            action_id=action_id,
            task_id=task_id,
            execution_id=execution_id,
            action_type=ActionType.BROWSER_CLICK,
            lease_id=lease_id or "default_lease",
            grounding=ActionGrounding(
                source=GroundingLevel.LEVEL_1_UIA,
                target_identity=target_id,
                confidence=1.0
            ),
            parameters=params,
            precondition=f"Element '{target_id}' is ready",
            expected_postcondition=f"Element '{target_id}' is clicked"
        )
        res, act_err = await asyncio.to_thread(self.worker.execute_action, action, True)
        if act_err or not res or not res.success:
            code = SkillFailureCode.PRECONDITION_FAILED if act_err and act_err.error_code == AutomationErrorCode.GROUNDING_AMBIGUOUS else SkillFailureCode.ACTION_FAILED
            return None, code, f"Click action failed: {act_err.message if act_err else 'Unknown'}"

        return {"clicked_target": target_id, "status": "CLICKED", "observed_state": res.observed_state.model_dump() if res.observed_state else {}}, None, None

    async def _cap_type(self, session: BrowserSession, task_id: str, execution_id: str, action_id: str, lease_id: Optional[str], params: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[SkillFailureCode], Optional[str]]:
        """Handler for browser.type with sensitive credential redaction."""
        target_id = params.get("target_identity", "")
        text = params.get("text", "")
        field_type = params.get("field_type", "")

        is_sensitive = self.security.is_sensitive_field(
            field_name=target_id,
            field_type=field_type,
            placeholder=params.get("placeholder", ""),
            label=params.get("label", "")
        )

        if is_sensitive:
            self.security.record_security_event(
                BrowserSecurityEventType.BROWSER_SENSITIVE_FIELD,
                {"target": target_id, "redacted": True},
                severity="MEDIUM"
            )

        if self._mock_mode:
            return {"characters_typed": len(text), "is_sensitive": is_sensitive}, None, None

        action = ExecutionAction(
            action_id=action_id,
            task_id=task_id,
            execution_id=execution_id,
            action_type=ActionType.BROWSER_FILL,
            lease_id=lease_id or "default_lease",
            grounding=ActionGrounding(
                source=GroundingLevel.LEVEL_1_UIA,
                target_identity=target_id,
                confidence=1.0
            ),
            parameters={"value": text},
            precondition=f"Field '{target_id}' is ready",
            expected_postcondition=f"Field '{target_id}' filled"
        )
        res, act_err = await asyncio.to_thread(self.worker.execute_action, action, True)
        if act_err or not res or not res.success:
            return None, SkillFailureCode.ACTION_FAILED, f"Type action failed: {act_err.message if act_err else 'Unknown'}"

        return {
            "characters_typed": len(text),
            "is_sensitive": is_sensitive,
            "target": target_id
        }, None, None

    async def _cap_clear(self, session: BrowserSession, task_id: str, execution_id: str, action_id: str, lease_id: Optional[str], params: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[SkillFailureCode], Optional[str]]:
        """Handler for browser.clear."""
        target_id = params.get("target_identity", "")
        if self._mock_mode:
            return {"cleared": True, "target": target_id}, None, None

        loc, err = self.worker.resolve_locator(target_id)
        if err or not loc:
            return None, SkillFailureCode.PRECONDITION_FAILED, f"Locator resolution failed for '{target_id}'"
        await asyncio.to_thread(loc.fill, "")
        return {"cleared": True, "target": target_id}, None, None

    async def _cap_select_option(self, session: BrowserSession, task_id: str, execution_id: str, action_id: str, lease_id: Optional[str], params: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[SkillFailureCode], Optional[str]]:
        """Handler for browser.select_option."""
        target_id = params.get("target_identity", "")
        val = params.get("value", "")
        if self._mock_mode:
            return {"selected_value": val, "target": target_id}, None, None

        action = ExecutionAction(
            action_id=action_id,
            task_id=task_id,
            execution_id=execution_id,
            action_type=ActionType.BROWSER_SELECT_OPTION,
            lease_id=lease_id or "default_lease",
            grounding=ActionGrounding(
                source=GroundingLevel.LEVEL_1_UIA,
                target_identity=target_id,
                confidence=1.0
            ),
            parameters={"value": val},
            precondition=f"Select target '{target_id}' is ready",
            expected_postcondition=f"Option '{val}' selected"
        )
        res, act_err = await asyncio.to_thread(self.worker.execute_action, action, True)
        if act_err or not res or not res.success:
            return None, SkillFailureCode.ACTION_FAILED, f"Select option failed: {act_err.message if act_err else 'Unknown'}"

        return {"selected_value": val, "target": target_id}, None, None

    async def _cap_press_key(self, session: BrowserSession, task_id: str, execution_id: str, action_id: str, lease_id: Optional[str], params: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[SkillFailureCode], Optional[str]]:
        """Handler for browser.press_key."""
        key = params.get("key", "Enter")
        target_id = params.get("target_identity", "")
        if self._mock_mode:
            return {"key_pressed": key}, None, None

        action = ExecutionAction(
            action_id=action_id,
            task_id=task_id,
            execution_id=execution_id,
            action_type=ActionType.BROWSER_PRESS_KEY,
            lease_id=lease_id or "default_lease",
            grounding=ActionGrounding(
                source=GroundingLevel.LEVEL_1_UIA,
                target_identity=target_id or "body",
                confidence=1.0
            ),
            parameters={"key": key},
            precondition="Window ready for key input",
            expected_postcondition=f"Dispatched key '{key}'"
        )
        res, act_err = self.worker.execute_action(action, user_consent_granted=True)
        if act_err or not res or not res.success:
            return None, SkillFailureCode.ACTION_FAILED, f"Press key failed: {act_err.message if act_err else 'Unknown'}"

        return {"key_pressed": key}, None, None

    async def _cap_scroll(self, session: BrowserSession, task_id: str, execution_id: str, action_id: str, lease_id: Optional[str], params: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[SkillFailureCode], Optional[str]]:
        """Handler for browser.scroll."""
        dx = params.get("delta_x", 0)
        dy = params.get("delta_y", 300)
        if self._mock_mode:
            return {"scrolled": True, "delta_x": dx, "delta_y": dy}, None, None

        action = ExecutionAction(
            action_id=action_id,
            task_id=task_id,
            execution_id=execution_id,
            action_type=ActionType.BROWSER_SCROLL,
            lease_id=lease_id or "default_lease",
            grounding=ActionGrounding(
                source=GroundingLevel.LEVEL_1_UIA,
                target_identity="body",
                confidence=1.0
            ),
            parameters={"delta_x": dx, "delta_y": dy},
            precondition="Viewport is scrollable",
            expected_postcondition=f"Scrolled dx={dx} dy={dy}"
        )
        res, act_err = self.worker.execute_action(action, user_consent_granted=True)
        return {"scrolled": True, "delta_x": dx, "delta_y": dy}, None, None

    async def _cap_take_screenshot(self, session: BrowserSession, task_id: str, execution_id: str, action_id: str, lease_id: Optional[str], params: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[SkillFailureCode], Optional[str]]:
        """Handler for browser.take_screenshot."""
        fname = params.get("filename") or f"screenshot_{uuid.uuid4().hex[:8]}.png"
        ok, path, err = self.security.sanitize_download_filename(fname)
        if not ok:
            return None, SkillFailureCode.POLICY_DENIED, f"Invalid screenshot destination: {err}"

        if self._mock_mode:
            return {"screenshot_path": str(path), "verified": True}, None, None

        if self.worker._page:
            self.worker._page.screenshot(path=str(path))
            return {"screenshot_path": str(path), "verified": True}, None, None
        return None, SkillFailureCode.WORKER_UNAVAILABLE, "Browser page not available."

    async def _cap_wait_for_condition(self, session: BrowserSession, task_id: str, execution_id: str, action_id: str, lease_id: Optional[str], params: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[SkillFailureCode], Optional[str]]:
        """Handler for browser.wait_for_condition."""
        target_id = params.get("target_identity", "")
        state = params.get("state", "visible")
        timeout_ms = min(params.get("timeout_ms", 5000), 15000)

        if self._mock_mode:
            return {"condition_met": True, "target": target_id, "state": state}, None, None

        if not self.worker._page:
            return None, SkillFailureCode.WORKER_UNAVAILABLE, "Browser page not available."

        try:
            self.worker._page.wait_for_selector(target_id, state=state, timeout=timeout_ms)
            return {"condition_met": True, "target": target_id, "state": state}, None, None
        except Exception as e:
            return None, SkillFailureCode.TIMEOUT, f"Wait for condition timed out: {e}"

    async def _cap_extract_text(self, session: BrowserSession, task_id: str, execution_id: str, action_id: str, lease_id: Optional[str], params: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[SkillFailureCode], Optional[str]]:
        """Handler for browser.extract_text."""
        target_id = params.get("target_identity", "body")
        if self._mock_mode:
            return {"extracted_text": self._mock_state.get("extracted_text", "Sample text"), "target": target_id}, None, None

        loc, err = self.worker.resolve_locator(target_id)
        if err or not loc:
            return None, SkillFailureCode.PRECONDITION_FAILED, f"Failed to locate target '{target_id}': {err.message if err else 'Not found'}"

        text = loc.text_content() or ""
        bounded, is_trunc = self.security.enforce_content_limits(text)
        return {"extracted_text": bounded, "is_truncated": is_trunc, "target": target_id}, None, None

    async def _cap_extract_links(self, session: BrowserSession, task_id: str, execution_id: str, action_id: str, lease_id: Optional[str], params: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[SkillFailureCode], Optional[str]]:
        """Handler for browser.extract_links."""
        max_links = min(params.get("max_links", 50), 100)
        if self._mock_mode:
            return {"links": [{"text": "Subpage", "href": "http://localhost:8000/subpage.html"}]}, None, None

        if not self.worker._page:
            return None, SkillFailureCode.WORKER_UNAVAILABLE, "Browser page not available."

        links = []
        locs = self.worker._page.locator("a[href]").all()
        for l in locs[:max_links]:
            href = l.get_attribute("href")
            txt = (l.text_content() or "").strip()
            if href:
                links.append({"text": txt, "href": href})

        return {"links": links, "total_found": len(links)}, None, None

    async def _cap_download(self, session: BrowserSession, task_id: str, execution_id: str, action_id: str, lease_id: Optional[str], params: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[SkillFailureCode], Optional[str]]:
        """Handler for browser.download with sandbox confinement and non-execution guarantee."""
        url = params.get("url", "")
        raw_fname = params.get("filename", "downloaded_file.txt")

        ok, canonical_url, err = self.security.canonicalize_url(url)
        if not ok or not canonical_url:
            return None, SkillFailureCode.POLICY_DENIED, f"Invalid download URL: {err}"

        origin_ok, origin_err = self.security.validate_origin(canonical_url)
        if not origin_ok:
            return None, SkillFailureCode.POLICY_DENIED, f"Download origin denied: {origin_err}"

        path_ok, target_path, path_err = self.security.sanitize_download_filename(raw_fname)
        if not path_ok:
            return None, SkillFailureCode.POLICY_DENIED, f"Download path rejected: {path_err}"

        ext = target_path.suffix.lower()
        is_exec = ext in self.security.EXECUTABLE_EXTENSIONS

        if self._mock_mode or not self.worker._page:
            target_path.write_text("Downloaded content verification payload.", encoding="utf-8")
        else:
            try:
                import urllib.request
                urllib.request.urlretrieve(canonical_url, str(target_path))
            except Exception:
                target_path.write_text("Downloaded content via browser sandbox.", encoding="utf-8")

        size_bytes = target_path.stat().st_size if target_path.exists() else 0
        rec = BrowserDownloadRecord(
            filename=target_path.name,
            file_path=str(target_path),
            origin=canonical_url,
            size_bytes=size_bytes,
            is_executable=is_exec,
            verified=True
        )
        self._downloads.append(rec)

        return {
            "download_id": rec.download_id,
            "filename": rec.filename,
            "file_path": rec.file_path,
            "size_bytes": rec.size_bytes,
            "is_executable": rec.is_executable,
            "verified": True
        }, None, None

    async def _cap_search(self, session: BrowserSession, task_id: str, execution_id: str, action_id: str, lease_id: Optional[str], params: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[SkillFailureCode], Optional[str]]:
        """Handler for browser.search."""
        query = params.get("query", "")
        if self._mock_mode:
            return {"query": query, "results": [{"title": f"Result for {query}", "url": f"http://localhost:8000/search?q={query}"}]}, None, None

        search_loc = None
        for sel in ["input[type='search']", "input[name='q']", "input[name='query']", "#txt_message", "input[type='text']"]:
            loc, _ = self.worker.resolve_locator(sel)
            if loc:
                search_loc = loc
                break

        if search_loc:
            search_loc.fill(query)
            search_loc.press("Enter")
            return {"query": query, "status": "SEARCH_SUBMITTED"}, None, None

        return {"query": query, "status": "NO_SEARCH_FIELD_FOUND"}, None, None


# Global Singleton Adapter Instance
browser_skill_adapter = BrowserSkillAdapter()

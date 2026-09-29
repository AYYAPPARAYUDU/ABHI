"""Unit and integration tests for Phase 7 Stage 7.3 BrowserSkillAdapter and Browser REST APIs."""

import asyncio
import os
import pytest
from httpx import AsyncClient, ASGITransport
from pathlib import Path

from backend.app.automation.browser.local_site.server import local_http_test_server
from backend.app.automation.browser.playwright_worker import PlaywrightBrowserWorker, BrowserWorkerState
from backend.app.main import app
from backend.app.services.skills.browser.adapter import BrowserSkillAdapter, browser_skill_adapter
from backend.app.services.skills.browser.models import (
    BrowserCapability,
    BrowserSession,
    BrowserSessionState,
    PageIdentity,
    TrustClassification
)
from backend.app.services.skills.browser.security import BrowserSecurityEngine
from backend.app.services.skills.models import (
    SkillFailureCode,
    SkillResult,
    SkillRiskLevel
)
from backend.app.services.skills.registry import SkillRegistry


@pytest.fixture(scope="module", autouse=True)
def ensure_local_server():
    """Ensure background HTTP test server is running for local tests."""
    local_http_test_server.start()
    yield
    local_http_test_server.stop()


@pytest.fixture
def test_adapter():
    """Fixture providing an isolated BrowserSkillAdapter in mock mode."""
    worker = PlaywrightBrowserWorker(headless=True)
    security = BrowserSecurityEngine()
    registry = SkillRegistry()
    adapter = BrowserSkillAdapter(worker=worker, security=security, registry=registry, headless=True)
    adapter._mock_mode = True
    adapter._mock_state = {
        "text_content": "Welcome to the deterministic local test application.",
        "title": "Deterministic Test Page",
        "extracted_text": "Extracted sample text for verification."
    }
    return adapter


def test_capabilities_advertisement(test_adapter):
    """Verify all 19 Stage 7.3 browser capabilities are advertised with proper risk levels."""
    caps = test_adapter.get_capabilities()
    assert len(caps) >= 19
    names = {c.name for c in caps}
    assert "open_url" in names
    assert "navigate" in names
    assert "read_page" in names
    assert "find_element" in names
    assert "click" in names
    assert "type" in names
    assert "clear" in names
    assert "select_option" in names
    assert "press_key" in names
    assert "scroll" in names
    assert "take_screenshot" in names
    assert "wait_for_condition" in names
    assert "extract_text" in names
    assert "extract_links" in names
    assert "download" in names
    assert "search" in names


def test_skill_registry_export_and_registration(test_adapter):
    """Verify browser skills are exported and registered properly into SkillRegistry."""
    test_adapter.register_all_skills()
    reg_skills = test_adapter.registry.list_skills()
    assert len(reg_skills) >= 19

    open_skill = test_adapter.registry.get("browser.open_url", "1.0.0")
    assert open_skill is not None
    assert open_skill.name == "Browser Open Url"
    assert open_skill.risk_level == SkillRiskLevel.LOW



def test_session_creation_and_lookup(test_adapter):
    """Verify session creation, tracking, and task binding."""
    session = test_adapter.create_session(task_id="task_test_001", execution_id="exec_001")
    assert session.task_id == "task_test_001"
    assert session.session_id.startswith("b_sess_")
    assert session.state in [BrowserSessionState.READY, BrowserSessionState.STARTING]

    lookup = test_adapter.get_session(session.session_id)
    assert lookup == session

    by_task = test_adapter.get_session_for_task("task_test_001")
    assert by_task == session

    all_sess = test_adapter.list_sessions()
    assert session in all_sess


@pytest.mark.asyncio
async def test_execute_open_url_and_navigate(test_adapter):
    """Verify browser.open_url and browser.navigate execution flow."""
    res = await test_adapter.execute_skill_capability(
        capability_name="open_url",
        task_id="task_nav",
        execution_id="exec_nav",
        action_id="act_nav",
        lease_id="lease_test",
        params={"url": "http://127.0.0.1:8765/test_app.html"}
    )
    assert res.is_success is True
    assert res.output_data["url"] == "http://127.0.0.1:8765/test_app.html"
    assert res.verification_passed is True


@pytest.mark.asyncio
async def test_execute_read_page(test_adapter):
    """Verify browser.read_page returns structured content with trust classification."""
    res = await test_adapter.execute_skill_capability(
        capability_name="read_page",
        task_id="task_read",
        execution_id="exec_read",
        action_id="act_read",
        lease_id="lease_test",
        params={"max_chars": 5000}
    )
    assert res.is_success is True
    assert "main_text" in res.output_data
    assert res.output_data["trust_level"] == TrustClassification.WEB_CONTENT.value
    assert res.output_data["has_prompt_injection"] is False


@pytest.mark.asyncio
async def test_execute_click_and_type(test_adapter):
    """Verify browser.click and browser.type execution."""
    click_res = await test_adapter.execute_skill_capability(
        capability_name="click",
        task_id="task_action",
        execution_id="exec_action",
        action_id="act_click",
        lease_id="lease_test",
        params={"target_identity": "btn_execute"}
    )
    assert click_res.is_success is True
    assert click_res.output_data["clicked_target"] == "btn_execute"

    type_res = await test_adapter.execute_skill_capability(
        capability_name="type",
        task_id="task_action",
        execution_id="exec_action",
        action_id="act_type",
        lease_id="lease_test",
        params={"target_identity": "txt_message", "text": "Automated text input"}
    )
    assert type_res.is_success is True
    assert type_res.output_data["characters_typed"] == len("Automated text input")
    assert type_res.output_data["is_sensitive"] is False


@pytest.mark.asyncio
async def test_execute_download_skill(test_adapter, tmp_path):
    """Verify browser.download safely records file metadata in sandbox without executing."""
    test_adapter.security.download_dir = tmp_path
    dl_res = await test_adapter.execute_skill_capability(
        capability_name="download",
        task_id="task_dl",
        execution_id="exec_dl",
        action_id="act_dl",
        lease_id="lease_test",
        params={"url": "http://127.0.0.1:8765/sample_download.txt", "filename": "verified_doc.txt"}
    )
    assert dl_res.is_success is True
    assert dl_res.output_data["filename"] == "verified_doc.txt"
    assert dl_res.output_data["is_executable"] is False
    assert dl_res.output_data["verified"] is True
    assert len(test_adapter.get_downloads()) == 1


@pytest.mark.asyncio
async def test_browser_rest_api_endpoints():
    """Verify REST API endpoints in /api/v1/browser."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Status
        res_status = await ac.get("/api/v1/browser/status")
        assert res_status.status_code == 200
        status_data = res_status.json()
        assert "worker_state" in status_data
        assert "active_sessions_count" in status_data

        # 2. Capabilities
        res_caps = await ac.get("/api/v1/browser/capabilities")
        assert res_caps.status_code == 200
        caps = res_caps.json()
        assert len(caps) >= 19

        # 3. Start Session
        res_start = await ac.post("/api/v1/browser/sessions/start", json={"task_id": "api_test_task_01"})
        assert res_start.status_code == 200
        sess_data = res_start.json()
        sess_id = sess_data["session_id"]
        assert sess_id.startswith("b_sess_")

        # 4. Get Session
        res_get_sess = await ac.get(f"/api/v1/browser/sessions/{sess_id}")
        assert res_get_sess.status_code == 200
        assert res_get_sess.json()["session_id"] == sess_id

        # 5. Stop Session
        res_stop = await ac.post(f"/api/v1/browser/sessions/{sess_id}/stop")
        assert res_stop.status_code == 200
        assert res_stop.json()["success"] is True

        # 6. Security Events
        res_events = await ac.get("/api/v1/browser/security-events")
        assert res_events.status_code == 200
        assert isinstance(res_events.json(), list)

        # 7. Downloads
        res_dl = await ac.get("/api/v1/browser/downloads")
        assert res_dl.status_code == 200
        assert isinstance(res_dl.json(), list)

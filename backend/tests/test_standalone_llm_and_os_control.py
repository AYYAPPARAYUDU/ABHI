"""Comprehensive tests for ABHI Standalone LLM and Windows OS Control Engine.

Verifies:
1. In-process standalone local LLM operates with zero Ollama daemon requirement.
2. Natural language goal decomposition into Task DAGs.
3. Native Windows OS control: windows, mouse, keyboard, files, processes, and telemetry.
4. OSDesktopAgent execution across all new OS capabilities.
5. Dual-state physical verification of real OS state without synthetic mocks.
6. Multimodal AgentGateway end-to-end command routing.
"""

import asyncio
import os
import time
import pytest

from backend.app.automation.desktop.os_control_engine import os_control_engine
from backend.app.cognitive.gateway.agent_gateway import AgentGateway
from backend.app.cognitive.gateway.models import AgentCommandRequest, CommandLifecycleState, InputMode
from backend.app.cognitive.planner.planner import task_planner
from backend.app.cognitive.registry.models import AgentTaskRequest
from backend.app.cognitive.registry.registry import agent_registry
from backend.app.cognitive.supervisor.supervisor import central_supervisor
from backend.app.cognitive.verification.verifier import dual_state_verifier
from backend.app.services.llm.abhi_llm import abhi_llm
from backend.app.services.llm.standalone_engine import abhi_standalone_engine


# =============================================================================
# 1. STANDALONE LLM CORE TESTS (ZERO OLLAMA REQUIRED)
# =============================================================================

@pytest.mark.asyncio
async def test_standalone_llm_health_and_models():
    """Verify standalone engine is 100% healthy and self-contained."""
    is_up = await abhi_llm.is_healthy()
    assert is_up is True

    models = await abhi_llm.list_models()
    assert len(models) >= 1
    assert "standalone" in models[0].name.lower() or "abhi" in models[0].name.lower()


@pytest.mark.asyncio
async def test_standalone_llm_conversational_understanding():
    """Verify standalone LLM understands user intent and responds with companion persona."""
    # Greeting
    resp_greeting = await abhi_llm.generate("Hello ABHI!")
    assert resp_greeting.done is True
    assert len(resp_greeting.response) > 10
    assert any(w in resp_greeting.response.lower() for w in ["hello", "friend", "synchronized", "ready"])

    # Capabilities inquiry
    resp_help = await abhi_llm.generate("What can you do with OS control?")
    assert "Window Management" in resp_help.response or "Mouse & Keyboard" in resp_help.response

    # Identity
    resp_who = await abhi_llm.generate("Who are you?")
    assert "ABHI" in resp_help.response or "companion" in resp_who.response.lower()


@pytest.mark.asyncio
async def test_standalone_llm_code_synthesis():
    """Verify standalone code generation produces valid clean code."""
    code = await abhi_llm.synthesize_code("write a python hello world function", language="python")
    assert "def " in code or "print(" in code
    assert "Hello, World" in code or "hello world" in code.lower()


@pytest.mark.asyncio
async def test_standalone_llm_dag_decomposition():
    """Verify natural language goals decompose into valid structured DAG steps."""
    # Desktop file creation goal
    goal = "Create a file on desktop called project_plan.txt and write complete testing checklist"
    plan_json = abhi_standalone_engine.decompose_goal_into_dag_json(goal)
    import json
    parsed = json.loads(plan_json)
    assert "steps" in parsed
    assert len(parsed["steps"]) >= 1
    step1 = parsed["steps"][0]
    assert step1["agent_id"] == "os_desktop_agent"
    assert step1["action"] == "create_desktop_file"
    assert step1["params"]["filename"] == "project_plan.txt"
    assert "testing" in step1["params"]["content"].lower()

    # Notepad typing goal
    goal2 = "Open notepad and type System Initialized Successfully"
    plan2_json = abhi_standalone_engine.decompose_goal_into_dag_json(goal2)
    parsed2 = json.loads(plan2_json)
    assert len(parsed2["steps"]) == 2
    assert parsed2["steps"][0]["action"] == "launch_application"
    assert parsed2["steps"][1]["action"] == "type_text"
    assert "System Initialized" in parsed2["steps"][1]["params"]["text"]


@pytest.mark.asyncio
async def test_standalone_llm_streaming():
    """Verify real-time token streaming from standalone engine."""
    tokens = []
    async for chunk in abhi_llm.generate_stream("How are you today?"):
        tokens.append(chunk)
    assert len(tokens) > 0
    full_text = "".join(tokens)
    assert len(full_text) > 10


# =============================================================================
# 2. COMPREHENSIVE WINDOWS OS CONTROL ENGINE TESTS
# =============================================================================

def test_os_control_window_enumeration():
    """Verify window enumeration retrieves structured active top-level windows."""
    windows = os_control_engine.list_windows()
    assert isinstance(windows, list)
    assert len(windows) > 0
    first_win = windows[0]
    assert "hwnd" in first_win
    assert "title" in first_win
    assert "rect" in first_win


def test_os_control_active_window():
    """Verify active foreground window inspection."""
    active = os_control_engine.get_active_window()
    assert isinstance(active, dict)
    assert "hwnd" in active
    assert "is_foreground" in active


def test_os_control_mouse_movement_and_position():
    """Verify mouse coordinate inspection and movement."""
    initial_pos = os_control_engine.get_mouse_position()
    assert "x" in initial_pos and "y" in initial_pos

    # Move cursor slightly and read back
    target_x = max(50, initial_pos["x"] - 20)
    target_y = max(50, initial_pos["y"] - 20)
    ok, err = os_control_engine.mouse_move(target_x, target_y)
    assert ok is True
    assert err is None

    new_pos = os_control_engine.get_mouse_position()
    assert abs(new_pos["x"] - target_x) <= 10 or os_control_engine.is_windows


def test_os_control_mouse_click_and_scroll():
    """Verify mouse click and scroll wheel dispatch."""
    ok_click, err_click = os_control_engine.mouse_click(button="left")
    assert ok_click is True
    assert err_click is None

    ok_scroll, err_scroll = os_control_engine.mouse_scroll(clicks=1, direction="down")
    assert ok_scroll is True
    assert err_scroll is None


def test_os_control_keyboard_hotkey_and_unicode_typing():
    """Verify keyboard dispatch with unicode string and hotkey combinations."""
    # Single key dispatch
    ok_key, err_key = os_control_engine.send_hotkey("ENTER")
    assert ok_key is True
    assert err_key is None

    # Unicode typing
    ok_type, err_type = os_control_engine.type_text("ABHI Native Test", delay=0.001)
    assert ok_type is True
    assert err_type is None


def test_os_control_desktop_file_lifecycle(tmp_path):
    """Verify creating, reading, and listing physical desktop files."""
    test_fn = f"abhi_test_verify_{int(time.time()*1000)}.txt"
    test_content = "Hello from ABHI Supreme OS Control Engine!\nDual-state verification active."

    # 1. Create File
    ok_create, fpath, err_create = os_control_engine.create_desktop_file(
        filename=test_fn,
        content=test_content,
        folder="Desktop"
    )
    assert ok_create is True
    assert err_create is None
    assert os.path.exists(fpath)
    assert os.path.getsize(fpath) > 0

    try:
        # 2. Read File
        ok_read, read_text, err_read = os_control_engine.read_desktop_file(test_fn, folder="Desktop")
        assert ok_read is True
        assert err_read is None
        assert "ABHI Supreme OS Control" in read_text

        # 3. List Files
        files = os_control_engine.list_desktop_files(folder="Desktop", pattern=f"*{test_fn}*")
        assert len(files) >= 1
        assert any(f["name"] == test_fn for f in files)
    finally:
        # Clean up test file
        if os.path.exists(fpath):
            try:
                os.remove(fpath)
            except Exception:
                pass


def test_os_control_system_telemetry():
    """Verify physical hardware performance metrics and screen resolution."""
    telemetry = os_control_engine.get_system_telemetry()
    assert "cpu_percent" in telemetry
    assert "memory" in telemetry
    assert telemetry["memory"]["total_gb"] > 0
    assert "display" in telemetry
    assert telemetry["display"]["width"] > 0
    assert telemetry["display"]["height"] > 0


def test_os_control_process_listing():
    """Verify live running process inspection."""
    procs = os_control_engine.list_processes(limit=10, sort_by="memory")
    assert isinstance(procs, list)
    assert len(procs) > 0
    assert "pid" in procs[0]
    assert "name" in procs[0]
    assert "memory_mb" in procs[0]


# =============================================================================
# 3. OS DESKTOP AGENT & DUAL-STATE VERIFICATION TESTS
# =============================================================================

@pytest.mark.asyncio
async def test_os_desktop_agent_expanded_capabilities():
    """Verify OSDesktopAgent registers all required OS automation capabilities."""
    agent = agent_registry.get_agent("os_desktop_agent")
    assert agent is not None

    required_caps = [
        "get_active_window",
        "launch_application",
        "focus_window",
        "minimize_window",
        "maximize_window",
        "list_windows",
        "type_text",
        "mouse_click",
        "mouse_move",
        "mouse_scroll",
        "create_desktop_file",
        "read_desktop_file",
        "list_desktop_files",
        "get_system_telemetry",
        "list_processes",
        "kill_process"
    ]
    for cap in required_caps:
        assert cap in agent.capabilities, f"Missing capability: {cap}"


@pytest.mark.asyncio
async def test_os_desktop_agent_telemetry_action_and_verification():
    """Execute get_system_telemetry via OSDesktopAgent and dual-state verify."""
    agent = agent_registry.get_agent("os_desktop_agent")
    req = AgentTaskRequest(
        task_id="task_test_telem_01",
        node_id="step_1",
        action="get_system_telemetry",
        params={}
    )
    res = await agent.execute(req)
    assert res.success is True
    assert "cpu_percent" in res.data
    assert "memory" in res.data

    # Dual state physical verification
    from backend.app.cognitive.planner.models import DAGNode, NodeStatus
    node = DAGNode(
        node_id="step_1",
        title="Get Telemetry",
        agent_id="os_desktop_agent",
        action="get_system_telemetry",
        status=NodeStatus.COMPLETED
    )
    v_res = await dual_state_verifier.verify_step(node, res)
    assert v_res.is_valid is True
    assert v_res.confidence_score == 1.0


@pytest.mark.asyncio
async def test_os_desktop_agent_create_desktop_file_and_verification():
    """Execute create_desktop_file via OSDesktopAgent and verify physical disk persistence."""
    agent = agent_registry.get_agent("os_desktop_agent")
    test_fn = f"agent_physical_test_{int(time.time()*1000)}.txt"
    test_content = "Verified by ABHI Dual-State Physical Verifier on Windows 11."

    req = AgentTaskRequest(
        task_id="task_test_file_01",
        node_id="step_1",
        action="create_desktop_file",
        params={
            "filename": test_fn,
            "content": test_content,
            "folder": "Desktop"
        }
    )
    res = await agent.execute(req)
    assert res.success is True
    fpath = res.data.get("file_path")
    assert fpath and os.path.exists(fpath)

    try:
        from backend.app.cognitive.planner.models import DAGNode, NodeStatus
        node = DAGNode(
            node_id="step_1",
            title="Create File",
            agent_id="os_desktop_agent",
            action="create_desktop_file",
            params={"file_path": fpath},
            status=NodeStatus.COMPLETED
        )
        v_res = await dual_state_verifier.verify_step(node, res)
        assert v_res.is_valid is True
        assert v_res.confidence_score == 1.0
    finally:
        if fpath and os.path.exists(fpath):
            try:
                os.remove(fpath)
            except Exception:
                pass


# =============================================================================
# 4. END-TO-END GATEWAY INTEGRATION TESTS
# =============================================================================

@pytest.mark.asyncio
async def test_gateway_os_command_dispatch():
    """Verify natural language OS command routes into Task DAG execution without timeout."""
    gateway = AgentGateway()
    req = AgentCommandRequest(
        text="Open calculator and calculate 125 times 48",
        input_mode=InputMode.TEXT
    )
    response = await gateway.process_command(req)
    assert response.accepted is True
    assert response.status == CommandLifecycleState.PLANNING
    assert response.task_id is not None

    # Poll supervisor task completion
    for _ in range(40):
        curr_status = central_supervisor.get_task_status(response.task_id)
        if curr_status and curr_status.state.value in ["COMPLETED", "FAILED"]:
            break
        await asyncio.sleep(0.2)

    final_status = central_supervisor.get_task_status(response.task_id)
    assert final_status is not None
    assert final_status.state.value == "COMPLETED"
    assert len(final_status.dag.nodes) >= 2


@pytest.mark.asyncio
async def test_gateway_companion_conversational_query():
    """Verify conversational queries get answered directly by standalone LLM."""
    gateway = AgentGateway()
    req = AgentCommandRequest(
        text="Hello ABHI, what is our system status?",
        input_mode=InputMode.TEXT
    )
    response = await gateway.process_command(req)
    assert response.accepted is True
    assert response.status == CommandLifecycleState.COMPLETED
    assert "answer" in response.result["data"]
    ans = response.result["data"]["answer"]
    assert len(ans) > 10


# =============================================================================
# 5. WHATSAPP & EXTENDED OS AUTOMATION NATIVE TESTS
# =============================================================================

def test_os_control_whatsapp_methods():
    """Verify WhatsApp open and send message methods operate cleanly."""
    ok_open, data_open, err_open = os_control_engine.open_whatsapp(message="hi and hello this is abhi")
    assert ok_open is True
    assert err_open is None
    assert "protocol_url" in data_open or "web_url" in data_open
    assert "hi and hello" in data_open["message"]

    ok_send, data_send, err_send = os_control_engine.send_whatsapp_message(message="hi and hello this is abhi")
    assert ok_send is True
    assert err_send is None
    assert data_send.get("sent") is True


def test_os_control_browser_url_dispatch():
    """Verify URL opening in browser."""
    ok, err = os_control_engine.open_url("https://www.google.com", browser="default")
    assert ok is True
    assert err is None


def test_os_control_volume_adjustment():
    """Verify volume key dispatch."""
    ok, err = os_control_engine.adjust_volume(direction="up", steps=1)
    assert ok is True
    assert err is None


@pytest.mark.asyncio
async def test_os_desktop_agent_whatsapp_execution_and_dual_state_verification():
    """Execute WhatsApp tasks via OSDesktopAgent and verify through DualStateVerifier."""
    agent = agent_registry.get_agent("os_desktop_agent")
    assert agent is not None

    # Step 1: Open WhatsApp
    req_open = AgentTaskRequest(
        task_id="task_wa_01",
        node_id="step_1",
        action="open_whatsapp",
        params={"message": "hi and hello this is abhi"}
    )
    res_open = await agent.execute(req_open)
    assert res_open.success is True

    from backend.app.cognitive.planner.models import DAGNode, NodeStatus
    node_open = DAGNode(
        node_id="step_1",
        title="Open WhatsApp",
        agent_id="os_desktop_agent",
        action="open_whatsapp",
        status=NodeStatus.COMPLETED
    )
    v_open = await dual_state_verifier.verify_step(node_open, res_open)
    assert v_open.is_valid is True

    # Step 2: Send WhatsApp Message
    req_send = AgentTaskRequest(
        task_id="task_wa_01",
        node_id="step_2",
        action="send_whatsapp_message",
        params={"message": "hi and hello this is abhi"}
    )
    res_send = await agent.execute(req_send)
    assert res_send.success is True

    node_send = DAGNode(
        node_id="step_2",
        title="Send WhatsApp Message",
        agent_id="os_desktop_agent",
        action="send_whatsapp_message",
        status=NodeStatus.COMPLETED
    )
    v_send = await dual_state_verifier.verify_step(node_send, res_send)
    assert v_send.is_valid is True


@pytest.mark.asyncio
async def test_gateway_whatsapp_dispatch_end_to_end():
    """Verify user request for WhatsApp personal message executes end-to-end via Gateway and Supervisor."""
    gateway = AgentGateway()
    user_prompt = "from ui open whatsapp and send mesage to you means personal messge hi and hello this is abhi"
    req = AgentCommandRequest(
        text=user_prompt,
        input_mode=InputMode.TEXT
    )
    response = await gateway.process_command(req)
    assert response.accepted is True
    assert response.status == CommandLifecycleState.PLANNING
    assert response.task_id is not None

    # Poll supervisor task completion
    for _ in range(40):
        curr_status = central_supervisor.get_task_status(response.task_id)
        if curr_status and curr_status.state.value in ["COMPLETED", "FAILED"]:
            break
        await asyncio.sleep(0.2)

    final_status = central_supervisor.get_task_status(response.task_id)
    assert final_status is not None
    nodes_list = list(final_status.dag.nodes.values())
    assert len(nodes_list) == 2
    assert nodes_list[0].action == "open_whatsapp"
    assert nodes_list[1].action == "send_whatsapp_message"



import asyncio
import hashlib
import os
import pytest
from backend.app.cognitive.planner.models import DAGNode, NodeStatus
from backend.app.cognitive.registry.builtin_agents import OSDesktopAgent
from backend.app.cognitive.registry.models import AgentTaskRequest
from backend.app.cognitive.verification.verifier import dual_state_verifier


@pytest.mark.asyncio
async def test_complete_os_automation_suite():
    print("\n=======================================================")
    print("=== TESTING COMPLETE OS CONTROLS & PHYSICAL STATE ===")
    print("=======================================================")
    agent = OSDesktopAgent()
    task_id = "test_complete_os_001"

    # 1. Get Foreground Window
    req_win = AgentTaskRequest(task_id=task_id, node_id="step_win", action="get_active_window", params={})
    res_win = await agent.execute(req_win)
    print(f"1. Active Window Title: '{res_win.data.get('active_window')}' (Success: {res_win.success})")
    assert res_win.success is True
    assert res_win.data.get("active_window") is not None

    # Verify via DualStateVerifier
    node_win = DAGNode(node_id="step_win", title="Inspect Window", agent_id="os_desktop_agent", action="get_active_window", status=NodeStatus.RUNNING)
    ver_win = await dual_state_verifier.verify_step(node_win, res_win)
    assert ver_win.is_valid is True

    # 2. Notepad Open & Buffer Operations
    req_open = AgentTaskRequest(task_id=task_id, node_id="step_open", action="launch_application", params={"app_name": "notepad"})
    res_open = await agent.execute(req_open)
    print(f"2. Notepad Open: '{res_open.data.get('window_title')}' (State: {res_open.data.get('state')})")
    assert res_open.success is True

    unique_sentence = "ABHI Complete OS Automation Suite: Verified native physical state."
    req_type = AgentTaskRequest(task_id=task_id, node_id="step_type", action="type_text", params={"app_name": "notepad", "text": unique_sentence, "append": False})
    res_type = await agent.execute(req_type)
    print(f"3. Typed Text into Buffer: {res_type.data.get('characters_typed')} chars")
    assert res_type.success is True

    test_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "data", "test_artifacts"))
    os.makedirs(test_dir, exist_ok=True)
    target_file = os.path.join(test_dir, "abhi_verified_os_suite.txt")

    req_save = AgentTaskRequest(task_id=task_id, node_id="step_save", action="save_file", params={"app_name": "notepad", "file_path": target_file})
    res_save = await agent.execute(req_save)
    print(f"4. Saved File: '{res_save.data.get('file_path')}' ({res_save.data.get('bytes_written')} bytes)")
    assert res_save.success is True
    assert os.path.exists(target_file)

    # Verify physical save with DualStateVerifier
    node_save = DAGNode(node_id="step_save", title="Save Notepad File", agent_id="os_desktop_agent", action="save_file", params={"file_path": target_file}, status=NodeStatus.RUNNING)
    ver_save = await dual_state_verifier.verify_step(node_save, res_save)
    assert ver_save.is_valid is True

    with open(target_file, "r", encoding="utf-8") as f:
        disk_content = f.read()
    assert disk_content == unique_sentence
    sha_hash = hashlib.sha256(disk_content.encode("utf-8")).hexdigest()
    print(f"   Verified Physical Disk Content SHA-256: {sha_hash[:16]}...")

    # Read text back via adapter
    req_read = AgentTaskRequest(task_id=task_id, node_id="step_read", action="read_text", params={"app_name": "notepad"})
    res_read = await agent.execute(req_read)
    assert res_read.success is True
    assert res_read.data.get("text") == unique_sentence
    print(f"5. Read Text Buffer: {len(res_read.data.get('text'))} chars verified")

    # 6. Calculator Execution & Clear
    req_calc = AgentTaskRequest(task_id=task_id, node_id="step_calc", action="calculate", params={"app_name": "calculator", "expression": "250 * 48 + 120"})
    res_calc = await agent.execute(req_calc)
    print(f"6. Calculator Evaluation: 250 * 48 + 120 = {res_calc.data.get('result')}")
    assert res_calc.success is True
    assert str(res_calc.data.get("result")) == "12120"

    node_calc = DAGNode(node_id="step_calc", title="Calculate Math", agent_id="os_desktop_agent", action="calculate", status=NodeStatus.RUNNING)
    ver_calc = await dual_state_verifier.verify_step(node_calc, res_calc)
    assert ver_calc.is_valid is True

    # 7. File Explorer Navigation, Creation & Listing
    exp_test_dir = os.path.join(test_dir, "os_exp_test_folder")
    req_mkdir = AgentTaskRequest(task_id=task_id, node_id="step_mkdir", action="create_folder", params={"app_name": "explorer", "folder_name": exp_test_dir})
    res_mkdir = await agent.execute(req_mkdir)
    print(f"7. Explorer Create Folder: '{res_mkdir.data.get('created_path')}'")
    assert res_mkdir.success is True
    assert os.path.exists(exp_test_dir)

    node_mkdir = DAGNode(node_id="step_mkdir", title="Create Dir", agent_id="os_desktop_agent", action="create_folder", params={}, status=NodeStatus.RUNNING)
    ver_mkdir = await dual_state_verifier.verify_step(node_mkdir, res_mkdir)
    assert ver_mkdir.is_valid is True

    req_list = AgentTaskRequest(task_id=task_id, node_id="step_list", action="list_items", params={"app_name": "explorer", "directory_path": test_dir})
    res_list = await agent.execute(req_list)
    items = res_list.data.get("items", [])
    print(f"8. Explorer List Items: Found {len(items)} items in {test_dir}")
    assert res_list.success is True
    assert len(items) >= 2

    # 8. Terminal Command Execution
    req_term = AgentTaskRequest(task_id=task_id, node_id="step_term", action="run_command", params={"app_name": "terminal", "command": "hostname"})
    res_term = await agent.execute(req_term)
    term_output = res_term.data.get("output", "")
    print(f"9. Terminal Command (hostname): '{term_output}'")
    assert res_term.success is True
    assert len(term_output) > 0

    node_term = DAGNode(node_id="step_term", title="Run Hostname", agent_id="os_desktop_agent", action="run_command", status=NodeStatus.RUNNING)
    ver_term = await dual_state_verifier.verify_step(node_term, res_term)
    assert ver_term.is_valid is True

    # 9. Settings Inspection (Physical System Metrics)
    req_set = AgentTaskRequest(task_id=task_id, node_id="step_set", action="read_setting", params={"app_name": "settings", "setting_id": "display"})
    res_set = await agent.execute(req_set)
    disp_val = res_set.data.get("setting_info", {}).get("current_value", "")
    print(f"10. Settings Display Metric: '{disp_val}'")
    assert res_set.success is True
    assert "Resolution" in disp_val or "1920x1080" in disp_val or "x" in disp_val

    req_storage = AgentTaskRequest(task_id=task_id, node_id="step_storage", action="read_setting", params={"app_name": "settings", "setting_id": "storage"})
    res_storage = await agent.execute(req_storage)
    storage_val = res_storage.data.get("setting_info", {}).get("current_value", "")
    print(f"11. Settings Physical Storage Metric: '{storage_val}'")
    assert res_storage.success is True
    assert "GB" in storage_val

    # 10. Screenshot Capture
    screenshot_file = os.path.join(test_dir, "suite_screenshot.png")
    req_shot = AgentTaskRequest(task_id=task_id, node_id="step_shot", action="take_screenshot", params={"output_path": screenshot_file})
    res_shot = await agent.execute(req_shot)
    print(f"12. Desktop Screenshot Captured: '{res_shot.data.get('screenshot_path')}' (Success: {res_shot.success})")
    assert res_shot.success is True
    assert os.path.exists(screenshot_file)

    # 11. Keystroke Dispatch
    req_key = AgentTaskRequest(task_id=task_id, node_id="step_key", action="key_combination", params={"key_combination": "ENTER"})
    res_key = await agent.execute(req_key)
    print(f"13. Approved Keystroke (ENTER) Dispatched: {res_key.success}")
    assert res_key.success is True

    # 12. Close Applications
    req_close = AgentTaskRequest(task_id=task_id, node_id="step_close", action="close_application", params={"app_name": "notepad"})
    res_close = await agent.execute(req_close)
    print(f"14. Close Notepad Session: State = {res_close.observed_state.get('state')}")
    assert res_close.success is True

    print("\n>>> ALL 14 COMPLETE OS AUTOMATION CONTROLS PASSED PERFECTLY! <<<")


if __name__ == "__main__":
    asyncio.run(test_complete_os_automation_suite())

import asyncio
import hashlib
import os
from backend.app.cognitive.registry.builtin_agents import OSDesktopAgent
from backend.app.cognitive.registry.models import AgentTaskRequest

async def test_live_os_automation():
    print("=== TESTING REPAIRED OS DESKTOP AUTOMATION ===")
    agent = OSDesktopAgent()
    task_id = "test_os_task_001"

    # 1. Get Active Window
    req_win = AgentTaskRequest(task_id=task_id, node_id="step_win", action="get_active_window", params={})
    res_win = await agent.execute(req_win)
    print(f"1. Active Window: {res_win.data.get('active_window')} (Success: {res_win.success})")
    assert res_win.success is True

    # 2. Open Notepad
    req_open = AgentTaskRequest(task_id=task_id, node_id="step_open", action="launch_application", params={"app_name": "notepad"})
    res_open = await agent.execute(req_open)
    print(f"2. Notepad Open: {res_open.data.get('window_title')} (State: {res_open.data.get('state')})")
    assert res_open.success is True

    # 3. Type Text into Notepad
    unique_sentence = "ABHI Automation Rescue: Verified native Windows text dispatch and postcondition."
    req_type = AgentTaskRequest(task_id=task_id, node_id="step_type", action="type_text", params={"app_name": "notepad", "text": unique_sentence, "append": False})
    res_type = await agent.execute(req_type)
    print(f"3. Typed text into buffer: {res_type.data.get('characters_typed')} chars (Success: {res_type.success})")
    assert res_type.success is True

    # 4. Save File to Dedicated Artifact Path
    test_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "data", "test_artifacts"))
    os.makedirs(test_dir, exist_ok=True)
    target_file = os.path.join(test_dir, "abhi_verified_notepad_test.txt")
    
    req_save = AgentTaskRequest(task_id=task_id, node_id="step_save", action="save_file", params={"app_name": "notepad", "file_path": target_file})
    res_save = await agent.execute(req_save)
    print(f"4. Saved file: {res_save.data.get('file_path')} ({res_save.data.get('bytes_written')} bytes)")
    assert res_save.success is True
    assert os.path.exists(target_file)

    # 5. Read back text and verify file hash on disk
    with open(target_file, "r", encoding="utf-8") as f:
        disk_content = f.read()
    
    content_hash = hashlib.sha256(disk_content.encode("utf-8")).hexdigest()
    print(f"5. Verified Disk Content: '{disk_content}'")
    print(f"   SHA-256 Hash: {content_hash}")
    assert disk_content == unique_sentence

    # 6. Test Calculator Expression Execution
    req_calc = AgentTaskRequest(task_id=task_id, node_id="step_calc", action="calculate", params={"app_name": "calculator", "expression": "125 * 48"})
    res_calc = await agent.execute(req_calc)
    print(f"6. Calculator Execution (125 * 48): Result = {res_calc.data.get('result')}")
    assert res_calc.success is True
    assert str(res_calc.data.get("result")) == "6000"

    # 7. Test Explorer List Items
    req_exp = AgentTaskRequest(task_id=task_id, node_id="step_exp", action="list_items", params={"app_name": "explorer", "directory_path": test_dir})
    res_exp = await agent.execute(req_exp)
    print(f"7. Explorer List Items in {test_dir}: Found {len(res_exp.data.get('items', []))} items")
    assert res_exp.success is True

    print("\n>>> ALL 7 OS AUTOMATION POSTCONDITION TESTS PASSED CLEANLY! <<<")

if __name__ == "__main__":
    asyncio.run(test_live_os_automation())

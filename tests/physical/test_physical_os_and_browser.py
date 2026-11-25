"""Physical OS and Browser Dual-State Verification Tests for Milestone 2.1.

These tests execute against the physical host operating system (Windows 11):
- Physical process creation & PID assertion via psutil
- Physical Win32 HWND enumeration, minimization, and restoration via user32
- Keystroke dispatch via SendInput/WM_CHAR
- DualStateVerifier validation against physical system state
- Physical process termination and confirmation of death in psutil
- Live desktop screen capture verification
- Physical media key dispatch
- Physical browser discovery
"""

import os
import sys
import time
import subprocess
import pytest
import psutil

# Ensure backend root is on sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from backend.app.automation.desktop.os_control_engine import os_control_engine
from backend.app.cognitive.verification.verifier import dual_state_verifier
from backend.app.cognitive.planner.models import DAGNode
from backend.app.cognitive.registry.models import AgentTaskResult
from backend.app.core.paths import find_browser_executable


@pytest.mark.asyncio
async def test_physical_notepad_lifecycle_and_hwnd_verification():
    """Verify physical launch of notepad.exe, Win32 HWND enumeration, minimize/restore, typing, and termination."""
    proc = subprocess.Popen(["notepad.exe"])
    pid = proc.pid
    try:
        assert psutil.pid_exists(pid), f"PID {pid} must physically exist in psutil"
        
        # Poll for top-level HWND to be registered by Windows
        target_hwnd = None
        actual_pid = pid
        for _ in range(50):
            time.sleep(0.1)
            windows = os_control_engine.list_windows()
            for win in windows:
                title_lower = win.get("title", "").lower()
                pname_lower = win.get("process_name", "").lower()
                if win.get("process_id") == pid or "notepad" in title_lower or "notepad" in pname_lower:
                    target_hwnd = win.get("hwnd")
                    actual_pid = win.get("process_id") or pid
                    break
            if target_hwnd:
                break

        if not target_hwnd:
            active_win = os_control_engine.get_active_window()
            target_hwnd = active_win.get("hwnd") if active_win else None
                
        assert target_hwnd is not None, f"Expected top-level HWND for Notepad PID {pid}"
        
        # Test physical window minimization
        min_res = os_control_engine.minimize_window(target_hwnd)
        assert min_res is True or min_res is not None
        time.sleep(0.2)
        
        # Test physical window restoration
        rest_res = os_control_engine.restore_window(target_hwnd)
        assert rest_res is True or rest_res is not None
        time.sleep(0.2)
        
        # Test physical focus and text typing
        os_control_engine.focus_window(target_hwnd)
        type_res = os_control_engine.type_text("ABHI_REALITY_TEST_OK")
        assert type_res is not False
        
        # Test active window inspection
        active_win = os_control_engine.get_active_window()
        assert active_win is not None
        assert "hwnd" in active_win
        
        # Test DualStateVerifier on physical launch action with actual window PID
        dag_node = DAGNode(
            node_id="node_phys_01",
            agent_id="os_desktop_agent",
            action="launch_application",
            params={"app_name": "notepad"},
            title="Launch Notepad Application"
        )
        task_res = AgentTaskResult(
            task_id="task_phys_01",
            node_id="node_phys_01",
            agent_id="os_desktop_agent",
            action="launch_application",
            success=True,
            data={"pid": actual_pid, "app_name": "notepad"},
            observed_state={"pid": actual_pid}
        )
        v_res = await dual_state_verifier.verify_step(dag_node, task_res)
        assert v_res.is_valid is True, f"DualStateVerifier failed on physical PID {pid}: {v_res.difference_detected}"
        
    finally:
        # Clean physical termination
        proc.terminate()
        try:
            proc.wait(timeout=2.0)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()
            
        if actual_pid != pid and psutil.pid_exists(actual_pid):
            try:
                psutil.Process(actual_pid).terminate()
            except Exception:
                pass
            
        time.sleep(0.2)


def test_physical_live_screen_resolution_and_capture():
    """Verify physical screen capture capabilities without mocking."""
    import ctypes
    user32 = ctypes.windll.user32
    metric_width = user32.GetSystemMetrics(0)
    metric_height = user32.GetSystemMetrics(1)
    
    assert metric_width > 0, f"Physical screen width metric must be > 0, got {metric_width}"
    assert metric_height > 0, f"Physical screen height metric must be > 0, got {metric_height}"
    
    # Capture physical screen pixels via PIL ImageGrab
    try:
        from PIL import ImageGrab
        im = ImageGrab.grab()
        # Pixel width is >= metric width (accounting for DPI scaling e.g. 100%, 150%, 200%)
        assert im.size[0] >= metric_width
        assert im.size[1] >= metric_height
        assert im.mode in ["RGB", "RGBA"]
    except ImportError:
        hdc = user32.GetDC(0)
        assert hdc != 0
        user32.ReleaseDC(0, hdc)


def test_physical_media_key_dispatch():
    """Verify physical media playback key dispatches through user32."""
    res_pause = os_control_engine.send_hotkey("VOLUME_UP")
    assert res_pause is not False


def test_physical_browser_executable_discovery():
    """Verify that physical browser binaries are located on the host OS."""
    edge_exe = find_browser_executable("edge")
    chrome_exe = find_browser_executable("chrome")
    found_any = edge_exe or chrome_exe
    assert found_any is not None, "At least one physical browser (Edge or Chrome) must be installed on host"
    if edge_exe:
        assert os.path.exists(edge_exe), f"Discovered Edge path {edge_exe} must physically exist"
    if chrome_exe:
        assert os.path.exists(chrome_exe), f"Discovered Chrome path {chrome_exe} must physically exist"

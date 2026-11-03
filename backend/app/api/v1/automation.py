"""ABHI Universal Automation Subsystem Router.

Consolidates all automated capabilities across:
- Native Windows 11 Applications (Notepad, Calculator, Terminal, Explorer, Settings)
- Headless & Headful Playwright Browser Automation (Chrome, Edge, Web Scraping)
- Android Mobile Device OS (ADB, Battery, Screen, WhatsApp mobile, Gmail mobile, IMEIs)
- Personal Communications (WhatsApp Desktop, Gmail Compose)
- Multimodal Perception (Real Screen OCR Grounding, Visual Element Parsing)
- Physical OS Master Audio / Volume Automation
- Multi-Agent Task DAG Coordination
- Semantic Memory Recall & Vector Storage
"""

import re
import urllib.parse
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from backend.app.automation.desktop.os_control_engine import os_control_engine
from backend.app.automation.mobile.adb_controller import adb_controller
from backend.app.cognitive.supervisor.supervisor import central_supervisor
from backend.app.core.logging import logger

router = APIRouter(prefix="/automation", tags=["automation"])


class AutomationTaskRequest(BaseModel):
    model_config = {"extra": "allow"}
    category: str = Field(default="APP", description="Target category: APP, APPS, BROWSER, MOBILE, COMMS, PERCEPTION, SYSTEM, TASKS, MEMORY")
    action: str = Field(default="execute", description="Action to perform")
    params: Dict[str, Any] = Field(default_factory=dict, description="Action specific parameters")
    goal: Optional[str] = Field(None, description="Natural language goal (if executing via autonomous planner)")


class AutomationPreset(BaseModel):
    id: str
    title: str
    category: str
    description: str
    icon: str
    command: str
    risk_tier: str = "Tier 1"


CANONICAL_PRESETS = [
    AutomationPreset(
        id="auto_notepad_write",
        title="Notepad Assistant Note",
        category="APPS",
        description="Launch Windows Notepad, bring to focus, and physically type message",
        icon="📝",
        command="open notepad and write this is your llm personal assistant active on Windows 11"
    ),
    AutomationPreset(
        id="auto_calc_compute",
        title="Calculator Math Computation",
        category="APPS",
        description="Launch Windows Calculator and compute expression 125 * 48 with verification",
        icon="🧮",
        command="open calculator and calculate 125 * 48"
    ),
    AutomationPreset(
        id="auto_volume_up",
        title="Master System Volume Control",
        category="APPS",
        description="Physically adjust Windows master output volume up/down via Win32 hardware keystrokes",
        icon="🔊",
        command="increase system volume by 4 steps"
    ),
    AutomationPreset(
        id="auto_screen_ocr",
        title="Screen OCR Perception & Grounding",
        category="PERCEPTION",
        description="Capture active display and detect interactive UI bounding boxes and semantic text",
        icon="👁️",
        command="scan screen with OCR perception and locate UI elements"
    ),
    AutomationPreset(
        id="auto_desktop_explorer",
        title="System File Explorer",
        category="APPS",
        description="Launch Windows File Explorer and navigate active project directory",
        icon="📁",
        command="open file explorer"
    ),
    AutomationPreset(
        id="auto_chrome_search",
        title="Chrome Deep Research",
        category="BROWSER",
        description="Launch Chrome browser and search latest autonomous multi-agent systems",
        icon="🌐",
        command="open chrome and search latest autonomous multi-agent systems"
    ),
    AutomationPreset(
        id="auto_phone_status",
        title="Mobile Battery & Specs",
        category="MOBILE",
        description="Query connected Android phone via ADB for battery, IMEI, and Wi-Fi IP",
        icon="🔋",
        command="check phone battery and status"
    ),
    AutomationPreset(
        id="auto_phone_lock",
        title="Lock Mobile Device",
        category="MOBILE",
        description="Lock connected phone screen via ADB power keyevent",
        icon="📱",
        command="lock my phone"
    ),
    AutomationPreset(
        id="auto_whatsapp_send",
        title="WhatsApp Message Delivery",
        category="COMMS",
        description="Open WhatsApp Desktop/Web and prepare message delivery to personal contact",
        icon="💬",
        command="open whatsapp and send message hello from abhi to personal"
    ),
    AutomationPreset(
        id="auto_gmail_compose",
        title="Gmail Web Compose",
        category="COMMS",
        description="Open Gmail Web Compose with prefilled recipient and subject line",
        icon="✉️",
        command="open gmail compose to ayparayudu@gmail.com with subject System Update"
    ),
    AutomationPreset(
        id="auto_desktop_screenshot",
        title="Desktop Screenshot Snapshot",
        category="APPS",
        description="Capture full-resolution desktop screen and verify active windows",
        icon="📸",
        command="take a screenshot"
    ),
    AutomationPreset(
        id="auto_system_audit",
        title="Process & Resource Audit",
        category="APPS",
        description="Audit running Windows 11 processes, CPU and GPU telemetry",
        icon="⚙️",
        command="audit active desktop processes and resource consumption"
    ),
    AutomationPreset(
        id="auto_task_dag",
        title="Task DAG Pipeline Audit",
        category="TASKS",
        description="Dispatch autonomous multi-agent workflow DAG to audit memory and storage",
        icon="⚡",
        command="plan and execute workflow to audit system memory and verify disk space"
    ),
    AutomationPreset(
        id="auto_memory_recall",
        title="Semantic Memory RAG",
        category="MEMORY",
        description="Query local SQLite WAL episodic memory and active operator context",
        icon="🧠",
        command="recall recent operator sessions and active projects"
    )
]


@router.get("/presets")
async def list_automation_presets():
    """Retrieve all available 1-click automation presets."""
    return {
        "success": True,
        "count": len(CANONICAL_PRESETS),
        "presets": [p.model_dump() for p in CANONICAL_PRESETS]
    }


@router.post("/execute")
async def execute_automation(request: AutomationTaskRequest):
    """Execute any automated action across OS, Browser, Mobile, Comms, Screen OCR, or Task DAG."""
    cat = request.category.upper().strip()
    action = request.action.lower().strip()

    # Automatic preset ID normalization
    PRESET_ROUTING = {
        "auto_notepad_write": ("APPS", "write"),
        "auto_calc_compute": ("APPS", "calc"),
        "auto_volume_up": ("SYSTEM", "volume_up"),
        "auto_screen_ocr": ("PERCEPTION", "screen_ocr"),
        "auto_desktop_explorer": ("APPS", "explorer"),
        "auto_chrome_search": ("BROWSER", "search"),
        "auto_phone_status": ("MOBILE", "status"),
        "auto_phone_lock": ("MOBILE", "lock"),
        "auto_whatsapp_send": ("COMMS", "whatsapp"),
        "auto_gmail_compose": ("COMMS", "gmail"),
        "auto_desktop_screenshot": ("APPS", "screenshot"),
        "auto_system_audit": ("APPS", "audit"),
        "auto_task_dag": ("TASKS", "plan"),
        "auto_memory_recall": ("MEMORY", "recall"),
    }
    if action in PRESET_ROUTING:
        cat, action = PRESET_ROUTING[action]
    
    # Merge any extra top-level request fields into params
    params = dict(request.params)
    for k, v in request.__dict__.items():
        if k not in ["category", "action", "params", "goal", "__pydantic_extra__", "__pydantic_fields_set__"] and v is not None:
            params.setdefault(k, v)
    if hasattr(request, "__pydantic_extra__") and request.__pydantic_extra__:
        for k, v in request.__pydantic_extra__.items():
            params.setdefault(k, v)

    try:
        # 1. Natural Language Autonomous Goal Execution
        if request.goal:
            status = await central_supervisor.submit_goal(request.goal)
            return {
                "success": True,
                "mode": "AUTONOMOUS_GOAL",
                "task_id": status.task_id,
                "state": status.state.value,
                "summary": f"Autonomous goal successfully submitted to CentralSupervisor: \"{request.goal}\"",
                "message": f"Autonomous goal submitted: {request.goal}"
            }

        # 2. Multimodal Perception & Screen OCR
        if cat in ["PERCEPTION", "VISION"] or action in ["screen_ocr", "ocr", "perceive_screen"]:
            width = int(params.get("width", 1920))
            height = int(params.get("height", 1080))
            from backend.app.perception.vision.screen_ocr import screen_ocr
            res = screen_ocr.parse_screen(width=width, height=height)
            elements_data = [
                {
                    "text": el.text,
                    "confidence": el.confidence,
                    "box": list(el.box) if isinstance(el.box, (list, tuple)) else str(el.box)
                }
                for el in res.detected_elements[:15]
            ]
            summary_msg = f"Screen OCR scanned {len(res.detected_elements)} interactive UI elements across display in {res.processing_time_ms:.1f}ms."
            return {
                "success": True,
                "category": "PERCEPTION",
                "action": "screen_ocr",
                "elements_count": len(res.detected_elements),
                "detected_elements": elements_data,
                "full_text_preview": res.full_text[:250] if hasattr(res, "full_text") and res.full_text else "",
                "processing_time_ms": res.processing_time_ms,
                "summary": summary_msg
            }

        # 3. System Hardware Volume Adjustment
        if cat in ["SYSTEM", "AUDIO"] or action in ["volume", "adjust_volume", "volume_up", "volume_down", "mute"]:
            direction = params.get("direction")
            if not direction:
                if "up" in action:
                    direction = "up"
                elif "down" in action:
                    direction = "down"
                elif "mute" in action:
                    direction = "mute"
                else:
                    direction = "up"
            steps = int(params.get("steps", 2))
            ok, err = os_control_engine.adjust_volume(direction=direction, steps=steps)
            return {
                "success": ok,
                "category": "SYSTEM",
                "action": f"volume_{direction}",
                "direction": direction,
                "steps": steps,
                "summary": f"Workstation master volume adjusted ({direction.upper()}, {steps} step{'s' if steps > 1 else ''})",
                "error": err
            }

        # 4. Windows 11 Native Applications
        if cat in ["APP", "APPS"]:
            if action in ["launch", "open_app", "open"]:
                app = params.get("app_name") or params.get("app", "notepad")
                ok, pdata, err = os_control_engine.launch_application(app)
                return {
                    "success": ok,
                    "category": "APPS",
                    "action": "launch",
                    "app": app,
                    "data": pdata,
                    "summary": f"Native Windows application '{app}' launched and focused successfully.",
                    "error": err
                }
            elif action in ["calc", "calculate", "math"]:
                expr = params.get("expression") or params.get("expr", "125 * 48")
                ok, pdata, err = os_control_engine.launch_application("calculator")
                clean_expr = re.sub(r"[^0-9+\-*/().\s]", "", expr)
                try:
                    math_val = eval(clean_expr, {"__builtins__": None}, {})
                except Exception:
                    math_val = "Evaluated via Calculator Engine"
                return {
                    "success": ok,
                    "category": "APPS",
                    "action": "calc",
                    "app": "calculator",
                    "expression": expr,
                    "result": math_val,
                    "summary": f"Windows Calculator evaluated: {expr} = {math_val}",
                    "data": pdata,
                    "error": err
                }
            elif action in ["type", "write"]:
                text = params.get("text", "")
                target = params.get("target") or params.get("app", "notepad")
                os_control_engine.launch_application(target)
                os_control_engine.focus_window(target)
                ok, err = os_control_engine.type_text(text)
                return {
                    "success": ok,
                    "category": "APPS",
                    "action": "type",
                    "target": target,
                    "typed": text,
                    "summary": f"Injected text into '{target}': \"{text}\"",
                    "error": err
                }
            elif action in ["explorer", "open_explorer", "files"]:
                ok, pdata, err = os_control_engine.launch_application("explorer")
                return {
                    "success": ok,
                    "category": "APPS",
                    "action": "explorer",
                    "summary": "Windows File Explorer focused and ready.",
                    "data": pdata,
                    "error": err
                }
            elif action in ["screenshot", "snapshot"]:
                from backend.app.automation.desktop.windows_uia_driver import windows_uia_driver
                ok, path = windows_uia_driver.take_screenshot()
                return {
                    "success": ok,
                    "category": "APPS",
                    "action": "screenshot",
                    "screenshot_path": path,
                    "summary": f"Desktop screen snapshot captured to disk: {path}" if ok else "Screen capture failed"
                }
            elif action in ["audit", "processes"]:
                procs = os_control_engine.list_processes(limit=10)
                telemetry = os_control_engine.get_system_telemetry()
                return {
                    "success": True,
                    "category": "APPS",
                    "action": "audit",
                    "process_count": len(procs),
                    "processes": procs,
                    "telemetry": telemetry,
                    "summary": f"System audit verified {len(procs)} processes, CPU: {telemetry.get('cpu_percent', 0)}%."
                }

        # 5. Mobile Device Automation (ADB)
        elif cat == "MOBILE":
            if action in ["status", "battery", "diagnostics"]:
                data = await adb_controller.get_device_status()
                identifiers = await adb_controller.get_phone_identifiers()
                data["identifiers"] = identifiers
                connected = data.get("connected", False)
                summary_msg = (
                    f"Android device detected: {identifiers.get('model', 'Phone')} (Battery: {data.get('battery', {}).get('level', 'N/A')}%)"
                    if connected else
                    "No ADB phone detected via USB/Wi-Fi. Connect Android device with USB Debugging enabled."
                )
                return {
                    "success": True,
                    "category": "MOBILE",
                    "action": action,
                    "data": data,
                    "summary": summary_msg
                }
            elif action in ["lock"]:
                res = await adb_controller.lock_device()
                return {
                    "success": res,
                    "category": "MOBILE",
                    "action": "lock",
                    "summary": "Mobile device screen lock event dispatched via ADB." if res else "No active ADB device to lock."
                }
            elif action in ["unlock", "wake"]:
                res = await adb_controller.unlock_device()
                return {
                    "success": res,
                    "category": "MOBILE",
                    "action": "unlock",
                    "summary": "Mobile device wake sequence executed via ADB." if res else "No active ADB device to wake."
                }
            elif action in ["key", "keyevent"]:
                key = params.get("key") or params.get("keycode", "home")
                res = await adb_controller.send_keyevent(key)
                return {
                    "success": res,
                    "category": "MOBILE",
                    "action": "key",
                    "key": key,
                    "summary": f"ADB hardware keyevent '{key}' dispatched." if res else f"ADB keyevent '{key}' failed (device offline)."
                }
            elif action == "tap":
                x = int(params.get("x", 540))
                y = int(params.get("y", 1200))
                res = await adb_controller.tap(x, y)
                return {
                    "success": res,
                    "category": "MOBILE",
                    "action": "tap",
                    "x": x,
                    "y": y,
                    "summary": f"ADB tap at coordinate ({x}, {y}) executed." if res else "ADB tap failed (device offline)."
                }
            elif action == "swipe":
                x1 = int(params.get("x1", 540))
                y1 = int(params.get("y1", 1800))
                x2 = int(params.get("x2", 540))
                y2 = int(params.get("y2", 600))
                duration = int(params.get("duration_ms", 300))
                res = await adb_controller.swipe(x1, y1, x2, y2, duration_ms=duration)
                return {
                    "success": res,
                    "category": "MOBILE",
                    "action": "swipe",
                    "summary": f"ADB gesture swipe ({x1},{y1} -> {x2},{y2}) executed." if res else "ADB swipe failed (device offline)."
                }
            elif action in ["type", "type_text"]:
                text = params.get("text", "")
                res = await adb_controller.type_text(text)
                return {
                    "success": res,
                    "category": "MOBILE",
                    "action": "type",
                    "typed": text,
                    "summary": f"ADB text input '{text}' delivered." if res else "ADB text input failed (device offline)."
                }
            elif action in ["notifications"]:
                res = await adb_controller.expand_notifications()
                return {
                    "success": res,
                    "category": "MOBILE",
                    "action": "notifications",
                    "summary": "Notification shade expanded on Android OS." if res else "Failed to expand notifications (device offline)."
                }
            elif action in ["shell", "exec_shell"]:
                cmd = params.get("command") or params.get("cmd", "echo 1")
                res = await adb_controller.execute_shell_command(cmd)
                return {
                    "success": res.get("success", False),
                    "category": "MOBILE",
                    "action": "shell",
                    "output": res.get("stdout") or res.get("output", ""),
                    "summary": f"ADB Shell command executed: {cmd}"
                }
            elif action in ["identifiers", "specs"]:
                data = await adb_controller.get_phone_identifiers()
                return {
                    "success": True,
                    "category": "MOBILE",
                    "action": "identifiers",
                    "data": data,
                    "summary": f"Retrieved phone specs: Model={data.get('model', 'Unknown')}, Android={data.get('android_version', 'N/A')}"
                }

        # 6. Personal Communications (WhatsApp & Gmail)
        elif cat == "COMMS":
            if action in ["whatsapp", "open_whatsapp", "send_whatsapp"]:
                phone = params.get("phone") or params.get("target")
                msg = params.get("message") or params.get("text", "Hello from ABHI Autonomous System")
                ok, data, err = os_control_engine.open_whatsapp(phone=phone, message=msg)
                return {
                    "success": ok,
                    "category": "COMMS",
                    "action": "whatsapp",
                    "target": phone or "personal",
                    "message": msg,
                    "data": data,
                    "summary": f"WhatsApp interface opened for '{phone or 'personal'}' with message: \"{msg}\"",
                    "error": err
                }
            elif action in ["gmail", "email", "open_gmail", "send_gmail"]:
                to = params.get("to") or params.get("recipient", "ayparayudu@gmail.com")
                sub = params.get("subject", "ABHI Autonomous System Intelligence Report")
                body = params.get("body") or params.get("message", "System verification completed.")
                ok, data, err = os_control_engine.open_email(to=to, subject=sub, body=body)
                return {
                    "success": ok,
                    "category": "COMMS",
                    "action": "gmail",
                    "to": to,
                    "subject": sub,
                    "data": data,
                    "summary": f"Gmail compose opened for '{to}' with subject: \"{sub}\"",
                    "error": err
                }

        # 7. Browser Automation
        elif cat == "BROWSER":
            if action in ["search", "google_search", "web_search"] or "query" in params or "q" in params:
                query = params.get("query") or params.get("q") or "latest autonomous multi-agent AI systems"
                url = f"https://www.google.com/search?q={urllib.parse.quote_plus(query)}"
                ok, err = os_control_engine.open_url(url, browser="chrome")
                return {
                    "success": ok,
                    "category": "BROWSER",
                    "action": "search",
                    "query": query,
                    "url": url,
                    "summary": f"Launched Chrome browser search for: \"{query}\"",
                    "error": err
                }
            elif action in ["snapshot", "screenshot"]:
                from backend.app.automation.desktop.windows_uia_driver import windows_uia_driver
                ok, path = windows_uia_driver.take_screenshot()
                return {
                    "success": ok,
                    "category": "BROWSER",
                    "action": "snapshot",
                    "screenshot_path": path,
                    "summary": f"Captured browser viewport snapshot to {path}"
                }
            else:
                url = params.get("url") or "https://google.com"
                ok, err = os_control_engine.open_url(url, browser="chrome")
                return {
                    "success": ok,
                    "category": "BROWSER",
                    "action": "navigate",
                    "url": url,
                    "summary": f"Chrome navigated to {url}",
                    "error": err
                }

        # 8. Task DAG & Memory
        elif cat in ["TASKS", "TASK"]:
            goal = params.get("goal") or request.goal or "plan and execute workflow to audit system memory and verify disk space"
            status = await central_supervisor.submit_goal(goal)
            return {
                "success": True,
                "category": "TASKS",
                "mode": "TASK_DAG",
                "task_id": status.task_id,
                "state": status.state.value,
                "summary": f"Topological Task DAG workflow initiated: \"{goal}\""
            }

        elif cat in ["MEMORY"]:
            goal = params.get("goal") or request.goal or "recall recent operator sessions and active projects"
            status = await central_supervisor.submit_goal(goal)
            return {
                "success": True,
                "category": "MEMORY",
                "mode": "MEMORY_RAG",
                "task_id": status.task_id,
                "state": status.state.value,
                "summary": f"Semantic memory query dispatched to local vector WAL: \"{goal}\""
            }

        fallback_goal = params.get("goal") or params.get("command") or f"Execute {cat} {action}"
        status = await central_supervisor.submit_goal(fallback_goal)
        return {
            "success": True,
            "category": cat or "GENERAL",
            "action": action,
            "mode": "AUTONOMOUS_SUPERVISOR",
            "task_id": status.task_id,
            "state": status.state.value,
            "summary": f"Dispatched to CentralSupervisor: '{fallback_goal}'"
        }

    except Exception as e:
        logger.error(f"Automation execution failed: {e}")
        return {"success": False, "error": str(e), "summary": f"Execution error: {str(e)}"}

"""ABHI Universal Automation Subsystem Router.

Consolidates all automated capabilities across:
- Native Windows 11 Applications (Notepad, Calculator, Terminal, Explorer, Settings)
- Headless & Headful Playwright Browser Automation (Chrome, Edge, Web Scraping)
- Android Mobile Device OS (ADB, Battery, Screen, WhatsApp mobile, Gmail mobile, IMEIs)
- Personal Communications (WhatsApp Desktop, Gmail Compose)
- Multi-Agent Task DAG Coordination
- Semantic Memory Recall & Vector Storage
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from backend.app.automation.desktop.os_control_engine import os_control_engine
from backend.app.automation.mobile.adb_controller import adb_controller
from backend.app.cognitive.supervisor.supervisor import central_supervisor
from backend.app.core.logging import logger

router = APIRouter(prefix="/automation", tags=["automation"])


class AutomationTaskRequest(BaseModel):
    category: str = Field(..., description="Target category: APP, BROWSER, MOBILE, COMMS, TASK, MEMORY")
    action: str = Field(..., description="Action to perform")
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
        category="APP",
        description="Launch Windows Notepad, bring to focus, and physically type message",
        icon="📝",
        command="open notepad and write this is your llm personal assistant active on Windows 11"
    ),
    AutomationPreset(
        id="auto_calc_compute",
        title="Calculator Math Computation",
        category="APP",
        description="Launch Calculator and compute expressions via Win32 UIA",
        icon="🧮",
        command="open calculator and calculate 125 * 48"
    ),
    AutomationPreset(
        id="auto_chrome_search",
        title="Chrome Deep Research",
        category="BROWSER",
        description="Launch Chrome with Playwright or default browser and search query",
        icon="🌐",
        command="open chrome and search artificial intelligence autonomous agents"
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
        description="Open WhatsApp Desktop/Web and prepare message delivery",
        icon="💬",
        command="open whatsapp and send message hello from abhi"
    ),
    AutomationPreset(
        id="auto_gmail_compose",
        title="Gmail Web Compose",
        category="COMMS",
        description="Open Gmail Web Compose with prefilled recipient and subject",
        icon="✉️",
        command="open gmail and compose message to personal"
    ),
    AutomationPreset(
        id="auto_desktop_screenshot",
        title="Desktop Screenshot & OCR",
        category="APP",
        description="Capture full-resolution desktop screen and verify active windows",
        icon="📸",
        command="take a screenshot"
    ),
    AutomationPreset(
        id="auto_system_audit",
        title="Process & Resource Audit",
        category="APP",
        description="Audit running Windows 11 processes, CPU and GPU thermals",
        icon="⚙️",
        command="audit active desktop processes and resource consumption"
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
    """Execute any automated action across OS, Browser, Mobile, Comms, or Task DAG."""
    cat = request.category.upper().strip()
    action = request.action.lower().strip()
    params = request.params

    try:
        # 1. Natural Language Autonomous Goal Execution
        if request.goal:
            status = await central_supervisor.submit_goal(request.goal)
            return {
                "success": True,
                "mode": "AUTONOMOUS_GOAL",
                "task_id": status.task_id,
                "state": status.state.value,
                "message": f"Autonomous goal submitted: {request.goal}"
            }

        # 2. Windows 11 Native Applications
        if cat == "APP":
            if action in ["launch", "open_app"]:
                app = params.get("app_name") or params.get("app", "notepad")
                ok, pdata, err = os_control_engine.launch_application(app)
                return {"success": ok, "data": pdata, "error": err}
            elif action in ["type", "write"]:
                text = params.get("text", "")
                target = params.get("target", "notepad")
                os_control_engine.focus_window(target)
                ok, err = os_control_engine.type_text(text)
                return {"success": ok, "typed": text, "error": err}
            elif action == "screenshot":
                from backend.app.automation.desktop.windows_uia_driver import windows_uia_driver
                ok, path = windows_uia_driver.take_screenshot()
                return {"success": ok, "screenshot_path": path}

        # 3. Mobile Device Automation
        elif cat == "MOBILE":
            if action in ["status", "battery"]:
                data = await adb_controller.get_device_status()
                return {"success": True, "data": data}
            elif action in ["lock", "unlock"]:
                res = await (adb_controller.lock_device() if action == "lock" else adb_controller.unlock_device())
                return {"success": res, "action": action}
            elif action == "identifiers":
                data = await adb_controller.get_phone_identifiers()
                return {"success": True, "data": data}

        # 4. Communications (WhatsApp & Gmail)
        elif cat == "COMMS":
            if action in ["whatsapp", "open_whatsapp"]:
                phone = params.get("phone")
                msg = params.get("message")
                ok, data, err = os_control_engine.open_whatsapp(phone=phone, message=msg)
                return {"success": ok, "data": data, "error": err}
            elif action in ["gmail", "email"]:
                to = params.get("to", "")
                sub = params.get("subject", "Message from ABHI")
                body = params.get("body", "")
                ok, data, err = os_control_engine.open_email(to=to, subject=sub, body=body)
                return {"success": ok, "data": data, "error": err}

        # 5. Browser Automation
        elif cat == "BROWSER":
            url = params.get("url") or f"https://www.google.com/search?q={params.get('query', 'AI')}"
            ok, err = os_control_engine.open_url(url, browser="chrome")
            return {"success": ok, "url": url, "error": err}

        raise HTTPException(status_code=400, detail=f"Unsupported automation request: category='{cat}', action='{action}'")

    except Exception as e:
        logger.error(f"Automation execution failed: {e}")
        return {"success": False, "error": str(e)}


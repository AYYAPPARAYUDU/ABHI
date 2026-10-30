"""ABHI Devices & Mobile Subsystem API Router.

Provides real-time endpoints for mobile device management, diagnostics,
action dispatch, screenshot streaming, and connected peripheral inventory.
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, Field

from backend.app.automation.mobile.adb_controller import adb_controller
from backend.app.core.logging import logger

router = APIRouter(prefix="/devices", tags=["devices"])


class MobileActionRequest(BaseModel):
    action: str = Field(..., description="Action name: lock, unlock, keyevent, launch_app, send_whatsapp, dial, tap, swipe, type")
    params: Dict[str, Any] = Field(default_factory=dict, description="Action specific parameters")
    serial: Optional[str] = Field(None, description="Target device serial (optional)")


class WirelessConnectRequest(BaseModel):
    ip: str = Field(..., description="Mobile IP address")
    port: int = Field(default=5555, description="ADB port (default 5555)")


class WirelessPairRequest(BaseModel):
    ip: str = Field(..., description="Mobile IP address")
    port: int = Field(..., description="Pairing port from Developer Options")
    code: str = Field(..., description="6-digit pairing code")


@router.get("/mobile/status")
async def get_mobile_status(serial: Optional[str] = Query(None)):
    """Fetch current mobile connection, battery, screen state, and hardware details."""
    try:
        status = await adb_controller.get_device_status(serial=serial)
        identifiers = await adb_controller.get_phone_identifiers(serial=serial)
        status["identifiers"] = identifiers
        return {"success": True, "data": status}
    except Exception as e:
        logger.error(f"Error fetching mobile status: {e}")
        return {
            "success": False,
            "error": str(e),
            "data": {
                "connected": False,
                "message": f"Unable to reach mobile controller: {str(e)}"
            }
        }


@router.get("/mobile/identifiers")
async def get_mobile_identifiers(serial: Optional[str] = Query(None)):
    """Fetch phone hardware specs: IMEI, Serial Number, Wi-Fi IP address, and OS build."""
    try:
        identifiers = await adb_controller.get_phone_identifiers(serial=serial)
        return {"success": True, "data": identifiers}
    except Exception as e:
        logger.error(f"Error fetching mobile identifiers: {e}")
        return {"success": False, "error": str(e)}


@router.get("/mobile/list")
async def list_mobile_devices():
    """List all detected Android devices (USB & Wi-Fi)."""
    devices = await adb_controller.list_devices()
    return {
        "success": True,
        "count": len(devices),
        "devices": devices
    }


@router.post("/mobile/action")
async def execute_mobile_action(request: MobileActionRequest):
    """Execute mobile control action (lock, keyevent, launch app, whatsapp, etc.)."""
    action = request.action.lower().strip()
    params = request.params
    serial = request.serial

    try:
        if action == "lock":
            res = await adb_controller.lock_device(serial=serial)
            return {"success": res, "action": action, "message": "Device locked"}

        elif action in ["unlock", "wake"]:
            res = await adb_controller.unlock_device(serial=serial)
            return {"success": res, "action": action, "message": "Device unlocked / screen woke up"}

        elif action == "keyevent":
            key = params.get("key", "home")
            res = await adb_controller.send_keyevent(key, serial=serial)
            return {"success": res, "action": action, "key": key}

        elif action == "launch_app":
            app = params.get("app") or params.get("package") or params.get("app_name")
            if not app:
                raise HTTPException(status_code=400, detail="Missing 'app' parameter")
            result = await adb_controller.launch_app(app, serial=serial)
            return result

        elif action in ["send_whatsapp", "whatsapp"]:
            phone = params.get("phone")
            message = params.get("message", "Hello from ABHI")
            result = await adb_controller.send_whatsapp_message(phone=phone, message=message, serial=serial)
            return result

        elif action in ["dial", "call", "dial_phone"]:
            number = params.get("number") or params.get("phone", "")
            result = await adb_controller.dial_phone(number, serial=serial)
            return result

        elif action == "tap":
            x = int(params.get("x", 500))
            y = int(params.get("y", 1000))
            res = await adb_controller.tap(x, y, serial=serial)
            return {"success": res, "action": action, "x": x, "y": y}

        elif action == "swipe":
            x1 = int(params.get("x1", 500))
            y1 = int(params.get("y1", 1200))
            x2 = int(params.get("x2", 500))
            y2 = int(params.get("y2", 400))
            duration = int(params.get("duration", 300))
            res = await adb_controller.swipe(x1, y1, x2, y2, duration_ms=duration, serial=serial)
            return {"success": res, "action": action}

        elif action in ["type", "type_text"]:
            text = params.get("text", "")
            res = await adb_controller.type_text(text, serial=serial)
            return {"success": res, "action": action, "typed": text}

        elif action in ["notifications", "expand_notifications"]:
            res = await adb_controller.expand_notifications(serial=serial)
            return {"success": res, "action": action, "message": "Notification shade expanded"}

        elif action in ["shell", "exec_shell"]:
            cmd = params.get("command") or params.get("cmd", "echo 1")
            res = await adb_controller.execute_shell_command(cmd, serial=serial)
            return {"success": res["success"], "action": action, "data": res}

        elif action in ["gmail", "send_gmail", "email"]:
            to = params.get("to") or "recipient@example.com"
            sub = params.get("subject") or "Message from ABHI"
            body = params.get("body") or params.get("message") or ""
            res = await adb_controller.send_gmail_intent(to=to, subject=sub, body=body, serial=serial)
            return res

        else:
            raise HTTPException(status_code=400, detail=f"Unsupported mobile action: {action}")

    except Exception as e:
        logger.error(f"Mobile action '{action}' failed: {e}")
        return {"success": False, "error": str(e)}


@router.get("/mobile/screenshot")
async def get_mobile_screenshot(serial: Optional[str] = Query(None)):
    """Capture raw PNG screenshot of connected mobile screen."""
    png_bytes = await adb_controller.take_screenshot_bytes(serial=serial)
    if not png_bytes:
        raise HTTPException(status_code=503, detail="Unable to capture mobile screen (device offline or locked)")
    return Response(content=png_bytes, media_type="image/png")


@router.post("/mobile/connect")
async def connect_wireless(request: WirelessConnectRequest):
    """Connect to mobile device via Wi-Fi."""
    res = await adb_controller.connect_wireless(ip=request.ip, port=request.port)
    return res


@router.post("/mobile/pair")
async def pair_wireless(request: WirelessPairRequest):
    """Pair mobile device for wireless debugging."""
    res = await adb_controller.pair_wireless(ip=request.ip, port=request.port, pairing_code=request.code)
    return res


@router.get("/connected")
async def get_all_connected_devices():
    """Retrieve full inventory of connected PC hardware and mobile devices."""
    mobiles = await adb_controller.list_devices()
    return {
        "success": True,
        "pc_host": "Windows 11 Sovereign Workstation",
        "mobile_devices": mobiles,
        "mobile_count": len(mobiles),
        "active_mobile": mobiles[0] if mobiles else None
    }


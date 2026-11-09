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
    model_config = {"extra": "allow"}
    action: str = Field(..., description="Action name: lock, unlock, wake, key, keyevent, launch_app, send_whatsapp, dial, tap, swipe, type, shell, notifications, gmail")
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
    # Merge any top-level parameters into params
    params = dict(request.params)
    for k, v in request.__dict__.items():
        if k not in ["action", "params", "serial", "__pydantic_extra__", "__pydantic_fields_set__"] and v is not None:
            params.setdefault(k, v)
    if hasattr(request, "__pydantic_extra__") and request.__pydantic_extra__:
        for k, v in request.__pydantic_extra__.items():
            params.setdefault(k, v)
    serial = request.serial

    try:
        if action == "lock":
            res = await adb_controller.lock_device(serial=serial)
            return {"success": res, "action": action, "message": "Device locked" if res else "No active device to lock"}

        elif action in ["unlock", "wake"]:
            res = await adb_controller.unlock_device(serial=serial)
            return {"success": res, "action": action, "message": "Device unlocked / screen woke up" if res else "No active device to unlock"}

        elif action in ["key", "keyevent"]:
            key = params.get("key") or params.get("keycode") or params.get("key_name", "home")
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


class NormalizedTapRequest(BaseModel):
    x_pct: float = Field(..., ge=0.0, le=1.0, description="Normalized X coordinate (0.0 to 1.0)")
    y_pct: float = Field(..., ge=0.0, le=1.0, description="Normalized Y coordinate (0.0 to 1.0)")
    serial: Optional[str] = None


class NormalizedSwipeRequest(BaseModel):
    x1_pct: float = Field(..., ge=0.0, le=1.0)
    y1_pct: float = Field(..., ge=0.0, le=1.0)
    x2_pct: float = Field(..., ge=0.0, le=1.0)
    y2_pct: float = Field(..., ge=0.0, le=1.0)
    duration_ms: int = Field(default=300, ge=50, le=5000)
    serial: Optional[str] = None


@router.get("/mobile/screenshot")
async def get_mobile_screenshot(serial: Optional[str] = Query(None)):
    """Capture raw PNG screenshot of connected mobile screen with zero-downtime canvas fallback."""
    png_bytes = await adb_controller.take_screenshot_bytes(serial=serial)
    return Response(content=png_bytes, media_type="image/png")


@router.post("/mobile/tap-normalized")
async def tap_normalized(request: NormalizedTapRequest):
    """Tap mobile screen using percentage coordinates (0.0 to 1.0) from mouse click on screen mirror."""
    ok = await adb_controller.normalized_tap(x_pct=request.x_pct, y_pct=request.y_pct, serial=request.serial)
    return {"success": ok, "x_pct": request.x_pct, "y_pct": request.y_pct}


@router.post("/mobile/swipe-normalized")
async def swipe_normalized(request: NormalizedSwipeRequest):
    """Swipe mobile screen using percentage coordinates."""
    ok = await adb_controller.normalized_swipe(
        x1_pct=request.x1_pct,
        y1_pct=request.y1_pct,
        x2_pct=request.x2_pct,
        y2_pct=request.y2_pct,
        duration_ms=request.duration_ms,
        serial=request.serial
    )
    return {"success": ok}


@router.get("/desktop/screenshot")
async def get_desktop_screenshot():
    """Capture laptop Windows PC desktop screenshot as live JPEG/PNG stream so mobile can view and control PC."""
    try:
        from PIL import ImageGrab
        import io
        screenshot = ImageGrab.grab()
        buf = io.BytesIO()
        if screenshot.width > 1600:
            new_h = int(screenshot.height * 1600 / screenshot.width)
            screenshot = screenshot.resize((1600, new_h))
        screenshot.save(buf, format="JPEG", quality=80)
        return Response(content=buf.getvalue(), media_type="image/jpeg")
    except Exception:
        png_bytes = adb_controller.generate_fallback_desktop_screen()
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


class DeviceSettingRequest(BaseModel):
    namespace: str = Field(default="system", description="Setting namespace: system, secure, global")
    key: str = Field(..., description="Setting key (e.g., screen_brightness, volume_music, bluetooth_on)")
    value: str = Field(..., description="Setting value to set")
    serial: Optional[str] = None


class DeviceSettingsScreenRequest(BaseModel):
    screen: str = Field(..., description="Screen name: wifi, bluetooth, display, sound, battery, about, apps, settings")
    serial: Optional[str] = None


class MobileToLaptopCommandRequest(BaseModel):
    command: str = Field(..., description="Command to execute on the laptop from mobile (e.g. lock laptop, check status, launch app)")
    auth_token: Optional[str] = Field(default="sovereign_mobile_owner", description="Auth token from paired mobile")


@router.get("/mobile/imei")
async def get_mobile_imei(serial: Optional[str] = Query(None)):
    """Retrieve verified IMEI number and cellular hardware specs."""
    try:
        identifiers = await adb_controller.get_phone_identifiers(serial=serial)
        imei = await adb_controller.get_imei_number(serial=serial) or identifiers.get("imei", "")
        return {
            "success": True,
            "imei": imei,
            "serial": identifiers.get("serial"),
            "model": identifiers.get("model"),
            "sim_state": identifiers.get("sim_state"),
            "full_identifiers": identifiers
        }
    except Exception as e:
        logger.error(f"Error fetching mobile IMEI: {e}")
        return {"success": False, "error": str(e)}


@router.get("/mobile/settings")
async def get_mobile_settings(serial: Optional[str] = Query(None)):
    """Fetch Android OS settings: brightness, volume, timeouts, bluetooth, wifi."""
    try:
        settings_data = await adb_controller.get_all_important_settings(serial=serial)
        return {"success": True, "settings": settings_data}
    except Exception as e:
        logger.error(f"Error reading mobile settings: {e}")
        return {"success": False, "error": str(e)}


@router.post("/mobile/settings")
async def put_mobile_setting(request: DeviceSettingRequest):
    """Directly modify Android system/secure/global setting from laptop."""
    try:
        ok = await adb_controller.put_setting(
            namespace=request.namespace,
            key=request.key,
            value=request.value,
            serial=request.serial
        )
        return {
            "success": ok,
            "namespace": request.namespace,
            "key": request.key,
            "value": request.value,
            "message": f"Setting '{request.key}' updated to '{request.value}'" if ok else "Failed to update setting"
        }
    except Exception as e:
        logger.error(f"Error updating mobile setting: {e}")
        return {"success": False, "error": str(e)}


@router.post("/mobile/settings/screen")
async def open_settings_screen(request: DeviceSettingsScreenRequest):
    """Launch specific Settings screen on mobile."""
    try:
        res = await adb_controller.open_settings_screen(screen_name=request.screen, serial=request.serial)
        return res
    except Exception as e:
        logger.error(f"Error launching settings screen: {e}")
        return {"success": False, "error": str(e)}


@router.get("/bluetooth/devices")
async def get_bluetooth_devices():
    """Scan Bluetooth paired/connected mobile devices on Windows host."""
    try:
        devices = await adb_controller.scan_bluetooth_devices()
        return {"success": True, "count": len(devices), "devices": devices}
    except Exception as e:
        logger.error(f"Error scanning Bluetooth devices: {e}")
        return {"success": False, "error": str(e), "devices": []}


@router.post("/mobile-bridge/execute")
async def mobile_to_laptop_remote_execute(request: MobileToLaptopCommandRequest):
    """Execute laptop command issued from paired mobile phone (Bidirectional Laptop <-> Mobile Bridge)."""
    from backend.app.cognitive.gateway.agent_gateway import agent_gateway
    from backend.app.cognitive.gateway.models import AgentCommandRequest, InputMode

    cmd_req = AgentCommandRequest(
        raw_text=request.command,
        input_mode=InputMode.REMOTE_MOBILE,
        language_hint="auto"
    )
    cmd_res = await agent_gateway.process_command(cmd_req)
    return {
        "success": cmd_res.accepted,
        "command": request.command,
        "response_message": cmd_res.message,
        "task_id": cmd_res.task_id,
        "status": cmd_res.status.value
    }


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


"""ABHI Android Device Automation & Mobile Control Engine.

Native asynchronous ADB controller enabling zero-touch personal device management:
- Real-time device discovery (USB & Wireless Wi-Fi debugging)
- Battery, thermal, network, and screen state diagnostics
- Keyevents (Home, Back, Power/Lock, Volume, Wake/Sleep)
- App launching (WhatsApp, YouTube, Camera, Phone, Settings, Browser)
- Touch gestures (Tap, Swipe, Text Input)
- Native intent execution (WhatsApp messaging, Phone dialing)
- Screen capture via raw stream
"""

import asyncio
import os
import re
import shutil
import urllib.parse
from typing import Any, Dict, List, Optional, Tuple
from backend.app.core.logging import logger


class AdbController:
    """Authoritative asynchronous Android Debug Bridge controller."""

    KNOWN_ADB_PATHS = [
        r"C:\Users\AYYAPPA RAYUDU\platform-tools\platform-tools\adb.exe",
        r"C:\Users\AYYAPPA RAYUDU\platform-tools\adb.exe",
        r"C:\Users\AYYAPPA RAYUDU\AppData\Local\Android\Sdk\platform-tools\adb.exe",
        r"C:\platform-tools\adb.exe",
    ]

    KEY_MAP = {
        "home": 3,
        "back": 4,
        "power": 26,
        "lock": 26,
        "volume_up": 24,
        "volume_down": 25,
        "mute": 164,
        "wake": 224,
        "wakeup": 224,
        "sleep": 223,
        "enter": 66,
        "tab": 61,
        "space": 62,
        "camera": 27,
        "recent_apps": 187,
        "app_switch": 187,
    }

    APP_PACKAGES = {
        "whatsapp": "com.whatsapp",
        "youtube": "com.google.android.youtube",
        "chrome": "com.android.chrome",
        "settings": "com.android.settings",
        "maps": "com.google.android.apps.maps",
        "spotify": "com.spotify.music",
        "telegram": "org.telegram.messenger",
        "instagram": "com.instagram.android",
        "camera": "com.android.camera",
        "calculator": "com.google.android.calculator",
        "gmail": "com.google.android.gm",
        "photos": "com.google.android.apps.photos",
    }

    def __init__(self, adb_path: Optional[str] = None):
        self._adb_path = adb_path or self._discover_adb()
        self._default_device: Optional[str] = None

    def _discover_adb(self) -> str:
        """Locate adb.exe binary across known paths or system PATH."""
        which_adb = shutil.which("adb")
        if which_adb and os.path.exists(which_adb):
            return which_adb

        for candidate in self.KNOWN_ADB_PATHS:
            if os.path.exists(candidate):
                return candidate

        return "adb"

    @property
    def adb_path(self) -> str:
        return self._adb_path

    async def is_available(self) -> bool:
        """Verify ADB binary is executable and server responds."""
        try:
            code, stdout, _ = await self.run_adb(["version"], timeout=4.0)
            return code == 0 and "Android Debug Bridge" in stdout
        except Exception:
            return False

    async def run_adb(
        self,
        args: List[str],
        serial: Optional[str] = None,
        timeout: float = 12.0
    ) -> Tuple[int, str, str]:
        """Execute ADB command asynchronously."""
        full_args = [self._adb_path]
        target_serial = serial or self._default_device
        if target_serial:
            full_args.extend(["-s", target_serial])
        full_args.extend(args)

        try:
            proc = await asyncio.create_subprocess_exec(
                *full_args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                proc.communicate(),
                timeout=timeout
            )
            stdout_str = stdout_bytes.decode("utf-8", errors="replace").strip()
            stderr_str = stderr_bytes.decode("utf-8", errors="replace").strip()
            return proc.returncode, stdout_str, stderr_str
        except asyncio.TimeoutError:
            logger.warning(f"ADB command timed out: {' '.join(full_args)}")
            return -1, "", "Command timed out"
        except Exception as e:
            logger.error(f"ADB command failed: {e}")
            return -1, "", str(e)

    async def list_devices(self) -> List[Dict[str, Any]]:
        """List all connected mobile devices with detailed model metadata."""
        code, stdout, _ = await self.run_adb(["devices", "-l"])
        if code != 0:
            return []

        devices = []
        for line in stdout.splitlines():
            line = line.strip()
            if not line or line.startswith("List of devices") or line.startswith("*"):
                continue

            parts = line.split()
            if len(parts) >= 2:
                serial = parts[0]
                state = parts[1]
                model = "Unknown"
                product = "Unknown"

                for part in parts[2:]:
                    if part.startswith("model:"):
                        model = part.split(":", 1)[1]
                    elif part.startswith("product:"):
                        product = part.split(":", 1)[1]

                is_wifi = ":" in serial
                devices.append({
                    "serial": serial,
                    "state": state,
                    "model": model,
                    "product": product,
                    "connection_type": "wifi" if is_wifi else "usb",
                    "authorized": state == "device",
                })

        if devices and not self._default_device:
            self._default_device = devices[0]["serial"]

        return devices

    async def get_device_status(self, serial: Optional[str] = None) -> Dict[str, Any]:
        """Fetch comprehensive status (battery, screen, network, OS) of device."""
        devices = await self.list_devices()
        if not devices:
            return {
                "connected": False,
                "message": "No mobile device connected via USB or Wi-Fi. Enable USB debugging in Developer Options or connect via Wi-Fi."
            }

        target_serial = serial or devices[0]["serial"]
        dev_info = next((d for d in devices if d["serial"] == target_serial), devices[0])

        battery = await self.get_battery_info(target_serial)
        screen = await self.get_screen_state(target_serial)
        os_info = await self.get_device_props(target_serial)

        return {
            "connected": True,
            "serial": target_serial,
            "device_info": dev_info,
            "battery": battery,
            "screen": screen,
            "os": os_info,
        }

    async def get_battery_info(self, serial: Optional[str] = None) -> Dict[str, Any]:
        """Query device battery level, health, temperature, and charging state."""
        code, stdout, _ = await self.run_adb(["shell", "dumpsys", "battery"], serial=serial)
        if code != 0 or not stdout:
            return {"level": 0, "status": "unknown"}

        battery_data = {"level": 100, "status": "unknown", "temperature_c": 0.0}
        for line in stdout.splitlines():
            line = line.strip()
            if ":" not in line:
                continue
            key, val = [p.strip() for p in line.split(":", 1)]
            key_lower = key.lower()

            if key_lower == "level":
                try:
                    battery_data["level"] = int(val)
                except ValueError:
                    pass
            elif key_lower == "status":
                status_map = {"1": "Unknown", "2": "Charging", "3": "Discharging", "4": "Not Charging", "5": "Full"}
                battery_data["status"] = status_map.get(val, val)
            elif key_lower == "temperature":
                try:
                    battery_data["temperature_c"] = round(int(val) / 10.0, 1)
                except ValueError:
                    pass
            elif key_lower == "health":
                health_map = {"1": "Unknown", "2": "Good", "3": "Overheat", "4": "Dead", "5": "Over Voltage", "6": "Failure"}
                battery_data["health"] = health_map.get(val, val)

        return battery_data

    async def get_screen_state(self, serial: Optional[str] = None) -> Dict[str, Any]:
        """Detect whether the mobile screen is currently on, awake, or locked."""
        code, stdout, _ = await self.run_adb(["shell", "dumpsys", "power"], serial=serial)
        is_on = True
        wakefulness = "Awake"
        if code == 0 and stdout:
            for line in stdout.splitlines():
                if "mWakefulness=" in line:
                    wakefulness = line.split("mWakefulness=")[1].split()[0]
                    is_on = wakefulness.lower() in ["awake", "dreaming"]
                    break
                elif "Display Power: state=" in line:
                    state = line.split("Display Power: state=")[1].split()[0]
                    is_on = state.upper() == "ON"
                    wakefulness = "Awake" if is_on else "Asleep"
                    break

        return {"screen_on": is_on, "wakefulness": wakefulness}

    async def get_device_props(self, serial: Optional[str] = None) -> Dict[str, str]:
        """Retrieve Android OS brand, model, release version, and SDK."""
        props = {}
        for prop, key in [
            ("ro.product.brand", "brand"),
            ("ro.product.model", "model"),
            ("ro.build.version.release", "android_version"),
            ("ro.build.version.sdk", "sdk_version"),
        ]:
            code, stdout, _ = await self.run_adb(["shell", "getprop", prop], serial=serial)
            if code == 0 and stdout:
                props[key] = stdout.strip()
        return props

    async def send_keyevent(self, key: str | int, serial: Optional[str] = None) -> bool:
        """Dispatch hardware keyevent (home, back, power, volume, etc.)."""
        if isinstance(key, str):
            code = self.KEY_MAP.get(key.lower().strip())
            if code is None:
                try:
                    code = int(key)
                except ValueError:
                    logger.warning(f"Unknown key name: {key}")
                    return False
        else:
            code = key

        ret_code, _, _ = await self.run_adb(["shell", "input", "keyevent", str(code)], serial=serial)
        return ret_code == 0

    async def lock_device(self, serial: Optional[str] = None) -> bool:
        """Lock the mobile device screen."""
        screen = await self.get_screen_state(serial)
        if screen.get("screen_on"):
            return await self.send_keyevent("power", serial)
        return True

    async def unlock_device(self, serial: Optional[str] = None) -> bool:
        """Wake up the mobile device screen."""
        screen = await self.get_screen_state(serial)
        if not screen.get("screen_on"):
            await self.send_keyevent("wake", serial)
            await asyncio.sleep(0.2)
            # Swipe up to reveal lockpad or home
            await self.swipe(500, 1500, 500, 500, duration_ms=250, serial=serial)
        return True

    async def tap(self, x: int, y: int, serial: Optional[str] = None) -> bool:
        """Tap at screen coordinate (x, y)."""
        ret_code, _, _ = await self.run_adb(["shell", "input", "tap", str(x), str(y)], serial=serial)
        return ret_code == 0

    async def swipe(
        self,
        x1: int,
        y1: int,
        x2: int,
        y2: int,
        duration_ms: int = 300,
        serial: Optional[str] = None
    ) -> bool:
        """Perform gesture swipe from (x1, y1) to (x2, y2)."""
        ret_code, _, _ = await self.run_adb(
            ["shell", "input", "swipe", str(x1), str(y1), str(x2), str(y2), str(duration_ms)],
            serial=serial
        )
        return ret_code == 0

    async def type_text(self, text: str, serial: Optional[str] = None) -> bool:
        """Type text on mobile device, escaping shell characters."""
        # Replace spaces with %s for adb input text
        sanitized = text.replace(" ", "%s").replace("&", "\\&").replace("'", "\\'").replace('"', '\\"')
        ret_code, _, _ = await self.run_adb(["shell", "input", "text", sanitized], serial=serial)
        return ret_code == 0

    async def launch_app(self, app_name_or_pkg: str, serial: Optional[str] = None) -> Dict[str, Any]:
        """Launch Android app by friendly name or explicit package."""
        target = app_name_or_pkg.lower().strip()
        pkg = self.APP_PACKAGES.get(target, app_name_or_pkg)

        # Launch via monkey tool which starts default launcher activity
        code, stdout, stderr = await self.run_adb(
            ["shell", "monkey", "-p", pkg, "-c", "android.intent.category.LAUNCHER", "1"],
            serial=serial
        )
        if code == 0:
            return {"success": True, "package": pkg, "message": f"Successfully launched {target}"}

        # Fallback to am start
        code2, stdout2, stderr2 = await self.run_adb(
            ["shell", "am", "start", "-a", "android.intent.action.MAIN", "-c", "android.intent.category.LAUNCHER", "-n", f"{pkg}/.MainActivity"],
            serial=serial
        )
        success = code2 == 0
        return {
            "success": success,
            "package": pkg,
            "message": f"Launched {target}" if success else f"Failed to launch {target}: {stderr or stderr2}"
        }

    async def send_whatsapp_message(
        self,
        phone: Optional[str] = None,
        message: str = "",
        serial: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send or prepare a WhatsApp message on connected Android device."""
        encoded_msg = urllib.parse.quote(message)
        phone_param = re.sub(r"[^\d]", "", phone) if phone else ""

        uri = f"https://api.whatsapp.com/send?phone={phone_param}&text={encoded_msg}"
        code, stdout, stderr = await self.run_adb(
            ["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", uri],
            serial=serial
        )
        if code == 0:
            return {
                "success": True,
                "action": "open_whatsapp_intent",
                "phone": phone_param or "Not specified",
                "message": message,
                "note": "WhatsApp opened with message pre-filled. Tap Send or allow ABHI to auto-confirm."
            }
        return {"success": False, "error": stderr}

    async def dial_phone(self, phone_number: str, serial: Optional[str] = None) -> Dict[str, Any]:
        """Open phone dialer with specified number."""
        clean_num = re.sub(r"[^\d+*#]", "", phone_number)
        code, stdout, stderr = await self.run_adb(
            ["shell", "am", "start", "-a", "android.intent.action.DIAL", "-d", f"tel:{clean_num}"],
            serial=serial
        )
        return {
            "success": code == 0,
            "number": clean_num,
            "message": f"Dialer opened for {clean_num}" if code == 0 else stderr
        }

    async def take_screenshot_bytes(self, serial: Optional[str] = None) -> Optional[bytes]:
        """Capture raw PNG screenshot directly from mobile device."""
        full_args = [self._adb_path]
        target_serial = serial or self._default_device
        if target_serial:
            full_args.extend(["-s", target_serial])
        full_args.extend(["exec-out", "screencap", "-p"])

        try:
            proc = await asyncio.create_subprocess_exec(
                *full_args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout_bytes, _ = await asyncio.wait_for(proc.communicate(), timeout=8.0)
            if proc.returncode == 0 and len(stdout_bytes) > 100:
                # Normalize Windows CRLF line endings in PNG stream if present
                if stdout_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
                    return stdout_bytes
                cleaned = stdout_bytes.replace(b"\r\n", b"\n").replace(b"\r\r\n", b"\n")
                return cleaned
            return None
        except Exception as e:
            logger.error(f"Failed to capture mobile screenshot: {e}")
            return None

    async def connect_wireless(self, ip: str, port: int = 5555) -> Dict[str, Any]:
        """Connect to Android phone over Wi-Fi network."""
        endpoint = f"{ip}:{port}"
        code, stdout, stderr = await self.run_adb(["connect", endpoint])
        success = code == 0 and ("connected to" in stdout.lower() or "already connected" in stdout.lower())
        return {
            "success": success,
            "endpoint": endpoint,
            "message": stdout or stderr
        }

    async def pair_wireless(self, ip: str, port: int, pairing_code: str) -> Dict[str, Any]:
        """Pair with Android 11+ wireless debugging using pairing code."""
        endpoint = f"{ip}:{port}"
        code, stdout, stderr = await self.run_adb(["pair", endpoint, pairing_code])
        success = code == 0 and "successfully paired" in stdout.lower()
        return {
            "success": success,
            "endpoint": endpoint,
            "message": stdout or stderr
        }


# Global singleton controller
adb_controller = AdbController()

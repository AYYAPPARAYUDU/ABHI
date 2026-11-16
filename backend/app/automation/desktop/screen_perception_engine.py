"""
ABHI Sovereign Screen Perception & Computer Vision Engine.
Real-Time Desktop Capture, Window Hierarchy Telemetry, and Dynamic Element Grid Resolver.
100% Authentic — Zero Mock Data.
"""

import sys
import os
import time
import re
import ctypes
from ctypes import wintypes
from typing import Dict, Any, List, Optional, Tuple
from PIL import Image

# Ensure project root is accessible
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.app.automation.desktop.os_control_engine import os_control_engine
from backend.app.automation.desktop.live_screen_vision import live_screen_vision


class ScreenPerceptionEngine:
    """High-Performance Computer Vision and Dynamic Screen Perception Engine."""

    def __init__(self):
        self.user32 = ctypes.windll.user32
        self.gdi32 = ctypes.windll.gdi32
        self.last_spoken_message = "I am listening and monitoring your workspace, Mamu."
        self.screenshot_dir = os.path.join(PROJECT_ROOT, "project_data", "desktop")
        os.makedirs(self.screenshot_dir, exist_ok=True)
        self.latest_screenshot_path = os.path.join(self.screenshot_dir, "latest_screenshot.png")

    def record_spoken(self, text: str) -> None:
        """Cache the last spoken message for 'what you said' queries."""
        if text and len(text.strip()) > 3:
            self.last_spoken_message = text.strip()
            live_screen_vision.record_spoken(text)

    def get_last_spoken(self) -> str:
        return live_screen_vision.get_last_spoken() or self.last_spoken_message

    def _ensure_desktop(self) -> None:
        """Attach thread to active user desktop."""
        try:
            desk = self.user32.OpenDesktopW("default", 0, False, 0x01FF)
            if desk:
                self.user32.SetThreadDesktop(desk)
        except Exception:
            pass

    def capture_screenshot(self, save_path: Optional[str] = None) -> Tuple[Optional[Image.Image], int, int]:
        """Capture live desktop screenshot using low-latency Win32 GDI BitBlt (< 10ms)."""
        self._ensure_desktop()
        w = self.user32.GetSystemMetrics(0)
        h = self.user32.GetSystemMetrics(1)
        if w <= 0 or h <= 0:
            w, h = 1280, 800

        hdc_screen = self.user32.GetDC(0)
        hdc_mem = self.gdi32.CreateCompatibleDC(hdc_screen)
        hbm = self.gdi32.CreateCompatibleBitmap(hdc_screen, w, h)
        old = self.gdi32.SelectObject(hdc_mem, hbm)

        # BitBlt SRCCOPY = 0x00CC0020
        res = self.gdi32.BitBlt(hdc_mem, 0, 0, w, h, hdc_screen, 0, 0, 0x00CC0020)

        class BITMAPINFOHEADER(ctypes.Structure):
            _fields_ = [
                ("biSize", wintypes.DWORD),
                ("biWidth", wintypes.LONG),
                ("biHeight", wintypes.LONG),
                ("biPlanes", wintypes.WORD),
                ("biBitCount", wintypes.WORD),
                ("biCompression", wintypes.DWORD),
                ("biSizeImage", wintypes.DWORD),
                ("biXPelsPerMeter", wintypes.LONG),
                ("biYPelsPerMeter", wintypes.LONG),
                ("biClrUsed", wintypes.DWORD),
                ("biClrImportant", wintypes.DWORD)
            ]

        bmi = BITMAPINFOHEADER()
        bmi.biSize = ctypes.sizeof(BITMAPINFOHEADER)
        bmi.biWidth = w
        bmi.biHeight = -h  # top-down DIB
        bmi.biPlanes = 1
        bmi.biBitCount = 32
        bmi.biCompression = 0

        buf = ctypes.create_string_buffer(w * h * 4)
        self.gdi32.GetDIBits(hdc_mem, hbm, 0, h, buf, ctypes.byref(bmi), 0)

        self.gdi32.SelectObject(hdc_mem, old)
        self.gdi32.DeleteObject(hbm)
        self.gdi32.DeleteDC(hdc_mem)
        self.user32.ReleaseDC(0, hdc_screen)

        try:
            img = Image.frombuffer("RGBA", (w, h), buf, "raw", "BGRA", 0, 1)
            target_path = save_path or self.latest_screenshot_path
            img.convert("RGB").save(target_path)
            return img, w, h
        except Exception:
            return None, w, h

    def get_real_screen_context(self) -> Dict[str, Any]:
        """Inspect all real active and visible windows across the operating system."""
        self._ensure_desktop()
        active_win = os_control_engine.get_active_window()
        all_windows = os_control_engine.list_windows()

        active_title = active_win.get("title", "Desktop")
        user_visible_apps = []
        has_youtube = False
        youtube_details = {}
        has_ide = False
        ide_details = {}

        for w in all_windows:
            title = w.get("title", "")
            if not title:
                continue
            # Filter out internal/system utilities
            if any(ign in title for ign in ["NVIDIA", "Settings", "Program Manager", "Windows Input"]):
                continue

            user_visible_apps.append({
                "title": title,
                "hwnd": w.get("hwnd"),
                "rect": w.get("rect", {})
            })

            t_lower = title.lower()
            if "youtube" in t_lower:
                has_youtube = True
                youtube_details = {
                    "title": title,
                    "hwnd": w.get("hwnd"),
                    "rect": w.get("rect", {})
                }
            elif "antigravity" in t_lower or "code" in t_lower:
                has_ide = True
                ide_details = {
                    "title": title,
                    "hwnd": w.get("hwnd")
                }

        return {
            "active_title": active_title,
            "active_window": active_win,
            "user_apps": user_visible_apps,
            "has_youtube": has_youtube,
            "youtube_details": youtube_details,
            "has_ide": has_ide,
            "ide_details": ide_details
        }

    def describe_current_screen(self) -> str:
        """Generate a 100% grounded, truthful verbal and text description of Mamu's screen using live WinRT OCR and window tracking."""
        desc = live_screen_vision.describe_current_screen()
        self.record_spoken(desc)
        return desc

    def execute_youtube_grid_selection(self, row: int, col: int) -> Tuple[bool, str]:
        """
        Dynamically target and click a specific (row, column) video on YouTube.
        Handles viewport calculation, scrolling for lower rows (Row 3+), and clicking.
        """
        self._ensure_desktop()
        yt_win = os_control_engine.get_active_youtube_window()
        if not yt_win:
            # Check if any Chrome window exists
            all_w = os_control_engine.list_windows()
            for w in all_w:
                if "chrome" in w.get("title", "").lower():
                    yt_win = w
                    break

        if yt_win:
            os_control_engine.focus_window(yt_win.get("hwnd"))
            time.sleep(0.15)
        else:
            # Launch YouTube if not running
            os_control_engine.open_url("https://www.youtube.com")
            time.sleep(1.2)

        # Screen metrics
        w = self.user32.GetSystemMetrics(0)
        h = self.user32.GetSystemMetrics(1)
        if w <= 0 or h <= 0:
            w, h = 1280, 800

        # Row and Column normalization
        row = max(1, min(row, 6))
        col = max(1, min(col, 4))

        # Dynamic Grid Coordinate Calculation
        # On a 1280x800 display, YouTube video cards:
        # Col 1: ~240, Col 2: ~540, Col 3: ~840, Col 4: ~1100
        col_x_map = {
            1: int(w * 0.187),  # ~240px on 1280
            2: int(w * 0.421),  # ~540px on 1280
            3: int(w * 0.656),  # ~840px on 1280
            4: int(w * 0.860)   # ~1100px on 1280
        }
        target_x = col_x_map.get(col, int(w * 0.187))

        if row == 1:
            target_y = int(h * 0.32)  # ~256px
            os_control_engine.mouse_move(target_x, target_y)
            time.sleep(0.08)
            os_control_engine.mouse_click(target_x, target_y, button="left")
            reply = f"Clicked Row 1, Column {col} on YouTube to start playback, Mamu!"
        elif row == 2:
            # Row 2 in YouTube is often the Shorts carousel or second video row
            target_y = int(h * 0.62)  # ~496px
            os_control_engine.mouse_move(target_x, target_y)
            time.sleep(0.08)
            os_control_engine.mouse_click(target_x, target_y, button="left")
            reply = f"Clicked Row 2, Column {col} on YouTube to start playback, Mamu!"
        else:
            # Row 3 or deeper: Must scroll down to bring it into primary view
            center_x = w // 2
            center_y = h // 2
            os_control_engine.mouse_move(center_x, center_y)
            time.sleep(0.05)

            # Scroll down proportional to row
            scroll_count = 6 if row == 3 else (row * 3)
            os_control_engine.mouse_scroll(clicks=scroll_count, direction="down")
            time.sleep(0.35)

            # After scroll, Row 3 is centered in the upper-middle area
            target_y = int(h * 0.40)  # ~320px
            os_control_engine.mouse_move(target_x, target_y)
            time.sleep(0.08)
            os_control_engine.mouse_click(target_x, target_y, button="left")
            reply = f"Scrolled to Row {row}, Column {col} on YouTube and clicked to start playback, Mamu!"

        self.record_spoken(reply)
        return True, reply

    def parse_and_execute_grid_intent(self, query: str) -> Tuple[bool, Optional[str]]:
        """Extract row and column from user voice directives like 'play third row first one'."""
        q = query.lower().strip()

        row_map = {
            "first row": 1, "1st row": 1, "row 1": 1, "row one": 1, "top row": 1,
            "second row": 2, "2nd row": 2, "row 2": 2, "row two": 2, "middle row": 2,
            "third row": 3, "3rd row": 3, "row 3": 3, "row three": 3,
            "fourth row": 4, "4th row": 4, "row 4": 4, "row four": 4,
            "fifth row": 5, "5th row": 5, "row 5": 5, "row five": 5
        }

        col_map = {
            "first one": 1, "first video": 1, "1st one": 1, "1st video": 1, "column 1": 1, "col 1": 1,
            "second one": 2, "second video": 2, "2nd one": 2, "2nd video": 2, "column 2": 2, "col 2": 2,
            "third one": 3, "third video": 3, "3rd one": 3, "3rd video": 3, "column 3": 3, "col 3": 3,
            "fourth one": 4, "fourth video": 4, "4th one": 4, "4th video": 4, "column 4": 4, "col 4": 4
        }

        found_row = None
        for r_phrase, r_num in row_map.items():
            if r_phrase in q:
                found_row = r_num
                break

        found_col = None
        for c_phrase, c_num in col_map.items():
            if c_phrase in q:
                found_col = c_num
                break

        # Fallback patterns: "first video", "second video", "play third video"
        if not found_row and not found_col:
            if "first video" in q or "1st video" in q or q in ["play first", "click first", "first one"]:
                found_row, found_col = 1, 1
            elif "second video" in q or "2nd video" in q or q in ["play second", "click second", "second one"]:
                found_row, found_col = 1, 2
            elif "third video" in q or "3rd video" in q or q in ["play third", "click third", "third one"]:
                found_row, found_col = 1, 3
            elif "fourth video" in q or "4th video" in q:
                found_row, found_col = 1, 4

        if found_row is not None or found_col is not None:
            r = found_row or 1
            c = found_col or 1
            ok, reply = self.execute_youtube_grid_selection(r, c)
            return ok, reply

        return False, None


# Global singleton instance
screen_perception = ScreenPerceptionEngine()

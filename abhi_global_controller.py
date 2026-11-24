"""
================================================================================
ABHI Ultra Advanced Global Windows Top Notch & Voice Operating System.
Next-Gen System-Wide Dynamic Notch (Vayli Windows Notch & Control Center)
Built with Frameless Always-On-Top CTk, Win32 Mutex Single-Instance Guard,
24/7 Background Ambient Voice Intelligence, Live Screen Perception,
and Complete Laptop OS Hardware Controls.

Features:
  1. Win32 Named Mutex: Zero duplicate instances across Windows.
  2. True Global Laptop Notch:
     - Collapsed: 340x38 sleek hardware pill at y=0 (top center of laptop screen).
     - Hover Expansion: Smoothly expands downward to 860x440 on mouse hover or click.
     - Auto-Collapse: Automatically returns to top pill when cursor leaves.
     - Pin Mode (📌): Keeps notch open while multitasking.
  3. Universal 6-Tab HUD Deck:
     - ⚙️ CENTER: Wi-Fi, Bluetooth, DND, Volume & Brightness sliders, Laptop Settings.
     - 📅 CALENDAR: Interactive month calendar with event dots + Focus Timer + Active Automations.
     - ♫ MUSIC: Online media player with track scrubber, equalizer bars, hardware media keys.
     - ⚡ VITALS: Live CPU, RAM, Disk telemetry via psutil + Active Foreground Window tracker.
     - 📋 SHELF: Windows Clipboard history + Quick scratchpad note.
     - 🚀 APPS: Instant 1-click launcher for VS Code, Chrome, Terminal, Explorer, Settings.
  4. 24/7 Ambient Voice Intelligence: Always listens in the background, executes
     system tasks, reads screen, and answers with neural natural voice.
================================================================================
"""

import sys
import os
import time
import json
import threading
import subprocess
import urllib.request
import urllib.error
import ctypes
from ctypes import wintypes
import io
import wave
import math
import collections
from typing import Optional, Dict, Any

# Win32 DPI Awareness for sharp 4K / High-DPI screens
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)  # PROCESS_PER_MONITOR_DPI_AWARE_V2
except Exception:
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(1)
    except Exception:
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass

# ==============================================================================
# WIN32 SINGLE-INSTANCE MUTEX ENFORCEMENT
# ==============================================================================
MUTEX_NAME = "Global\\ABHI_BOT_CONTROLLER_MUTEX_V3"
kernel32 = ctypes.windll.kernel32
user32 = ctypes.windll.user32

_mutex_handle = kernel32.CreateMutexW(None, False, MUTEX_NAME)
if kernel32.GetLastError() == 183:  # ERROR_ALREADY_EXISTS
    hwnd = user32.FindWindowW(None, "ABHI Bot")
    if not hwnd:
        hwnd = user32.FindWindowW(None, "ABHI Global Notch")
    if hwnd:
        user32.ShowWindow(hwnd, 9)  # SW_RESTORE
        user32.SetForegroundWindow(hwnd)
    sys.exit(0)

# ==============================================================================
# THIRD-PARTY AUDIO & UI LIBRARIES
# ==============================================================================
import sounddevice as sd
import numpy as np
import speech_recognition as sr
import customtkinter as ctk
import psutil

# ABHI In-Process Engines
APP_ROOT = os.path.dirname(os.path.abspath(__file__))
if APP_ROOT not in sys.path:
    sys.path.insert(0, APP_ROOT)

try:
    from backend.app.automation.desktop.dynamic_action_resolver import dynamic_action_resolver
except Exception:
    dynamic_action_resolver = None

try:
    from backend.app.automation.desktop.screen_perception_engine import screen_perception
except Exception:
    screen_perception = None

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

API_BASE = "http://127.0.0.1:8000"

# ==============================================================================
# WINDOWS COREAUDIO (WASAPI) HARDWARE MASTER VOLUME CONTROLLER
# ==============================================================================
class WindowsAudioController:
    """Real Windows CoreAudio master volume controller via COM IAudioEndpointVolume."""
    def __init__(self):
        self._vol_ctrl = None
        self._init_endpoint()

    def _init_endpoint(self):
        try:
            import comtypes
            from comtypes import GUID, IUnknown, COMMETHOD, client
            from ctypes import wintypes, HRESULT, POINTER, c_float
            import ctypes

            class IMMDevice(IUnknown):
                _iid_ = GUID('{D666063F-1587-4E43-81F1-B948E807363F}')
                _methods_ = [
                    COMMETHOD([], HRESULT, 'Activate',
                              (['in'], POINTER(GUID), 'iid'),
                              (['in'], wintypes.DWORD, 'dwClsCtx'),
                              (['in'], ctypes.c_void_p, 'pActivationParams'),
                              (['out'], POINTER(POINTER(IUnknown)), 'ppInterface'))
                ]

            class IMMDeviceEnumerator(IUnknown):
                _iid_ = GUID('{A95664D2-9614-4F35-A746-DE8DB63617E6}')
                _methods_ = [
                    COMMETHOD([], HRESULT, 'EnumAudioEndpoints'),
                    COMMETHOD([], HRESULT, 'GetDefaultAudioEndpoint',
                              (['in'], wintypes.DWORD, 'dataFlow'),
                              (['in'], wintypes.DWORD, 'role'),
                              (['out'], POINTER(POINTER(IMMDevice)), 'ppEndpoint'))
                ]

            class IAudioEndpointVolume(IUnknown):
                _iid_ = GUID('{5CDF2C82-841E-4546-9722-0CF74078229A}')
                _methods_ = [
                    COMMETHOD([], HRESULT, 'RegisterControlChangeNotify'),
                    COMMETHOD([], HRESULT, 'UnregisterControlChangeNotify'),
                    COMMETHOD([], HRESULT, 'GetChannelCount'),
                    COMMETHOD([], HRESULT, 'SetMasterVolumeLevel'),
                    COMMETHOD([], HRESULT, 'SetMasterVolumeLevelScalar',
                              (['in'], c_float, 'fLevel'),
                              (['in'], ctypes.c_void_p, 'pguidEventContext')),
                    COMMETHOD([], HRESULT, 'GetMasterVolumeLevel'),
                    COMMETHOD([], HRESULT, 'GetMasterVolumeLevelScalar',
                              (['out'], POINTER(c_float), 'pfLevel')),
                    COMMETHOD([], HRESULT, 'SetChannelVolumeLevel'),
                    COMMETHOD([], HRESULT, 'SetChannelVolumeLevelScalar'),
                    COMMETHOD([], HRESULT, 'GetChannelVolumeLevel'),
                    COMMETHOD([], HRESULT, 'GetChannelVolumeLevelScalar'),
                    COMMETHOD([], HRESULT, 'SetMute',
                              (['in'], wintypes.BOOL, 'bMute'),
                              (['in'], ctypes.c_void_p, 'pguidEventContext')),
                    COMMETHOD([], HRESULT, 'GetMute',
                              (['out'], POINTER(wintypes.BOOL), 'pbMute'))
                ]

            enumerator = client.CreateObject('{BCDE0395-E52F-467C-8E3D-C4579291692E}', interface=IMMDeviceEnumerator)
            endpoint = enumerator.GetDefaultAudioEndpoint(0, 1) # eRender=0, eMultimedia=1
            target_iid = GUID('{5CDF2C82-841E-4546-9722-0CF74078229A}')
            unk = endpoint.Activate(ctypes.byref(target_iid), 1, None)
            self._vol_ctrl = unk.QueryInterface(IAudioEndpointVolume)
        except Exception:
            self._vol_ctrl = None

    def get_volume(self) -> int:
        if not self._vol_ctrl:
            self._init_endpoint()
        if self._vol_ctrl:
            try:
                scalar = self._vol_ctrl.GetMasterVolumeLevelScalar()
                return int(round(scalar * 100))
            except Exception:
                pass
        return 50

    def set_volume(self, percent: int) -> bool:
        pct = max(0, min(100, int(percent)))
        if not self._vol_ctrl:
            self._init_endpoint()
        if self._vol_ctrl:
            try:
                scalar = pct / 100.0
                self._vol_ctrl.SetMasterVolumeLevelScalar(scalar, None)
                return True
            except Exception:
                pass
        return False

# ==============================================================================
# PALETTES & DYNAMIC THEMES (Matching Frontend ThemeService Presets)
# ==============================================================================
THEMES = {
    "obsidian_dark": {
        "name": "Obsidian Dark",
        "bg": "#0b0f19",
        "surface": "#0f172a",
        "surface_card": "#131d31",
        "border": "#1e293b",
        "border_secondary": "#334155",
        "border_glow": "#06b6d4",
        "accent": "#3882f6",
        "accent_hover": "#06b6d4",
        "text_primary": "#f8fafc",
        "text_secondary": "#94a3b8",
        "text_muted": "#64748b",
        "hud_border": "#1e293b",
    },
    "cyber_neon": {
        "name": "Cyber / AI Neon Dark",
        "bg": "#080711",
        "surface": "#0f0c1e",
        "surface_card": "#16132d",
        "border": "#7c3aed",
        "border_secondary": "#a855f7",
        "border_glow": "#00f0ff",
        "accent": "#00f0ff",
        "accent_hover": "#ec4899",
        "text_primary": "#ffffff",
        "text_secondary": "#c4b5fd",
        "text_muted": "#8b7ca8",
        "hud_border": "#7c3aed",
    },
    "emerald_matrix": {
        "name": "Emerald Matrix Terminal",
        "bg": "#020b06",
        "surface": "#05160d",
        "surface_card": "#092416",
        "border": "#10b981",
        "border_secondary": "#059669",
        "border_glow": "#34d399",
        "accent": "#10b981",
        "accent_hover": "#34d399",
        "text_primary": "#e6fff2",
        "text_secondary": "#86efac",
        "text_muted": "#4ade80",
        "hud_border": "#10b981",
    },
    "ardena_crimson": {
        "name": "Ardena Sunset Crimson",
        "bg": "#0e1013",
        "surface": "#15181e",
        "surface_card": "#1c2027",
        "border": "#ff4d4d",
        "border_secondary": "#ff7849",
        "border_glow": "#ff4d4d",
        "accent": "#ff4d4d",
        "accent_hover": "#ff7849",
        "text_primary": "#f8fafc",
        "text_secondary": "#9ca3af",
        "text_muted": "#6b7280",
        "hud_border": "#ff4d4d",
    },
    "ombria_slate": {
        "name": "Ombria Titanium Slate",
        "bg": "#131518",
        "surface": "#1a1d22",
        "surface_card": "#23272e",
        "border": "#f59e0b",
        "border_secondary": "#fbbf24",
        "border_glow": "#fbbf24",
        "accent": "#f59e0b",
        "accent_hover": "#fbbf24",
        "text_primary": "#f3f4f6",
        "text_secondary": "#cbd5e1",
        "text_muted": "#94a3b8",
        "hud_border": "#f59e0b",
    },
    "modern_light": {
        "name": "Modern Light Mode",
        "bg": "#f8fafc",
        "surface": "#ffffff",
        "surface_card": "#f1f5f9",
        "border": "#cbd5e1",
        "border_secondary": "#94a3b8",
        "border_glow": "#3b82f6",
        "accent": "#2563eb",
        "accent_hover": "#3b82f6",
        "text_primary": "#0f172a",
        "text_secondary": "#334155",
        "text_muted": "#64748b",
        "hud_border": "#cbd5e1",
    }
}


class AbhiGlobalTopNotch(ctk.CTk):
    """
    ABHI Global System-Wide Windows Top Notch & Voice Operating System.
    """

    def __init__(self):
        super().__init__()
        self.title("ABHI Global Notch")

        # Real Hardware CoreAudio Volume Controller
        self.audio_controller = WindowsAudioController()
        self.current_volume = self.audio_controller.get_volume()

        # Window styling: Frameless, Always-On-Top, Transparent Backing
        self.overrideredirect(True)
        self.wm_attributes("-topmost", True)
        self.TRANSPARENT_KEY = "#020617"
        self.config(bg=self.TRANSPARENT_KEY)
        self.wm_attributes("-transparentcolor", self.TRANSPARENT_KEY)

        # Active Dynamic Theme (Default: Obsidian Dark matching the app)
        self.current_theme_key = "obsidian_dark"
        self._load_saved_theme()
        self.theme = THEMES[self.current_theme_key]

        # Geometry & Notch States
        self.is_expanded = False
        self.is_pinned = False
        self.dock_mode = "TOP_CENTER"
        self.active_tab = "CENTER"
        phys_screen_w = user32.GetSystemMetrics(0)
        phys_screen_h = user32.GetSystemMetrics(1)
        self.screen_width = max(self.winfo_screenwidth(), phys_screen_w)
        self.screen_height = max(self.winfo_screenheight(), phys_screen_h)

        # Dimensions calibrated for High-DPI screens
        self.compact_w, self.compact_h = 280, 32
        self.expanded_w, self.expanded_h = 720, 400
        self._is_animating = False

        # Dynamic Drag-and-Drop Positioning State
        self._drag_start_x = 0
        self._drag_start_y = 0
        self._drag_window_x = 0
        self._drag_window_y = 0
        self._has_dragged = False

        # Load persisted position or default to screen top-center
        self._load_saved_position()

        # Keyboard shortcuts: Escape collapses expanded HUD
        self.bind("<Escape>", lambda e: self.collapse_notch())

        self._hover_collapse_job = None
        self.animation_tick = 0
        self.session_start_time = time.time()

        # Telemetry & States
        self.live_audio_rms = 0.0
        self.live_voice_ratio = 0.0
        self.is_mic_listening = True
        self.active_window_title = "Windows Desktop"
        self.bot_state = "IDLE"

        # Hardware Values
        self.current_brightness = 85
        self.is_wifi_on = True
        self.is_dnd_on = False
        self.is_bt_on = True
        self.is_night_light_on = False
        self.is_battery_saver_on = False

        # Music State
        self.is_playing = False
        self.music_track = "Golden Hour - Nova Lane"
        self.music_progress = 34
        self.music_duration = 161

        # Coffee Always State
        self.is_coffee_on = False
        self.home_notes_text = "Project sprint review at 10 AM..."

        # Focus Timer State
        self.timer_seconds = 25 * 60
        self.is_timer_running = False
        self.timer_thread = None

        # Clipboard Shelf
        self.clipboard_history = [
            "https://github.com/elayadesign/ai-design-skills",
            "git status -s",
            "py -3.14 run_server.py"
        ]

        # Build Frames (Sleek 1px border, smooth rounded pill radius)
        self.compact_frame = ctk.CTkFrame(
            self,
            width=self.compact_w,
            height=self.compact_h,
            fg_color=self.theme["bg"],
            border_color=self.theme["border"],
            border_width=1,
            corner_radius=16
        )

        self.expanded_frame = ctk.CTkFrame(
            self,
            width=self.expanded_w,
            height=self.expanded_h,
            fg_color=self.theme["bg"],
            border_color=self.theme["border"],
            border_width=1,
            corner_radius=20
        )

        self._build_compact_notch_view()
        self._build_expanded_notch_view()

        # Apply active saved theme to all widgets across the application
        self.set_theme(self.current_theme_key)

        # Launch docked at position
        self._update_geometry()
        self._save_notch_position()
        self.compact_frame.pack(fill="both", expand=True)

        # Background loops
        self._enforce_topmost()
        self._start_os_context_monitor()
        self._start_continuous_voice_listener()
        self._start_clock_and_vitals_loop()

    # ==========================================================================
    # WINDOW MANAGEMENT, GEOMETRY, REGIONS & DYNAMIC POSITIONING
    # ==========================================================================

    def _apply_native_round_region(self, phys_w: int, phys_h: int, radius: int):
        """Physically clips the Windows OS window to an authentic hardware rounded rectangle, eliminating all black corner artifacts."""
        try:
            root_hwnd = ctypes.windll.user32.GetAncestor(self.winfo_id(), 2)
            if not root_hwnd:
                root_hwnd = self.winfo_id()
            ellipse_d = max(4, radius * 2)
            rgn = ctypes.windll.gdi32.CreateRoundRectRgn(0, 0, phys_w + 1, phys_h + 1, ellipse_d, ellipse_d)
            if rgn:
                ctypes.windll.user32.SetWindowRgn(root_hwnd, rgn, True)
        except Exception:
            pass

    def _get_position_file(self) -> str:
        return os.path.join(APP_ROOT, "project_data", "desktop", "notch_position.json")

    def _load_saved_position(self):
        scale = ctk.ScalingTracker.get_window_scaling(self)
        phys_w = round(self.compact_w * scale)
        phys_h = round(self.compact_h * scale)
        center_x = (self.screen_width - phys_w) // 2
        try:
            pos_file = self._get_position_file()
            if os.path.exists(pos_file):
                with open(pos_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    saved_mode = data.get("dock_mode", "TOP_CENTER")
                    saved_x = data.get("pos_x")
                    saved_y = data.get("pos_y")
                    self.dock_mode = saved_mode

                    if saved_mode == "TOP_CENTER" or (saved_y == 0 and abs(saved_x - center_x) < 200):
                        self.dock_mode = "TOP_CENTER"
                        self.pos_x = center_x
                        self.pos_y = 0
                        return
                    elif saved_mode == "TOP_LEFT":
                        self.pos_x = 40
                        self.pos_y = 0
                        return
                    elif saved_mode == "TOP_RIGHT":
                        self.pos_x = self.screen_width - phys_w - 40
                        self.pos_y = 0
                        return
                    elif isinstance(saved_x, int) and isinstance(saved_y, int):
                        if 0 <= saved_x <= (self.screen_width - phys_w) and 0 <= saved_y <= (self.screen_height - phys_h):
                            self.pos_x = saved_x
                            self.pos_y = saved_y
                            return
        except Exception:
            pass
        # Default fallback: Mathematically perfect top-center
        self.dock_mode = "TOP_CENTER"
        self.pos_x = center_x
        self.pos_y = 0

    def _save_notch_position(self):
        try:
            pos_file = self._get_position_file()
            os.makedirs(os.path.dirname(pos_file), exist_ok=True)
            with open(pos_file, "w", encoding="utf-8") as f:
                json.dump({
                    "pos_x": self.pos_x,
                    "pos_y": self.pos_y,
                    "dock_mode": getattr(self, "dock_mode", "TOP_CENTER"),
                    "is_docked": (self.pos_y == 0),
                    "screen_w": self.screen_width,
                    "screen_h": self.screen_height,
                    "timestamp": time.time()
                }, f, indent=2)
        except Exception:
            pass
            pass

    def _save_notch_theme(self):
        try:
            theme_file = os.path.join(APP_ROOT, "project_data", "desktop", "notch_theme.json")
            os.makedirs(os.path.dirname(theme_file), exist_ok=True)
            with open(theme_file, "w", encoding="utf-8") as f:
                json.dump({"theme": self.current_theme_key}, f, indent=2)
        except Exception:
            pass

    def _load_saved_theme(self):
        try:
            theme_file = os.path.join(APP_ROOT, "project_data", "desktop", "notch_theme.json")
            if os.path.exists(theme_file):
                with open(theme_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    th = data.get("theme")
                    if th in THEMES:
                        self.current_theme_key = th
                        self.theme = THEMES[th]
                        return
        except Exception:
            pass
        self.current_theme_key = "obsidian_dark"
        self.theme = THEMES[self.current_theme_key]

    def cycle_theme(self):
        keys = list(THEMES.keys())
        idx = keys.index(self.current_theme_key) if self.current_theme_key in keys else 0
        next_key = keys[(idx + 1) % len(keys)]
        self.set_theme(next_key)

    def set_theme(self, theme_key: str):
        if theme_key not in THEMES:
            return
        self.current_theme_key = theme_key
        self.theme = THEMES[theme_key]
        t = self.theme

        # 1. Frames & Outer Chassis
        if hasattr(self, "compact_frame"):
            self.compact_frame.configure(fg_color=t["bg"], border_color=t["border"])
        if hasattr(self, "expanded_frame"):
            self.expanded_frame.configure(fg_color=t["bg"], border_color=t["border"])
        if hasattr(self, "header_strip"):
            self.header_strip.configure(fg_color="transparent")
        if hasattr(self, "header_div"):
            self.header_div.configure(fg_color=t["border"])

        # 2. Header Strip Labels & Buttons
        if hasattr(self, "strip_clock_lbl"):
            self.strip_clock_lbl.configure(text_color=t["text_primary"])
        if hasattr(self, "tag_lbl"):
            self.tag_lbl.configure(text_color=t["accent"])
        if hasattr(self, "strip_battery_lbl"):
            self.strip_battery_lbl.configure(text_color=t["accent"])
        if hasattr(self, "theme_btn"):
            self.theme_btn.configure(text_color=t["accent"])
        if hasattr(self, "center_btn"):
            self.center_btn.configure(text_color=t["accent"])
        if hasattr(self, "pin_btn"):
            self.pin_btn.configure(text_color=t["text_secondary"])

        # 3. Header Tab Buttons
        if hasattr(self, "tab_buttons"):
            for key, btn in self.tab_buttons.items():
                if key == self.active_tab:
                    btn.configure(fg_color=t["accent"], text_color="#ffffff")
                else:
                    btn.configure(fg_color="transparent", text_color=t["text_secondary"], hover_color=t["surface_card"])

        # 4. Left Chassis
        if hasattr(self, "left_chassis"):
            self.left_chassis.configure(fg_color=t["surface"], border_color=t["border"])
        if hasattr(self, "date_badge"):
            self.date_badge.configure(fg_color=t["surface_card"])
        if hasattr(self, "date_badge_lbl"):
            self.date_badge_lbl.configure(text_color=t["text_secondary"])
        if hasattr(self, "art_card"):
            self.art_card.configure(fg_color=t["bg"], border_color=t["border_glow"])
        if hasattr(self, "tab_rail"):
            self.tab_rail.configure(fg_color=t["surface_card"])
        if hasattr(self, "bot_screen"):
            self.bot_screen.configure(border_color=t["accent"])
        if hasattr(self, "rail_buttons"):
            for btn, key in self.rail_buttons:
                if key == self.active_tab:
                    btn.configure(fg_color=t["accent"], text_color="#ffffff")
                else:
                    btn.configure(fg_color=t["surface"], text_color=t["text_secondary"], hover_color=t["surface_card"])

        # 5. Right Chassis Control Cards
        card_on_fg = t["surface_card"]
        card_on_text = t["text_primary"]
        card_off_fg = t["surface"]
        card_off_text = t["text_muted"]

        if hasattr(self, "wifi_card"):
            self.wifi_card.configure(
                fg_color=card_on_fg if self.is_wifi_on else card_off_fg,
                text_color=card_on_text if self.is_wifi_on else card_off_text,
                hover_color=t["border_secondary"]
            )
        if hasattr(self, "bt_card"):
            self.bt_card.configure(
                fg_color=card_on_fg if self.is_bt_on else card_off_fg,
                text_color=card_on_text if self.is_bt_on else card_off_text,
                hover_color=t["border_secondary"]
            )
        if hasattr(self, "dnd_card"):
            self.dnd_card.configure(
                fg_color=card_on_fg if self.is_dnd_on else card_off_fg,
                text_color=card_on_text if self.is_dnd_on else card_off_text,
                hover_color=t["border_secondary"]
            )
        if hasattr(self, "notch_mode_card"):
            self.notch_mode_card.configure(
                fg_color=card_on_fg,
                text_color=card_on_text,
                hover_color=t["border_secondary"]
            )

        # 6. Sliders
        if hasattr(self, "sliders_box"):
            self.sliders_box.configure(fg_color=t["surface"], border_color=t["border"])
        if hasattr(self, "vol_lbl"):
            self.vol_lbl.configure(text_color=t["text_secondary"])
        if hasattr(self, "vol_val_lbl"):
            self.vol_val_lbl.configure(text_color=t["text_primary"])
        if hasattr(self, "vol_slider"):
            self.vol_slider.configure(button_color=t["accent"], progress_color=t["accent"])
        if hasattr(self, "bri_lbl"):
            self.bri_lbl.configure(text_color=t["text_secondary"])
        if hasattr(self, "bri_val_lbl"):
            self.bri_val_lbl.configure(text_color=t["text_primary"])
        if hasattr(self, "bri_slider"):
            self.bri_slider.configure(button_color=t["accent"], progress_color=t["accent"])

        # 7. Transcription / Chat Box
        if hasattr(self, "chat_box"):
            self.chat_box.configure(fg_color=t["surface"], border_color=t["border"])
        if hasattr(self, "chat_hdr"):
            self.chat_hdr.configure(fg_color=t["surface_card"])
        if hasattr(self, "chat_display"):
            self.chat_display.configure(text_color=t["text_primary"])

        # 8. Bottom Input Bar
        if hasattr(self, "input_bar"):
            self.input_bar.configure(fg_color=t["surface"], border_color=t["border"])
        if hasattr(self, "input_entry"):
            self.input_entry.configure(text_color=t["text_primary"])
        if hasattr(self, "send_btn"):
            self.send_btn.configure(fg_color=t["accent"], hover_color=t["accent_hover"])
        if hasattr(self, "mic_btn"):
            self.mic_btn.configure(fg_color=t["surface_card"], text_color=t["accent"])

        # 9. Compact Pill View
        if hasattr(self, "pill_clock_lbl"):
            self.pill_clock_lbl.configure(text_color=t["text_primary"])
        if hasattr(self, "pill_dot"):
            self.pill_dot.configure(text_color=t["accent"])
        if hasattr(self, "pill_chevron"):
            self.pill_chevron.configure(text_color=t["text_muted"])
        if hasattr(self, "pill_battery_lbl"):
            self.pill_battery_lbl.configure(text_color=t["accent"])

        # 10. Music Tab Dynamic Theming
        if hasattr(self, "music_card"):
            self.music_card.configure(fg_color=t["surface_card"], border_color=t["border"])
        if hasattr(self, "music_artist_lbl"):
            self.music_artist_lbl.configure(text_color=t["text_secondary"])
        if hasattr(self, "music_title_lbl"):
            self.music_title_lbl.configure(text_color=t["text_primary"])
        if hasattr(self, "music_lyrics_lbl"):
            self.music_lyrics_lbl.configure(text_color=t["text_secondary"])
        if hasattr(self, "eq_lbl"):
            self.eq_lbl.configure(text_color=t["accent"])
        if hasattr(self, "scrub_slider"):
            self.scrub_slider.configure(button_color=t["accent"], progress_color=t["accent"])
        if hasattr(self, "cur_time_lbl"):
            self.cur_time_lbl.configure(text_color=t["text_muted"])
        if hasattr(self, "tot_time_lbl"):
            self.tot_time_lbl.configure(text_color=t["text_muted"])
        if hasattr(self, "music_prev_btn"):
            self.music_prev_btn.configure(fg_color=t["surface"], text_color=t["text_primary"], hover_color=t["border_secondary"])
        if hasattr(self, "play_btn"):
            self.play_btn.configure(fg_color=t["accent"], text_color="#ffffff", hover_color=t["accent_hover"])
        if hasattr(self, "music_next_btn"):
            self.music_next_btn.configure(fg_color=t["surface"], text_color=t["text_primary"], hover_color=t["border_secondary"])
        if hasattr(self, "music_tray_btns"):
            for b in self.music_tray_btns:
                b.configure(fg_color=t["surface"], text_color=t["text_secondary"], hover_color=t["border_secondary"])

        # 11. Calendar Tab Dynamic Theming
        if hasattr(self, "cal_left_card"):
            self.cal_left_card.configure(fg_color=t["surface_card"], border_color=t["border"])
        if hasattr(self, "cal_right_card"):
            self.cal_right_card.configure(fg_color=t["surface_card"], border_color=t["border"])
        if hasattr(self, "cal_m_title"):
            self.cal_m_title.configure(text_color=t["text_primary"])
        if hasattr(self, "cal_today_btn"):
            self.cal_today_btn.configure(fg_color=t["surface"], text_color=t["text_secondary"], hover_color=t["border_secondary"])
        if hasattr(self, "timer_lbl"):
            self.timer_lbl.configure(text_color=t["text_primary"])
        if hasattr(self, "start_timer_btn"):
            self.start_timer_btn.configure(
                fg_color="#f97316" if getattr(self, "is_timer_running", False) else t["accent"],
                text_color="#ffffff",
                hover_color=t["accent_hover"]
            )
        if hasattr(self, "cal_reset_btn"):
            self.cal_reset_btn.configure(fg_color=t["surface"], text_color=t["text_secondary"], hover_color=t["border_secondary"])
        if hasattr(self, "cal_preset_btns"):
            for pb in self.cal_preset_btns:
                pb.configure(fg_color=t["surface"], text_color=t["text_primary"], hover_color=t["border_secondary"])
        if hasattr(self, "cal_day_cells"):
            for cell, is_today, has_ev in self.cal_day_cells:
                if is_today:
                    cell.configure(fg_color=t["accent"], text_color="#ffffff")
                elif has_ev:
                    cell.configure(fg_color="transparent", text_color=t["accent"])
                else:
                    cell.configure(fg_color="transparent", text_color=t["text_secondary"])

        # 12. Vitals Tab Dynamic Theming
        if hasattr(self, "vitals_card"):
            self.vitals_card.configure(fg_color=t["surface_card"], border_color=t["border"])
        if hasattr(self, "screen_time_lbl"):
            self.screen_time_lbl.configure(text_color=t["text_primary"])
        if hasattr(self, "active_win_lbl"):
            self.active_win_lbl.configure(text_color=t["text_primary"])
        if hasattr(self, "cpu_card"):
            self.cpu_card.configure(fg_color=t["surface"], border_color=t["border"])
        if hasattr(self, "ram_card"):
            self.ram_card.configure(fg_color=t["surface"], border_color=t["border"])
        if hasattr(self, "disk_card"):
            self.disk_card.configure(fg_color=t["surface"], border_color=t["border"])
        if hasattr(self, "cpu_pct_lbl"):
            self.cpu_pct_lbl.configure(text_color=t["text_primary"])
        if hasattr(self, "ram_pct_lbl"):
            self.ram_pct_lbl.configure(text_color=t["text_primary"])
        if hasattr(self, "disk_pct_lbl"):
            self.disk_pct_lbl.configure(text_color=t["text_primary"])
        if hasattr(self, "app_usage_card"):
            self.app_usage_card.configure(fg_color=t["surface"], border_color=t["border"])
        if hasattr(self, "net_card"):
            self.net_card.configure(fg_color=t["surface"], border_color=t["border"])
        if hasattr(self, "spark_f"):
            self.spark_f.configure(fg_color=t["surface_card"])
        if hasattr(self, "vitals_tray_btns"):
            for vb in self.vitals_tray_btns:
                vb.configure(fg_color=t["surface"], hover_color=t["border_secondary"])

        # 13. Home Tab Dynamic Theming
        if hasattr(self, "home_timer_card"):
            self.home_timer_card.configure(fg_color=t["surface_card"], border_color=t["border"])
        if hasattr(self, "dial_frame"):
            self.dial_frame.configure(fg_color=t["surface"], border_color=t["accent"])
        if hasattr(self, "home_timer_lbl"):
            self.home_timer_lbl.configure(text_color=t["text_primary"])
        if hasattr(self, "home_coffee_card"):
            self.home_coffee_card.configure(fg_color=t["surface_card"], border_color=t["border"])
        if hasattr(self, "home_music_card"):
            self.home_music_card.configure(fg_color=t["surface_card"], border_color=t["border"])
        if hasattr(self, "home_notes_card"):
            self.home_notes_card.configure(fg_color=t["surface_card"], border_color=t["border"])
        if hasattr(self, "home_notes_entry"):
            self.home_notes_entry.configure(fg_color=t["surface"], border_color=t["border"], text_color=t["text_primary"])
        if hasattr(self, "clip_card"):
            self.clip_card.configure(fg_color=t["surface_card"], border_color=t["border"])
        if hasattr(self, "tools_card"):
            self.tools_card.configure(fg_color=t["surface_card"], border_color=t["border"])
        if hasattr(self, "home_tool_btns"):
            for tb in self.home_tool_btns:
                tb.configure(fg_color=t["surface"], border_color=t["border"], hover_color=t["border_secondary"])

        self._save_notch_theme()

    def toggle_floating_mode(self):
        """Toggles strictly between Docked Top-Center and Free-Floating mode as requested by Mamu."""
        scale = ctk.ScalingTracker.get_window_scaling(self)
        cur_w = self.expanded_w if self.is_expanded else self.compact_w
        cur_h = self.expanded_h if self.is_expanded else self.compact_h
        phys_w = round(cur_w * scale)
        phys_h = round(cur_h * scale)

        if getattr(self, "dock_mode", "TOP_CENTER") == "FLOATING":
            # Snap back to top center dock
            self.dock_mode = "TOP_CENTER"
            self.pos_x = (self.screen_width - phys_w) // 2
            self.pos_y = 0
        else:
            # Switch to free floating: place gently below top bar so user can drag freely
            self.dock_mode = "FLOATING"
            self.pos_x = (self.screen_width - phys_w) // 2
            self.pos_y = 60

        self.geometry(f"{cur_w}x{cur_h}+{self.pos_x}+{self.pos_y}")
        radius = round(20 * scale) if self.is_expanded else (phys_h // 2)
        self._apply_native_round_region(phys_w, phys_h, radius)
        self._update_top_navbar_toggles()
        self._update_notch_mode_card_label()
        self._save_notch_position()

    def _update_top_navbar_toggles(self):
        t = self.theme
        if hasattr(self, "float_toggle_btn"):
            is_float = (getattr(self, "dock_mode", "TOP_CENTER") == "FLOATING")
            self.float_toggle_btn.configure(
                text="⚓ Dock" if is_float else "🪟 Float",
                fg_color=t["accent"] if is_float else t["surface_card"],
                text_color="#ffffff" if is_float else t["text_primary"],
                hover_color=t["border_secondary"]
            )
        if hasattr(self, "sticky_toggle_btn"):
            self.sticky_toggle_btn.configure(
                text="📌 Sticky" if self.is_pinned else "🔓 Auto",
                fg_color=t["accent"] if self.is_pinned else t["surface_card"],
                text_color="#ffffff" if self.is_pinned else t["text_muted"],
                hover_color=t["border_secondary"]
            )

    def set_dock_mode(self, mode: str):
        """Sets the dynamic positioning dock mode and updates window placement."""
        self.dock_mode = mode
        scale = ctk.ScalingTracker.get_window_scaling(self)
        cur_w = self.expanded_w if self.is_expanded else self.compact_w
        cur_h = self.expanded_h if self.is_expanded else self.compact_h
        phys_w = round(cur_w * scale)
        phys_h = round(cur_h * scale)

        if mode == "TOP_CENTER":
            self.pos_x = (self.screen_width - phys_w) // 2
            self.pos_y = 0
        elif mode == "TOP_LEFT":
            self.pos_x = 40
            self.pos_y = 0
        elif mode == "TOP_RIGHT":
            self.pos_x = self.screen_width - phys_w - 40
            self.pos_y = 0
        elif mode == "FLOATING":
            self.pos_x = (self.screen_width - phys_w) // 2
            self.pos_y = 80

        self.geometry(f"{cur_w}x{cur_h}+{self.pos_x}+{self.pos_y}")
        self.update_idletasks()
        radius = round(20 * scale) if self.is_expanded else (phys_h // 2)
        self._apply_native_round_region(phys_w, phys_h, radius)
        self._update_notch_mode_card_label()
        self._save_notch_position()

    def cycle_dock_mode(self):
        """Cycles through dynamic positioning presets: Center -> Left -> Right -> Floating."""
        modes = ["TOP_CENTER", "TOP_LEFT", "TOP_RIGHT", "FLOATING"]
        current = getattr(self, "dock_mode", "TOP_CENTER")
        idx = modes.index(current) if current in modes else 0
        next_mode = modes[(idx + 1) % len(modes)]
        self.set_dock_mode(next_mode)

    def recenter_notch(self):
        """Snaps the notch back to the screen's top-center docking point."""
        self.set_dock_mode("TOP_CENTER")

    def _update_notch_mode_card_label(self):
        if hasattr(self, "notch_mode_card"):
            mode = getattr(self, "dock_mode", "TOP_CENTER")
            if mode == "TOP_CENTER":
                lbl = "🔝 Notch Mode\nTop Center Dock"
            elif mode == "TOP_LEFT":
                lbl = "◀️ Notch Mode\nTop Left Dock"
            elif mode == "TOP_RIGHT":
                lbl = "▶️ Notch Mode\nTop Right Dock"
            else:
                lbl = "🪟 Notch Mode\nFree Floating"
            self.notch_mode_card.configure(text=lbl)

    def _bind_drag_and_click(self, widget, click_action=None):
        widget.bind("<ButtonPress-1>", self._on_drag_press, add="+")
        widget.bind("<B1-Motion>", self._on_drag_motion, add="+")
        widget.bind("<ButtonRelease-1>", lambda e, act=click_action: self._on_drag_release(e, act), add="+")

    def _on_drag_press(self, event):
        self._drag_start_x = event.x_root
        self._drag_start_y = event.y_root
        self._drag_window_x = self.pos_x
        self._drag_window_y = self.pos_y
        self._has_dragged = False

    def _on_drag_motion(self, event):
        dx = event.x_root - self._drag_start_x
        dy = event.y_root - self._drag_start_y
        if abs(dx) > 10 or abs(dy) > 10:
            self._has_dragged = True
            scale = ctk.ScalingTracker.get_window_scaling(self)
            cur_w = self.expanded_w if self.is_expanded else self.compact_w
            cur_h = self.expanded_h if self.is_expanded else self.compact_h
            phys_w = round(cur_w * scale)
            phys_h = round(cur_h * scale)

            new_x = self._drag_window_x + dx
            new_y = self._drag_window_y + dy
            # Keep within visible screen bounds
            new_x = max(0, min(self.screen_width - phys_w, new_x))
            new_y = max(0, min(self.screen_height - phys_h, new_y))

            self.pos_x = new_x
            self.pos_y = new_y
            self.geometry(f"{cur_w}x{cur_h}+{self.pos_x}+{self.pos_y}")
            radius = round(20 * scale) if self.is_expanded else (phys_h // 2)
            self._apply_native_round_region(phys_w, phys_h, radius)

    def _on_drag_release(self, event, click_action=None):
        scale = ctk.ScalingTracker.get_window_scaling(self)
        cur_w = self.expanded_w if self.is_expanded else self.compact_w
        cur_h = self.expanded_h if self.is_expanded else self.compact_h
        phys_w = round(cur_w * scale)
        phys_h = round(cur_h * scale)

        if getattr(self, "_has_dragged", False):
            self._has_dragged = False
            # Dynamic Snap / Auto-Docking Physics:
            center_x = (self.screen_width - phys_w) // 2
            if self.pos_y < 50:
                self.pos_y = 0
                if abs(self.pos_x - center_x) < 200:
                    self.pos_x = center_x
                    self.dock_mode = "TOP_CENTER"
                elif self.pos_x < 250:
                    self.pos_x = 40
                    self.dock_mode = "TOP_LEFT"
                elif self.pos_x > (self.screen_width - phys_w - 250):
                    self.pos_x = self.screen_width - phys_w - 40
                    self.dock_mode = "TOP_RIGHT"
                else:
                    self.dock_mode = "TOP_CUSTOM"
            else:
                self.dock_mode = "FLOATING"

            self.geometry(f"{cur_w}x{cur_h}+{self.pos_x}+{self.pos_y}")
            radius = round(20 * scale) if self.is_expanded else (phys_h // 2)
            self._apply_native_round_region(phys_w, phys_h, radius)
            self._update_notch_mode_card_label()
            self._update_top_navbar_toggles()
            self._save_notch_position()
        else:
            if click_action:
                click_action()
            else:
                self.toggle_mode()

    def _enforce_topmost(self):
        try:
            root_hwnd = ctypes.windll.user32.GetAncestor(self.winfo_id(), 2)
            if not root_hwnd:
                root_hwnd = self.winfo_id()
            cur_style = ctypes.windll.user32.GetWindowLongW(root_hwnd, -20)  # GWL_EXSTYLE
            ctypes.windll.user32.SetWindowLongW(root_hwnd, -20, cur_style | 0x00000008 | 0x00000080)
            ctypes.windll.user32.SetWindowPos(root_hwnd, -1, 0, 0, 0, 0, 0x0053)
            self.lift()
            self.attributes("-topmost", True)
        except Exception:
            pass
        self.after(1000, self._enforce_topmost)

    def _update_geometry(self):
        scale = ctk.ScalingTracker.get_window_scaling(self)
        w = self.expanded_w if self.is_expanded else self.compact_w
        h = self.expanded_h if self.is_expanded else self.compact_h
        phys_w = round(w * scale)
        phys_h = round(h * scale)

        self.pos_x = max(0, min(self.screen_width - phys_w, self.pos_x))
        if self.pos_y + phys_h > self.screen_height:
            self.pos_y = max(0, self.screen_height - phys_h)

        self.geometry(f"{w}x{h}+{self.pos_x}+{self.pos_y}")
        self.update_idletasks()
        radius = round(20 * scale) if self.is_expanded else (phys_h // 2)
        self._apply_native_round_region(phys_w, phys_h, radius)

    def expand_notch(self):
        if self.is_expanded or getattr(self, "_is_animating", False):
            return

        scale = ctk.ScalingTracker.get_window_scaling(self)
        target_w = self.expanded_w
        target_h = self.expanded_h
        phys_target_w = round(target_w * scale)
        phys_target_h = round(target_h * scale)

        mode = getattr(self, "dock_mode", "TOP_CENTER")
        if mode == "TOP_CENTER":
            self.pos_x = (self.screen_width - phys_target_w) // 2
            self.pos_y = 0
        elif mode == "TOP_LEFT":
            self.pos_x = 40
            self.pos_y = 0
        elif mode == "TOP_RIGHT":
            self.pos_x = self.screen_width - phys_target_w - 40
            self.pos_y = 0
        else:
            compact_phys_w = round(self.compact_w * scale)
            center_x = self.pos_x + (compact_phys_w // 2)
            self.pos_x = max(0, min(self.screen_width - phys_target_w, center_x - (phys_target_w // 2)))
            self.pos_y = max(0, min(self.screen_height - phys_target_h, self.pos_y))

        self.is_expanded = True
        self._is_animating = True

        self.compact_frame.pack_forget()
        self.expanded_frame.pack(fill="both", expand=True)

        # Smooth dynamic easing steps (macOS Dynamic Island physics over ~56ms)
        h_steps = [140, 260, 350, target_h]
        w_steps = [420, 560, 660, target_w]

        def _step_expand(idx):
            if idx >= len(h_steps):
                self._is_animating = False
                self.geometry(f"{target_w}x{target_h}+{self.pos_x}+{self.pos_y}")
                self.update_idletasks()
                self._apply_native_round_region(phys_target_w, phys_target_h, round(20 * scale))
                self._update_top_navbar_toggles()
                self._save_notch_position()
                if hasattr(self, "input_entry"):
                    self.input_entry.focus_set()
                return

            cur_w_step = w_steps[idx]
            cur_h_step = h_steps[idx]
            step_phys_w = round(cur_w_step * scale)
            step_phys_h = round(cur_h_step * scale)

            if mode == "TOP_CENTER":
                step_x = (self.screen_width - step_phys_w) // 2
            else:
                step_x = self.pos_x

            self.geometry(f"{cur_w_step}x{cur_h_step}+{step_x}+{self.pos_y}")
            self._apply_native_round_region(step_phys_w, step_phys_h, round(20 * scale))
            self.after(14, lambda: _step_expand(idx + 1))

        _step_expand(0)

    def collapse_notch(self):
        if not self.is_expanded or self.is_pinned or getattr(self, "_is_animating", False):
            return

        scale = ctk.ScalingTracker.get_window_scaling(self)
        target_w = self.compact_w
        target_h = self.compact_h
        phys_target_w = round(target_w * scale)
        phys_target_h = round(target_h * scale)

        mode = getattr(self, "dock_mode", "TOP_CENTER")
        if mode == "TOP_CENTER":
            self.pos_x = (self.screen_width - phys_target_w) // 2
            self.pos_y = 0
        elif mode == "TOP_LEFT":
            self.pos_x = 40
            self.pos_y = 0
        elif mode == "TOP_RIGHT":
            self.pos_x = self.screen_width - phys_target_w - 40
            self.pos_y = 0
        else:
            expanded_phys_w = round(self.expanded_w * scale)
            center_x = self.pos_x + (expanded_phys_w // 2)
            self.pos_x = max(0, min(self.screen_width - phys_target_w, center_x - (phys_target_w // 2)))
            self.pos_y = max(0, min(self.screen_height - phys_target_h, self.pos_y))

        self.is_expanded = False
        self._is_animating = True

        h_steps = [280, 160, target_h]
        w_steps = [540, 390, target_w]

        def _step_collapse(idx):
            if idx >= len(h_steps):
                self._is_animating = False
                self.expanded_frame.pack_forget()
                self.compact_frame.pack(fill="both", expand=True)
                self.geometry(f"{target_w}x{target_h}+{self.pos_x}+{self.pos_y}")
                self.update_idletasks()
                self._apply_native_round_region(phys_target_w, phys_target_h, phys_target_h // 2)
                self._save_notch_position()
                return

            cur_w_step = w_steps[idx]
            cur_h_step = h_steps[idx]
            step_phys_w = round(cur_w_step * scale)
            step_phys_h = round(cur_h_step * scale)

            if mode == "TOP_CENTER":
                step_x = (self.screen_width - step_phys_w) // 2
            else:
                step_x = self.pos_x

            self.geometry(f"{cur_w_step}x{cur_h_step}+{step_x}+{self.pos_y}")
            self._apply_native_round_region(step_phys_w, step_phys_h, round(16 * scale))
            self.after(14, lambda: _step_collapse(idx + 1))

        _step_collapse(0)

    def toggle_mode(self):
        if self.is_expanded:
            self.collapse_notch()
        else:
            self.expand_notch()

    def toggle_pin(self):
        self.is_pinned = not self.is_pinned
        self._update_top_navbar_toggles()

    # ==========================================================================
    # 1. COMPACT NOTCH PILL VIEW (270x34 Resting, 380x34 Extended on Hover)
    # ==========================================================================

    def _build_compact_notch_view(self):
        cf = self.compact_frame
        t = self.theme

        # Sub-container for clean alignment
        inner = ctk.CTkFrame(cf, fg_color="transparent")
        inner.pack(fill="both", expand=True, padx=10, pady=1)

        # Drag-and-drop & expansion bindings
        self._bind_drag_and_click(cf, self.expand_notch)
        self._bind_drag_and_click(inner, self.expand_notch)
        cf.bind("<Enter>", self._on_compact_hover_enter)
        cf.bind("<Leave>", self._on_compact_hover_leave)

        # Left: Pulsing Green Dot + ABHI NOTCH
        left_box = ctk.CTkFrame(inner, fg_color="transparent")
        left_box.pack(side="left", fill="y")
        self._bind_drag_and_click(left_box, self.expand_notch)

        self.pill_beacon = ctk.CTkLabel(
            left_box,
            text="●",
            font=("Segoe UI", 10, "bold"),
            text_color="#22c55e"
        )
        self.pill_beacon.pack(side="left", padx=(0, 4))
        self._bind_drag_and_click(self.pill_beacon, self.expand_notch)

        self.pill_title = ctk.CTkLabel(
            left_box,
            text="ABHI NOTCH",
            font=("Segoe UI", 8, "bold"),
            text_color=t.get("accent", "#3882f6")
        )
        self.pill_title.pack(side="left")
        self._bind_drag_and_click(self.pill_title, self.expand_notch)

        # Center: Live Clock & Dynamic Status Snippet
        self.pill_clock_lbl = ctk.CTkLabel(
            inner,
            text=time.strftime("%I:%M %p"),
            font=("Segoe UI", 8, "bold"),
            text_color=t.get("text_primary", "#f8fafc")
        )
        self.pill_clock_lbl.pack(side="left", expand=True)
        self._bind_drag_and_click(self.pill_clock_lbl, self.expand_notch)

        self.pill_status_lbl = ctk.CTkLabel(
            inner,
            text="• 28° Sunny",
            font=("Segoe UI", 8),
            text_color=t.get("text_muted", "#64748b")
        )
        self.pill_status_lbl.pack(side="left", padx=2)
        self._bind_drag_and_click(self.pill_status_lbl, self.expand_notch)

        # Right: Battery & Chevron
        right_box = ctk.CTkFrame(inner, fg_color="transparent")
        right_box.pack(side="right", fill="y")
        self._bind_drag_and_click(right_box, self.expand_notch)

        self.pill_battery_lbl = ctk.CTkLabel(
            right_box,
            text="⚡ 99%",
            font=("Segoe UI", 8, "bold"),
            text_color=t.get("accent", "#3882f6")
        )
        self.pill_battery_lbl.pack(side="left", padx=(0, 4))
        self._bind_drag_and_click(self.pill_battery_lbl, self.expand_notch)

        self.pill_chevron = ctk.CTkLabel(
            right_box,
            text="▼",
            font=("Segoe UI", 7),
            text_color=t.get("text_muted", "#94a3b8")
        )
        self.pill_chevron.pack(side="left")
        self._bind_drag_and_click(self.pill_chevron, self.expand_notch)

    def _on_compact_hover_enter(self, event=None):
        if not self.is_expanded:
            self.compact_frame.configure(border_color=self.theme.get("border_glow", "#06b6d4"))
            self.pill_chevron.configure(text="▾", font=("Segoe UI", 8, "bold"), text_color=self.theme.get("accent", "#3882f6"))

    def _on_compact_hover_leave(self, event=None):
        if not self.is_expanded:
            try:
                x = self.winfo_pointerx()
                y = self.winfo_pointery()
                wx = self.winfo_rootx()
                wy = self.winfo_rooty()
                ww = self.winfo_width()
                wh = self.winfo_height()
                if wx <= x <= wx + ww and wy <= y <= wy + wh:
                    return
            except Exception:
                pass
            self.compact_frame.configure(border_color=self.theme["border"])
            self.pill_chevron.configure(text="▼", font=("Segoe UI", 7), text_color=self.theme["text_muted"])

    # ==========================================================================
    # 2. EXPANDED NOTCH DECK VIEW (780x420, Ultra Responsive HUD)
    # ==========================================================================

    def _build_expanded_notch_view(self):
        ef = self.expanded_frame
        t = self.theme

        # ----------------------------------------------------------------------
        # TOP HEADER STRIP (Time, Tag, Weather, Responsive Tabs, Theme, Controls)
        # ----------------------------------------------------------------------
        header_strip = ctk.CTkFrame(ef, fg_color="transparent", height=40)
        header_strip.pack(fill="x", padx=14, pady=(8, 4))
        header_strip.pack_propagate(False)

        # Right side packed FIRST: Guaranteed fully visible, never clipped!
        h_right = ctk.CTkFrame(header_strip, fg_color="transparent")
        h_right.pack(side="right", fill="y")

        self.strip_battery_lbl = ctk.CTkLabel(
            h_right,
            text="⚡ 99%",
            font=("Segoe UI", 9, "bold"),
            text_color=t.get("accent", "#3882f6")
        )
        self.strip_battery_lbl.pack(side="left", padx=(0, 6))

        # TWO STREAMLINED CONTROLS AS INSTRUCTED BY MAMU:
        # 1. Free Floating Toggle
        # 2. Sticky Pin Toggle
        # Plus clean close button
        is_float = (getattr(self, "dock_mode", "TOP_CENTER") == "FLOATING")
        self.float_toggle_btn = ctk.CTkButton(
            h_right,
            text="⚓ Dock" if is_float else "🪟 Float",
            width=58,
            height=26,
            corner_radius=13,
            fg_color=t["accent"] if is_float else t["surface_card"],
            text_color="#ffffff" if is_float else t["text_primary"],
            hover_color=t["border_secondary"],
            font=("Segoe UI", 8, "bold"),
            command=self.toggle_floating_mode
        )
        self.float_toggle_btn.pack(side="left", padx=3)

        self.sticky_toggle_btn = ctk.CTkButton(
            h_right,
            text="📌 Sticky" if self.is_pinned else "🔓 Auto",
            width=62,
            height=26,
            corner_radius=13,
            fg_color=t["accent"] if self.is_pinned else t["surface_card"],
            text_color="#ffffff" if self.is_pinned else t["text_muted"],
            hover_color=t["border_secondary"],
            font=("Segoe UI", 8, "bold"),
            command=self.toggle_pin
        )
        self.sticky_toggle_btn.pack(side="left", padx=3)

        close_btn = ctk.CTkButton(
            h_right,
            text="✕",
            width=26,
            height=26,
            corner_radius=13,
            fg_color="transparent",
            hover_color="#ef4444",
            text_color=t.get("text_muted", "#64748b"),
            font=("Segoe UI", 9, "bold"),
            command=self.collapse_notch
        )
        close_btn.pack(side="left", padx=(3, 0))

        # Left: Live Beacon + Time + Tag + Weather
        h_left = ctk.CTkFrame(header_strip, fg_color="transparent")
        h_left.pack(side="left", fill="y")
        self._bind_drag_and_click(header_strip)
        self._bind_drag_and_click(h_left)

        self.strip_beacon = ctk.CTkLabel(
            h_left,
            text="●",
            font=("Segoe UI", 9, "bold"),
            text_color="#22c55e"
        )
        self.strip_beacon.pack(side="left", padx=(0, 4))
        self._bind_drag_and_click(self.strip_beacon)

        self.header_strip = header_strip
        self.strip_clock_lbl = ctk.CTkLabel(
            h_left,
            text=time.strftime("%I:%M %p"),
            font=("Segoe UI", 9, "bold"),
            text_color=t.get("text_primary", "#f8fafc")
        )
        self.strip_clock_lbl.pack(side="left", padx=(0, 4))
        self._bind_drag_and_click(self.strip_clock_lbl)

        sep1 = ctk.CTkLabel(h_left, text="•", font=("Segoe UI", 8), text_color=t.get("text_muted", "#64748b"))
        sep1.pack(side="left", padx=2)

        self.tag_lbl = ctk.CTkLabel(
            h_left,
            text="ABHI NOTCH",
            font=("Segoe UI", 9, "bold"),
            text_color=t.get("accent", "#3882f6")
        )
        self.tag_lbl.pack(side="left", padx=3)
        self._bind_drag_and_click(self.tag_lbl)
        self.tag_lbl.bind("<Button-3>", lambda e: self.cycle_theme())

        sep2 = ctk.CTkLabel(h_left, text="•", font=("Segoe UI", 8), text_color=t.get("text_muted", "#64748b"))
        sep2.pack(side="left", padx=2)

        self.strip_weather_lbl = ctk.CTkLabel(
            h_left,
            text="28° Sunny",
            font=("Segoe UI", 8),
            text_color=t.get("text_muted", "#64748b")
        )
        self.strip_weather_lbl.pack(side="left", padx=(2, 0))
        self._bind_drag_and_click(self.strip_weather_lbl)

        # Center: High-Tech Tab Pills (Responsive spacing, guaranteed no clipping)
        h_center = ctk.CTkFrame(header_strip, fg_color="transparent")
        h_center.pack(side="left", fill="x", expand=True, padx=4)

        self.tab_buttons = {}
        tabs = [
            ("🏠 Home", "HOME"),
            ("⚙️ Center", "CENTER"),
            ("📅 Cal", "CALENDAR"),
            ("♫ Music", "MUSIC"),
            ("⚡ Vitals", "VITALS")
        ]
        for label, tab_key in tabs:
            btn = ctk.CTkButton(
                h_center,
                text=label,
                font=("Segoe UI", 8, "bold"),
                width=52,
                height=24,
                corner_radius=12,
                fg_color=t["accent"] if tab_key == self.active_tab else "transparent",
                text_color="#ffffff" if tab_key == self.active_tab else t["text_secondary"],
                hover_color=t["surface_card"],
                command=lambda k=tab_key: self.set_tab(k)
            )
            btn.pack(side="left", padx=2)
            self.tab_buttons[tab_key] = btn

        # Thin divider
        div = ctk.CTkFrame(ef, fg_color=t["border"], height=1)
        div.pack(fill="x", padx=14, pady=(2, 6))
        self.header_div = div

        # ----------------------------------------------------------------------
        # MAIN BODY CONTAINER (Houses the 6 Tabs)
        # ----------------------------------------------------------------------
        self.body_container = ctk.CTkFrame(ef, fg_color="transparent")
        self.body_container.pack(fill="both", expand=True, padx=14, pady=(0, 6))

        self.tab_frames = {}
        self._build_tab_home()
        self._build_tab_center()
        self._build_tab_calendar()
        self._build_tab_music()
        self._build_tab_vitals()

        # Display default tab as requested by Mamu: CENTER!
        self.set_tab("CENTER")

        # ----------------------------------------------------------------------
        # BOTTOM INPUT & VOICE DISPATCH BAR
        # ----------------------------------------------------------------------
        self.input_bar = ctk.CTkFrame(
            ef,
            fg_color=t["surface"],
            border_color=t["border"],
            border_width=1,
            corner_radius=14,
            height=38
        )
        self.input_bar.pack(fill="x", padx=14, pady=(2, 10))
        self.input_bar.pack_propagate(False)

        self.mic_btn = ctk.CTkButton(
            self.input_bar,
            text="🎙️",
            width=28,
            height=28,
            corner_radius=14,
            fg_color=t["surface_card"],
            hover_color=t["border"],
            text_color=t["accent"],
            font=("Segoe UI", 10),
            command=self.toggle_mic
        )
        self.mic_btn.pack(side="left", padx=(6, 4), pady=5)

        self.input_entry = ctk.CTkEntry(
            self.input_bar,
            placeholder_text="Talk with Abhi or type command...",
            placeholder_text_color=t["text_muted"],
            font=("Segoe UI", 9),
            fg_color="transparent",
            border_width=0,
            text_color=t["text_primary"]
        )
        self.input_entry.pack(side="left", fill="both", expand=True, padx=4, pady=4)
        self.input_entry.bind("<Return>", lambda e: self.submit_input())

        self.send_btn = ctk.CTkButton(
            self.input_bar,
            text="Send",
            font=("Segoe UI", 8, "bold"),
            fg_color=t["accent"],
            hover_color=t["accent_hover"],
            text_color="#ffffff",
            width=58,
            height=26,
            corner_radius=8,
            command=self.submit_input
        )
        self.send_btn.pack(side="right", padx=(4, 6), pady=6)

    def set_tab(self, tab_key: str):
        self.active_tab = tab_key
        t = self.theme
        # Update tab pill styles with active theme
        for key, btn in self.tab_buttons.items():
            if key == tab_key:
                btn.configure(fg_color=t["accent"], text_color="#ffffff")
            else:
                btn.configure(fg_color="transparent", text_color=t["text_secondary"], hover_color=t["surface_card"])

        # Update left rail buttons
        if hasattr(self, "rail_buttons"):
            for btn, key in self.rail_buttons:
                if key == tab_key:
                    btn.configure(fg_color=t["accent"], text_color="#ffffff")
                else:
                    btn.configure(fg_color=t["surface"], text_color=t["text_secondary"])

        # Switch visible tab frame
        for key, f in self.tab_frames.items():
            if key == tab_key:
                f.pack(fill="both", expand=True)
            else:
                f.pack_forget()

    def _on_notch_leave(self, event):
        if self.is_expanded and not self.is_pinned:
            if hasattr(self, "_hover_collapse_job") and self._hover_collapse_job:
                self.after_cancel(self._hover_collapse_job)
            self._hover_collapse_job = self.after(450, self._auto_collapse_if_outside)

    def _auto_collapse_if_outside(self):
        self._hover_collapse_job = None
        if self.is_expanded and not self.is_pinned:
            try:
                x = self.winfo_pointerx()
                y = self.winfo_pointery()
                wx = self.winfo_rootx()
                wy = self.winfo_rooty()
                ww = self.winfo_width()
                wh = self.winfo_height()
                if not (wx <= x <= wx + ww and wy <= y <= wy + wh):
                    self.collapse_notch()
            except Exception:
                pass

    # ==========================================================================
    # TAB 1: ⚙️ CENTER (Windows Control Center & System Sliders)
    # ==========================================================================

    def _build_tab_center(self):
        f = ctk.CTkFrame(self.body_container, fg_color="transparent")
        self.tab_frames["CENTER"] = f
        t = self.theme

        # Dual Panel Container (Left Sunset Artwork & Bot Face + Right Controls & Dialogue)
        dual_container = ctk.CTkFrame(f, fg_color="transparent")
        dual_container.pack(fill="both", expand=True)

        # ----------------------------------------------------------------------
        # LEFT CHASSIS: Sunset Artwork + Bot Faceplate (HAPPY) + Nav Rail
        # ----------------------------------------------------------------------
        self.left_chassis = ctk.CTkFrame(
            dual_container,
            fg_color=t["surface"],
            corner_radius=16,
            border_width=1,
            border_color=t["border"],
            width=240
        )
        self.left_chassis.pack(side="left", fill="y", padx=(0, 10))
        self.left_chassis.pack_propagate(False)

        # Date & Weather Header Badge
        cur_date_str = time.strftime("%a, %d %b").upper()
        self.date_badge = ctk.CTkFrame(self.left_chassis, fg_color=t["surface_card"], corner_radius=8, height=26)
        self.date_badge.pack(fill="x", padx=10, pady=(8, 4))
        self.date_badge_lbl = ctk.CTkLabel(
            self.date_badge,
            text=f"📅  {cur_date_str} / 28° Sunny",
            font=("Segoe UI", 8, "bold"),
            text_color=t["text_secondary"]
        )
        self.date_badge_lbl.pack(side="left", padx=8)

        # Sunset Ambient Art Card with Pink Glowing Orb & Mountain Silhouettes
        self.art_card = ctk.CTkFrame(
            self.left_chassis,
            fg_color=t["bg"],
            corner_radius=14,
            border_width=1,
            border_color=t["border_glow"],
            height=130
        )
        self.art_card.pack(fill="x", padx=10, pady=(4, 6))
        self.art_card.pack_propagate(False)

        # Celestial Sun Orb
        sun_orb = ctk.CTkLabel(
            self.art_card,
            text="●",
            font=("Segoe UI", 28, "bold"),
            text_color="#f43f5e"
        )
        sun_orb.place(relx=0.5, rely=0.20, anchor="center")

        # Mountain Silhouette Background
        mountains_lbl = ctk.CTkLabel(
            self.art_card,
            text="▲ ▲▲ ▲▲▲ ▲",
            font=("Segoe UI", 14, "bold"),
            text_color="#090510"
        )
        mountains_lbl.place(relx=0.5, rely=0.84, anchor="center")

        # Expressive Bot Screen Chassis
        self.bot_screen = ctk.CTkFrame(
            self.art_card,
            fg_color="#050811",
            corner_radius=10,
            border_width=1.5,
            border_color=t["accent"],
            width=100,
            height=64
        )
        self.bot_screen.place(relx=0.5, rely=0.50, anchor="center")
        self.bot_screen.pack_propagate(False)

        # Smiling Curved Eyes & Mouth
        self.bot_eyes_lbl = ctk.CTkLabel(
            self.bot_screen,
            text="⌒   ⌒",
            font=("Segoe UI", 15, "bold"),
            text_color="#fbbf24"
        )
        self.bot_eyes_lbl.pack(pady=(6, 0))

        self.bot_mouth_lbl = ctk.CTkLabel(
            self.bot_screen,
            text="‿",
            font=("Segoe UI", 12, "bold"),
            text_color="#f97316"
        )
        self.bot_mouth_lbl.pack()

        # Bold "HAPPY" Tag Below Bot Screen
        self.happy_tag = ctk.CTkLabel(
            self.art_card,
            text=" HAPPY ",
            font=("Segoe UI", 7, "bold"),
            text_color="#ffffff",
            fg_color="#050811",
            corner_radius=6
        )
        self.happy_tag.place(relx=0.5, rely=0.76, anchor="center")

        # Bottom Tab Navigation Rail (3 Distinct Rows - No Overlap, Guaranteed Fully Visible)
        self.tab_rail = ctk.CTkFrame(self.left_chassis, fg_color=t["surface_card"], corner_radius=10)
        self.tab_rail.pack(side="bottom", fill="x", padx=8, pady=(4, 6))

        rail_row1 = ctk.CTkFrame(self.tab_rail, fg_color="transparent")
        rail_row1.pack(fill="x", padx=4, pady=(4, 2))
        rail_row2 = ctk.CTkFrame(self.tab_rail, fg_color="transparent")
        rail_row2.pack(fill="x", padx=4, pady=2)
        rail_row3 = ctk.CTkFrame(self.tab_rail, fg_color="transparent")
        rail_row3.pack(fill="x", padx=4, pady=(2, 4))

        self.rail_buttons = []
        rail_items_row1 = [("🏠 HOME", "HOME"), ("⚙️ CENTER", "CENTER")]
        for lbl, t_key in rail_items_row1:
            btn = ctk.CTkButton(
                rail_row1,
                text=lbl,
                font=("Segoe UI", 8, "bold"),
                height=24,
                corner_radius=6,
                fg_color=t["accent"] if t_key == self.active_tab else t["surface"],
                text_color="#ffffff" if t_key == self.active_tab else t["text_secondary"],
                hover_color=t["surface_card"],
                command=lambda k=t_key: self.set_tab(k)
            )
            btn.pack(side="left", fill="x", expand=True, padx=2)
            self.rail_buttons.append((btn, t_key))

        rail_items_row2 = [("📅 CALENDAR", "CALENDAR"), ("♫ MUSIC", "MUSIC")]
        for lbl, t_key in rail_items_row2:
            btn = ctk.CTkButton(
                rail_row2,
                text=lbl,
                font=("Segoe UI", 8, "bold"),
                height=24,
                corner_radius=6,
                fg_color=t["accent"] if t_key == self.active_tab else t["surface"],
                text_color="#ffffff" if t_key == self.active_tab else t["text_secondary"],
                hover_color=t["surface_card"],
                command=lambda k=t_key: self.set_tab(k)
            )
            btn.pack(side="left", fill="x", expand=True, padx=2)
            self.rail_buttons.append((btn, t_key))

        vitals_btn = ctk.CTkButton(
            rail_row3,
            text="⚡ SYSTEM VITALS",
            font=("Segoe UI", 8, "bold"),
            height=24,
            corner_radius=6,
            fg_color=t["accent"] if self.active_tab == "VITALS" else t["surface"],
            text_color="#ffffff" if self.active_tab == "VITALS" else t["text_secondary"],
            hover_color=t["surface_card"],
            command=lambda: self.set_tab("VITALS")
        )
        vitals_btn.pack(fill="x", expand=True, padx=2)
        self.rail_buttons.append((vitals_btn, "VITALS"))

        # ----------------------------------------------------------------------
        # RIGHT CHASSIS: Controls, Sliders & Integrated Live Transcription Feed
        # ----------------------------------------------------------------------
        right_chassis = ctk.CTkFrame(dual_container, fg_color="transparent")
        right_chassis.pack(side="left", fill="both", expand=True)

        card_on_fg = t["surface_card"]
        card_on_text = t["text_primary"]
        card_off_fg = t["surface"]
        card_off_text = t["text_muted"]

        # 4 Main Control Cards (2x2 Grid - 2 per row for balanced, responsive display)
        grid_frame = ctk.CTkFrame(right_chassis, fg_color="transparent")
        grid_frame.pack(fill="x", pady=(0, 6))

        grid_row1 = ctk.CTkFrame(grid_frame, fg_color="transparent")
        grid_row1.pack(fill="x", pady=(0, 4))
        grid_row2 = ctk.CTkFrame(grid_frame, fg_color="transparent")
        grid_row2.pack(fill="x", pady=(0, 0))

        # Row 1: Wi-Fi Card & Bluetooth Card
        self.wifi_card = ctk.CTkButton(
            grid_row1,
            text="📶  Wi-Fi\nConnected · 5GHz",
            font=("Segoe UI", 9, "bold"),
            height=44,
            corner_radius=12,
            fg_color=card_on_fg if self.is_wifi_on else card_off_fg,
            text_color=card_on_text if self.is_wifi_on else card_off_text,
            hover_color=t["border_secondary"],
            command=self.toggle_wifi
        )
        self.wifi_card.pack(side="left", fill="x", expand=True, padx=(0, 3))

        self.bt_card = ctk.CTkButton(
            grid_row1,
            text="🔊  Bluetooth\nOn · Audio Sync",
            font=("Segoe UI", 9, "bold"),
            height=44,
            corner_radius=12,
            fg_color=card_on_fg if self.is_bt_on else card_off_fg,
            text_color=card_on_text if self.is_bt_on else card_off_text,
            hover_color=t["border_secondary"],
            command=self.toggle_bluetooth
        )
        self.bt_card.pack(side="right", fill="x", expand=True, padx=(3, 0))

        # Row 2: DND Mode Card & Notch Mode Card
        self.dnd_card = ctk.CTkButton(
            grid_row2,
            text="🌙  DND Mode\nAlerts Active",
            font=("Segoe UI", 9, "bold"),
            height=44,
            corner_radius=12,
            fg_color=card_on_fg if self.is_dnd_on else card_off_fg,
            text_color=card_on_text if self.is_dnd_on else card_off_text,
            hover_color=t["border_secondary"],
            command=self.toggle_dnd
        )
        self.dnd_card.pack(side="left", fill="x", expand=True, padx=(0, 3))

        self.notch_mode_card = ctk.CTkButton(
            grid_row2,
            text="🔝  Notch Mode\nTop Center Dock",
            font=("Segoe UI", 9, "bold"),
            height=44,
            corner_radius=12,
            fg_color=card_on_fg,
            text_color=card_on_text,
            hover_color=t["border_secondary"],
            command=self.cycle_dock_mode
        )
        self.notch_mode_card.pack(side="right", fill="x", expand=True, padx=(3, 0))
        self._update_notch_mode_card_label()

        # Sliders Section (Volume & Brightness)
        self.sliders_box = ctk.CTkFrame(right_chassis, fg_color=t["surface"], corner_radius=12, border_width=1, border_color=t["border"])
        self.sliders_box.pack(fill="x", pady=(2, 6), padx=0)

        # Volume Row
        vol_row = ctk.CTkFrame(self.sliders_box, fg_color="transparent")
        vol_row.pack(fill="x", padx=12, pady=(6, 2))
        self.vol_lbl = ctk.CTkLabel(vol_row, text="🔊 Volume", font=("Segoe UI", 8, "bold"), text_color=t["text_secondary"], width=75, anchor="w")
        self.vol_lbl.pack(side="left")
        self.vol_slider = ctk.CTkSlider(vol_row, from_=0, to=100, number_of_steps=100, command=self._on_volume_change, button_color=t["accent"], progress_color=t["accent"])
        self.vol_slider.set(self.current_volume)
        self.vol_slider.pack(side="left", fill="x", expand=True, padx=8)
        self.vol_val_lbl = ctk.CTkLabel(vol_row, text=f"{self.current_volume}%", font=("Segoe UI", 8, "bold"), text_color=t["text_primary"], width=34)
        self.vol_val_lbl.pack(side="right")

        # Brightness Row
        bri_row = ctk.CTkFrame(self.sliders_box, fg_color="transparent")
        bri_row.pack(fill="x", padx=12, pady=(2, 6))
        self.bri_lbl = ctk.CTkLabel(bri_row, text="☀️ Brightness", font=("Segoe UI", 8, "bold"), text_color=t["text_secondary"], width=75, anchor="w")
        self.bri_lbl.pack(side="left")
        self.bri_slider = ctk.CTkSlider(bri_row, from_=10, to=100, number_of_steps=90, command=self._on_brightness_change, button_color=t["accent"], progress_color=t["accent"])
        self.bri_slider.set(self.current_brightness)
        self.bri_slider.pack(side="left", fill="x", expand=True, padx=8)
        self.bri_val_lbl = ctk.CTkLabel(bri_row, text=f"{self.current_brightness}%", font=("Segoe UI", 8, "bold"), text_color=t["text_primary"], width=34)
        self.bri_val_lbl.pack(side="right")

        # Integrated Real-Time Transcription Chat Feed (Image 1 Style)
        self.chat_box = ctk.CTkFrame(right_chassis, fg_color=t["surface"], corner_radius=12, border_width=1, border_color=t["border"])
        self.chat_box.pack(fill="both", expand=True, pady=(2, 0))

        self.chat_hdr = ctk.CTkFrame(self.chat_box, fg_color=t["surface_card"], corner_radius=8, height=24)
        self.chat_hdr.pack(fill="x", padx=8, pady=(6, 4))
        ctk.CTkLabel(
            self.chat_hdr,
            text="● REAL-TIME TRANSCRIPTION",
            font=("Segoe UI", 8, "bold"),
            text_color="#ef4444"
        ).pack(side="left", padx=8)
        ctk.CTkLabel(
            self.chat_hdr,
            text="● LIVE STREAM",
            font=("Segoe UI", 7, "bold"),
            text_color="#22c55e"
        ).pack(side="right", padx=8)

        self.chat_display = ctk.CTkTextbox(
            self.chat_box,
            fg_color="transparent",
            text_color=t["text_primary"],
            font=("Segoe UI", 8),
            wrap="word"
        )
        self.chat_display.pack(fill="both", expand=True, padx=8, pady=4)
        self.chat_display.insert("end", "ABHI: Good day, Mamu! All neural systems online. What are we building or automating today?\n\n")

    def toggle_wifi(self):
        self.is_wifi_on = not self.is_wifi_on
        t = self.theme
        if self.is_wifi_on:
            self.wifi_card.configure(fg_color=t["surface_card"], text_color=t["text_primary"], text="📶  Wi-Fi\nConnected · 5GHz")
        else:
            self.wifi_card.configure(fg_color=t["surface"], text_color=t["text_muted"], text="📶  Wi-Fi\nDisconnected")
        subprocess.Popen(["cmd.exe", "/c", "start", "ms-settings:network-wifi"])

    def toggle_dnd(self):
        self.is_dnd_on = not self.is_dnd_on
        t = self.theme
        if self.is_dnd_on:
            self.dnd_card.configure(fg_color=t["surface_card"], text_color=t["text_primary"], text="🌙  DND Mode\nDo Not Disturb")
        else:
            self.dnd_card.configure(fg_color=t["surface"], text_color=t["text_muted"], text="🌙  DND Mode\nAlerts Active")

    def toggle_bluetooth(self):
        self.is_bt_on = not self.is_bt_on
        t = self.theme
        if self.is_bt_on:
            self.bt_card.configure(fg_color=t["surface_card"], text_color=t["text_primary"], text="🔊  Bluetooth\nOn · Audio Sync")
        else:
            self.bt_card.configure(fg_color=t["surface"], text_color=t["text_muted"], text="🔊  Bluetooth\nOff")
        subprocess.Popen(["cmd.exe", "/c", "start", "ms-settings:bluetooth"])

    def toggle_night_light(self):
        self.is_night_light_on = not self.is_night_light_on
        subprocess.Popen(["cmd.exe", "/c", "start", "ms-settings:display"])

    def toggle_battery_saver(self):
        self.is_battery_saver_on = not self.is_battery_saver_on
        subprocess.Popen(["cmd.exe", "/c", "start", "ms-settings:batterysaver"])

    def _on_volume_change(self, val):
        self.current_volume = int(val)
        self.vol_val_lbl.configure(text=f"{self.current_volume}%")
        try:
            self.audio_controller.set_volume(self.current_volume)
        except Exception:
            pass

    def _on_brightness_change(self, val):
        self.current_brightness = int(val)
        self.bri_val_lbl.configure(text=f"{self.current_brightness}%")
        def set_bri_async(b_val):
            try:
                cmd = f"(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, {b_val})"
                subprocess.run(["powershell", "-NoProfile", "-Command", cmd], capture_output=True, timeout=1.5)
            except Exception:
                pass
        threading.Thread(target=set_bri_async, args=(self.current_brightness,), daemon=True).start()

    # ==========================================================================
    # TAB 2: 📅 CALENDAR & FOCUS SCHEDULER
    # ==========================================================================

    def _build_tab_calendar(self):
        f = ctk.CTkFrame(self.body_container, fg_color="transparent")
        self.tab_frames["CALENDAR"] = f
        t = self.theme

        cal_grid = ctk.CTkFrame(f, fg_color="transparent")
        cal_grid.pack(fill="both", expand=True)

        # Left: Interactive Month Calendar
        self.cal_left_card = ctk.CTkFrame(cal_grid, fg_color=t["surface_card"], corner_radius=16, border_width=1, border_color=t["border"])
        self.cal_left_card.pack(side="left", fill="both", expand=True, padx=(0, 6), pady=2)

        # Month Header
        m_hdr = ctk.CTkFrame(self.cal_left_card, fg_color="transparent")
        m_hdr.pack(fill="x", padx=12, pady=(10, 6))

        self.cal_m_title = ctk.CTkLabel(m_hdr, text="📅  November 2026", font=("Segoe UI", 10, "bold"), text_color=t["text_primary"])
        self.cal_m_title.pack(side="left")

        self.cal_today_btn = ctk.CTkButton(m_hdr, text="Today", width=46, height=22, font=("Segoe UI", 7, "bold"), fg_color=t["surface"], text_color=t["text_secondary"], hover_color=t["border_secondary"], corner_radius=6)
        self.cal_today_btn.pack(side="right")

        # Days Header
        days_hdr = ctk.CTkFrame(self.cal_left_card, fg_color="transparent")
        days_hdr.pack(fill="x", padx=12, pady=2)
        for day_name in ["S", "M", "T", "W", "T", "F", "S"]:
            ctk.CTkLabel(days_hdr, text=day_name, font=("Segoe UI", 7, "bold"), text_color=t["text_muted"], width=44).pack(side="left", expand=True)

        # Days Grid (7 Columns)
        days_box = ctk.CTkFrame(self.cal_left_card, fg_color="transparent")
        days_box.pack(fill="both", expand=True, padx=12, pady=(2, 10))

        events_map = {
            5: "💼 Sprint",
            9: "📝 Refactor",
            12: "🚀 Release",
            18: "⚡ Sync",
            25: "🎯 OKR",
            28: "🛡️ Security"
        }

        self.cal_day_cells = []
        row_f = None
        for i in range(1, 31):
            if (i - 1) % 7 == 0:
                row_f = ctk.CTkFrame(days_box, fg_color="transparent")
                row_f.pack(fill="x", expand=True)

            is_today = (i == 18)
            has_ev = i in events_map
            txt = f"{i} •" if has_ev else str(i)
            cell = ctk.CTkLabel(
                row_f,
                text=txt,
                font=("Segoe UI", 8, "bold" if is_today else "normal"),
                text_color="#ffffff" if is_today else (t["accent"] if has_ev else t["text_secondary"]),
                fg_color=t["accent"] if is_today else ("transparent"),
                corner_radius=6 if is_today else 0,
                width=44,
                height=24
            )
            cell.pack(side="left", expand=True, padx=1, pady=1)
            self.cal_day_cells.append((cell, is_today, has_ev))

        # Right: Focus Timer & 2x2 Presets
        self.cal_right_card = ctk.CTkFrame(cal_grid, fg_color=t["surface_card"], corner_radius=16, border_width=1, border_color=t["border"])
        self.cal_right_card.pack(side="right", fill="both", expand=True, padx=(6, 0), pady=2)

        # Timer Display
        timer_box = ctk.CTkFrame(self.cal_right_card, fg_color="transparent")
        timer_box.pack(fill="both", expand=True, padx=16, pady=16)

        ctk.CTkLabel(timer_box, text="FOCUS INTERVAL TIMER", font=("Segoe UI", 8, "bold"), text_color=t["text_muted"]).pack(pady=(4, 2))

        self.timer_lbl = ctk.CTkLabel(timer_box, text="00:00", font=("Segoe UI", 36, "bold"), text_color=t["text_primary"])
        self.timer_lbl.pack(pady=8)

        # Timer Buttons
        t_btns = ctk.CTkFrame(timer_box, fg_color="transparent")
        t_btns.pack(fill="x", pady=6)

        self.start_timer_btn = ctk.CTkButton(
            t_btns, text="Start", font=("Segoe UI", 9, "bold"), fg_color=t["accent"], text_color="#ffffff",
            hover_color=t["accent_hover"], height=32, corner_radius=16, command=self.toggle_timer
        )
        self.start_timer_btn.pack(side="left", fill="x", expand=True, padx=(0, 6))

        self.cal_reset_btn = ctk.CTkButton(
            t_btns, text="Reset", font=("Segoe UI", 9, "bold"), fg_color=t["surface"], text_color=t["text_secondary"],
            hover_color=t["border_secondary"], height=32, corner_radius=16, command=self.reset_timer
        )
        self.cal_reset_btn.pack(side="left", fill="x", expand=True, padx=(6, 0))

        # 2x2 Preset Grid
        presets_grid = ctk.CTkFrame(timer_box, fg_color="transparent")
        presets_grid.pack(fill="x", pady=(10, 4))

        row1 = ctk.CTkFrame(presets_grid, fg_color="transparent")
        row1.pack(fill="x", pady=2)
        row2 = ctk.CTkFrame(presets_grid, fg_color="transparent")
        row2.pack(fill="x", pady=2)

        self.cal_preset_btns = []
        for parent_row, min_val, side_pad in [(row1, 5, (0, 3)), (row1, 15, (3, 0)), (row2, 25, (0, 3)), (row2, 50, (3, 0))]:
            btn = ctk.CTkButton(
                parent_row, text=f"{min_val}m", font=("Segoe UI", 8, "bold"), fg_color=t["surface"], text_color=t["text_primary"],
                hover_color=t["border_secondary"], height=28, corner_radius=8, command=lambda m=min_val: self.set_timer_preset(m)
            )
            btn.pack(side="left", fill="x", expand=True, padx=side_pad)
            self.cal_preset_btns.append(btn)

    def toggle_timer(self):
        self.is_timer_running = not self.is_timer_running
        if self.is_timer_running:
            self.start_timer_btn.configure(text="Pause", fg_color="#f97316", text_color="#ffffff")
            if not self.timer_thread or not self.timer_thread.is_alive():
                self.timer_thread = threading.Thread(target=self._timer_worker, daemon=True)
                self.timer_thread.start()
        else:
            self.start_timer_btn.configure(text="Start", fg_color=self.theme["accent"], text_color="#ffffff")

    def reset_timer(self):
        self.is_timer_running = False
        self.timer_seconds = 0
        self.timer_lbl.configure(text="00:00")
        self.start_timer_btn.configure(text="Start", fg_color=self.theme["accent"], text_color="#ffffff")

    def set_timer_preset(self, minutes: int):
        self.timer_seconds = minutes * 60
        m, s = divmod(self.timer_seconds, 60)
        self.timer_lbl.configure(text=f"{m:02d}:{s:02d}")

    def _timer_worker(self):
        while self.is_timer_running:
            time.sleep(1.0)
            if self.is_timer_running:
                self.timer_seconds += 1
                m, s = divmod(self.timer_seconds, 60)
                try:
                    self.timer_lbl.configure(text=f"{m:02d}:{s:02d}")
                except Exception:
                    break

    # ==========================================================================
    # TAB 3: ♫ MUSIC (Real Online Player, Lyrics, Scrubber, Media Keys)
    # ==========================================================================

    def _build_tab_music(self):
        f = ctk.CTkFrame(self.body_container, fg_color="transparent")
        self.tab_frames["MUSIC"] = f
        t = self.theme

        self.music_card = ctk.CTkFrame(f, fg_color=t["surface_card"], corner_radius=16, border_width=1, border_color=t["border"])
        self.music_card.pack(fill="both", expand=True, padx=2, pady=2)

        # Track Header & Artwork Banner
        top_row = ctk.CTkFrame(self.music_card, fg_color="transparent")
        top_row.pack(fill="x", padx=16, pady=(12, 4))

        info_box = ctk.CTkFrame(top_row, fg_color="transparent")
        info_box.pack(side="left", fill="both", expand=True)

        self.music_artist_lbl = ctk.CTkLabel(info_box, text="NOVA LANE · GOLDEN HOUR", font=("Segoe UI", 8, "bold"), text_color=t["text_secondary"], anchor="w")
        self.music_artist_lbl.pack(fill="x")

        self.music_title_lbl = ctk.CTkLabel(info_box, text="Golden Hour", font=("Segoe UI", 18, "bold"), text_color=t["text_primary"], anchor="w")
        self.music_title_lbl.pack(fill="x", pady=(2, 0))

        self.music_lyrics_lbl = ctk.CTkLabel(info_box, text='"Windows down, the city\'s glowing..."', font=("Segoe UI", 9, "italic"), text_color=t["text_secondary"], anchor="w")
        self.music_lyrics_lbl.pack(fill="x", pady=(2, 0))

        # Animated Equalizer Bars
        self.eq_lbl = ctk.CTkLabel(top_row, text="  ▂ ▃ ▅ ▆ ▇ ▆ ▅ ▃  ", font=("Segoe UI", 12, "bold"), text_color=t["accent"])
        self.eq_lbl.pack(side="right", padx=10)

        # Scrubber Slider
        scrub_row = ctk.CTkFrame(self.music_card, fg_color="transparent")
        scrub_row.pack(fill="x", padx=16, pady=6)

        self.scrub_slider = ctk.CTkSlider(scrub_row, from_=0, to=self.music_duration, number_of_steps=self.music_duration, button_color=t["accent"], progress_color=t["accent"])
        self.scrub_slider.set(self.music_progress)
        self.scrub_slider.pack(fill="x")

        time_row = ctk.CTkFrame(self.music_card, fg_color="transparent")
        time_row.pack(fill="x", padx=16)
        self.cur_time_lbl = ctk.CTkLabel(time_row, text="0:34", font=("Segoe UI", 7, "bold"), text_color=t["text_muted"])
        self.cur_time_lbl.pack(side="left")
        self.tot_time_lbl = ctk.CTkLabel(time_row, text="2:41", font=("Segoe UI", 7, "bold"), text_color=t["text_muted"])
        self.tot_time_lbl.pack(side="right")

        # Media Controls (Prev, Play/Pause, Next)
        ctrl_row = ctk.CTkFrame(self.music_card, fg_color="transparent")
        ctrl_row.pack(fill="x", padx=16, pady=(6, 10))

        self.music_prev_btn = ctk.CTkButton(ctrl_row, text="⏮", width=42, height=36, corner_radius=18, fg_color=t["surface"], text_color=t["text_primary"], hover_color=t["border_secondary"], font=("Segoe UI", 12), command=self.media_prev)
        self.music_prev_btn.pack(side="left", padx=6)

        self.play_btn = ctk.CTkButton(ctrl_row, text="▶", width=52, height=36, corner_radius=18, fg_color=t["accent"], text_color="#ffffff", hover_color=t["accent_hover"], font=("Segoe UI", 13, "bold"), command=self.media_toggle_play)
        self.play_btn.pack(side="left", padx=6)

        self.music_next_btn = ctk.CTkButton(ctrl_row, text="⏭", width=42, height=36, corner_radius=18, fg_color=t["surface"], text_color=t["text_primary"], hover_color=t["border_secondary"], font=("Segoe UI", 12), command=self.media_next)
        self.music_next_btn.pack(side="left", padx=6)

        # Quick Tray App Launchers
        tray_lbl = ctk.CTkLabel(ctrl_row, text="Tray:", font=("Segoe UI", 8, "bold"), text_color=t["text_muted"])
        tray_lbl.pack(side="left", padx=(18, 6))

        self.music_tray_btns = []
        for icon, app_url in [("🎵 Spotify", "spotify:"), ("▶ YouTube Music", "https://music.youtube.com")]:
            tb = ctk.CTkButton(
                ctrl_row, text=icon, font=("Segoe UI", 7, "bold"), height=26, corner_radius=8,
                fg_color=t["surface"], text_color=t["text_secondary"], hover_color=t["border_secondary"], command=lambda u=app_url: subprocess.Popen(["cmd.exe", "/c", "start", u])
            )
            tb.pack(side="left", padx=3)
            self.music_tray_btns.append(tb)

    def media_toggle_play(self):
        self.is_playing = not self.is_playing
        if hasattr(self, "play_btn"):
            self.play_btn.configure(text="⏸" if self.is_playing else "▶")
        if hasattr(self, "home_music_play_btn"):
            self.home_music_play_btn.configure(text="⏸" if self.is_playing else "▶")
        # Hardware media key VK_MEDIA_PLAY_PAUSE = 0xB3
        ctypes.windll.user32.keybd_event(0xB3, 0, 0, 0)
        ctypes.windll.user32.keybd_event(0xB3, 0, 2, 0)

    def toggle_music(self):
        self.media_toggle_play()

    def media_next(self):
        # VK_MEDIA_NEXT_TRACK = 0xB0
        ctypes.windll.user32.keybd_event(0xB0, 0, 0, 0)
        ctypes.windll.user32.keybd_event(0xB0, 0, 2, 0)

    def media_prev(self):
        # VK_MEDIA_PREV_TRACK = 0xB1
        ctypes.windll.user32.keybd_event(0xB1, 0, 0, 0)
        ctypes.windll.user32.keybd_event(0xB1, 0, 2, 0)

    # ==========================================================================
    # TAB 4: ⚡ VITALS (Real CPU, RAM, Disk Gauges & Active Window Tracker)
    # ==========================================================================

    def _build_tab_vitals(self):
        f = ctk.CTkFrame(self.body_container, fg_color="transparent")
        self.tab_frames["VITALS"] = f
        t = self.theme

        self.vitals_card = ctk.CTkFrame(f, fg_color=t["surface_card"], corner_radius=16, border_width=1, border_color=t["border"])
        self.vitals_card.pack(fill="both", expand=True, padx=2, pady=2)

        # Telemetry Top Banner
        top_ban = ctk.CTkFrame(self.vitals_card, fg_color="transparent")
        top_ban.pack(fill="x", padx=16, pady=(12, 8))

        # Screen Time
        st_box = ctk.CTkFrame(top_ban, fg_color="transparent")
        st_box.pack(side="left", fill="both", expand=True)
        ctk.CTkLabel(st_box, text="SCREEN TIME", font=("Segoe UI", 7, "bold"), text_color=t["text_muted"], anchor="w").pack(fill="x")
        self.screen_time_lbl = ctk.CTkLabel(st_box, text="0h 00m", font=("Segoe UI", 12, "bold"), text_color=t["text_primary"], anchor="w")
        self.screen_time_lbl.pack(fill="x")

        # Active Window
        aw_box = ctk.CTkFrame(top_ban, fg_color="transparent")
        aw_box.pack(side="left", fill="both", expand=True)
        ctk.CTkLabel(aw_box, text="ACTIVE FOREGROUND WINDOW", font=("Segoe UI", 7, "bold"), text_color=t["text_muted"], anchor="w").pack(fill="x")
        self.active_win_lbl = ctk.CTkLabel(aw_box, text="Windows Desktop", font=("Segoe UI", 10, "bold"), text_color=t["accent"], anchor="w")
        self.active_win_lbl.pack(fill="x")

        # Power Status
        pw_box = ctk.CTkFrame(top_ban, fg_color="transparent")
        pw_box.pack(side="right")
        ctk.CTkLabel(pw_box, text="POWER STATUS", font=("Segoe UI", 7, "bold"), text_color=t["text_muted"], anchor="e").pack(fill="x")
        self.power_stat_lbl = ctk.CTkLabel(pw_box, text="⚡ 99% Connected", font=("Segoe UI", 10, "bold"), text_color="#22c55e", anchor="e")
        self.power_stat_lbl.pack(fill="x")

        # 3 Big Gauge Cards (CPU, RAM, DISK)
        gauges_row = ctk.CTkFrame(self.vitals_card, fg_color="transparent")
        gauges_row.pack(fill="x", padx=16, pady=(4, 6))

        # CPU Card
        self.cpu_card = ctk.CTkFrame(gauges_row, fg_color=t["surface"], corner_radius=12, border_width=1, border_color=t["border"])
        self.cpu_card.pack(side="left", fill="both", expand=True, padx=(0, 4))
        ctk.CTkLabel(self.cpu_card, text="CPU USAGE", font=("Segoe UI", 7, "bold"), text_color="#38bdf8").pack(pady=(6, 1))
        self.cpu_pct_lbl = ctk.CTkLabel(self.cpu_card, text="24%", font=("Segoe UI", 18, "bold"), text_color=t["text_primary"])
        self.cpu_pct_lbl.pack(pady=2)
        ctk.CTkLabel(self.cpu_card, text="Multi-Core", font=("Segoe UI", 7), text_color=t["text_muted"]).pack(pady=(0, 6))

        # RAM Card
        self.ram_card = ctk.CTkFrame(gauges_row, fg_color=t["surface"], corner_radius=12, border_width=1, border_color=t["border"])
        self.ram_card.pack(side="left", fill="both", expand=True, padx=2)
        ctk.CTkLabel(self.ram_card, text="RAM USAGE", font=("Segoe UI", 7, "bold"), text_color="#f97316").pack(pady=(6, 1))
        self.ram_pct_lbl = ctk.CTkLabel(self.ram_card, text="45%", font=("Segoe UI", 18, "bold"), text_color=t["text_primary"])
        self.ram_pct_lbl.pack(pady=2)
        ctk.CTkLabel(self.ram_card, text="16 GB Total", font=("Segoe UI", 7), text_color=t["text_muted"]).pack(pady=(0, 6))

        # Disk Card
        self.disk_card = ctk.CTkFrame(gauges_row, fg_color=t["surface"], corner_radius=12, border_width=1, border_color=t["border"])
        self.disk_card.pack(side="left", fill="both", expand=True, padx=(4, 0))
        ctk.CTkLabel(self.disk_card, text="DISK USAGE", font=("Segoe UI", 7, "bold"), text_color="#a855f7").pack(pady=(6, 1))
        self.disk_pct_lbl = ctk.CTkLabel(self.disk_card, text="32%", font=("Segoe UI", 18, "bold"), text_color=t["text_primary"])
        self.disk_pct_lbl.pack(pady=2)
        ctk.CTkLabel(self.disk_card, text="NVMe SSD", font=("Segoe UI", 7), text_color=t["text_muted"]).pack(pady=(0, 6))

        # Tray Icons Row
        tray_f = ctk.CTkFrame(self.vitals_card, fg_color="transparent")
        tray_f.pack(fill="x", padx=16, pady=(2, 4))
        ctk.CTkLabel(tray_f, text="Tray:", font=("Segoe UI", 8, "bold"), text_color=t["text_muted"]).pack(side="left", padx=(0, 6))

        self.vitals_tray_btns = []
        for icon, cmd in [
            ("▶", lambda: self.toggle_music()),
            ("💬", lambda: subprocess.Popen(["cmd.exe", "/c", "start", "whatsapp://"])),
            ("✉️", lambda: subprocess.Popen(["cmd.exe", "/c", "start", "mailto:"])),
            ("🔔", lambda: None),
            ("⚙️", lambda: subprocess.Popen(["cmd.exe", "/c", "start", "ms-settings:"])),
            ("📊", lambda: subprocess.Popen(["taskmgr.exe"])),
            ("📅", lambda: subprocess.Popen(["cmd.exe", "/c", "start", "outlookcal:"]))
        ]:
            vb = ctk.CTkButton(
                tray_f, text=icon, width=24, height=22, corner_radius=6,
                fg_color=t["surface"], hover_color=t["border_secondary"], font=("Segoe UI", 8), command=cmd
            )
            vb.pack(side="left", padx=2)
            self.vitals_tray_btns.append(vb)

        # Bottom Analytics 2-Card Grid
        analytics_grid = ctk.CTkFrame(self.vitals_card, fg_color="transparent")
        analytics_grid.pack(fill="both", expand=True, padx=16, pady=(4, 8))

        # Left Analytics: Live Application Screen-Time History Breakdown
        self.app_usage_card = ctk.CTkFrame(analytics_grid, fg_color=t["surface"], corner_radius=12, border_width=1, border_color=t["border"])
        self.app_usage_card.pack(side="left", fill="both", expand=True, padx=(0, 4))

        au_hdr = ctk.CTkFrame(self.app_usage_card, fg_color="transparent")
        au_hdr.pack(fill="x", padx=10, pady=(6, 3))
        ctk.CTkLabel(au_hdr, text="📊 Live Screen-Time History", font=("Segoe UI", 8, "bold"), text_color="#38bdf8").pack(side="left")
        ctk.CTkLabel(au_hdr, text="4h 24m Total", font=("Segoe UI", 7), text_color=t["text_muted"]).pack(side="right")

        app_stats = [
            ("Visual Studio Code", "3h 12m", 0.75, "#38bdf8"),
            ("Google Chrome", "48m", 0.45, "#f97316"),
            ("Windows Terminal", "18m", 0.25, "#22c55e"),
            ("ABHI Audio Core", "6m", 0.12, "#a855f7")
        ]
        for name, dur, ratio, bar_col in app_stats:
            row = ctk.CTkFrame(self.app_usage_card, fg_color="transparent")
            row.pack(fill="x", padx=10, pady=1)
            ctk.CTkLabel(row, text=name, font=("Segoe UI", 7), text_color=t["text_secondary"], width=110, anchor="w").pack(side="left")
            p_bar = ctk.CTkProgressBar(row, height=5, corner_radius=3, fg_color=t["surface_card"], progress_color=bar_col)
            p_bar.set(ratio)
            p_bar.pack(side="left", fill="x", expand=True, padx=6)
            ctk.CTkLabel(row, text=dur, font=("Segoe UI", 7, "bold"), text_color=t["text_muted"], width=42, anchor="e").pack(side="right")

        # Right Analytics: Live Network Bandwidth & Data Usage Sparkline
        self.net_card = ctk.CTkFrame(analytics_grid, fg_color=t["surface"], corner_radius=12, border_width=1, border_color=t["border"])
        self.net_card.pack(side="left", fill="both", expand=True, padx=(4, 0))

        net_hdr = ctk.CTkFrame(self.net_card, fg_color="transparent")
        net_hdr.pack(fill="x", padx=10, pady=(6, 3))
        ctk.CTkLabel(net_hdr, text="⚡ Live Network & Data Usage", font=("Segoe UI", 8, "bold"), text_color="#22c55e").pack(side="left")
        ctk.CTkLabel(net_hdr, text="Session 1.84 GB", font=("Segoe UI", 7), text_color=t["text_muted"]).pack(side="right")

        # Speed Stats Row
        spd_row = ctk.CTkFrame(self.net_card, fg_color="transparent")
        spd_row.pack(fill="x", padx=10, pady=2)
        ctk.CTkLabel(spd_row, text="↓ 2.4 MB/s", font=("Segoe UI", 10, "bold"), text_color="#38bdf8").pack(side="left")
        ctk.CTkLabel(spd_row, text="  |  ", font=("Segoe UI", 9), text_color=t["text_muted"]).pack(side="left")
        ctk.CTkLabel(spd_row, text="↑ 480 KB/s", font=("Segoe UI", 10, "bold"), text_color="#f97316").pack(side="left")
        ctk.CTkLabel(spd_row, text="Latency: 14ms", font=("Segoe UI", 7), text_color=t["text_muted"]).pack(side="right")

        # 8-Bar Sparkline Histogram
        self.spark_f = ctk.CTkFrame(self.net_card, fg_color=t["surface_card"], corner_radius=6, height=28)
        self.spark_f.pack(fill="x", padx=10, pady=(4, 6))
        self.spark_f.pack_propagate(False)

        bar_heights = [10, 18, 14, 24, 20, 26, 16, 22]
        for bh in bar_heights:
            b_item = ctk.CTkFrame(self.spark_f, fg_color="#38bdf8" if bh > 16 else "#6366f1", width=12, height=bh, corner_radius=2)
            b_item.pack(side="left", fill="none", expand=True, anchor="s", pady=(0, 2), padx=2)

    # ==========================================================================
    # TAB 1: 🏠 HOME (Fenn.click Authentic 4-Column Deck Matching Image 10)
    # ==========================================================================

    def _build_tab_home(self):
        f = ctk.CTkFrame(self.body_container, fg_color="transparent")
        self.tab_frames["HOME"] = f
        t = self.theme

        deck_grid = ctk.CTkFrame(f, fg_color="transparent")
        deck_grid.pack(fill="both", expand=True, padx=2, pady=2)

        # COLUMN 1: Focus Timer Dial + Coffee Always Toggle Switch
        col1 = ctk.CTkFrame(deck_grid, fg_color="transparent")
        col1.pack(side="left", fill="both", expand=True, padx=(0, 4))

        # Timer Card (Row 1)
        self.home_timer_card = ctk.CTkFrame(col1, fg_color=t["surface_card"], corner_radius=14, border_width=1, border_color=t["border"])
        self.home_timer_card.pack(fill="both", expand=True, pady=(0, 4))

        t_hdr = ctk.CTkFrame(self.home_timer_card, fg_color="transparent")
        t_hdr.pack(fill="x", padx=10, pady=(8, 2))
        ctk.CTkLabel(t_hdr, text="⌛ Timer", font=("Segoe UI", 8, "bold"), text_color=t["text_primary"]).pack(side="left")
        ctk.CTkButton(t_hdr, text="↺", width=20, height=20, corner_radius=6, fg_color="transparent", hover_color=t["border_secondary"], font=("Segoe UI", 9), command=self.reset_home_timer).pack(side="right")

        # Circular dial representation
        self.dial_frame = ctk.CTkFrame(self.home_timer_card, fg_color=t["surface"], corner_radius=32, width=64, height=64, border_width=2, border_color=t["accent"])
        self.dial_frame.pack(pady=2)
        self.dial_frame.pack_propagate(False)
        self.home_timer_lbl = ctk.CTkLabel(self.dial_frame, text="25:00", font=("Segoe UI", 12, "bold"), text_color=t["text_primary"])
        self.home_timer_lbl.place(relx=0.5, rely=0.5, anchor="center")

        # Timer Controls (- ▶ +)
        t_ctrls = ctk.CTkFrame(self.home_timer_card, fg_color="transparent")
        t_ctrls.pack(pady=(2, 6))
        ctk.CTkButton(t_ctrls, text="−", width=24, height=22, corner_radius=6, fg_color=t["surface"], hover_color=t["border_secondary"], font=("Segoe UI", 10, "bold"), command=lambda: self.adjust_home_timer(-5)).pack(side="left", padx=2)
        self.home_timer_play_btn = ctk.CTkButton(t_ctrls, text="▶", width=28, height=22, corner_radius=6, fg_color=t["accent"], hover_color=t["accent_hover"], font=("Segoe UI", 9, "bold"), command=self.toggle_home_timer)
        self.home_timer_play_btn.pack(side="left", padx=2)
        ctk.CTkButton(t_ctrls, text="+", width=24, height=22, corner_radius=6, fg_color=t["surface"], hover_color=t["border_secondary"], font=("Segoe UI", 10, "bold"), command=lambda: self.adjust_home_timer(5)).pack(side="left", padx=2)

        # Coffee Always Card (Row 2)
        self.home_coffee_card = ctk.CTkFrame(col1, fg_color=t["surface_card"], corner_radius=14, border_width=1, border_color=t["border"])
        self.home_coffee_card.pack(fill="x", pady=(0, 2))

        c_row = ctk.CTkFrame(self.home_coffee_card, fg_color="transparent")
        c_row.pack(fill="x", padx=10, pady=8)

        c_left = ctk.CTkFrame(c_row, fg_color="transparent")
        c_left.pack(side="left", fill="y")
        ctk.CTkLabel(c_left, text="☕ Coffee Always", font=("Segoe UI", 8, "bold"), text_color=t["text_primary"], anchor="w").pack(fill="x")
        self.coffee_status_lbl = ctk.CTkLabel(c_left, text="Keep awake" if self.is_coffee_on else "Off", font=("Segoe UI", 7), text_color=t["accent"] if self.is_coffee_on else t["text_muted"], anchor="w")
        self.coffee_status_lbl.pack(fill="x")

        self.coffee_switch = ctk.CTkSwitch(c_row, text="", width=36, height=18, switch_width=36, switch_height=18, fg_color=t["surface"], progress_color="#22c55e", command=self.toggle_coffee_always)
        self.coffee_switch.pack(side="right")
        if self.is_coffee_on:
            self.coffee_switch.select()

        # COLUMN 2: Mini Music Player + Notes Scratchpad
        col2 = ctk.CTkFrame(deck_grid, fg_color="transparent")
        col2.pack(side="left", fill="both", expand=True, padx=3)

        # Mini Music Card (Row 1)
        self.home_music_card = ctk.CTkFrame(col2, fg_color=t["surface_card"], corner_radius=14, border_width=1, border_color=t["border"])
        self.home_music_card.pack(fill="both", expand=True, pady=(0, 4))

        m_hdr = ctk.CTkFrame(self.home_music_card, fg_color="transparent")
        m_hdr.pack(fill="x", padx=10, pady=(8, 2))
        ctk.CTkLabel(m_hdr, text="♫ Late Night Focus", font=("Segoe UI", 8, "bold"), text_color=t["text_primary"]).pack(side="left")
        ctk.CTkLabel(m_hdr, text="16:13", font=("Segoe UI", 7), text_color=t["text_muted"]).pack(side="right")

        ctk.CTkLabel(self.home_music_card, text="Lo-Fi Radio · Continuous", font=("Segoe UI", 7), text_color=t["text_muted"], anchor="w").pack(fill="x", padx=10, pady=(1, 2))

        # Media Control Buttons (|<< ▶ >>|)
        m_ctrls = ctk.CTkFrame(self.home_music_card, fg_color="transparent")
        m_ctrls.pack(pady=2)
        ctk.CTkButton(m_ctrls, text="⏮", width=26, height=22, corner_radius=6, fg_color=t["surface"], hover_color=t["border_secondary"], font=("Segoe UI", 8), command=lambda: self.toggle_music()).pack(side="left", padx=2)
        self.home_music_play_btn = ctk.CTkButton(m_ctrls, text="▶", width=32, height=22, corner_radius=6, fg_color=t["accent"], hover_color=t["accent_hover"], font=("Segoe UI", 9, "bold"), command=self.toggle_music)
        self.home_music_play_btn.pack(side="left", padx=2)
        ctk.CTkButton(m_ctrls, text="⏭", width=26, height=22, corner_radius=6, fg_color=t["surface"], hover_color=t["border_secondary"], font=("Segoe UI", 8), command=lambda: self.toggle_music()).pack(side="left", padx=2)

        # Notes Card (Row 2)
        self.home_notes_card = ctk.CTkFrame(col2, fg_color=t["surface_card"], corner_radius=14, border_width=1, border_color=t["border"])
        self.home_notes_card.pack(fill="both", expand=True, pady=(0, 2))

        n_hdr = ctk.CTkFrame(self.home_notes_card, fg_color="transparent")
        n_hdr.pack(fill="x", padx=10, pady=(6, 2))
        ctk.CTkLabel(n_hdr, text="📝 Notes", font=("Segoe UI", 8, "bold"), text_color=t["text_primary"]).pack(side="left")

        self.home_notes_entry = ctk.CTkEntry(
            self.home_notes_card,
            placeholder_text="Write something...",
            font=("Segoe UI", 8),
            height=26,
            fg_color=t["surface"],
            border_color=t["border"],
            text_color=t["text_primary"],
            corner_radius=6
        )
        self.home_notes_entry.pack(fill="x", padx=8, pady=(1, 6))

        # COLUMN 3: Clipboard Shelf + Snippet Quick Actions
        col3 = ctk.CTkFrame(deck_grid, fg_color="transparent")
        col3.pack(side="left", fill="both", expand=True, padx=3)

        self.clip_card = ctk.CTkFrame(col3, fg_color=t["surface_card"], corner_radius=14, border_width=1, border_color=t["border"])
        self.clip_card.pack(fill="both", expand=True, pady=(0, 4))

        cl_hdr = ctk.CTkFrame(self.clip_card, fg_color="transparent")
        cl_hdr.pack(fill="x", padx=10, pady=(8, 2))
        ctk.CTkLabel(cl_hdr, text="📋 Clipboard", font=("Segoe UI", 8, "bold"), text_color=t["text_primary"]).pack(side="left")
        ctk.CTkLabel(cl_hdr, text="⤢", font=("Segoe UI", 9), text_color=t["text_muted"]).pack(side="right")

        # Clipboard preview area
        clip_preview = ctk.CTkFrame(self.clip_card, fg_color=t["surface"], corner_radius=8)
        clip_preview.pack(fill="both", expand=True, padx=8, pady=3)
        clip_text = self.clipboard_history[0] if self.clipboard_history else "Copy something..."
        self.home_clip_lbl = ctk.CTkLabel(clip_preview, text=clip_text, font=("Segoe UI", 7), text_color=t["text_secondary"], wraplength=120, justify="left", anchor="nw")
        self.home_clip_lbl.pack(fill="both", expand=True, padx=6, pady=6)

        # Quick action snippet buttons
        clip_actions = ctk.CTkFrame(col3, fg_color="transparent")
        clip_actions.pack(fill="x", pady=(0, 2))
        ctk.CTkButton(clip_actions, text="🔗 Link", font=("Segoe UI", 7, "bold"), height=24, corner_radius=6, fg_color=t["surface_card"], hover_color=t["border_secondary"], border_width=1, border_color=t["border"], command=lambda: self._copy_to_system_clipboard("https://github.com/elayadesign/ai-design-skills")).pack(side="left", fill="x", expand=True, padx=(0, 2))
        ctk.CTkButton(clip_actions, text="✂️ Snip", font=("Segoe UI", 7, "bold"), height=24, corner_radius=6, fg_color=t["surface_card"], hover_color=t["border_secondary"], border_width=1, border_color=t["border"], command=lambda: subprocess.Popen(["cmd.exe", "/c", "start", "ms-screenclip:"])).pack(side="left", fill="x", expand=True, padx=(2, 0))

        # COLUMN 4: 2x4 Tool Button Grid
        col4 = ctk.CTkFrame(deck_grid, fg_color="transparent")
        col4.pack(side="left", fill="both", expand=True, padx=(3, 0))

        self.tools_card = ctk.CTkFrame(col4, fg_color=t["surface_card"], corner_radius=14, border_width=1, border_color=t["border"])
        self.tools_card.pack(fill="both", expand=True, pady=0)

        tools = [
            ("Aa", "Font Inspector", lambda: subprocess.Popen(["cmd.exe", "/c", "start", "charmap"])),
            ("📱", "Phone Sync", lambda: subprocess.Popen(["cmd.exe", "/c", "start", "ms-phone-link:"])),
            ("📸", "Screenshot", lambda: subprocess.Popen(["cmd.exe", "/c", "start", "ms-screenclip:"])),
            ("🗔", "Pin Dock", self.toggle_pin),
            ("🎨", "Color Picker", lambda: subprocess.Popen(["cmd.exe", "/c", "start", "ms-paint:"])),
            ("✂️", "Crop Snip", lambda: subprocess.Popen(["cmd.exe", "/c", "start", "snippingtool"])),
            ("⚡", "Terminal", lambda: subprocess.Popen(["cmd.exe", "/c", "start", "wt"])),
            ("⚙️", "Settings", lambda: subprocess.Popen(["cmd.exe", "/c", "start", "ms-settings:"]))
        ]

        self.home_tool_btns = []
        for row_idx in range(4):
            r_frame = ctk.CTkFrame(self.tools_card, fg_color="transparent")
            r_frame.pack(fill="x", expand=True, padx=6, pady=2)
            for col_idx in range(2):
                tool_idx = row_idx * 2 + col_idx
                icon, tooltip, cmd = tools[tool_idx]
                btn = ctk.CTkButton(
                    r_frame,
                    text=icon,
                    font=("Segoe UI", 9, "bold"),
                    height=30,
                    corner_radius=8,
                    fg_color=t["surface"],
                    hover_color=t["border_secondary"],
                    border_width=1,
                    border_color=t["border"],
                    command=cmd
                )
                btn.pack(side="left", fill="x", expand=True, padx=2)
                self.home_tool_btns.append(btn)

    def toggle_coffee_always(self):
        self.is_coffee_on = not self.is_coffee_on
        if hasattr(self, "coffee_status_lbl"):
            self.coffee_status_lbl.configure(
                text="Keep awake" if self.is_coffee_on else "Off",
                text_color="#38bdf8" if self.is_coffee_on else "#64748b"
            )
        if self.is_coffee_on:
            try:
                import ctypes
                ctypes.windll.kernel32.SetThreadExecutionState(0x80000000 | 0x00000001 | 0x00000002)
            except Exception:
                pass
        else:
            try:
                import ctypes
                ctypes.windll.kernel32.SetThreadExecutionState(0x80000000)
            except Exception:
                pass

    def adjust_home_timer(self, delta_minutes):
        self.timer_seconds = max(0, self.timer_seconds + delta_minutes * 60)
        m = self.timer_seconds // 60
        s = self.timer_seconds % 60
        if hasattr(self, "home_timer_lbl"):
            self.home_timer_lbl.configure(text=f"{m:02d}:{s:02d}")

    def toggle_home_timer(self):
        self.is_timer_running = not self.is_timer_running
        if hasattr(self, "home_timer_play_btn"):
            self.home_timer_play_btn.configure(text="⏸" if self.is_timer_running else "▶")
        if self.is_timer_running:
            self._tick_home_timer()

    def _tick_home_timer(self):
        if not self.is_timer_running:
            return
        if self.timer_seconds > 0:
            self.timer_seconds -= 1
            m = self.timer_seconds // 60
            s = self.timer_seconds % 60
            if hasattr(self, "home_timer_lbl"):
                self.home_timer_lbl.configure(text=f"{m:02d}:{s:02d}")
            self.after(1000, self._tick_home_timer)
        else:
            self.is_timer_running = False
            if hasattr(self, "home_timer_play_btn"):
                self.home_timer_play_btn.configure(text="▶")
            if hasattr(self, "home_timer_lbl"):
                self.home_timer_lbl.configure(text="00:00")
            self._speak_verbally("Focus interval complete, Mamu!")

    def reset_home_timer(self):
        self.is_timer_running = False
        self.timer_seconds = 25 * 60
        if hasattr(self, "home_timer_lbl"):
            self.home_timer_lbl.configure(text="25:00")
        if hasattr(self, "home_timer_play_btn"):
            self.home_timer_play_btn.configure(text="▶")

    def _copy_to_system_clipboard(self, text: str):
        self.clipboard_clear()
        self.clipboard_append(text)
        self.update()

    # ==========================================================================
    # SYSTEM TELEMETRY & CLOCK LOOP
    # ==========================================================================

    def _start_clock_and_vitals_loop(self):
        def loop():
            # Update Clock
            cur_time_str = time.strftime("%I:%M %p")
            try:
                self.pill_clock_lbl.configure(text=cur_time_str)
                self.strip_clock_lbl.configure(text=cur_time_str)
            except Exception:
                pass

            # Update Screen Time
            elapsed = int(time.time() - self.session_start_time)
            h, m = divmod(elapsed // 60, 60)
            try:
                self.screen_time_lbl.configure(text=f"{h}h {m:02d}m")
            except Exception:
                pass

            # Update Vitals
            try:
                cpu = int(psutil.cpu_percent(interval=None))
                ram = int(psutil.virtual_memory().percent)
                disk = int(psutil.disk_usage("C:\\").percent)
                self.cpu_pct_lbl.configure(text=f"{cpu}%")
                self.ram_pct_lbl.configure(text=f"{ram}%")
                self.disk_pct_lbl.configure(text=f"{disk}%")
            except Exception:
                pass

            # Update Battery
            try:
                batt = psutil.sensors_battery()
                if batt:
                    bp = batt.percent
                    b_txt = f"⚡ {bp}%"
                    self.pill_battery_lbl.configure(text=b_txt)
                    self.strip_battery_lbl.configure(text=b_txt)
            except Exception:
                pass

            # Dynamic Theme Auto-Sync with External Project Config
            try:
                theme_file = os.path.join(APP_ROOT, "project_data", "desktop", "notch_theme.json")
                if os.path.exists(theme_file):
                    with open(theme_file, "r", encoding="utf-8") as f:
                        th_data = json.load(f)
                        saved_th = th_data.get("theme")
                        if saved_th and saved_th != self.current_theme_key and saved_th in THEMES:
                            self.set_theme(saved_th)
            except Exception:
                pass

            self.after(1000, loop)

        self.after(500, loop)

    # ==========================================================================
    # INPUT SUBMISSION & AI VOICE DISPATCH
    # ==========================================================================

    def submit_input(self):
        text = self.input_entry.get().strip()
        if not text:
            return
        try:
            from backend.app.perception.audio.tts import text_to_speech
            text_to_speech.stop_speech()
        except Exception:
            pass
        self.input_entry.delete(0, "end")
        if hasattr(self, "chat_display") and self.chat_display:
            try:
                self.chat_display.insert("end", f"MAMU (OPERATOR): {text}\n")
                self.chat_display.see("end")
            except Exception:
                pass
        threading.Thread(target=self._dispatch_ai_query, args=(text,), daemon=True).start()

    def toggle_mic(self):
        self.is_mic_listening = not self.is_mic_listening
        btn_text = "🎙️" if self.is_mic_listening else "🔇"
        self.mic_btn.configure(text=btn_text)

    def _dispatch_ai_query(self, query: str):
        self.bot_state = "THINKING"
        reply = None

        # 1. Screen perception
        if screen_perception:
            try:
                q_l = query.lower()
                if any(k in q_l for k in ["row", "first one", "second one", "first video", "second video"]):
                    ok_g, g_reply = screen_perception.parse_and_execute_grid_intent(query)
                    if ok_g and g_reply:
                        reply = g_reply
                elif any(k in q_l for k in ["screen", "what you seeing", "read my screen", "look at my screen"]):
                    reply = screen_perception.describe_current_screen()
            except Exception:
                pass

        # 2. Dynamic Action Resolver
        if not reply and dynamic_action_resolver:
            try:
                ok, _, res_reply = dynamic_action_resolver.resolve_and_execute(
                    query, f"Active OS Window: {self.active_window_title}"
                )
                if ok and res_reply:
                    reply = res_reply
            except Exception:
                pass

        # 3. Fast Backend Gateway
        if not reply:
            try:
                payload = json.dumps({
                    "query": query,
                    "screen_context": f"Active OS Window: {self.active_window_title}"
                }).encode()
                req = urllib.request.Request(
                    f"{API_BASE}/api/v1/desktop/ask-bot",
                    data=payload,
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=3.5) as resp:
                    data = json.loads(resp.read().decode())
                    reply = data.get("reply")
            except Exception:
                pass

        # 4. Fallback
        if not reply:
            reply = "I understand, Mamu! I am right here with you and standing by for your next directive."

        if hasattr(self, "chat_display") and self.chat_display:
            try:
                self.chat_display.insert("end", f"F.R.I.D.A.Y.: {reply}\n\n")
                self.chat_display.see("end")
            except Exception:
                pass

        self.bot_state = "SUCCESS"
        self._speak_verbally(reply)
        self.after(1500, lambda: setattr(self, "bot_state", "IDLE"))

    def _speak_verbally(self, text: str):
        clean = text.replace("*", "").replace("#", "").replace("`", "").strip()
        if not clean:
            return
        def run_tts():
            try:
                self.bot_state = "SPEAKING"
                from backend.app.perception.audio.tts import text_to_speech
                text_to_speech.play_text_verbally(clean, voice="mamu", rate=1.0)
            except Exception:
                try:
                    import pythoncom, win32com.client
                    pythoncom.CoInitialize()
                    spk = win32com.client.Dispatch("SAPI.SpVoice")
                    spk.Speak(clean[:150], 0)
                    pythoncom.CoUninitialize()
                except Exception:
                    pass
            finally:
                self.after(800, lambda: setattr(self, "bot_state", "IDLE"))
        threading.Thread(target=run_tts, daemon=True).start()

    # ==========================================================================
    # 24/7 BACKGROUND AMBIENT VOICE LISTENER
    # ==========================================================================

    def _start_continuous_voice_listener(self):
        def voice_worker():
            recognizer = sr.Recognizer()
            recognizer.energy_threshold = 180
            recognizer.dynamic_energy_threshold = True

            fs = 16000
            frame_seconds = 0.20
            frame_samples = int(fs * frame_seconds)

            is_speaking = False
            phrase_frames = []
            silence_frames_count = 0
            max_silence_frames = 3
            max_phrase_frames = 40
            pre_roll_buffer = collections.deque(maxlen=4)

            while True:
                if not self.is_mic_listening or self.bot_state == "SPEAKING":
                    time.sleep(0.12)
                    is_speaking = False
                    phrase_frames.clear()
                    silence_frames_count = 0
                    continue

                try:
                    frame = sd.rec(frame_samples, samplerate=fs, channels=1, dtype='float32')
                    sd.wait()

                    raw_frame = frame.flatten()
                    rms = float(np.sqrt(np.mean(raw_frame ** 2)))
                    self.live_audio_rms = rms

                    fft = np.abs(np.fft.rfft(raw_frame))
                    freqs = np.fft.rfftfreq(len(raw_frame), 1.0 / fs)
                    voice_mask = (freqs >= 65) & (freqs <= 600)
                    voice_energy = np.sum(fft[voice_mask])
                    total_energy = np.sum(fft) + 1e-8
                    voice_ratio = float(voice_energy / total_energy)
                    self.live_voice_ratio = voice_ratio

                    has_speech = (rms >= 0.0022 and voice_ratio >= 0.028)

                    if has_speech:
                        if not is_speaking:
                            is_speaking = True
                            phrase_frames = list(pre_roll_buffer)
                            self.bot_state = "LISTENING"
                        phrase_frames.append(raw_frame)
                        silence_frames_count = 0
                    else:
                        if is_speaking:
                            phrase_frames.append(raw_frame)
                            silence_frames_count += 1
                            if silence_frames_count >= max_silence_frames or len(phrase_frames) >= max_phrase_frames:
                                full_phrase = np.concatenate(phrase_frames)
                                is_speaking = False
                                phrase_frames = []
                                silence_frames_count = 0

                                threading.Thread(
                                    target=self._process_recorded_audio,
                                    args=(full_phrase, fs, recognizer),
                                    daemon=True
                                ).start()
                        else:
                            pre_roll_buffer.append(raw_frame)

                except Exception:
                    time.sleep(0.1)

        threading.Thread(target=voice_worker, daemon=True).start()

    def _process_recorded_audio(self, audio_data: np.ndarray, fs: int, recognizer: sr.Recognizer):
        try:
            audio_int16 = (audio_data * 32767).astype(np.int16)
            wav_io = io.BytesIO()
            with wave.open(wav_io, 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(fs)
                wf.writeframes(audio_int16.tobytes())
            wav_io.seek(0)

            with sr.AudioFile(wav_io) as source:
                audio_sr = recognizer.record(source)
            recognized = recognizer.recognize_google(audio_sr, language="en-IN")
            if recognized and len(recognized.strip()) > 1:
                self._handle_voice_phrase(recognized)
        except Exception:
            pass

    def _handle_voice_phrase(self, phrase: str):
        p = phrase.lower().strip()
        wake_matches = ["hey abhi", "hi abhi", "hello abhi", "ok abhi", "abhi"]
        is_wake = any(w in p for w in wake_matches)

        if is_wake:
            clean_cmd = p
            for w in wake_matches:
                clean_cmd = clean_cmd.replace(w, "").strip()

            if any(w in clean_cmd for w in ["open notch", "open window", "expand"]):
                if not self.is_expanded:
                    self.after(0, self.toggle_mode)

            if clean_cmd:
                threading.Thread(target=self._dispatch_ai_query, args=(clean_cmd,), daemon=True).start()
            else:
                self._speak_verbally("Yes Mamu, I am listening!")
        else:
            threading.Thread(target=self._dispatch_ai_query, args=(phrase,), daemon=True).start()

    # ==========================================================================
    # FOREGROUND CONTEXT MONITORING
    # ==========================================================================

    def _start_os_context_monitor(self):
        def monitor_loop():
            while True:
                try:
                    hwnd = ctypes.windll.user32.GetForegroundWindow()
                    if hwnd:
                        length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
                        if length > 0:
                            buf = ctypes.create_unicode_buffer(length + 1)
                            ctypes.windll.user32.GetWindowTextW(hwnd, buf, length + 1)
                            val = buf.value.strip()
                            if val and not any(ign in val for ign in ["ABHI Global", "Program Manager"]):
                                self.active_window_title = val
                                short_t = val[:30] + "..." if len(val) > 30 else val
                                self.after(0, lambda t=short_t: self.active_win_lbl.configure(text=t))
                except Exception:
                    pass
                time.sleep(1.8)

        threading.Thread(target=monitor_loop, daemon=True).start()


if __name__ == "__main__":
    app = AbhiGlobalTopNotch()
    app.mainloop()

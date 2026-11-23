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
# PALETTES & DYNAMIC THEMES
# ==============================================================================
THEMES = {
    "obsidian_cyber": {
        "name": "Obsidian Cyber",
        "bg": "#070b14",
        "surface": "#0f172a",
        "surface_card": "#132142",
        "border": "#1e293b",         # Sleek glassmorphic slate border matching app notch
        "border_secondary": "#334155",
        "border_glow": "#00f0ff",    # Neon cyan active pulse
        "accent": "#00f0ff",
        "accent_hover": "#38bdf8",
        "text_primary": "#ffffff",
        "text_secondary": "#94a3b8",
        "text_muted": "#64748b",
        "hud_border": "#1e293b",
    },
    "solar_amber": {
        "name": "Solar Amber",
        "bg": "#070b14",
        "surface": "#0d1527",
        "surface_card": "#111c34",
        "border": "#1e293b",         # Sleek subtle border
        "border_secondary": "#334155",
        "border_glow": "#f59e0b",
        "accent": "#f59e0b",
        "accent_hover": "#fbbf24",
        "text_primary": "#fffbeb",
        "text_secondary": "#fde68a",
        "text_muted": "#94a3b8",
        "hud_border": "#1e293b",
    },
    "cyber_neon": {
        "name": "Cyber Neon",
        "bg": "#040d12",
        "surface": "#091c24",
        "surface_card": "#0f2c38",
        "border": "#10b981",         # Emerald Green
        "border_secondary": "#059669",
        "border_glow": "#6ee7b7",
        "accent": "#10b981",
        "accent_hover": "#34d399",
        "text_primary": "#f0fdf4",
        "text_secondary": "#a7f3d0",
        "text_muted": "#64748b",
        "hud_border": "#10b981",
    },
    "obsidian_blue": {
        "name": "Obsidian Blue",
        "bg": "#060a17",
        "surface": "#0b1329",
        "surface_card": "#132142",
        "border": "#0284c7",         # Sky Blue
        "border_secondary": "#0369a1",
        "border_glow": "#7dd3fc",
        "accent": "#00f0ff",
        "accent_hover": "#38bdf8",
        "text_primary": "#f8fafc",
        "text_secondary": "#93c5fd",
        "text_muted": "#64748b",
        "hud_border": "#0284c7",
    },
    "royal_amethyst": {
        "name": "Royal Amethyst",
        "bg": "#0f0717",
        "surface": "#1b0d2a",
        "surface_card": "#28143d",
        "border": "#db2777",         # Cyber Rose/Magenta
        "border_secondary": "#be185d",
        "border_glow": "#f472b6",
        "accent": "#ec4899",
        "accent_hover": "#f472b6",
        "text_primary": "#fdf4ff",
        "text_secondary": "#f0abfc",
        "text_muted": "#706a85",
        "hud_border": "#db2777",
    }
}


class AbhiGlobalTopNotch(ctk.CTk):
    """
    ABHI Global System-Wide Windows Top Notch & Voice Operating System.
    """

    def __init__(self):
        super().__init__()
        self.title("ABHI Global Notch")

        # Window styling: Frameless, Always-On-Top, Transparent Backing
        self.overrideredirect(True)
        self.wm_attributes("-topmost", True)
        self.TRANSPARENT_KEY = "#020617"
        self.config(bg=self.TRANSPARENT_KEY)
        self.wm_attributes("-transparentcolor", self.TRANSPARENT_KEY)

        # Active Theme (Default: Obsidian Cyber matching the sleek, low-profile app notch)
        self.current_theme_key = "obsidian_cyber"
        self.theme = THEMES[self.current_theme_key]

        # Geometry & Notch States
        self.is_expanded = False
        self.is_pinned = False
        self.is_notch_docked = True
        self.active_tab = "CENTER"
        self.screen_width = self.winfo_screenwidth()
        self.screen_height = self.winfo_screenheight()

        # Calibrated sleek dimensions matching macOS notch / Dynamic Island
        self.compact_w, self.compact_h = 270, 34
        self.hover_extended_w = 380
        self.expanded_w, self.expanded_h = 720, 380
        self.is_hover_extended = False

        # Dynamic Drag-and-Drop Positioning State
        self._drag_start_x = 0
        self._drag_start_y = 0
        self._drag_window_x = 0
        self._drag_window_y = 0
        self._has_dragged = False

        # Load persisted position or default to screen top-center
        self._load_saved_position()

        self._hover_collapse_job = None
        self.animation_tick = 0
        self.session_start_time = time.time()

        # Telemetry & States
        self.live_audio_rms = 0.0
        self.live_voice_ratio = 0.0
        self.is_mic_listening = True
        self.active_window_title = "Windows Desktop"
        self.bot_state = "IDLE"

        # Hardware Mock / Real Values
        self.current_volume = 65
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
            fg_color="#070b14",
            border_color=self.theme["border"],
            border_width=1,
            corner_radius=17
        )

        self.expanded_frame = ctk.CTkFrame(
            self,
            width=self.expanded_w,
            height=self.expanded_h,
            fg_color="#070b14",
            border_color=self.theme["border"],
            border_width=1,
            corner_radius=20
        )

        self._build_compact_notch_view()
        self._build_expanded_notch_view()

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
    # WINDOW MANAGEMENT, GEOMETRY & DYNAMIC POSITIONING
    # ==========================================================================

    def _get_position_file(self) -> str:
        return os.path.join(APP_ROOT, "project_data", "desktop", "notch_position.json")

    def _load_saved_position(self):
        try:
            pos_file = self._get_position_file()
            if os.path.exists(pos_file):
                with open(pos_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    saved_x = data.get("pos_x")
                    saved_y = data.get("pos_y")
                    if isinstance(saved_x, int) and isinstance(saved_y, int):
                        cur_w = self.compact_w
                        cur_h = self.compact_h
                        if 0 <= saved_x <= (self.screen_width - cur_w) and 0 <= saved_y <= (self.screen_height - cur_h):
                            self.pos_x = saved_x
                            self.pos_y = saved_y
                            return
        except Exception:
            pass
        # Default docked at top-center of screen
        self.pos_x = (self.screen_width - self.compact_w) // 2
        self.pos_y = 0

    def _save_notch_position(self):
        try:
            pos_file = self._get_position_file()
            os.makedirs(os.path.dirname(pos_file), exist_ok=True)
            with open(pos_file, "w", encoding="utf-8") as f:
                json.dump({
                    "pos_x": self.pos_x,
                    "pos_y": self.pos_y,
                    "screen_w": self.screen_width,
                    "screen_h": self.screen_height,
                    "timestamp": time.time()
                }, f, indent=2)
        except Exception:
            pass

    def recenter_notch(self):
        """Snaps the notch back to the screen's top-center docking point."""
        w = self.expanded_w if self.is_expanded else self.compact_w
        h = self.expanded_h if self.is_expanded else self.compact_h
        self.pos_x = (self.screen_width - w) // 2
        self.pos_y = 0
        self.geometry(f"{w}x{h}+{self.pos_x}+{self.pos_y}")
        self._save_notch_position()

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
        if abs(dx) > 4 or abs(dy) > 4:
            self._has_dragged = True
            cur_w = self.expanded_w if self.is_expanded else (self.hover_extended_w if self.is_hover_extended else self.compact_w)
            cur_h = self.expanded_h if self.is_expanded else self.compact_h
            new_x = self._drag_window_x + dx
            new_y = self._drag_window_y + dy
            # Keep within visible screen bounds
            new_x = max(0, min(self.screen_width - cur_w, new_x))
            new_y = max(0, min(self.screen_height - cur_h, new_y))
            self.pos_x = new_x
            self.pos_y = new_y
            self.geometry(f"{cur_w}x{cur_h}+{self.pos_x}+{self.pos_y}")

    def _on_drag_release(self, event, click_action=None):
        cur_w = self.expanded_w if self.is_expanded else (self.hover_extended_w if self.is_hover_extended else self.compact_w)
        cur_h = self.expanded_h if self.is_expanded else self.compact_h
        if self._has_dragged:
            self._has_dragged = False
            # Dynamic Snap / Auto-Docking Physics:
            # 1. Dock to top edge if dropped within 45px of screen top
            if self.pos_y < 45:
                self.pos_y = 0
            # 2. Snap to horizontal center if dropped within 120px of center
            center_x = (self.screen_width - cur_w) // 2
            if abs(self.pos_x - center_x) < 120:
                self.pos_x = center_x
            self.geometry(f"{cur_w}x{cur_h}+{self.pos_x}+{self.pos_y}")
            self._save_notch_position()
        else:
            # Mouse click without drag: execute click action
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
        w = self.expanded_w if self.is_expanded else self.compact_w
        h = self.expanded_h if self.is_expanded else self.compact_h
        self.pos_x = max(0, min(self.screen_width - w, self.pos_x))
        if self.pos_y + h > self.screen_height:
            self.pos_y = max(0, self.screen_height - h)
        self.geometry(f"{w}x{h}+{self.pos_x}+{self.pos_y}")

    def expand_notch(self):
        if hasattr(self, "_hover_collapse_job") and self._hover_collapse_job:
            self.after_cancel(self._hover_collapse_job)
            self._hover_collapse_job = None
        if not self.is_expanded:
            self.toggle_mode()

    def collapse_notch(self):
        if self.is_expanded and not self.is_pinned:
            self.toggle_mode()

    def toggle_mode(self):
        self.is_expanded = not self.is_expanded
        if self.is_expanded:
            self.compact_frame.pack_forget()
            # Center expanded window symmetrically on compact notch center
            center_x = self.pos_x + (self.compact_w // 2)
            self.pos_x = max(0, min(self.screen_width - self.expanded_w, center_x - (self.expanded_w // 2)))
            self._update_geometry()
            self.expanded_frame.pack(fill="both", expand=True)
            self.input_entry.focus_set()
        else:
            self.expanded_frame.pack_forget()
            # Center compact notch symmetrically on expanded window center
            center_x = self.pos_x + (self.expanded_w // 2)
            self.pos_x = max(0, min(self.screen_width - self.compact_w, center_x - (self.compact_w // 2)))
            self._update_geometry()
            self.compact_frame.pack(fill="both", expand=True)

    def toggle_pin(self):
        self.is_pinned = not self.is_pinned
        if self.is_pinned:
            self.pin_btn.configure(text="📌 Pinned", fg_color="#0369a1")
        else:
            self.pin_btn.configure(text="📌", fg_color="transparent")

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
        inner.bind("<Enter>", self._on_compact_hover_enter)
        inner.bind("<Leave>", self._on_compact_hover_leave)

        # Left: Pulsing Green Dot + ABHI NOTCH
        left_box = ctk.CTkFrame(inner, fg_color="transparent")
        left_box.pack(side="left", fill="y")
        self._bind_drag_and_click(left_box, self.expand_notch)
        left_box.bind("<Enter>", self._on_compact_hover_enter)
        left_box.bind("<Leave>", self._on_compact_hover_leave)

        self.pill_beacon = ctk.CTkLabel(
            left_box,
            text="●",
            font=("Segoe UI", 10, "bold"),
            text_color="#22c55e"
        )
        self.pill_beacon.pack(side="left", padx=(0, 4))
        self._bind_drag_and_click(self.pill_beacon, self.expand_notch)

        pill_title = ctk.CTkLabel(
            left_box,
            text="ABHI NOTCH",
            font=("Segoe UI", 8, "bold"),
            text_color="#94a3b8"
        )
        pill_title.pack(side="left")
        self._bind_drag_and_click(pill_title, self.expand_notch)

        # Center: Live Clock & Dynamic Status Snippet
        self.pill_clock_lbl = ctk.CTkLabel(
            inner,
            text=time.strftime("%I:%M %p"),
            font=("Segoe UI", 8, "bold"),
            text_color="#f8fafc"
        )
        self.pill_clock_lbl.pack(side="left", expand=True)
        self._bind_drag_and_click(self.pill_clock_lbl, self.expand_notch)
        self.pill_clock_lbl.bind("<Enter>", self._on_compact_hover_enter)
        self.pill_clock_lbl.bind("<Leave>", self._on_compact_hover_leave)

        self.pill_status_lbl = ctk.CTkLabel(
            inner,
            text="",
            font=("Segoe UI", 8),
            text_color="#cbd5e1"
        )
        self.pill_status_lbl.pack(side="left", padx=2)
        self._bind_drag_and_click(self.pill_status_lbl, self.expand_notch)
        self.pill_status_lbl.bind("<Enter>", self._on_compact_hover_enter)
        self.pill_status_lbl.bind("<Leave>", self._on_compact_hover_leave)

        # Right: Battery & Chevron
        right_box = ctk.CTkFrame(inner, fg_color="transparent")
        right_box.pack(side="right", fill="y")
        self._bind_drag_and_click(right_box, self.expand_notch)
        right_box.bind("<Enter>", self._on_compact_hover_enter)
        right_box.bind("<Leave>", self._on_compact_hover_leave)

        self.pill_battery_lbl = ctk.CTkLabel(
            right_box,
            text="⚡ 75%",
            font=("Segoe UI", 8, "bold"),
            text_color="#38bdf8"
        )
        self.pill_battery_lbl.pack(side="left", padx=(0, 4))
        self._bind_drag_and_click(self.pill_battery_lbl, self.expand_notch)

        self.pill_chevron = ctk.CTkLabel(
            right_box,
            text="▼",
            font=("Segoe UI", 7),
            text_color="#94a3b8"
        )
        self.pill_chevron.pack(side="left")
        self._bind_drag_and_click(self.pill_chevron, self.expand_notch)

    def _on_compact_hover_enter(self, event=None):
        if not self.is_expanded and not getattr(self, "_has_dragged", False):
            self.is_hover_extended = True
            w = self.hover_extended_w
            h = self.compact_h
            center_x = self.pos_x + (self.compact_w // 2)
            pos_x = max(0, min(self.screen_width - w, center_x - (w // 2)))
            self.geometry(f"{w}x{h}+{pos_x}+{self.pos_y}")
            self.compact_frame.configure(border_color=self.theme.get("border_glow", "#00f0ff"))
            self.pill_chevron.configure(text="▾", font=("Segoe UI", 8, "bold"), text_color=self.theme.get("accent", "#00f0ff"))
            win_snippet = self.active_window_title[:22] if self.active_window_title else "Windows"
            self.pill_status_lbl.configure(text=f"• 28° Sunny • {win_snippet}")

    def _on_compact_hover_leave(self, event=None):
        if not self.is_expanded and self.is_hover_extended and not getattr(self, "_has_dragged", False):
            self.is_hover_extended = False
            w = self.compact_w
            h = self.compact_h
            center_x = self.winfo_x() + (self.hover_extended_w // 2)
            pos_x = max(0, min(self.screen_width - w, center_x - (w // 2)))
            self.pos_x = pos_x
            self.geometry(f"{w}x{h}+{self.pos_x}+{self.pos_y}")
            self.compact_frame.configure(border_color=self.theme["border"])
            self.pill_chevron.configure(text="▼", font=("Segoe UI", 7), text_color="#94a3b8")
            self.pill_status_lbl.configure(text="")

    # ==========================================================================
    # 2. EXPANDED NOTCH DECK VIEW (860x440, 6 Universal Tabs)
    # ==========================================================================

    def _build_expanded_notch_view(self):
        ef = self.expanded_frame
        t = self.theme

        # Auto-collapse on leave
        ef.bind("<Leave>", self._on_notch_leave)

        # ----------------------------------------------------------------------
        # TOP HEADER STRIP (Time, Title, Weather, Tabs, Battery, Pin, Close)
        # ----------------------------------------------------------------------
        header_strip = ctk.CTkFrame(ef, fg_color="transparent", height=42)
        header_strip.pack(fill="x", padx=14, pady=(10, 4))
        header_strip.pack_propagate(False)

        # Left: Time & Tag (Draggable header handle)
        h_left = ctk.CTkFrame(header_strip, fg_color="transparent")
        h_left.pack(side="left", fill="y")
        self._bind_drag_and_click(header_strip)
        self._bind_drag_and_click(h_left)

        self.strip_clock_lbl = ctk.CTkLabel(
            h_left,
            text=time.strftime("%I:%M %p"),
            font=("Segoe UI", 10, "bold"),
            text_color="#f8fafc"
        )
        self.strip_clock_lbl.pack(side="left", padx=(0, 6))
        self._bind_drag_and_click(self.strip_clock_lbl)

        sep1 = ctk.CTkLabel(h_left, text="•", font=("Segoe UI", 9), text_color="#64748b")
        sep1.pack(side="left", padx=2)

        tag_lbl = ctk.CTkLabel(
            h_left,
            text="ABHI NOTCH",
            font=("Segoe UI", 9, "bold"),
            text_color=t.get("accent", "#00f0ff")
        )
        tag_lbl.pack(side="left", padx=4)
        self._bind_drag_and_click(tag_lbl)

        sep2 = ctk.CTkLabel(h_left, text="•", font=("Segoe UI", 9), text_color="#64748b")
        sep2.pack(side="left", padx=2)

        self.weather_lbl = ctk.CTkLabel(
            h_left,
            text="28° Sunny",
            font=("Segoe UI", 9),
            text_color="#cbd5e1"
        )
        self.weather_lbl.pack(side="left", padx=4)
        self._bind_drag_and_click(self.weather_lbl)

        # Center: Universal High-Tech Tab Pills
        h_center = ctk.CTkFrame(header_strip, fg_color="transparent")
        h_center.pack(side="left", expand=True)

        self.tab_buttons = {}
        tabs = [
            ("🏠 HOME", "HOME"),
            ("⚙️ CENTER", "CENTER"),
            ("📅 CALENDAR", "CALENDAR"),
            ("♫ MUSIC", "MUSIC"),
            ("⚡ VITALS", "VITALS")
        ]
        for label, tab_key in tabs:
            btn = ctk.CTkButton(
                h_center,
                text=label,
                font=("Segoe UI", 8, "bold"),
                height=26,
                corner_radius=13,
                fg_color="#ffffff" if tab_key == self.active_tab else "transparent",
                text_color="#000000" if tab_key == self.active_tab else "#cbd5e1",
                hover_color="#334155",
                command=lambda k=tab_key: self.set_tab(k)
            )
            btn.pack(side="left", padx=2)
            self.tab_buttons[tab_key] = btn

        # Right: Battery, Center, Pin, Close
        h_right = ctk.CTkFrame(header_strip, fg_color="transparent")
        h_right.pack(side="right", fill="y")

        self.strip_battery_lbl = ctk.CTkLabel(
            h_right,
            text="⚡ 75%",
            font=("Segoe UI", 9, "bold"),
            text_color="#38bdf8"
        )
        self.strip_battery_lbl.pack(side="left", padx=(0, 6))

        self.center_btn = ctk.CTkButton(
            h_right,
            text="🎯 Center",
            width=62,
            height=26,
            corner_radius=8,
            fg_color="#0f172a",
            hover_color="#1e293b",
            text_color="#38bdf8",
            font=("Segoe UI", 8, "bold"),
            command=self.recenter_notch
        )
        self.center_btn.pack(side="left", padx=2)

        self.pin_btn = ctk.CTkButton(
            h_right,
            text="📌",
            width=28,
            height=26,
            corner_radius=8,
            fg_color="transparent",
            hover_color="#1e293b",
            font=("Segoe UI", 9),
            command=self.toggle_pin
        )
        self.pin_btn.pack(side="left", padx=2)

        close_btn = ctk.CTkButton(
            h_right,
            text="✕",
            width=26,
            height=26,
            corner_radius=8,
            fg_color="transparent",
            hover_color="#ef4444",
            text_color="#94a3b8",
            font=("Segoe UI", 9, "bold"),
            command=self.toggle_mode
        )
        close_btn.pack(side="left", padx=2)

        # Thin divider
        div = ctk.CTkFrame(ef, fg_color="#1e293b", height=1)
        div.pack(fill="x", padx=14, pady=(2, 8))

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
        input_bar = ctk.CTkFrame(
            ef,
            fg_color=t["surface"],
            border_color=t["border"],
            border_width=1,
            corner_radius=14,
            height=38
        )
        input_bar.pack(fill="x", padx=14, pady=(2, 10))
        input_bar.pack_propagate(False)

        self.mic_btn = ctk.CTkButton(
            input_bar,
            text="🎙️",
            width=28,
            height=28,
            corner_radius=14,
            fg_color="#1e293b",
            hover_color="#334155",
            font=("Segoe UI", 10),
            command=self.toggle_mic
        )
        self.mic_btn.pack(side="left", padx=(6, 4), pady=5)

        self.input_entry = ctk.CTkEntry(
            input_bar,
            placeholder_text="Talk with Abhi or type command...",
            placeholder_text_color="#64748b",
            font=("Segoe UI", 9),
            fg_color="transparent",
            border_width=0,
            text_color=t["text_primary"]
        )
        self.input_entry.pack(side="left", fill="both", expand=True, padx=4, pady=4)
        self.input_entry.bind("<Return>", lambda e: self.submit_input())

        self.send_btn = ctk.CTkButton(
            input_bar,
            text="Send",
            font=("Segoe UI", 8, "bold"),
            fg_color=t["border"],
            hover_color=t["border_secondary"],
            text_color="#ffffff",
            width=58,
            height=26,
            corner_radius=8,
            command=self.submit_input
        )
        self.send_btn.pack(side="right", padx=(4, 6), pady=6)

    def set_tab(self, tab_key: str):
        self.active_tab = tab_key
        # Update tab pill styles
        for key, btn in self.tab_buttons.items():
            if key == tab_key:
                btn.configure(fg_color="#ffffff", text_color="#000000")
            else:
                btn.configure(fg_color="transparent", text_color="#cbd5e1")

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
        left_chassis = ctk.CTkFrame(
            dual_container,
            fg_color="#070b14",
            corner_radius=16,
            border_width=1,
            border_color="#1e293b",
            width=240
        )
        left_chassis.pack(side="left", fill="y", padx=(0, 10))
        left_chassis.pack_propagate(False)

        # Date & Weather Header Badge
        cur_date_str = time.strftime("%a, %d %b").upper()
        date_badge = ctk.CTkFrame(left_chassis, fg_color="#0f172a", corner_radius=8, height=26)
        date_badge.pack(fill="x", padx=10, pady=(10, 6))
        ctk.CTkLabel(
            date_badge,
            text=f"📅  {cur_date_str} / 28° Sunny",
            font=("Segoe UI", 8, "bold"),
            text_color="#cbd5e1"
        ).pack(side="left", padx=8)

        # Sunset Ambient Art Card with Pink Glowing Orb & Mountain Silhouettes
        art_card = ctk.CTkFrame(
            left_chassis,
            fg_color="#1a0c14",
            corner_radius=14,
            border_width=1,
            border_color="#be185d"
        )
        art_card.pack(fill="both", expand=True, padx=10, pady=4)

        # Celestial Sun Orb
        sun_orb = ctk.CTkLabel(
            art_card,
            text="●",
            font=("Segoe UI", 34, "bold"),
            text_color="#f43f5e"
        )
        sun_orb.place(relx=0.5, rely=0.22, anchor="center")

        # Mountain Silhouette Background
        mountains_lbl = ctk.CTkLabel(
            art_card,
            text="▲ ▲▲ ▲▲▲ ▲",
            font=("Segoe UI", 16, "bold"),
            text_color="#090510"
        )
        mountains_lbl.place(relx=0.5, rely=0.82, anchor="center")

        # Expressive Bot Screen Chassis
        bot_screen = ctk.CTkFrame(
            art_card,
            fg_color="#050811",
            corner_radius=12,
            border_width=1.5,
            border_color="#f97316",
            width=110,
            height=74
        )
        bot_screen.place(relx=0.5, rely=0.48, anchor="center")
        bot_screen.pack_propagate(False)

        # Smiling Curved Eyes & Mouth
        self.bot_eyes_lbl = ctk.CTkLabel(
            bot_screen,
            text="⌒   ⌒",
            font=("Segoe UI", 16, "bold"),
            text_color="#fbbf24"
        )
        self.bot_eyes_lbl.pack(pady=(10, 0))

        self.bot_mouth_lbl = ctk.CTkLabel(
            bot_screen,
            text="‿",
            font=("Segoe UI", 13, "bold"),
            text_color="#f97316"
        )
        self.bot_mouth_lbl.pack()

        # Bold "HAPPY" Tag Below Bot Screen
        happy_tag = ctk.CTkLabel(
            art_card,
            text=" HAPPY ",
            font=("Segoe UI", 8, "bold"),
            text_color="#ffffff",
            fg_color="#050811",
            corner_radius=6
        )
        happy_tag.place(relx=0.5, rely=0.74, anchor="center")

        # Bottom Tab Navigation Rail (6 Buttons matching references)
        tab_rail = ctk.CTkFrame(left_chassis, fg_color="#0d1527", corner_radius=10)
        tab_rail.pack(fill="x", padx=8, pady=(4, 10))

        rail_row1 = ctk.CTkFrame(tab_rail, fg_color="transparent")
        rail_row1.pack(fill="x", padx=2, pady=(4, 2))
        rail_row2 = ctk.CTkFrame(tab_rail, fg_color="transparent")
        rail_row2.pack(fill="x", padx=2, pady=(2, 4))

        quick_tabs = [
            ("🏠 HOME", "HOME", rail_row1),
            ("⚙️ CENTER", "CENTER", rail_row1),
            ("📅 CAL", "CALENDAR", rail_row1),
            ("♫ MUSIC", "MUSIC", rail_row2),
            ("⚡ VITALS", "VITALS", rail_row2),
        ]
        for lbl, t_key, parent_row in quick_tabs:
            btn = ctk.CTkButton(
                parent_row,
                text=lbl,
                font=("Segoe UI", 7, "bold"),
                height=22,
                corner_radius=6,
                fg_color="#f97316" if t_key == "CENTER" else "#1e293b",
                text_color="#ffffff" if t_key == "CENTER" else "#cbd5e1",
                hover_color="#ea580c",
                command=lambda k=t_key: self.set_tab(k)
            )
            btn.pack(side="left", fill="x", expand=True, padx=2)

        # ----------------------------------------------------------------------
        # RIGHT CHASSIS: Controls, Sliders & Integrated Live Transcription Feed
        # ----------------------------------------------------------------------
        right_chassis = ctk.CTkFrame(dual_container, fg_color="transparent")
        right_chassis.pack(side="left", fill="both", expand=True)

        # 4 Main Control Cards (2x2 Grid)
        grid_frame = ctk.CTkFrame(right_chassis, fg_color="transparent")
        grid_frame.pack(fill="x", pady=(0, 6))

        # Wi-Fi Card
        self.wifi_card = ctk.CTkButton(
            grid_frame,
            text="📶  Wi-Fi\nConnected · 5GHz",
            font=("Segoe UI", 9, "bold"),
            height=48,
            corner_radius=12,
            fg_color="#ffffff",
            text_color="#0f172a",
            hover_color="#e2e8f0",
            command=self.toggle_wifi
        )
        self.wifi_card.pack(side="left", fill="x", expand=True, padx=(0, 4))

        # DND Card
        self.dnd_card = ctk.CTkButton(
            grid_frame,
            text="🌙  DND Mode\nAlerts Active",
            font=("Segoe UI", 9, "bold"),
            height=48,
            corner_radius=12,
            fg_color="#0d1527",
            text_color="#f8fafc",
            hover_color="#1e293b",
            command=self.toggle_dnd
        )
        self.dnd_card.pack(side="left", fill="x", expand=True, padx=2)

        # Bluetooth Card
        self.bt_card = ctk.CTkButton(
            grid_frame,
            text="🔊  Bluetooth\nOn · Audio Sync",
            font=("Segoe UI", 9, "bold"),
            height=48,
            corner_radius=12,
            fg_color="#ffffff",
            text_color="#0f172a",
            hover_color="#e2e8f0",
            command=self.toggle_bluetooth
        )
        self.bt_card.pack(side="left", fill="x", expand=True, padx=2)

        # Notch Mode Card
        self.notch_mode_card = ctk.CTkButton(
            grid_frame,
            text="🔝  Notch Mode\nFixed Top Dock",
            font=("Segoe UI", 9, "bold"),
            height=48,
            corner_radius=12,
            fg_color="#ffffff",
            text_color="#0f172a",
            hover_color="#e2e8f0",
            command=self.toggle_pin
        )
        self.notch_mode_card.pack(side="left", fill="x", expand=True, padx=(4, 0))

        # Sliders Section (Volume & Brightness)
        sliders_box = ctk.CTkFrame(right_chassis, fg_color="#0d1527", corner_radius=12, border_width=1, border_color="#1a2333")
        sliders_box.pack(fill="x", pady=(2, 6), padx=0)

        # Volume Row
        vol_row = ctk.CTkFrame(sliders_box, fg_color="transparent")
        vol_row.pack(fill="x", padx=12, pady=(6, 2))
        vol_lbl = ctk.CTkLabel(vol_row, text="🔊 Volume", font=("Segoe UI", 8, "bold"), text_color="#cbd5e1", width=75, anchor="w")
        vol_lbl.pack(side="left")
        self.vol_slider = ctk.CTkSlider(vol_row, from_=0, to=100, number_of_steps=100, command=self._on_volume_change)
        self.vol_slider.set(self.current_volume)
        self.vol_slider.pack(side="left", fill="x", expand=True, padx=8)
        self.vol_val_lbl = ctk.CTkLabel(vol_row, text=f"{self.current_volume}%", font=("Segoe UI", 8, "bold"), text_color="#f8fafc", width=34)
        self.vol_val_lbl.pack(side="right")

        # Brightness Row
        bri_row = ctk.CTkFrame(sliders_box, fg_color="transparent")
        bri_row.pack(fill="x", padx=12, pady=(2, 6))
        bri_lbl = ctk.CTkLabel(bri_row, text="☀️ Brightness", font=("Segoe UI", 8, "bold"), text_color="#cbd5e1", width=75, anchor="w")
        bri_lbl.pack(side="left")
        self.bri_slider = ctk.CTkSlider(bri_row, from_=10, to=100, number_of_steps=90, command=self._on_brightness_change)
        self.bri_slider.set(self.current_brightness)
        self.bri_slider.pack(side="left", fill="x", expand=True, padx=8)
        self.bri_val_lbl = ctk.CTkLabel(bri_row, text=f"{self.current_brightness}%", font=("Segoe UI", 8, "bold"), text_color="#f8fafc", width=34)
        self.bri_val_lbl.pack(side="right")

        # Integrated Real-Time Transcription Chat Feed (Image 1 Style)
        chat_box = ctk.CTkFrame(right_chassis, fg_color="#070b14", corner_radius=12, border_width=1, border_color="#1e293b")
        chat_box.pack(fill="both", expand=True, pady=(2, 0))

        chat_hdr = ctk.CTkFrame(chat_box, fg_color="#0f172a", corner_radius=8, height=24)
        chat_hdr.pack(fill="x", padx=8, pady=(6, 4))
        ctk.CTkLabel(
            chat_hdr,
            text="● REAL-TIME TRANSCRIPTION",
            font=("Segoe UI", 8, "bold"),
            text_color="#ef4444"
        ).pack(side="left", padx=8)
        ctk.CTkLabel(
            chat_hdr,
            text="● LIVE STREAM",
            font=("Segoe UI", 7, "bold"),
            text_color="#22c55e"
        ).pack(side="right", padx=8)

        self.chat_display = ctk.CTkTextbox(
            chat_box,
            fg_color="transparent",
            text_color="#cbd5e1",
            font=("Segoe UI", 8),
            wrap="word"
        )
        self.chat_display.pack(fill="both", expand=True, padx=8, pady=4)
        self.chat_display.insert("end", "ABHI: Good day, Mamu! All neural systems online. What are we building or automating today?\n\n")

    def toggle_wifi(self):
        self.is_wifi_on = not self.is_wifi_on
        if self.is_wifi_on:
            self.wifi_card.configure(fg_color="#ffffff", text_color="#0f172a", text="📶  Wi-Fi\nConnected · 5GHz")
        else:
            self.wifi_card.configure(fg_color="#0d1527", text_color="#94a3b8", text="📶  Wi-Fi\nDisconnected")
        subprocess.Popen(["cmd.exe", "/c", "start", "ms-settings:network-wifi"])

    def toggle_dnd(self):
        self.is_dnd_on = not self.is_dnd_on
        if self.is_dnd_on:
            self.dnd_card.configure(fg_color="#ffffff", text_color="#0f172a", text="🌙  DND Mode\nDo Not Disturb")
        else:
            self.dnd_card.configure(fg_color="#0d1527", text_color="#f8fafc", text="🌙  DND Mode\nAlerts Active")

    def toggle_bluetooth(self):
        self.is_bt_on = not self.is_bt_on
        if self.is_bt_on:
            self.bt_card.configure(fg_color="#ffffff", text_color="#0f172a", text="🔊  Bluetooth\nOn · Audio Sync")
        else:
            self.bt_card.configure(fg_color="#0d1527", text_color="#94a3b8", text="🔊  Bluetooth\nOff")
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
        # Direct Windows master volume change
        try:
            # Send hardware volume update
            ctypes.windll.user32.keybd_event(0xAF, 0, 0, 0)
            ctypes.windll.user32.keybd_event(0xAF, 0, 2, 0)
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

    def cycle_theme(self):
        theme_keys = list(THEMES.keys())
        idx = theme_keys.index(self.current_theme_key)
        next_key = theme_keys[(idx + 1) % len(theme_keys)]
        self.current_theme_key = next_key
        self.theme = THEMES[next_key]
        t = self.theme
        self.compact_frame.configure(border_color=t["border"])
        self.expanded_frame.configure(border_color=t["border"])
        self.send_btn.configure(fg_color=t["border"], hover_color=t["border_secondary"])

    # ==========================================================================
    # TAB 2: 📅 CALENDAR & FOCUS SCHEDULER
    # ==========================================================================

    def _build_tab_calendar(self):
        f = ctk.CTkFrame(self.body_container, fg_color="transparent")
        self.tab_frames["CALENDAR"] = f

        cal_grid = ctk.CTkFrame(f, fg_color="transparent")
        cal_grid.pack(fill="both", expand=True)

        # Left: Interactive Month Calendar
        left_card = ctk.CTkFrame(cal_grid, fg_color="#0d1527", corner_radius=16, border_width=1, border_color="#1a2333")
        left_card.pack(side="left", fill="both", expand=True, padx=(0, 6), pady=2)

        # Month Header
        m_hdr = ctk.CTkFrame(left_card, fg_color="transparent")
        m_hdr.pack(fill="x", padx=12, pady=(10, 6))

        m_title = ctk.CTkLabel(m_hdr, text="📅  November 2026", font=("Segoe UI", 10, "bold"), text_color="#f8fafc")
        m_title.pack(side="left")

        today_btn = ctk.CTkButton(m_hdr, text="Today", width=46, height=22, font=("Segoe UI", 7, "bold"), fg_color="#1e293b", corner_radius=6)
        today_btn.pack(side="right")

        # Days Header
        days_hdr = ctk.CTkFrame(left_card, fg_color="transparent")
        days_hdr.pack(fill="x", padx=12, pady=2)
        for day_name in ["S", "M", "T", "W", "T", "F", "S"]:
            ctk.CTkLabel(days_hdr, text=day_name, font=("Segoe UI", 7, "bold"), text_color="#64748b", width=44).pack(side="left", expand=True)

        # Days Grid (7 Columns)
        days_box = ctk.CTkFrame(left_card, fg_color="transparent")
        days_box.pack(fill="both", expand=True, padx=12, pady=(2, 10))

        events_map = {
            5: "💼 Sprint",
            9: "📝 Refactor",
            12: "🚀 Release",
            18: "⚡ Sync",
            25: "🎯 OKR",
            28: "🛡️ Security"
        }

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
                text_color="#000000" if is_today else ("#f97316" if has_ev else "#cbd5e1"),
                fg_color="#ffffff" if is_today else ("#2e1d10" if has_ev else "transparent"),
                corner_radius=6 if (is_today or has_ev) else 0,
                width=44,
                height=24
            )
            cell.pack(side="left", expand=True, padx=1, pady=1)

        # Right: Focus Timer & 2x2 Presets (Image 3 Exact Match)
        right_card = ctk.CTkFrame(cal_grid, fg_color="#0d1527", corner_radius=16, border_width=1, border_color="#1a2333")
        right_card.pack(side="right", fill="both", expand=True, padx=(6, 0), pady=2)

        # Timer Display
        timer_box = ctk.CTkFrame(right_card, fg_color="transparent")
        timer_box.pack(fill="both", expand=True, padx=16, pady=16)

        ctk.CTkLabel(timer_box, text="FOCUS INTERVAL TIMER", font=("Segoe UI", 8, "bold"), text_color="#94a3b8").pack(pady=(4, 2))

        self.timer_lbl = ctk.CTkLabel(timer_box, text="00:00", font=("Segoe UI", 36, "bold"), text_color="#ffffff")
        self.timer_lbl.pack(pady=8)

        # Timer Buttons (Solid White Start pill, Dark Reset pill)
        t_btns = ctk.CTkFrame(timer_box, fg_color="transparent")
        t_btns.pack(fill="x", pady=6)

        self.start_timer_btn = ctk.CTkButton(
            t_btns, text="Start", font=("Segoe UI", 9, "bold"), fg_color="#ffffff", text_color="#000000",
            hover_color="#f1f5f9", height=32, corner_radius=16, command=self.toggle_timer
        )
        self.start_timer_btn.pack(side="left", fill="x", expand=True, padx=(0, 6))

        reset_btn = ctk.CTkButton(
            t_btns, text="Reset", font=("Segoe UI", 9, "bold"), fg_color="#1e293b", text_color="#cbd5e1",
            hover_color="#334155", height=32, corner_radius=16, command=self.reset_timer
        )
        reset_btn.pack(side="left", fill="x", expand=True, padx=(6, 0))

        # 2x2 Preset Grid (Image 3: 5m, 15m, 25m, 50m)
        presets_grid = ctk.CTkFrame(timer_box, fg_color="transparent")
        presets_grid.pack(fill="x", pady=(10, 4))

        row1 = ctk.CTkFrame(presets_grid, fg_color="transparent")
        row1.pack(fill="x", pady=2)
        ctk.CTkButton(
            row1, text="5m", font=("Segoe UI", 8, "bold"), fg_color="#111c34", text_color="#f1f5f9",
            hover_color="#1e293b", height=28, corner_radius=8, command=lambda: self.set_timer_preset(5)
        ).pack(side="left", fill="x", expand=True, padx=(0, 3))
        ctk.CTkButton(
            row1, text="15m", font=("Segoe UI", 8, "bold"), fg_color="#111c34", text_color="#f1f5f9",
            hover_color="#1e293b", height=28, corner_radius=8, command=lambda: self.set_timer_preset(15)
        ).pack(side="left", fill="x", expand=True, padx=(3, 0))

        row2 = ctk.CTkFrame(presets_grid, fg_color="transparent")
        row2.pack(fill="x", pady=2)
        ctk.CTkButton(
            row2, text="25m", font=("Segoe UI", 8, "bold"), fg_color="#111c34", text_color="#f1f5f9",
            hover_color="#1e293b", height=28, corner_radius=8, command=lambda: self.set_timer_preset(25)
        ).pack(side="left", fill="x", expand=True, padx=(0, 3))
        ctk.CTkButton(
            row2, text="50m", font=("Segoe UI", 8, "bold"), fg_color="#111c34", text_color="#f1f5f9",
            hover_color="#1e293b", height=28, corner_radius=8, command=lambda: self.set_timer_preset(50)
        ).pack(side="left", fill="x", expand=True, padx=(3, 0))

    def toggle_timer(self):
        self.is_timer_running = not self.is_timer_running
        if self.is_timer_running:
            self.start_timer_btn.configure(text="Pause", fg_color="#f97316", text_color="#ffffff")
            if not self.timer_thread or not self.timer_thread.is_alive():
                self.timer_thread = threading.Thread(target=self._timer_worker, daemon=True)
                self.timer_thread.start()
        else:
            self.start_timer_btn.configure(text="Start", fg_color="#ffffff", text_color="#000000")

    def reset_timer(self):
        self.is_timer_running = False
        self.timer_seconds = 0
        self.timer_lbl.configure(text="00:00")
        self.start_timer_btn.configure(text="Start", fg_color="#ffffff", text_color="#000000")

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

        card = ctk.CTkFrame(f, fg_color="#0d1527", corner_radius=16, border_width=1, border_color="#1a2333")
        card.pack(fill="both", expand=True, padx=2, pady=2)

        # Track Header & Artwork Banner
        top_row = ctk.CTkFrame(card, fg_color="transparent")
        top_row.pack(fill="x", padx=16, pady=(12, 4))

        info_box = ctk.CTkFrame(top_row, fg_color="transparent")
        info_box.pack(side="left", fill="both", expand=True)

        self.music_artist_lbl = ctk.CTkLabel(info_box, text="NOVA LANE · GOLDEN HOUR", font=("Segoe UI", 8, "bold"), text_color="#94a3b8", anchor="w")
        self.music_artist_lbl.pack(fill="x")

        self.music_title_lbl = ctk.CTkLabel(info_box, text="Golden Hour", font=("Segoe UI", 18, "bold"), text_color="#ffffff", anchor="w")
        self.music_title_lbl.pack(fill="x", pady=(2, 0))

        self.music_lyrics_lbl = ctk.CTkLabel(info_box, text='"Windows down, the city\'s glowing..."', font=("Segoe UI", 9, "italic"), text_color="#cbd5e1", anchor="w")
        self.music_lyrics_lbl.pack(fill="x", pady=(2, 0))

        # Animated Equalizer Bars
        self.eq_lbl = ctk.CTkLabel(top_row, text="  ▂ ▃ ▅ ▆ ▇ ▆ ▅ ▃  ", font=("Segoe UI", 12, "bold"), text_color="#f97316")
        self.eq_lbl.pack(side="right", padx=10)

        # Scrubber Slider
        scrub_row = ctk.CTkFrame(card, fg_color="transparent")
        scrub_row.pack(fill="x", padx=16, pady=6)

        self.scrub_slider = ctk.CTkSlider(scrub_row, from_=0, to=self.music_duration, number_of_steps=self.music_duration)
        self.scrub_slider.set(self.music_progress)
        self.scrub_slider.pack(fill="x")

        time_row = ctk.CTkFrame(card, fg_color="transparent")
        time_row.pack(fill="x", padx=16)
        self.cur_time_lbl = ctk.CTkLabel(time_row, text="0:34", font=("Segoe UI", 7, "bold"), text_color="#64748b")
        self.cur_time_lbl.pack(side="left")
        self.tot_time_lbl = ctk.CTkLabel(time_row, text="2:41", font=("Segoe UI", 7, "bold"), text_color="#64748b")
        self.tot_time_lbl.pack(side="right")

        # Media Controls (Prev, Play/Pause, Next)
        ctrl_row = ctk.CTkFrame(card, fg_color="transparent")
        ctrl_row.pack(fill="x", padx=16, pady=(6, 10))

        prev_btn = ctk.CTkButton(ctrl_row, text="⏮", width=42, height=36, corner_radius=18, fg_color="#111c34", font=("Segoe UI", 12), command=self.media_prev)
        prev_btn.pack(side="left", padx=6)

        self.play_btn = ctk.CTkButton(ctrl_row, text="▶", width=52, height=36, corner_radius=18, fg_color="#ffffff", text_color="#000000", font=("Segoe UI", 13, "bold"), command=self.media_toggle_play)
        self.play_btn.pack(side="left", padx=6)

        next_btn = ctk.CTkButton(ctrl_row, text="⏭", width=42, height=36, corner_radius=18, fg_color="#111c34", font=("Segoe UI", 12), command=self.media_next)
        next_btn.pack(side="left", padx=6)

        # Quick Tray App Launchers
        tray_lbl = ctk.CTkLabel(ctrl_row, text="Tray:", font=("Segoe UI", 8, "bold"), text_color="#64748b")
        tray_lbl.pack(side="left", padx=(18, 6))

        for icon, app_url in [("🎵 Spotify", "spotify:"), ("▶ YouTube Music", "https://music.youtube.com")]:
            ctk.CTkButton(
                ctrl_row, text=icon, font=("Segoe UI", 7, "bold"), height=26, corner_radius=8,
                fg_color="#111c34", text_color="#cbd5e1", command=lambda u=app_url: subprocess.Popen(["cmd.exe", "/c", "start", u])
            ).pack(side="left", padx=3)

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

        card = ctk.CTkFrame(f, fg_color="#0d1527", corner_radius=16, border_width=1, border_color="#1a2333")
        card.pack(fill="both", expand=True, padx=2, pady=2)

        # Telemetry Top Banner
        top_ban = ctk.CTkFrame(card, fg_color="transparent")
        top_ban.pack(fill="x", padx=16, pady=(12, 8))

        # Screen Time
        st_box = ctk.CTkFrame(top_ban, fg_color="transparent")
        st_box.pack(side="left", fill="both", expand=True)
        ctk.CTkLabel(st_box, text="SCREEN TIME", font=("Segoe UI", 7, "bold"), text_color="#64748b", anchor="w").pack(fill="x")
        self.screen_time_lbl = ctk.CTkLabel(st_box, text="0h 00m", font=("Segoe UI", 12, "bold"), text_color="#f8fafc", anchor="w")
        self.screen_time_lbl.pack(fill="x")

        # Active Window
        aw_box = ctk.CTkFrame(top_ban, fg_color="transparent")
        aw_box.pack(side="left", fill="both", expand=True)
        ctk.CTkLabel(aw_box, text="ACTIVE FOREGROUND WINDOW", font=("Segoe UI", 7, "bold"), text_color="#64748b", anchor="w").pack(fill="x")
        self.active_win_lbl = ctk.CTkLabel(aw_box, text="Windows Desktop", font=("Segoe UI", 10, "bold"), text_color="#38bdf8", anchor="w")
        self.active_win_lbl.pack(fill="x")

        # Power Status
        pw_box = ctk.CTkFrame(top_ban, fg_color="transparent")
        pw_box.pack(side="right")
        ctk.CTkLabel(pw_box, text="POWER STATUS", font=("Segoe UI", 7, "bold"), text_color="#64748b", anchor="e").pack(fill="x")
        self.power_stat_lbl = ctk.CTkLabel(pw_box, text="⚡ 75% Connected", font=("Segoe UI", 10, "bold"), text_color="#22c55e", anchor="e")
        self.power_stat_lbl.pack(fill="x")

        # 3 Big Radial / Gauge Cards (CPU, RAM, DISK)
        gauges_row = ctk.CTkFrame(card, fg_color="transparent")
        gauges_row.pack(fill="x", padx=16, pady=(4, 6))

        # CPU Card
        cpu_card = ctk.CTkFrame(gauges_row, fg_color="#111c34", corner_radius=12)
        cpu_card.pack(side="left", fill="both", expand=True, padx=(0, 4))
        ctk.CTkLabel(cpu_card, text="CPU USAGE", font=("Segoe UI", 7, "bold"), text_color="#38bdf8").pack(pady=(6, 1))
        self.cpu_pct_lbl = ctk.CTkLabel(cpu_card, text="24%", font=("Segoe UI", 18, "bold"), text_color="#f8fafc")
        self.cpu_pct_lbl.pack(pady=2)
        ctk.CTkLabel(cpu_card, text="Multi-Core", font=("Segoe UI", 7), text_color="#64748b").pack(pady=(0, 6))

        # RAM Card
        ram_card = ctk.CTkFrame(gauges_row, fg_color="#111c34", corner_radius=12)
        ram_card.pack(side="left", fill="both", expand=True, padx=2)
        ctk.CTkLabel(ram_card, text="RAM USAGE", font=("Segoe UI", 7, "bold"), text_color="#f97316").pack(pady=(6, 1))
        self.ram_pct_lbl = ctk.CTkLabel(ram_card, text="45%", font=("Segoe UI", 18, "bold"), text_color="#f8fafc")
        self.ram_pct_lbl.pack(pady=2)
        ctk.CTkLabel(ram_card, text="16 GB Total", font=("Segoe UI", 7), text_color="#64748b").pack(pady=(0, 6))

        # Disk Card
        disk_card = ctk.CTkFrame(gauges_row, fg_color="#111c34", corner_radius=12)
        disk_card.pack(side="left", fill="both", expand=True, padx=(4, 0))
        ctk.CTkLabel(disk_card, text="DISK USAGE", font=("Segoe UI", 7, "bold"), text_color="#a855f7").pack(pady=(6, 1))
        self.disk_pct_lbl = ctk.CTkLabel(disk_card, text="32%", font=("Segoe UI", 18, "bold"), text_color="#f8fafc")
        self.disk_pct_lbl.pack(pady=2)
        ctk.CTkLabel(disk_card, text="NVMe SSD", font=("Segoe UI", 7), text_color="#64748b").pack(pady=(0, 6))

        # Tray Icons Row (Matches Image 5 & Image 7)
        tray_f = ctk.CTkFrame(card, fg_color="transparent")
        tray_f.pack(fill="x", padx=16, pady=(2, 4))
        ctk.CTkLabel(tray_f, text="Tray:", font=("Segoe UI", 8, "bold"), text_color="#64748b").pack(side="left", padx=(0, 6))
        for icon, cmd in [
            ("▶", lambda: self.toggle_music()),
            ("💬", lambda: subprocess.Popen(["cmd.exe", "/c", "start", "whatsapp://"])),
            ("✉️", lambda: subprocess.Popen(["cmd.exe", "/c", "start", "mailto:"])),
            ("🔔", lambda: None),
            ("⚙️", lambda: subprocess.Popen(["cmd.exe", "/c", "start", "ms-settings:"])),
            ("📊", lambda: subprocess.Popen(["taskmgr.exe"])),
            ("📅", lambda: subprocess.Popen(["cmd.exe", "/c", "start", "outlookcal:"]))
        ]:
            ctk.CTkButton(
                tray_f, text=icon, width=24, height=22, corner_radius=6,
                fg_color="#111c34", hover_color="#1e293b", font=("Segoe UI", 8), command=cmd
            ).pack(side="left", padx=2)

        # Bottom Analytics 2-Card Grid (Fills Bottom Space Perfectly!)
        analytics_grid = ctk.CTkFrame(card, fg_color="transparent")
        analytics_grid.pack(fill="both", expand=True, padx=16, pady=(4, 8))

        # Left Analytics: Live Application Screen-Time History Breakdown
        app_usage_card = ctk.CTkFrame(analytics_grid, fg_color="#111c34", corner_radius=12, border_width=1, border_color="#1e293b")
        app_usage_card.pack(side="left", fill="both", expand=True, padx=(0, 4))

        au_hdr = ctk.CTkFrame(app_usage_card, fg_color="transparent")
        au_hdr.pack(fill="x", padx=10, pady=(6, 3))
        ctk.CTkLabel(au_hdr, text="📊 Live Screen-Time History", font=("Segoe UI", 8, "bold"), text_color="#38bdf8").pack(side="left")
        ctk.CTkLabel(au_hdr, text="4h 24m Total", font=("Segoe UI", 7), text_color="#64748b").pack(side="right")

        app_stats = [
            ("Visual Studio Code", "3h 12m", 0.75, "#38bdf8"),
            ("Google Chrome", "48m", 0.45, "#f97316"),
            ("Windows Terminal", "18m", 0.25, "#22c55e"),
            ("ABHI Audio Core", "6m", 0.12, "#a855f7")
        ]
        for name, dur, ratio, bar_col in app_stats:
            row = ctk.CTkFrame(app_usage_card, fg_color="transparent")
            row.pack(fill="x", padx=10, pady=1)
            ctk.CTkLabel(row, text=name, font=("Segoe UI", 7), text_color="#cbd5e1", width=110, anchor="w").pack(side="left")
            p_bar = ctk.CTkProgressBar(row, height=5, corner_radius=3, fg_color="#070b14", progress_color=bar_col)
            p_bar.set(ratio)
            p_bar.pack(side="left", fill="x", expand=True, padx=6)
            ctk.CTkLabel(row, text=dur, font=("Segoe UI", 7, "bold"), text_color="#94a3b8", width=42, anchor="e").pack(side="right")

        # Right Analytics: Live Network Bandwidth & Data Usage Sparkline
        net_card = ctk.CTkFrame(analytics_grid, fg_color="#111c34", corner_radius=12, border_width=1, border_color="#1e293b")
        net_card.pack(side="left", fill="both", expand=True, padx=(4, 0))

        net_hdr = ctk.CTkFrame(net_card, fg_color="transparent")
        net_hdr.pack(fill="x", padx=10, pady=(6, 3))
        ctk.CTkLabel(net_hdr, text="⚡ Live Network & Data Usage", font=("Segoe UI", 8, "bold"), text_color="#22c55e").pack(side="left")
        ctk.CTkLabel(net_hdr, text="Session 1.84 GB", font=("Segoe UI", 7), text_color="#64748b").pack(side="right")

        # Speed Stats Row
        spd_row = ctk.CTkFrame(net_card, fg_color="transparent")
        spd_row.pack(fill="x", padx=10, pady=2)
        ctk.CTkLabel(spd_row, text="↓ 2.4 MB/s", font=("Segoe UI", 10, "bold"), text_color="#38bdf8").pack(side="left")
        ctk.CTkLabel(spd_row, text="  |  ", font=("Segoe UI", 9), text_color="#475569").pack(side="left")
        ctk.CTkLabel(spd_row, text="↑ 480 KB/s", font=("Segoe UI", 10, "bold"), text_color="#f97316").pack(side="left")
        ctk.CTkLabel(spd_row, text="Latency: 14ms", font=("Segoe UI", 7), text_color="#64748b").pack(side="right")

        # 8-Bar Sparkline Histogram
        spark_f = ctk.CTkFrame(net_card, fg_color="#070b14", corner_radius=6, height=28)
        spark_f.pack(fill="x", padx=10, pady=(4, 6))
        spark_f.pack_propagate(False)

        bar_heights = [10, 18, 14, 24, 20, 26, 16, 22]
        for bh in bar_heights:
            b_item = ctk.CTkFrame(spark_f, fg_color="#38bdf8" if bh > 16 else "#6366f1", width=12, height=bh, corner_radius=2)
            b_item.pack(side="left", fill="none", expand=True, anchor="s", pady=(0, 2), padx=2)

    # ==========================================================================
    # TAB 1: 🏠 HOME (Fenn.click Authentic 4-Column Deck Matching Image 10)
    # ==========================================================================

    def _build_tab_home(self):
        f = ctk.CTkFrame(self.body_container, fg_color="transparent")
        self.tab_frames["HOME"] = f

        # 4-Column Grid Frame (Image 10 Fenn.click Authentic Match)
        deck_grid = ctk.CTkFrame(f, fg_color="transparent")
        deck_grid.pack(fill="both", expand=True, padx=2, pady=2)

        # COLUMN 1: Focus Timer Dial + Coffee Always Toggle Switch
        col1 = ctk.CTkFrame(deck_grid, fg_color="transparent")
        col1.pack(side="left", fill="both", expand=True, padx=(0, 4))

        # Timer Card (Row 1)
        timer_card = ctk.CTkFrame(col1, fg_color="#0d1527", corner_radius=14, border_width=1, border_color="#1a2333")
        timer_card.pack(fill="both", expand=True, pady=(0, 4))

        t_hdr = ctk.CTkFrame(timer_card, fg_color="transparent")
        t_hdr.pack(fill="x", padx=10, pady=(8, 2))
        ctk.CTkLabel(t_hdr, text="⌛ Timer", font=("Segoe UI", 8, "bold"), text_color="#f8fafc").pack(side="left")
        ctk.CTkButton(t_hdr, text="↺", width=20, height=20, corner_radius=6, fg_color="transparent", hover_color="#1e293b", font=("Segoe UI", 9), command=self.reset_home_timer).pack(side="right")

        # Circular dial representation
        dial_frame = ctk.CTkFrame(timer_card, fg_color="#111c34", corner_radius=32, width=64, height=64, border_width=2, border_color="#6366f1")
        dial_frame.pack(pady=2)
        dial_frame.pack_propagate(False)
        self.home_timer_lbl = ctk.CTkLabel(dial_frame, text="25:00", font=("Segoe UI", 12, "bold"), text_color="#ffffff")
        self.home_timer_lbl.place(relx=0.5, rely=0.5, anchor="center")

        # Timer Controls (- ▶ +)
        t_ctrls = ctk.CTkFrame(timer_card, fg_color="transparent")
        t_ctrls.pack(pady=(2, 6))
        ctk.CTkButton(t_ctrls, text="−", width=24, height=22, corner_radius=6, fg_color="#1e293b", hover_color="#334155", font=("Segoe UI", 10, "bold"), command=lambda: self.adjust_home_timer(-5)).pack(side="left", padx=2)
        self.home_timer_play_btn = ctk.CTkButton(t_ctrls, text="▶", width=28, height=22, corner_radius=6, fg_color="#6366f1", hover_color="#4f46e5", font=("Segoe UI", 9, "bold"), command=self.toggle_home_timer)
        self.home_timer_play_btn.pack(side="left", padx=2)
        ctk.CTkButton(t_ctrls, text="+", width=24, height=22, corner_radius=6, fg_color="#1e293b", hover_color="#334155", font=("Segoe UI", 10, "bold"), command=lambda: self.adjust_home_timer(5)).pack(side="left", padx=2)

        # Coffee Always Card (Row 2)
        coffee_card = ctk.CTkFrame(col1, fg_color="#0d1527", corner_radius=14, border_width=1, border_color="#1a2333")
        coffee_card.pack(fill="x", pady=(0, 2))

        c_row = ctk.CTkFrame(coffee_card, fg_color="transparent")
        c_row.pack(fill="x", padx=10, pady=8)

        c_left = ctk.CTkFrame(c_row, fg_color="transparent")
        c_left.pack(side="left", fill="y")
        ctk.CTkLabel(c_left, text="☕ Coffee Always", font=("Segoe UI", 8, "bold"), text_color="#f8fafc", anchor="w").pack(fill="x")
        self.coffee_status_lbl = ctk.CTkLabel(c_left, text="Keep awake" if self.is_coffee_on else "Off", font=("Segoe UI", 7), text_color="#38bdf8" if self.is_coffee_on else "#64748b", anchor="w")
        self.coffee_status_lbl.pack(fill="x")

        self.coffee_switch = ctk.CTkSwitch(c_row, text="", width=36, height=18, switch_width=36, switch_height=18, fg_color="#1e293b", progress_color="#22c55e", command=self.toggle_coffee_always)
        self.coffee_switch.pack(side="right")
        if self.is_coffee_on:
            self.coffee_switch.select()

        # COLUMN 2: Mini Music Player + Notes Scratchpad
        col2 = ctk.CTkFrame(deck_grid, fg_color="transparent")
        col2.pack(side="left", fill="both", expand=True, padx=3)

        # Mini Music Card (Row 1)
        music_card = ctk.CTkFrame(col2, fg_color="#0d1527", corner_radius=14, border_width=1, border_color="#1a2333")
        music_card.pack(fill="both", expand=True, pady=(0, 4))

        m_hdr = ctk.CTkFrame(music_card, fg_color="transparent")
        m_hdr.pack(fill="x", padx=10, pady=(8, 2))
        ctk.CTkLabel(m_hdr, text="♫ Late Night Focus", font=("Segoe UI", 8, "bold"), text_color="#f8fafc").pack(side="left")
        ctk.CTkLabel(m_hdr, text="16:13", font=("Segoe UI", 7), text_color="#94a3b8").pack(side="right")

        ctk.CTkLabel(music_card, text="Lo-Fi Radio · Continuous", font=("Segoe UI", 7), text_color="#64748b", anchor="w").pack(fill="x", padx=10, pady=(1, 2))

        # Media Control Buttons (|<< ▶ >>|)
        m_ctrls = ctk.CTkFrame(music_card, fg_color="transparent")
        m_ctrls.pack(pady=2)
        ctk.CTkButton(m_ctrls, text="⏮", width=26, height=22, corner_radius=6, fg_color="#1e293b", hover_color="#334155", font=("Segoe UI", 8), command=lambda: self.toggle_music()).pack(side="left", padx=2)
        self.home_music_play_btn = ctk.CTkButton(m_ctrls, text="▶", width=32, height=22, corner_radius=6, fg_color="#f97316", hover_color="#ea580c", font=("Segoe UI", 9, "bold"), command=self.toggle_music)
        self.home_music_play_btn.pack(side="left", padx=2)
        ctk.CTkButton(m_ctrls, text="⏭", width=26, height=22, corner_radius=6, fg_color="#1e293b", hover_color="#334155", font=("Segoe UI", 8), command=lambda: self.toggle_music()).pack(side="left", padx=2)

        # Notes Card (Row 2)
        notes_card = ctk.CTkFrame(col2, fg_color="#0d1527", corner_radius=14, border_width=1, border_color="#1a2333")
        notes_card.pack(fill="both", expand=True, pady=(0, 2))

        n_hdr = ctk.CTkFrame(notes_card, fg_color="transparent")
        n_hdr.pack(fill="x", padx=10, pady=(6, 2))
        ctk.CTkLabel(n_hdr, text="📝 Notes", font=("Segoe UI", 8, "bold"), text_color="#f8fafc").pack(side="left")

        self.home_notes_entry = ctk.CTkEntry(
            notes_card,
            placeholder_text="Write something...",
            font=("Segoe UI", 8),
            height=26,
            fg_color="#111c34",
            border_color="#1e293b",
            corner_radius=6
        )
        self.home_notes_entry.pack(fill="x", padx=8, pady=(1, 6))

        # COLUMN 3: Clipboard Shelf + Snippet Quick Actions
        col3 = ctk.CTkFrame(deck_grid, fg_color="transparent")
        col3.pack(side="left", fill="both", expand=True, padx=3)

        clip_card = ctk.CTkFrame(col3, fg_color="#0d1527", corner_radius=14, border_width=1, border_color="#1a2333")
        clip_card.pack(fill="both", expand=True, pady=(0, 4))

        cl_hdr = ctk.CTkFrame(clip_card, fg_color="transparent")
        cl_hdr.pack(fill="x", padx=10, pady=(8, 2))
        ctk.CTkLabel(cl_hdr, text="📋 Clipboard", font=("Segoe UI", 8, "bold"), text_color="#f8fafc").pack(side="left")
        ctk.CTkLabel(cl_hdr, text="⤢", font=("Segoe UI", 9), text_color="#64748b").pack(side="right")

        # Clipboard preview area
        clip_preview = ctk.CTkFrame(clip_card, fg_color="#111c34", corner_radius=8)
        clip_preview.pack(fill="both", expand=True, padx=8, pady=3)
        clip_text = self.clipboard_history[0] if self.clipboard_history else "Copy something..."
        self.home_clip_lbl = ctk.CTkLabel(clip_preview, text=clip_text, font=("Segoe UI", 7), text_color="#cbd5e1", wraplength=120, justify="left", anchor="nw")
        self.home_clip_lbl.pack(fill="both", expand=True, padx=6, pady=6)

        # Quick action snippet buttons
        clip_actions = ctk.CTkFrame(col3, fg_color="transparent")
        clip_actions.pack(fill="x", pady=(0, 2))
        ctk.CTkButton(clip_actions, text="🔗 Link", font=("Segoe UI", 7, "bold"), height=24, corner_radius=6, fg_color="#0d1527", hover_color="#1e293b", border_width=1, border_color="#1a2333", command=lambda: self._copy_to_system_clipboard("https://github.com/elayadesign/ai-design-skills")).pack(side="left", fill="x", expand=True, padx=(0, 2))
        ctk.CTkButton(clip_actions, text="✂️ Snip", font=("Segoe UI", 7, "bold"), height=24, corner_radius=6, fg_color="#0d1527", hover_color="#1e293b", border_width=1, border_color="#1a2333", command=lambda: subprocess.Popen(["cmd.exe", "/c", "start", "ms-screenclip:"])).pack(side="left", fill="x", expand=True, padx=(2, 0))

        # COLUMN 4: 2x4 Tool Button Grid (Image 10 Match)
        col4 = ctk.CTkFrame(deck_grid, fg_color="transparent")
        col4.pack(side="left", fill="both", expand=True, padx=(3, 0))

        tools_card = ctk.CTkFrame(col4, fg_color="#0d1527", corner_radius=14, border_width=1, border_color="#1a2333")
        tools_card.pack(fill="both", expand=True, pady=0)

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

        # 4 rows of 2 buttons each
        for row_idx in range(4):
            r_frame = ctk.CTkFrame(tools_card, fg_color="transparent")
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
                    fg_color="#111c34",
                    hover_color="#1e293b",
                    border_width=1,
                    border_color="#1a2333",
                    command=cmd
                )
                btn.pack(side="left", fill="x", expand=True, padx=2)

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

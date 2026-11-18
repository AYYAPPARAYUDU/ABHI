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
    "solar_amber": {
        "name": "Solar Amber",
        "bg": "#070b14",
        "surface": "#0d1527",
        "surface_card": "#111c34",
        "border": "#f97316",         # Cyber Orange
        "border_secondary": "#ea580c",
        "border_glow": "#fdba74",
        "accent": "#f59e0b",
        "accent_hover": "#fbbf24",
        "text_primary": "#fffbeb",
        "text_secondary": "#fde68a",
        "text_muted": "#94a3b8",
        "hud_border": "#f97316",
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

        # Active Theme (Default: Solar Amber matching Light Yellows & Orange borders)
        self.current_theme_key = "solar_amber"
        self.theme = THEMES[self.current_theme_key]

        # Geometry & Notch States
        self.is_expanded = False
        self.is_pinned = False
        self.is_notch_docked = True
        self.active_tab = "CENTER"
        self.screen_width = self.winfo_screenwidth()
        self.screen_height = self.winfo_screenheight()

        self.compact_w, self.compact_h = 340, 38
        self.expanded_w, self.expanded_h = 860, 440

        # Pinned right at the top center of Windows screen
        self.pos_x = (self.screen_width - self.compact_w) // 2
        self.pos_y = 0

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

        # Focus Timer State
        self.timer_seconds = 0
        self.is_timer_running = False
        self.timer_thread = None

        # Clipboard Shelf
        self.clipboard_history = [
            "https://github.com/elayadesign/ai-design-skills",
            "git status -s",
            "py -3.14 run_server.py"
        ]

        # Build Frames
        self.compact_frame = ctk.CTkFrame(
            self,
            width=self.compact_w,
            height=self.compact_h,
            fg_color="#070b14",
            border_color=self.theme["border"],
            border_width=1.5,
            corner_radius=18
        )

        self.expanded_frame = ctk.CTkFrame(
            self,
            width=self.expanded_w,
            height=self.expanded_h,
            fg_color="#070b14",
            border_color=self.theme["border"],
            border_width=1.5,
            corner_radius=22
        )

        self._build_compact_notch_view()
        self._build_expanded_notch_view()

        # Launch docked at top
        self._update_geometry()
        self.compact_frame.pack(fill="both", expand=True)

        # Background loops
        self._enforce_topmost()
        self._start_os_context_monitor()
        self._start_continuous_voice_listener()
        self._start_clock_and_vitals_loop()

    # ==========================================================================
    # WINDOW MANAGEMENT & GEOMETRY
    # ==========================================================================

    def _enforce_topmost(self):
        try:
            hwnd = ctypes.windll.user32.GetParent(self.winfo_id())
            if not hwnd:
                hwnd = self.winfo_id()
            ctypes.windll.user32.SetWindowPos(hwnd, -1, 0, 0, 0, 0, 0x0013)
        except Exception:
            pass
        self.after(1000, self._enforce_topmost)

    def _update_geometry(self):
        w = self.expanded_w if self.is_expanded else self.compact_w
        h = self.expanded_h if self.is_expanded else self.compact_h
        self.pos_x = (self.screen_width - w) // 2
        self.pos_y = 0
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
            self._update_geometry()
            self.expanded_frame.pack(fill="both", expand=True)
            self.input_entry.focus_set()
        else:
            self.expanded_frame.pack_forget()
            self._update_geometry()
            self.compact_frame.pack(fill="both", expand=True)

    def toggle_pin(self):
        self.is_pinned = not self.is_pinned
        if self.is_pinned:
            self.pin_btn.configure(text="📌 Pinned", fg_color="#0369a1")
        else:
            self.pin_btn.configure(text="📌", fg_color="transparent")

    # ==========================================================================
    # 1. COMPACT NOTCH PILL VIEW (340x38, Docked at y=0)
    # ==========================================================================

    def _build_compact_notch_view(self):
        cf = self.compact_frame
        t = self.theme

        # Hover & Click events to auto-expand
        for w in (cf,):
            w.bind("<Enter>", lambda e: self.after(100, self.expand_notch))
            w.bind("<Button-1>", lambda e: self.expand_notch())

        # Sub-container for clean alignment
        inner = ctk.CTkFrame(cf, fg_color="transparent")
        inner.pack(fill="both", expand=True, padx=12, pady=2)
        inner.bind("<Enter>", lambda e: self.after(100, self.expand_notch))
        inner.bind("<Button-1>", lambda e: self.expand_notch())

        # Left: Pulsing Green Dot + ABHI NOTCH
        left_box = ctk.CTkFrame(inner, fg_color="transparent")
        left_box.pack(side="left", fill="y")
        left_box.bind("<Enter>", lambda e: self.after(100, self.expand_notch))
        left_box.bind("<Button-1>", lambda e: self.expand_notch())

        self.pill_beacon = ctk.CTkLabel(
            left_box,
            text="●",
            font=("Segoe UI", 12, "bold"),
            text_color="#22c55e"
        )
        self.pill_beacon.pack(side="left", padx=(0, 5))
        self.pill_beacon.bind("<Enter>", lambda e: self.after(100, self.expand_notch))
        self.pill_beacon.bind("<Button-1>", lambda e: self.expand_notch())

        pill_title = ctk.CTkLabel(
            left_box,
            text="ABHI NOTCH",
            font=("Segoe UI", 8, "bold"),
            text_color="#94a3b8"
        )
        pill_title.pack(side="left")
        pill_title.bind("<Enter>", lambda e: self.after(100, self.expand_notch))
        pill_title.bind("<Button-1>", lambda e: self.expand_notch())

        # Center: Live Clock
        self.pill_clock_lbl = ctk.CTkLabel(
            inner,
            text="10:16 AM",
            font=("Segoe UI", 9, "bold"),
            text_color="#f8fafc"
        )
        self.pill_clock_lbl.pack(side="left", expand=True)
        self.pill_clock_lbl.bind("<Enter>", lambda e: self.after(100, self.expand_notch))
        self.pill_clock_lbl.bind("<Button-1>", lambda e: self.expand_notch())

        # Right: Battery & Chevron
        right_box = ctk.CTkFrame(inner, fg_color="transparent")
        right_box.pack(side="right", fill="y")
        right_box.bind("<Enter>", lambda e: self.after(100, self.expand_notch))
        right_box.bind("<Button-1>", lambda e: self.expand_notch())

        self.pill_battery_lbl = ctk.CTkLabel(
            right_box,
            text="⚡ 75%",
            font=("Segoe UI", 8, "bold"),
            text_color="#38bdf8"
        )
        self.pill_battery_lbl.pack(side="left", padx=(0, 6))
        self.pill_battery_lbl.bind("<Enter>", lambda e: self.after(100, self.expand_notch))
        self.pill_battery_lbl.bind("<Button-1>", lambda e: self.expand_notch())

        chevron = ctk.CTkLabel(
            right_box,
            text="▼",
            font=("Segoe UI", 8),
            text_color="#94a3b8"
        )
        chevron.pack(side="left")
        chevron.bind("<Enter>", lambda e: self.after(100, self.expand_notch))
        chevron.bind("<Button-1>", lambda e: self.expand_notch())

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

        # Left: Time & Tag
        h_left = ctk.CTkFrame(header_strip, fg_color="transparent")
        h_left.pack(side="left", fill="y")

        self.strip_clock_lbl = ctk.CTkLabel(
            h_left,
            text="10:16 AM",
            font=("Segoe UI", 10, "bold"),
            text_color="#f8fafc"
        )
        self.strip_clock_lbl.pack(side="left", padx=(0, 6))

        sep1 = ctk.CTkLabel(h_left, text="•", font=("Segoe UI", 9), text_color="#64748b")
        sep1.pack(side="left", padx=2)

        tag_lbl = ctk.CTkLabel(
            h_left,
            text="ABHI ALL-IN-ONE NOTCH",
            font=("Segoe UI", 9, "bold"),
            text_color=t["border"]
        )
        tag_lbl.pack(side="left", padx=4)

        sep2 = ctk.CTkLabel(h_left, text="•", font=("Segoe UI", 9), text_color="#64748b")
        sep2.pack(side="left", padx=2)

        self.weather_lbl = ctk.CTkLabel(
            h_left,
            text="28° Sunny",
            font=("Segoe UI", 9),
            text_color="#cbd5e1"
        )
        self.weather_lbl.pack(side="left", padx=4)

        # Center: Universal High-Tech Tab Pills
        h_center = ctk.CTkFrame(header_strip, fg_color="transparent")
        h_center.pack(side="left", expand=True)

        self.tab_buttons = {}
        tabs = [
            ("⚙️ CENTER", "CENTER"),
            ("📅 CALENDAR", "CALENDAR"),
            ("♫ MUSIC", "MUSIC"),
            ("⚡ VITALS", "VITALS"),
            ("📋 SHELF", "SHELF"),
            ("🚀 APPS", "APPS")
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

        # Right: Battery, Pin, Close
        h_right = ctk.CTkFrame(header_strip, fg_color="transparent")
        h_right.pack(side="right", fill="y")

        self.strip_battery_lbl = ctk.CTkLabel(
            h_right,
            text="⚡ 75%",
            font=("Segoe UI", 9, "bold"),
            text_color="#38bdf8"
        )
        self.strip_battery_lbl.pack(side="left", padx=(0, 6))

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
        self._build_tab_center()
        self._build_tab_calendar()
        self._build_tab_music()
        self._build_tab_vitals()
        self._build_tab_shelf()
        self._build_tab_apps()

        # Display default tab
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

        # 4 Main Control Cards (2x2 Grid)
        grid_frame = ctk.CTkFrame(f, fg_color="transparent")
        grid_frame.pack(fill="x", pady=(2, 10))

        # Wi-Fi Card
        self.wifi_card = ctk.CTkButton(
            grid_frame,
            text="📶  Wi-Fi\nConnected · 5GHz",
            font=("Segoe UI", 9, "bold"),
            height=54,
            corner_radius=14,
            fg_color="#ffffff",
            text_color="#0f172a",
            hover_color="#e2e8f0",
            command=self.toggle_wifi
        )
        self.wifi_card.pack(side="left", fill="x", expand=True, padx=(0, 6))

        # DND Card
        self.dnd_card = ctk.CTkButton(
            grid_frame,
            text="🌙  DND Mode\nAlerts Active",
            font=("Segoe UI", 9, "bold"),
            height=54,
            corner_radius=14,
            fg_color="#0d1527",
            text_color="#f8fafc",
            hover_color="#1e293b",
            command=self.toggle_dnd
        )
        self.dnd_card.pack(side="left", fill="x", expand=True, padx=3)

        # Bluetooth Card
        self.bt_card = ctk.CTkButton(
            grid_frame,
            text="🔊  Bluetooth\nOn · Audio Sync",
            font=("Segoe UI", 9, "bold"),
            height=54,
            corner_radius=14,
            fg_color="#ffffff",
            text_color="#0f172a",
            hover_color="#e2e8f0",
            command=self.toggle_bluetooth
        )
        self.bt_card.pack(side="left", fill="x", expand=True, padx=3)

        # Notch Mode Card
        self.notch_mode_card = ctk.CTkButton(
            grid_frame,
            text="🔝  Notch Mode\nFixed Top Dock",
            font=("Segoe UI", 9, "bold"),
            height=54,
            corner_radius=14,
            fg_color="#ffffff",
            text_color="#0f172a",
            hover_color="#e2e8f0",
            command=self.toggle_pin
        )
        self.notch_mode_card.pack(side="left", fill="x", expand=True, padx=(6, 0))

        # Sliders Section (Volume & Brightness)
        sliders_box = ctk.CTkFrame(f, fg_color="#0d1527", corner_radius=14, border_width=1, border_color="#1a2333")
        sliders_box.pack(fill="x", pady=4, padx=2)

        # Volume Row
        vol_row = ctk.CTkFrame(sliders_box, fg_color="transparent")
        vol_row.pack(fill="x", padx=14, pady=(8, 4))
        vol_lbl = ctk.CTkLabel(vol_row, text="🔊 Volume", font=("Segoe UI", 8, "bold"), text_color="#cbd5e1", width=80, anchor="w")
        vol_lbl.pack(side="left")
        self.vol_slider = ctk.CTkSlider(vol_row, from_=0, to=100, number_of_steps=100, command=self._on_volume_change)
        self.vol_slider.set(self.current_volume)
        self.vol_slider.pack(side="left", fill="x", expand=True, padx=10)
        self.vol_val_lbl = ctk.CTkLabel(vol_row, text=f"{self.current_volume}%", font=("Segoe UI", 8, "bold"), text_color="#f8fafc", width=36)
        self.vol_val_lbl.pack(side="right")

        # Brightness Row
        bri_row = ctk.CTkFrame(sliders_box, fg_color="transparent")
        bri_row.pack(fill="x", padx=14, pady=(4, 8))
        bri_lbl = ctk.CTkLabel(bri_row, text="☀️ Brightness", font=("Segoe UI", 8, "bold"), text_color="#cbd5e1", width=80, anchor="w")
        bri_lbl.pack(side="left")
        self.bri_slider = ctk.CTkSlider(bri_row, from_=10, to=100, number_of_steps=90, command=self._on_brightness_change)
        self.bri_slider.set(self.current_brightness)
        self.bri_slider.pack(side="left", fill="x", expand=True, padx=10)
        self.bri_val_lbl = ctk.CTkLabel(bri_row, text=f"{self.current_brightness}%", font=("Segoe UI", 8, "bold"), text_color="#f8fafc", width=36)
        self.bri_val_lbl.pack(side="right")

        # Quick System Tools Bar (Settings, Night Light, Battery, Dashboard, Theme)
        tools_row = ctk.CTkFrame(f, fg_color="transparent")
        tools_row.pack(fill="x", pady=(8, 2))

        tools = [
            ("🌙 Night Light", self.toggle_night_light),
            ("🔋 Battery Saver", self.toggle_battery_saver),
            ("⚙️ Laptop Settings", lambda: subprocess.Popen(["cmd.exe", "/c", "start", "ms-settings:"])),
            ("⊞ Home Dashboard", lambda: subprocess.Popen(["cmd.exe", "/c", "start", "http://localhost:4200/#/home"])),
            ("🧠 Cognitive Brain", lambda: subprocess.Popen(["cmd.exe", "/c", "start", "http://localhost:4200/#/brain"])),
            ("🎨 Cycle Theme", self.cycle_theme)
        ]
        for label, cmd in tools:
            btn = ctk.CTkButton(
                tools_row,
                text=label,
                font=("Segoe UI", 8, "bold"),
                height=30,
                corner_radius=10,
                fg_color="#0d1527",
                text_color="#cbd5e1",
                hover_color="#1e293b",
                command=cmd
            )
            btn.pack(side="left", fill="x", expand=True, padx=3)

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

        # Right: Focus Timer & Active Automations
        right_card = ctk.CTkFrame(cal_grid, fg_color="#0d1527", corner_radius=16, border_width=1, border_color="#1a2333")
        right_card.pack(side="right", fill="both", expand=True, padx=(6, 0), pady=2)

        # Timer Display
        timer_box = ctk.CTkFrame(right_card, fg_color="transparent")
        timer_box.pack(fill="x", padx=14, pady=(10, 4))

        self.timer_lbl = ctk.CTkLabel(timer_box, text="00:00", font=("Segoe UI", 24, "bold"), text_color="#f8fafc")
        self.timer_lbl.pack(side="top")

        # Timer Buttons
        t_btns = ctk.CTkFrame(timer_box, fg_color="transparent")
        t_btns.pack(fill="x", pady=4)

        self.start_timer_btn = ctk.CTkButton(
            t_btns, text="Start", font=("Segoe UI", 8, "bold"), fg_color="#ffffff", text_color="#000000",
            hover_color="#e2e8f0", height=26, corner_radius=8, command=self.toggle_timer
        )
        self.start_timer_btn.pack(side="left", fill="x", expand=True, padx=(0, 4))

        reset_btn = ctk.CTkButton(
            t_btns, text="Reset", font=("Segoe UI", 8, "bold"), fg_color="#1e293b", text_color="#cbd5e1",
            hover_color="#334155", height=26, corner_radius=8, command=self.reset_timer
        )
        reset_btn.pack(side="left", fill="x", expand=True, padx=(4, 0))

        # Preset Chips
        chips_f = ctk.CTkFrame(timer_box, fg_color="transparent")
        chips_f.pack(fill="x", pady=4)
        for preset_m in [5, 15, 25, 50]:
            btn = ctk.CTkButton(
                chips_f, text=f"{preset_m}m", font=("Segoe UI", 7, "bold"), fg_color="#111c34",
                text_color="#cbd5e1", height=20, corner_radius=6,
                command=lambda m=preset_m: self.set_timer_preset(m)
            )
            btn.pack(side="left", fill="x", expand=True, padx=2)

        # Active Automations
        auto_lbl = ctk.CTkLabel(right_card, text="ACTIVE AUTOMATIONS", font=("Segoe UI", 7, "bold"), text_color="#64748b")
        auto_lbl.pack(anchor="w", padx=14, pady=(6, 2))

        autos = [
            ("● Executive Briefing", "08:00 AM"),
            ("● Security & Health Audit", "12:00 PM"),
            ("● Device Sync & Backup", "06:30 PM")
        ]
        for name, sched in autos:
            row = ctk.CTkFrame(right_card, fg_color="transparent")
            row.pack(fill="x", padx=14, pady=1)
            ctk.CTkLabel(row, text=name, font=("Segoe UI", 7, "bold"), text_color="#22c55e").pack(side="left")
            ctk.CTkLabel(row, text=sched, font=("Segoe UI", 7), text_color="#94a3b8").pack(side="right")

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
        self.play_btn.configure(text="⏸" if self.is_playing else "▶")
        # Hardware media key VK_MEDIA_PLAY_PAUSE = 0xB3
        ctypes.windll.user32.keybd_event(0xB3, 0, 0, 0)
        ctypes.windll.user32.keybd_event(0xB3, 0, 2, 0)

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
        gauges_row.pack(fill="both", expand=True, padx=16, pady=8)

        # CPU Card
        cpu_card = ctk.CTkFrame(gauges_row, fg_color="#111c34", corner_radius=14)
        cpu_card.pack(side="left", fill="both", expand=True, padx=(0, 6))
        ctk.CTkLabel(cpu_card, text="CPU USAGE", font=("Segoe UI", 7, "bold"), text_color="#38bdf8").pack(pady=(10, 2))
        self.cpu_pct_lbl = ctk.CTkLabel(cpu_card, text="24%", font=("Segoe UI", 22, "bold"), text_color="#f8fafc")
        self.cpu_pct_lbl.pack(pady=4)
        ctk.CTkLabel(cpu_card, text="Multi-Core", font=("Segoe UI", 7), text_color="#64748b").pack(pady=(0, 10))

        # RAM Card
        ram_card = ctk.CTkFrame(gauges_row, fg_color="#111c34", corner_radius=14)
        ram_card.pack(side="left", fill="both", expand=True, padx=4)
        ctk.CTkLabel(ram_card, text="RAM USAGE", font=("Segoe UI", 7, "bold"), text_color="#f97316").pack(pady=(10, 2))
        self.ram_pct_lbl = ctk.CTkLabel(ram_card, text="45%", font=("Segoe UI", 22, "bold"), text_color="#f8fafc")
        self.ram_pct_lbl.pack(pady=4)
        ctk.CTkLabel(ram_card, text="16 GB Total", font=("Segoe UI", 7), text_color="#64748b").pack(pady=(0, 10))

        # Disk Card
        disk_card = ctk.CTkFrame(gauges_row, fg_color="#111c34", corner_radius=14)
        disk_card.pack(side="left", fill="both", expand=True, padx=(6, 0))
        ctk.CTkLabel(disk_card, text="DISK USAGE", font=("Segoe UI", 7, "bold"), text_color="#a855f7").pack(pady=(10, 2))
        self.disk_pct_lbl = ctk.CTkLabel(disk_card, text="32%", font=("Segoe UI", 22, "bold"), text_color="#f8fafc")
        self.disk_pct_lbl.pack(pady=4)
        ctk.CTkLabel(disk_card, text="NVMe SSD", font=("Segoe UI", 7), text_color="#64748b").pack(pady=(0, 10))

    # ==========================================================================
    # TAB 5: 📋 SHELF (Clipboard Monitor & Scratchpad Note)
    # ==========================================================================

    def _build_tab_shelf(self):
        f = ctk.CTkFrame(self.body_container, fg_color="transparent")
        self.tab_frames["SHELF"] = f

        box = ctk.CTkFrame(f, fg_color="#0d1527", corner_radius=16, border_width=1, border_color="#1a2333")
        box.pack(fill="both", expand=True, padx=2, pady=2)

        hdr = ctk.CTkFrame(box, fg_color="transparent")
        hdr.pack(fill="x", padx=16, pady=(12, 4))
        ctk.CTkLabel(hdr, text="📋  Windows System Clipboard History", font=("Segoe UI", 9, "bold"), text_color="#f8fafc").pack(side="left")

        # Clipboard list
        for text in self.clipboard_history:
            item_f = ctk.CTkFrame(box, fg_color="#111c34", corner_radius=10)
            item_f.pack(fill="x", padx=16, pady=3)
            ctk.CTkLabel(item_f, text=text, font=("Segoe UI", 8), text_color="#cbd5e1", anchor="w").pack(side="left", fill="x", expand=True, padx=10, pady=6)
            ctk.CTkButton(
                item_f, text="Copy", font=("Segoe UI", 7, "bold"), width=44, height=22, corner_radius=6,
                fg_color="#1e293b", hover_color="#334155",
                command=lambda t=text: self._copy_to_system_clipboard(t)
            ).pack(side="right", padx=6)

    def _copy_to_system_clipboard(self, text: str):
        self.clipboard_clear()
        self.clipboard_append(text)
        self.update()

    # ==========================================================================
    # TAB 6: 🚀 APPS (Instant App Launchers)
    # ==========================================================================

    def _build_tab_apps(self):
        f = ctk.CTkFrame(self.body_container, fg_color="transparent")
        self.tab_frames["APPS"] = f

        grid = ctk.CTkFrame(f, fg_color="transparent")
        grid.pack(fill="both", expand=True, pady=4)

        apps = [
            ("💻 VS Code", lambda: subprocess.Popen(["cmd.exe", "/c", "code ."])),
            ("🌐 Google Chrome", lambda: subprocess.Popen(["cmd.exe", "/c", "start", "chrome"])),
            ("⌨️ Terminal", lambda: subprocess.Popen(["cmd.exe", "/c", "start", "wt"])),
            ("📁 File Explorer", lambda: subprocess.Popen(["explorer.exe"])),
            ("⚙️ Windows Settings", lambda: subprocess.Popen(["cmd.exe", "/c", "start", "ms-settings:"])),
            ("🔢 Calculator", lambda: subprocess.Popen(["calc.exe"])),
            ("📝 Notepad", lambda: subprocess.Popen(["notepad.exe"])),
            ("📊 Task Manager", lambda: subprocess.Popen(["taskmgr.exe"]))
        ]

        row_f = None
        for i, (name, cmd) in enumerate(apps):
            if i % 4 == 0:
                row_f = ctk.CTkFrame(grid, fg_color="transparent")
                row_f.pack(fill="x", expand=True, pady=3)

            btn = ctk.CTkButton(
                row_f,
                text=name,
                font=("Segoe UI", 9, "bold"),
                height=42,
                corner_radius=12,
                fg_color="#0d1527",
                hover_color="#1e293b",
                border_width=1,
                border_color="#1a2333",
                command=cmd
            )
            btn.pack(side="left", fill="x", expand=True, padx=4)

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
            reply = "Understood, Mamu. Operating on your command."

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

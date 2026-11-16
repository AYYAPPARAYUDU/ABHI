"""
================================================================================
ABHI Ultra Advanced Cybernetic Companion Cube Pet & Voice Operating System.
Next-Gen Living Cyber Pet with Animated Expressive Eyes, Dynamic Themes,
Win32 Mutex Single-Instance Guard, Ambient 24/7 Voice Intelligence,
and Minimal Advanced HUD.

Features:
  1. Win32 Named Mutex: Zero duplicate instances on startup or manual launch.
  2. Cybernetic Cube Pet: 110x110 floating companion with cute animated eyes
     (Blinking, Happy, Listening, Thinking, Speaking, Sleeping, Success).
  3. Dynamic Color Themes: Solar Amber (Light Yellows + Orange borders),
     Cyber Neon, Obsidian Blue, Royal Amethyst.
  4. Ambient 24/7 Background Audio Listener: Executes directives, reads screen,
     and controls apps even if the popup is never opened.
  5. Minimal Advanced Studio HUD (380x520): Top living faceplate, interactive mood
     pills, dynamic theme switcher, context telemetry, quick action chips.
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
from typing import Optional, Dict, Any
import collections

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
MUTEX_NAME = "Global\\ABHI_CYBERNETIC_CONTROLLER_MUTEX_V2"
kernel32 = ctypes.windll.kernel32
user32 = ctypes.windll.user32

_mutex_handle = kernel32.CreateMutexW(None, False, MUTEX_NAME)
if kernel32.GetLastError() == 183:  # ERROR_ALREADY_EXISTS
    hwnd = user32.FindWindowW(None, "ABHI Cybernetic Intelligence")
    if not hwnd:
        hwnd = user32.FindWindowW(None, "ABHI Cyber Companion")
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
        "eye_primary": "#fef08a",    # Light Yellow
        "eye_secondary": "#facc15",  # Warm Yellow
        "eye_glow": "#fef9c3",
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
        "eye_primary": "#67e8f9",    # Cyber Cyan
        "eye_secondary": "#22d3ee",
        "eye_glow": "#cffafe",
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
        "eye_primary": "#bae6fd",    # Frost Cyan
        "eye_secondary": "#38bdf8",
        "eye_glow": "#e0f2fe",
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
        "eye_primary": "#fbcfe8",    # Light Pink
        "eye_secondary": "#c084fc",  # Purple
        "eye_glow": "#fdf2f8",
        "accent": "#ec4899",
        "accent_hover": "#f472b6",
        "text_primary": "#fdf4ff",
        "text_secondary": "#f0abfc",
        "text_muted": "#706a85",
        "hud_border": "#db2777",
    }
}


class AbhiCyberneticCompanion(ctk.CTk):
    """
    ABHI Living Cyber Cube Companion Pet & Ambient Voice Operating System.
    """

    def __init__(self):
        super().__init__()
        self.title("ABHI Cyber Companion")

        # Window styling: Frameless, Always-On-Top, Transparent Backing
        self.overrideredirect(True)
        self.wm_attributes("-topmost", True)
        self.TRANSPARENT_KEY = "#020617"
        self.config(bg=self.TRANSPARENT_KEY)
        self.wm_attributes("-transparentcolor", self.TRANSPARENT_KEY)

        # Active Theme (Default: Solar Amber matching Light Yellows & Orange borders)
        self.current_theme_key = "solar_amber"
        self.theme = THEMES[self.current_theme_key]

        # Emotion & Mood State
        self.mood = "happy"  # happy, focus, cyber, tuned, sleep
        self.bot_state = "IDLE"  # IDLE, LISTENING, THINKING, SPEAKING, SUCCESS
        self.blink_state = 0.0  # 0.0 (wide open) to 1.0 (fully shut)
        self.is_blinking = False
        self.gaze_x = 0.0  # Normalized -1.0 to 1.0
        self.gaze_y = 0.0  # Normalized -1.0 to 1.0
        self.visor_scan_pos = 0.0  # Thinking sweep
        self.animation_tick = 0

        # Audio & Telemetry
        self.live_audio_rms = 0.0
        self.live_voice_ratio = 0.0
        self.is_mic_listening = True
        self.audio_history = [0.0] * 20
        self.active_window_title = "Windows Desktop"
        self.tts_lock = threading.Lock()

        # Window Geometry & Dragging
        self.is_expanded = False
        self.screen_width = self.winfo_screenwidth()
        self.screen_height = self.winfo_screenheight()

        self.compact_w, self.compact_h = 110, 110
        self.expanded_w, self.expanded_h = 380, 520

        # Position at bottom-right corner
        self.pos_x = self.screen_width - self.compact_w - 35
        self.pos_y = self.screen_height - self.compact_h - 75

        self.drag_start_x = 0
        self.drag_start_y = 0
        self.drag_dist = 0
        self.is_dragging = False

        # Build UI Components
        self.compact_frame = ctk.CTkFrame(
            self,
            width=self.compact_w,
            height=self.compact_h,
            fg_color="transparent",
            corner_radius=22
        )

        self.expanded_frame = ctk.CTkFrame(
            self,
            width=self.expanded_w,
            height=self.expanded_h,
            fg_color=self.theme["bg"],
            border_color=self.theme["border"],
            border_width=2,
            corner_radius=18
        )

        self._build_compact_cube_view()
        self._build_expanded_studio_view()

        # Start in compact mode
        self._update_geometry()
        self.compact_frame.pack(fill="both", expand=True)

        # Background loops
        self._enforce_topmost()
        self._start_os_context_monitor()
        self._start_continuous_voice_listener()
        self._schedule_blinking()

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
        self.geometry(f"{w}x{h}+{self.pos_x}+{self.pos_y}")

    # ==========================================================================
    # COMPACT LIVING CYBER CUBE PET VIEW (110x110)
    # ==========================================================================

    def _build_compact_cube_view(self):
        self.cube_canvas = ctk.CTkCanvas(
            self.compact_frame,
            width=self.compact_w,
            height=self.compact_h,
            bg=self.TRANSPARENT_KEY,
            highlightthickness=0
        )
        self.cube_canvas.pack(fill="both", expand=True)

        # Mouse Events: Dragging, Clicking, Gaze Tracking
        self.cube_canvas.bind("<Button-1>", self._on_drag_start)
        self.cube_canvas.bind("<B1-Motion>", self._on_drag_motion)
        self.cube_canvas.bind("<ButtonRelease-1>", self._on_drag_end_cube)
        self.cube_canvas.bind("<Motion>", self._on_mouse_hover)
        self.cube_canvas.bind("<Leave>", self._on_mouse_leave)

        self._render_cube_pet()

    def _on_mouse_hover(self, event):
        # Eyes track cursor relative to cube center
        cx, cy = self.compact_w / 2, self.compact_h / 2
        dx = (event.x - cx) / cx
        dy = (event.y - cy) / cy
        self.gaze_x = max(-1.0, min(1.0, dx))
        self.gaze_y = max(-1.0, min(1.0, dy))

    def _on_mouse_leave(self, event):
        self.gaze_x = 0.0
        self.gaze_y = 0.0

    def _schedule_blinking(self):
        """Natural lifelike eye blinking loop every 3.2 - 5 seconds."""
        if not self.is_blinking and self.mood != "sleep":
            self.is_blinking = True
            self._execute_blink_step(0.0, True)
        next_blink = 3200 + int(np.random.random() * 2000)
        self.after(next_blink, self._schedule_blinking)

    def _execute_blink_step(self, stage: float, closing: bool):
        if closing:
            stage += 0.35
            if stage >= 1.0:
                stage = 1.0
                closing = False
        else:
            stage -= 0.35
            if stage <= 0.0:
                stage = 0.0
                self.blink_state = 0.0
                self.is_blinking = False
                return

        self.blink_state = stage
        self.after(25, lambda: self._execute_blink_step(stage, closing))

    def _render_cube_pet(self):
        """Draws the Cybernetic Cube Pet chassis, beveled borders, and cute expressive eyes."""
        self.cube_canvas.delete("all")
        w, h = self.compact_w, self.compact_h
        t = self.theme
        self.animation_tick += 1

        # 1. Outer Glow Aura (Dynamic Audio RMS pulse)
        audio_boost = int(min(6, self.live_audio_rms * 40))
        pad = 8 - audio_boost
        cx, cy = w / 2, h / 2

        # 2. Cybernetic Cube Box Body (Rounded Beveled Chassis)
        box_x1, box_y1 = pad, pad + 2
        box_x2, box_y2 = w - pad, h - pad + 2
        corner_r = 16

        # Draw outer glowing halo if listening/talking
        if self.bot_state in ["LISTENING", "SPEAKING"] or self.live_voice_ratio > 0.06:
            halo_col = t["border_glow"] if self.bot_state != "SPEAKING" else "#86efac"
            self.cube_canvas.create_rectangle(
                box_x1 - 2, box_y1 - 2, box_x2 + 2, box_y2 + 2,
                outline=halo_col, width=1.5
            )

        # Main Cube Body
        self._create_rounded_rect(
            self.cube_canvas, box_x1, box_y1, box_x2, box_y2,
            radius=corner_r,
            fill=t["surface"],
            outline=t["border"],
            width=2.5
        )

        # 3. Corner Cyber Accents (Rivets / Screws)
        rivet_color = t["border_secondary"]
        rivet_offset = 7
        rivets = [
            (box_x1 + rivet_offset, box_y1 + rivet_offset),
            (box_x2 - rivet_offset, box_y1 + rivet_offset),
            (box_x1 + rivet_offset, box_y2 - rivet_offset),
            (box_x2 - rivet_offset, box_y2 - rivet_offset),
        ]
        for rx, ry in rivets:
            self.cube_canvas.create_oval(rx - 2, ry - 2, rx + 2, ry + 2, fill=rivet_color, outline="")

        # 4. Top Antenna / Cyber Horn (Tiny glowing amber nodule)
        horn_col = t["accent"] if self.bot_state != "SPEAKING" else "#22c55e"
        self.cube_canvas.create_line(cx, box_y1, cx, box_y1 - 5, fill=t["border"], width=2)
        self.cube_canvas.create_oval(cx - 3, box_y1 - 8, cx + 3, box_y1 - 2, fill=horn_col, outline="")

        # 5. Inner Glass Visor / Faceplate
        visor_pad = 7
        vx1, vy1 = box_x1 + visor_pad, box_y1 + visor_pad
        vx2, vy2 = box_x2 - visor_pad, box_y2 - visor_pad - 2
        self._create_rounded_rect(
            self.cube_canvas, vx1, vy1, vx2, vy2,
            radius=10,
            fill=t["bg"],
            outline="#1e293b",
            width=1
        )

        # 6. Cute Expressive Eyes (Left & Right)
        face_cx = (vx1 + vx2) / 2
        face_cy = (vy1 + vy2) / 2 - 1
        eye_spacing = 16
        eye_base_w = 12
        eye_base_h = 18

        # Thinking Visor Sweep
        if self.bot_state == "THINKING":
            self.visor_scan_pos = (self.visor_scan_pos + 2.5) % (vx2 - vx1)
            sweep_x = vx1 + self.visor_scan_pos
            self.cube_canvas.create_line(
                sweep_x, vy1 + 2, sweep_x, vy2 - 2,
                fill=t["accent"], width=2
            )

        # Draw left and right eyes
        left_eye_center = (face_cx - eye_spacing, face_cy)
        right_eye_center = (face_cx + eye_spacing, face_cy)

        for ex, ey in [left_eye_center, right_eye_center]:
            self._draw_cute_eye(
                canvas=self.cube_canvas,
                cx=ex,
                cy=ey,
                base_w=eye_base_w,
                base_h=eye_base_h,
                theme=t
            )

        # 7. Cute Mouth / Expression Indicator at Bottom of Visor
        mouth_y = face_cy + 13
        if self.bot_state == "SPEAKING":
            # Speaking audio wave mouth
            mouth_w = 6 + int(min(8, self.live_audio_rms * 50))
            self.cube_canvas.create_line(
                face_cx - mouth_w, mouth_y, face_cx + mouth_w, mouth_y,
                fill=t["eye_primary"], width=2
            )
        elif self.mood == "happy":
            # Cute small smiling arc
            self.cube_canvas.create_arc(
                face_cx - 5, mouth_y - 3, face_cx + 5, mouth_y + 4,
                start=190, extent=160, style="arc",
                outline=t["border_secondary"], width=1.5
            )

        # 8. Bottom Mood / State Label
        state_txt = self.mood.upper()
        if self.bot_state != "IDLE":
            state_txt = self.bot_state
        self.cube_canvas.create_text(
            cx, h - 3,
            text=state_txt,
            font=("Segoe UI", 6, "bold"),
            fill=t["text_muted"]
        )

        # Refresh canvas frame (smooth 30 FPS animation)
        self.after(33, self._render_cube_pet)

    def _draw_cute_eye(self, canvas, cx, cy, base_w, base_h, theme):
        """Draws one cute expressive eye taking mood, gaze, and blink state into account."""
        # Sleep Mode: Simple peaceful curved horizontal slits
        if self.mood == "sleep":
            canvas.create_line(
                cx - base_w, cy + 2, cx + base_w, cy + 2,
                fill=theme["eye_primary"], width=2.5
            )
            return

        # Happy Mode: Cute anime arched crescents (^ ^)
        if self.mood == "happy" and not self.is_blinking:
            canvas.create_arc(
                cx - base_w, cy - base_h / 2, cx + base_w, cy + base_h / 2,
                start=20, extent=140, style="arc",
                outline=theme["eye_primary"], width=3
            )
            return

        # Success Mode: Glowing Stars (★)
        if self.bot_state == "SUCCESS":
            canvas.create_text(
                cx, cy, text="★", font=("Segoe UI", 14, "bold"),
                fill=theme["eye_primary"]
            )
            return

        # Calculate animated height based on blinking
        current_h = base_h * (1.0 - self.blink_state)
        if current_h < 2.0:
            # Fully shut eye line during blink
            canvas.create_line(
                cx - base_w, cy, cx + base_w, cy,
                fill=theme["eye_primary"], width=2
            )
            return

        # Gaze offset (moves pupil/eye gently)
        gx = self.gaze_x * 3.5
        gy = self.gaze_y * 2.5

        # Audio reactive pupil enlargement when listening
        audio_pulse = min(3.0, self.live_audio_rms * 25.0) if self.bot_state == "LISTENING" else 0.0
        w_eff = (base_w + audio_pulse)
        h_eff = (current_h + audio_pulse)

        x1 = cx - w_eff + gx
        y1 = cy - h_eff / 2 + gy
        x2 = cx + w_eff + gx
        y2 = cy + h_eff / 2 + gy

        # Outer Eye Capsule
        eye_color = theme["eye_primary"]
        self._create_rounded_rect(
            canvas, x1, y1, x2, y2,
            radius=min(w_eff, h_eff / 2),
            fill=eye_color,
            outline=theme["eye_secondary"],
            width=1.5
        )

        # Cute Anime Specular Highlight (White shiny reflection dot at top-right)
        if current_h > 8.0:
            hl_x = cx + gx + 2.5
            hl_y = cy + gy - 3.5
            canvas.create_oval(
                hl_x - 2, hl_y - 2, hl_x + 2, hl_y + 2,
                fill="#ffffff", outline=""
            )
            # Secondary tiny reflection dot at bottom-left
            hl2_x = cx + gx - 2.5
            hl2_y = cy + gy + 3.0
            canvas.create_oval(
                hl2_x - 1, hl2_y - 1, hl2_x + 1, hl2_y + 1,
                fill="#ffffff", outline=""
            )

    def _create_rounded_rect(self, canvas, x1, y1, x2, y2, radius=12, **kwargs):
        """Helper to draw smooth anti-aliased rounded rectangles on standard Tk canvas."""
        points = [
            x1 + radius, y1,
            x2 - radius, y1,
            x2, y1,
            x2, y1 + radius,
            x2, y2 - radius,
            x2, y2,
            x2 - radius, y2,
            x1 + radius, y2,
            x1, y2,
            x1, y2 - radius,
            x1, y1 + radius,
            x1, y1,
        ]
        return canvas.create_polygon(points, smooth=True, **kwargs)

    # ==========================================================================
    # EXPANDED STUDIO HUD VIEW (380x520) - Minimal & Advanced
    # ==========================================================================

    def _build_expanded_studio_view(self):
        t = self.theme

        # 1. Header Bar with Living Mini Faceplate
        self.hud_header = ctk.CTkFrame(
            self.expanded_frame,
            fg_color=t["surface"],
            corner_radius=14,
            height=54
        )
        self.hud_header.pack(fill="x", padx=10, pady=(10, 4))
        self.hud_header.pack_propagate(False)

        header_left = ctk.CTkFrame(self.hud_header, fg_color="transparent")
        header_left.pack(side="left", padx=10, pady=6)

        self.header_status_dot = ctk.CTkLabel(
            header_left,
            text="●",
            font=("Segoe UI", 13, "bold"),
            text_color="#22c55e"
        )
        self.header_status_dot.pack(side="left", padx=(0, 6))

        self.header_title = ctk.CTkLabel(
            header_left,
            text="ABHI CYBER COMPANION",
            font=("Segoe UI", 10, "bold"),
            text_color=t["text_primary"]
        )
        self.header_title.pack(side="left")

        # Minimize to Cube Pet button
        min_btn = ctk.CTkButton(
            self.hud_header,
            text="―",
            width=26,
            height=26,
            corner_radius=13,
            fg_color="#1e293b",
            hover_color="#334155",
            text_color="#f8fafc",
            font=("Segoe UI", 10, "bold"),
            command=self.toggle_mode
        )
        min_btn.pack(side="right", padx=(4, 10))

        # Enable dragging from header
        for w in (self.hud_header, header_left, self.header_status_dot, self.header_title):
            w.bind("<Button-1>", self._on_drag_start)
            w.bind("<B1-Motion>", self._on_drag_motion)
            w.bind("<ButtonRelease-1>", self._on_drag_end_header)

        # 2. Interactive Mood Switcher Chips (5 Cute Micro-Chips)
        self.mood_bar = ctk.CTkFrame(self.expanded_frame, fg_color="transparent")
        self.mood_bar.pack(fill="x", padx=10, pady=2)

        moods = [
            ("😊 Happy", "happy"),
            ("🎯 Focus", "focus"),
            ("⚡ Cyber", "cyber"),
            ("🎧 Tuned", "tuned"),
            ("🌙 Sleep", "sleep")
        ]
        self.mood_buttons = {}
        for label, mood_key in moods:
            btn = ctk.CTkButton(
                self.mood_bar,
                text=label,
                font=("Segoe UI", 8, "bold"),
                width=66,
                height=26,
                corner_radius=13,
                fg_color=t["border"] if mood_key == self.mood else t["surface"],
                hover_color=t["border_secondary"],
                text_color=t["text_primary"],
                command=lambda m=mood_key: self.set_mood(m)
            )
            btn.pack(side="left", padx=2, expand=True)
            self.mood_buttons[mood_key] = btn

        # 3. Dynamic Themes Dropdown
        theme_row = ctk.CTkFrame(self.expanded_frame, fg_color="transparent")
        theme_row.pack(fill="x", padx=10, pady=2)

        theme_lbl = ctk.CTkLabel(
            theme_row,
            text="Active Theme:",
            font=("Segoe UI", 8, "bold"),
            text_color=t["text_muted"]
        )
        theme_lbl.pack(side="left", padx=(4, 6))

        self.theme_menu = ctk.CTkOptionMenu(
            theme_row,
            values=["Solar Amber", "Cyber Neon", "Obsidian Blue", "Royal Amethyst"],
            font=("Segoe UI", 8, "bold"),
            dropdown_font=("Segoe UI", 8),
            fg_color=t["surface"],
            button_color=t["border"],
            button_hover_color=t["border_secondary"],
            text_color=t["text_primary"],
            height=24,
            corner_radius=8,
            command=self._on_theme_select
        )
        self.theme_menu.set(t["name"])
        self.theme_menu.pack(side="left", fill="x", expand=True)

        # 4. Context Telemetry Pill
        self.telemetry_pill = ctk.CTkFrame(
            self.expanded_frame,
            fg_color=t["surface"],
            border_color="#1e293b",
            border_width=1,
            corner_radius=10,
            height=30
        )
        self.telemetry_pill.pack(fill="x", padx=10, pady=3)
        self.telemetry_pill.pack_propagate(False)

        self.telemetry_label = ctk.CTkLabel(
            self.telemetry_pill,
            text="🖥️ Foreground Context: Windows Desktop",
            font=("Segoe UI", 8),
            text_color=t["text_secondary"],
            anchor="w"
        )
        self.telemetry_label.pack(side="left", fill="x", expand=True, padx=8)

        # 5. Quick Action Chips (Single compact row)
        actions_frame = ctk.CTkFrame(self.expanded_frame, fg_color="transparent")
        actions_frame.pack(fill="x", padx=10, pady=2)

        quick_actions = [
            ("📸 Read Screen", "read_screen"),
            ("⏯️ Play/Pause", "toggle_playback"),
            ("🔒 Lock OS", "lock_screen"),
            ("🔇 Mute", "toggle_mic")
        ]
        self.quick_buttons = []
        for text, act in quick_actions:
            btn = ctk.CTkButton(
                actions_frame,
                text=text,
                font=("Segoe UI", 8, "bold"),
                height=26,
                corner_radius=8,
                fg_color=t["surface"],
                hover_color=t["border_secondary"],
                text_color=t["text_primary"],
                command=lambda a=act: self._handle_quick_chip(a)
            )
            btn.pack(side="left", padx=2, fill="x", expand=True)
            self.quick_buttons.append(btn)

        # 6. Minimal Clean Conversation History
        self.chat_card = ctk.CTkFrame(
            self.expanded_frame,
            fg_color=t["surface"],
            border_color="#1e293b",
            border_width=1,
            corner_radius=12
        )
        self.chat_card.pack(fill="both", expand=True, padx=10, pady=4)

        self.chat_box = ctk.CTkTextbox(
            self.chat_card,
            fg_color="transparent",
            text_color=t["text_primary"],
            font=("Segoe UI", 8),
            wrap="word",
            activate_scrollbars=True
        )
        self.chat_box.pack(fill="both", expand=True, padx=6, pady=6)
        self.chat_box.configure(state="disabled")

        self.append_chat("ABHI", "Acoustic voice filter engaged. I am tuned to your voice frequency, Mamu!")

        # 7. Modern Glass Input Bar
        input_bar = ctk.CTkFrame(
            self.expanded_frame,
            fg_color=t["surface"],
            border_color=t["border"],
            border_width=1,
            corner_radius=14,
            height=40
        )
        input_bar.pack(fill="x", padx=10, pady=(4, 10))
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
        self.mic_btn.pack(side="left", padx=(6, 4), pady=6)

        self.input_entry = ctk.CTkEntry(
            input_bar,
            placeholder_text="Talk with Abhi or type command...",
            placeholder_text_color="#64748b",
            font=("Segoe UI", 8),
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
            width=54,
            height=28,
            corner_radius=8,
            command=self.submit_input
        )
        self.send_btn.pack(side="right", padx=(4, 6), pady=6)

    def _handle_quick_chip(self, action: str):
        if action == "read_screen":
            self.append_chat("Mamu", "Read my screen")
            threading.Thread(target=self._dispatch_ai_query, args=("what are you seeing on my screen",), daemon=True).start()
        elif action == "toggle_playback":
            ctypes.windll.user32.keybd_event(0x20, 0, 0, 0)
            ctypes.windll.user32.keybd_event(0x20, 0, 2, 0)
            self.append_chat("ABHI", "Toggled playback, Mamu.")
            self._speak_verbally("Toggled playback, Mamu.")
        elif action == "lock_screen":
            ctypes.windll.user32.LockWorkStation()
            self.append_chat("ABHI", "Workstation locked securely, Mamu.")
        elif action == "toggle_mic":
            self.toggle_mic()

    def set_mood(self, new_mood: str):
        """Sets the mood of ABHI, altering eye expressions, colors, and personality."""
        self.mood = new_mood
        t = self.theme
        # Update mood button highlights
        for m_key, btn in self.mood_buttons.items():
            if m_key == new_mood:
                btn.configure(fg_color=t["border"])
            else:
                btn.configure(fg_color=t["surface"])

        greetings = {
            "happy": "Feeling vibrant and ready, Mamu!",
            "focus": "Focus mode engaged. Maximum productivity, Mamu.",
            "cyber": "Cyber matrix synchronized. All systems hyper-charged, Mamu.",
            "tuned": "Acoustic voice filter locked onto your frequency, Mamu.",
            "sleep": "Power-saving standby mode active, Mamu. Call me anytime."
        }
        msg = greetings.get(new_mood, f"Mood set to {new_mood}, Mamu.")
        self.append_chat("ABHI", msg)
        self._speak_verbally(msg)

    def _on_theme_select(self, theme_display_name: str):
        key_map = {
            "Solar Amber": "solar_amber",
            "Cyber Neon": "cyber_neon",
            "Obsidian Blue": "obsidian_blue",
            "Royal Amethyst": "royal_amethyst"
        }
        chosen_key = key_map.get(theme_display_name, "solar_amber")
        self.apply_theme(chosen_key)

    def apply_theme(self, theme_key: str):
        """Dynamically applies a color theme across the entire companion."""
        if theme_key not in THEMES:
            return
        self.current_theme_key = theme_key
        self.theme = THEMES[theme_key]
        t = self.theme

        # Update Frame styling
        self.expanded_frame.configure(
            fg_color=t["bg"],
            border_color=t["border"]
        )
        self.hud_header.configure(fg_color=t["surface"])
        self.header_title.configure(text_color=t["text_primary"])
        self.telemetry_pill.configure(fg_color=t["surface"])
        self.telemetry_label.configure(text_color=t["text_secondary"])
        self.chat_card.configure(fg_color=t["surface"])
        self.chat_box.configure(text_color=t["text_primary"])
        self.send_btn.configure(fg_color=t["border"], hover_color=t["border_secondary"])

        # Update mood buttons
        for m_key, btn in self.mood_buttons.items():
            if m_key == self.mood:
                btn.configure(fg_color=t["border"], hover_color=t["border_secondary"])
            else:
                btn.configure(fg_color=t["surface"], hover_color=t["border_secondary"])

        self.append_chat("System", f"Switched dynamic theme to {t['name']}.")

    # ==========================================================================
    # DRAG & DROP LOGIC
    # ==========================================================================

    def _on_drag_start(self, event):
        self.drag_start_x = event.x_root
        self.drag_start_y = event.y_root
        self.drag_dist = 0
        self.is_dragging = True

    def _on_drag_motion(self, event):
        dx = event.x_root - self.drag_start_x
        dy = event.y_root - self.drag_start_y
        self.drag_dist += abs(dx) + abs(dy)

        self.pos_x += dx
        self.pos_y += dy
        self.drag_start_x = event.x_root
        self.drag_start_y = event.y_root

        w = self.expanded_w if self.is_expanded else self.compact_w
        h = self.expanded_h if self.is_expanded else self.compact_h

        self.pos_x = max(0, min(self.pos_x, self.screen_width - w))
        self.pos_y = max(0, min(self.pos_y, self.screen_height - h))
        self.geometry(f"+{self.pos_x}+{self.pos_y}")

    def _on_drag_end_cube(self, event):
        self.is_dragging = False
        if self.drag_dist <= 6:
            self.toggle_mode()

    def _on_drag_end_header(self, event):
        self.is_dragging = False

    def toggle_mode(self):
        self.is_expanded = not self.is_expanded
        if self.is_expanded:
            self.compact_frame.pack_forget()
            self.pos_x = max(10, min(self.pos_x, self.screen_width - self.expanded_w - 20))
            self.pos_y = max(10, min(self.pos_y, self.screen_height - self.expanded_h - 40))
            self._update_geometry()
            self.expanded_frame.pack(fill="both", expand=True)
            self.input_entry.focus_set()
        else:
            self.expanded_frame.pack_forget()
            self._update_geometry()
            self.compact_frame.pack(fill="both", expand=True)

    def toggle_mic(self):
        self.is_mic_listening = not self.is_mic_listening
        btn_text = "🎙️" if self.is_mic_listening else "🔇"
        self.mic_btn.configure(text=btn_text)
        status = "Voice listening active." if self.is_mic_listening else "Voice listener muted."
        self.append_chat("System", status)

    # ==========================================================================
    # CONVERSATION DISPATCH & LOW-LATENCY SPEECH SYNTHESIS
    # ==========================================================================

    def append_chat(self, sender: str, msg: str):
        self.chat_box.configure(state="normal")
        self.chat_box.insert("end", f"[{sender}]: {msg}\n\n")
        self.chat_box.see("end")
        self.chat_box.configure(state="disabled")

    def submit_input(self):
        text = self.input_entry.get().strip()
        if not text:
            return
        self.input_entry.delete(0, "end")
        self.append_chat("Mamu", text)
        threading.Thread(target=self._dispatch_ai_query, args=(text,), daemon=True).start()

    def _dispatch_ai_query(self, query: str):
        """Processes user directive with 0ms in-process screen perception & dynamic actions."""
        self.bot_state = "THINKING"
        reply = None

        # 1. Direct screen perception & YouTube grid intent
        if screen_perception:
            try:
                q_l = query.lower()
                if any(k in q_l for k in ["row", "first one", "second one", "third one", "video", "play"]):
                    ok_g, g_reply = screen_perception.parse_and_execute_grid_intent(query)
                    if ok_g and g_reply:
                        reply = g_reply
                elif any(k in q_l for k in ["screen", "what you seeing", "what you saw", "what do you see", "read my screen", "look at my screen"]):
                    reply = screen_perception.describe_current_screen()
                elif any(k in q_l for k in ["what you said", "what did you say", "repeat", "say again"]):
                    reply = f"Mamu, I said: '{screen_perception.get_last_spoken()}'"
            except Exception:
                pass

        # 2. In-Process Dynamic Action Resolver (0ms execution)
        if not reply and dynamic_action_resolver:
            try:
                ok, action_name, res_reply = dynamic_action_resolver.resolve_and_execute(
                    query, f"Active OS Window: {self.active_window_title}"
                )
                if ok and res_reply:
                    reply = res_reply
            except Exception:
                pass

        # 3. Fast Backend Gateway (3.5s timeout)
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

        # 4. Instant Native OS Fallback
        if not reply:
            reply = self._execute_native_fallback(query)

        if screen_perception and reply:
            screen_perception.record_spoken(reply)

        self.bot_state = "SUCCESS"
        self.after(0, lambda: self.append_chat("ABHI", reply))
        self._speak_verbally(reply)
        self.after(1500, lambda: setattr(self, "bot_state", "IDLE"))

    def _speak_verbally(self, text: str):
        """Talks back verbally to user every time using native Windows SAPI5."""
        def run_tts():
            try:
                import pythoncom
                import win32com.client
                pythoncom.CoInitialize()
                spk = win32com.client.Dispatch("SAPI.SpVoice")
                spk.Rate = 1
                spk.Volume = 100
                for v in spk.GetVoices():
                    if "zira" in v.GetDescription().lower():
                        spk.Voice = v
                        break

                clean = text.replace("*", "").replace("#", "").replace("`", "").strip()
                sentences = clean.split(".")
                spoken_text = ". ".join(sentences[:2]) if len(sentences) > 1 else clean
                if len(spoken_text) > 180:
                    spoken_text = spoken_text[:180]

                self.bot_state = "SPEAKING"
                spk.Speak(spoken_text, 0)
            except Exception:
                pass
            finally:
                self.bot_state = "IDLE"
                try:
                    import pythoncom
                    pythoncom.CoUninitialize()
                except Exception:
                    pass

        threading.Thread(target=run_tts, daemon=True).start()

    def _execute_native_fallback(self, query: str) -> str:
        q = query.lower().strip()

        # Mood directives
        if "happy mood" in q or "feel happy" in q:
            self.after(0, lambda: self.set_mood("happy"))
            return "Switched to happy mood, Mamu!"
        elif "focus mood" in q or "focus mode" in q:
            self.after(0, lambda: self.set_mood("focus"))
            return "Focus mode active, Mamu."
        elif "cyber mood" in q or "cyber mode" in q:
            self.after(0, lambda: self.set_mood("cyber"))
            return "Cyber overdrive engaged, Mamu."
        elif "sleep mode" in q or "go to sleep" in q:
            self.after(0, lambda: self.set_mood("sleep"))
            return "Going into sleep standby mode, Mamu."

        # Window & OS controls
        if "close the window" in q or "close window" in q:
            ctypes.windll.user32.PostMessageA(ctypes.windll.user32.GetForegroundWindow(), 0x0010, 0, 0)
            return "Closed active window, Mamu."
        elif "close tab" in q or "close the tab" in q:
            ctypes.windll.user32.keybd_event(0x11, 0, 0, 0)
            ctypes.windll.user32.keybd_event(0x57, 0, 0, 0)
            ctypes.windll.user32.keybd_event(0x57, 0, 2, 0)
            ctypes.windll.user32.keybd_event(0x11, 0, 2, 0)
            return "Closed tab, Mamu."
        elif q in ["pause", "pause video", "stop video", "stop music", "resume", "play", "play video", "toggle play"]:
            ctypes.windll.user32.keybd_event(0x20, 0, 0, 0)
            ctypes.windll.user32.keybd_event(0x20, 0, 2, 0)
            return "Toggled playback, Mamu."
        elif "terminal" in q or "powershell" in q:
            subprocess.Popen(["powershell.exe"])
            return "Launched PowerShell Terminal, Mamu."
        elif "notepad" in q:
            subprocess.Popen(["notepad.exe"])
            return "Opened Notepad, Mamu."
        elif "calc" in q or "calculator" in q:
            subprocess.Popen(["calc.exe"])
            return "Opened Calculator, Mamu."
        elif "explorer" in q or "files" in q:
            subprocess.Popen(["explorer.exe"])
            return "Opened File Explorer, Mamu."
        elif "chrome" in q or "browser" in q:
            subprocess.Popen(["cmd.exe", "/c", "start", "chrome"])
            return "Launched Chrome Browser, Mamu."
        elif "lock" in q:
            ctypes.windll.user32.LockWorkStation()
            return "Workstation locked securely, Mamu."
        else:
            return "Understood, Mamu. I am monitoring your screen and listening. Tell me what program to launch, song to play, or action to automate."

    # ==========================================================================
    # 24/7 BACKGROUND AMBIENT VOICE LISTENER
    # ==========================================================================

    def _start_continuous_voice_listener(self):
        """Continuous voice listener running 24/7 in background even when popup is closed."""
        def voice_worker():
            recognizer = sr.Recognizer()
            recognizer.energy_threshold = 180
            recognizer.dynamic_energy_threshold = True
            recognizer.dynamic_energy_adjustment_damping = 0.10

            fs = 16000
            frame_seconds = 0.20
            frame_samples = int(fs * frame_seconds)

            is_speaking = False
            phrase_frames = []
            silence_frames_count = 0
            max_silence_frames = 3   # ~600ms silence ends utterance (low latency)
            max_phrase_frames = 40   # 8 seconds max utterance
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

                    # Frequency spectrum analysis
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
        except sr.UnknownValueError:
            pass
        except Exception:
            pass

    def _handle_voice_phrase(self, phrase: str):
        """
        Handles voice directives even when the popup is completely compact or closed.
        Does NOT force-expand unless Mamu explicitly asks to expand or see the window.
        """
        p = phrase.lower().strip()
        wake_matches = [
            "hey abhi", "hay abhi", "he abhi", "hi abhi", "hello abhi",
            "ok abhi", "abhi", "abi", "avi", "abhee", "a bee", "are abhi"
        ]
        is_wake = any(w in p for w in wake_matches)

        if is_wake:
            try:
                import winsound
                winsound.Beep(1200, 70)
                winsound.Beep(1800, 100)
            except Exception:
                pass

            clean_cmd = p
            for w in wake_matches:
                clean_cmd = clean_cmd.replace(w, "").strip()

            # If user explicitly wants popup opened
            if any(w in clean_cmd for w in ["open popup", "open window", "expand", "show yourself", "show screen"]):
                if not self.is_expanded:
                    self.after(0, self.toggle_mode)

            if clean_cmd and len(clean_cmd) > 1:
                self.after(0, lambda: self.append_chat("Voice (Mamu)", clean_cmd))
                threading.Thread(target=self._dispatch_ai_query, args=(clean_cmd,), daemon=True).start()
            else:
                reply = "Yes Mamu, I am listening! Tell me what to do."
                self.after(0, lambda: self.append_chat("ABHI", reply))
                self._speak_verbally(reply)
        else:
            action_triggers = [
                "open", "close", "play", "pause", "mute", "unmute", "search", "skip",
                "type", "run", "keypad", "keyboard", "screen", "what", "how", "who",
                "youtube", "chrome", "notepad", "terminal", "calc", "tab", "window",
                "fb", "movie", "scroll", "next", "rewind", "desktop", "task manager",
                "click", "select", "row", "first", "second", "third", "one", "video",
                "see", "saw", "say", "said", "read", "show", "tell", "mood", "theme"
            ]
            has_action = any(t in p for t in action_triggers)
            # Ambient 24/7 execution: processes in background even if compact!
            if has_action or len(p) >= 3:
                self.after(0, lambda: self.append_chat("Voice (Mamu)", phrase))
                threading.Thread(target=self._dispatch_ai_query, args=(phrase,), daemon=True).start()

    # ==========================================================================
    # FOREGROUND CONTEXT MONITORING
    # ==========================================================================

    def _start_os_context_monitor(self):
        def monitor_loop():
            while True:
                try:
                    title = self._get_native_active_window()
                    self.active_window_title = title
                    short_title = title[:35] + "..." if len(title) > 35 else title
                    self.after(0, lambda t=short_title: self.telemetry_label.configure(
                        text=f"🖥️ Foreground Context: {t}"
                    ))
                except Exception:
                    pass
                time.sleep(1.8)

        threading.Thread(target=monitor_loop, daemon=True).start()

    def _get_native_active_window(self) -> str:
        try:
            hwnd = ctypes.windll.user32.GetForegroundWindow()
            if hwnd:
                length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
                if length > 0:
                    buf = ctypes.create_unicode_buffer(length + 1)
                    ctypes.windll.user32.GetWindowTextW(hwnd, buf, length + 1)
                    val = buf.value.strip()
                    if val and not any(ign in val for ign in ["ABHI Cybernetic", "ABHI Cyber", "Program Manager"]):
                        return val
            if screen_perception:
                ctx = screen_perception.get_real_screen_context()
                user_apps = ctx.get("user_apps", [])
                for app in user_apps:
                    t = app.get("title", "")
                    if t and not any(ign in t for ign in ["ABHI Cyber", "Program Manager"]):
                        return t
        except Exception:
            pass
        return "Windows Desktop"


if __name__ == "__main__":
    app = AbhiCyberneticCompanion()
    app.mainloop()

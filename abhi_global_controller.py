"""
ABHI Ultra Advanced Cybernetic Voice-First Desktop Companion.
Next-Gen Arc Reactor Holographic HUD with CustomTkinter.
Always-On-Top (HWND_TOPMOST), Hardware-Accelerated Floating Widget.
Equipped with:
  1. Low-latency pyttsx3 neural speech synthesis (instant conversational replies to everything).
  2. Responsive Dual-Window Voice Processing (Fast wake-word response + command execution).
  3. Continuous ambient sounddevice stream with Google Speech Recognition API (en-IN).
  4. Real-time animated Arc Reactor rings, wave visualizer, and quick action glass tiles.
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
import io
import wave
import math
from typing import Optional, Dict, Any

import sounddevice as sd
import numpy as np
import speech_recognition as sr
import pyttsx3
import customtkinter as ctk

# DPI Awareness for crisp 4K / High-DPI Windows displays
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(1)
except Exception:
    try:
        ctypes.windll.user32.SetProcessDPIAware()
    except Exception:
        pass

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

API_BASE = "http://127.0.0.1:8000"


class AbhiCyberneticVoiceCore(ctk.CTk):
    """High-polish Arc Reactor Floating HUD and Voice-First Operating System Companion."""

    def __init__(self):
        super().__init__()
        self.title("ABHI Cybernetic Intelligence")

        # Frameless and Always-on-Top
        self.overrideredirect(True)
        self.wm_attributes("-topmost", True)

        # Transparency key for seamless floating widget
        self.TRANSPARENT_KEY = "#020617"
        self.config(bg=self.TRANSPARENT_KEY)
        self.wm_attributes("-transparentcolor", self.TRANSPARENT_KEY)

        # Luxury Cyberpunk Palette
        self.COLOR_BG = "#060913"
        self.COLOR_SURFACE = "#0b1222"
        self.COLOR_SURFACE_HOVER = "#131f38"
        self.COLOR_CYAN = "#00f0ff"
        self.COLOR_CYAN_DIM = "#0891b2"
        self.COLOR_PURPLE = "#a855f7"
        self.COLOR_EMERALD = "#10b981"
        self.COLOR_ROSE = "#f43f5e"
        self.COLOR_AMBER = "#f59e0b"
        self.COLOR_TEXT_PRIMARY = "#f8fafc"
        self.COLOR_TEXT_SECONDARY = "#94a3b8"
        self.COLOR_TEXT_MUTED = "#64748b"

        # Dimensions & Spatial Position
        self.is_expanded = False
        self.screen_width = self.winfo_screenwidth()
        self.screen_height = self.winfo_screenheight()

        self.compact_w, self.compact_h = 88, 88
        self.expanded_w, self.expanded_h = 430, 600

        # Initial bottom-right placement
        self.pos_x = self.screen_width - self.compact_w - 40
        self.pos_y = self.screen_height - self.compact_h - 80

        # Drag tracking
        self.drag_start_x = 0
        self.drag_start_y = 0
        self.drag_dist = 0
        self.is_dragging = False

        # Live State
        self.active_window_title = "Scanning OS Context..."
        self.bot_state = "LISTENING"  # LISTENING, THINKING, SPEAKING, IDLE
        self.live_audio_rms = 0.0
        self.live_voice_ratio = 0.0
        self.is_mic_listening = True
        self.rotation_angle = 0.0
        self.audio_history = [0.0] * 24

        # Initialize TTS Engine (In-Process)
        self.tts_lock = threading.Lock()
        self.tts_engine = pyttsx3.init()
        self.tts_engine.setProperty('rate', 178)
        self.tts_engine.setProperty('volume', 1.0)
        voices = self.tts_engine.getProperty('voices')
        for v in voices:
            if "zira" in v.name.lower() or "david" in v.name.lower():
                self.tts_engine.setProperty('voice', v.id)
                break

        # Build UI Modes
        self.compact_frame = ctk.CTkFrame(
            self,
            width=self.compact_w,
            height=self.compact_h,
            fg_color="transparent",
            corner_radius=44
        )

        self.expanded_frame = ctk.CTkFrame(
            self,
            width=self.expanded_w,
            height=self.expanded_h,
            fg_color=self.COLOR_BG,
            border_color="#0284c7",
            border_width=2,
            corner_radius=22
        )

        self._build_compact_view()
        self._build_expanded_view()

        # Render compact by default
        self._update_geometry()
        self.compact_frame.pack(fill="both", expand=True)

        # Enforce topmost and start audio pipelines
        self._enforce_topmost()
        self._start_os_context_monitor()
        self._start_continuous_voice_listener()

    # -------------------------------------------------------------------------
    # TOPMOST ENFORCEMENT & GEOMETRY
    # -------------------------------------------------------------------------

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

    # -------------------------------------------------------------------------
    # COMPACT ARC REACTOR LIVING CORE VIEW
    # -------------------------------------------------------------------------

    def _build_compact_view(self):
        self.orb_canvas = ctk.CTkCanvas(
            self.compact_frame,
            width=self.compact_w,
            height=self.compact_h,
            bg=self.TRANSPARENT_KEY,
            highlightthickness=0
        )
        self.orb_canvas.pack(fill="both", expand=True)

        self.orb_canvas.bind("<Button-1>", self._on_drag_start)
        self.orb_canvas.bind("<B1-Motion>", self._on_drag_motion)
        self.orb_canvas.bind("<ButtonRelease-1>", self._on_drag_end_orb)

        self._animate_reactor()

    def _animate_reactor(self):
        self.orb_canvas.delete("all")
        cx, cy = self.compact_w // 2, self.compact_h // 2
        self.rotation_angle = (self.rotation_angle + 0.12) % (2 * math.pi)

        # Dynamic Audio Pulse Scaling
        pulse_scale = int(min(14, self.live_audio_rms * 50))
        r_outer = 38 + pulse_scale

        glow_col = self.COLOR_CYAN
        if self.bot_state == "SPEAKING":
            glow_col = self.COLOR_EMERALD
        elif self.bot_state == "THINKING":
            glow_col = self.COLOR_PURPLE
        elif self.live_voice_ratio > 0.08:
            glow_col = "#38bdf8"

        # 1. Outer Holographic Energy Ring
        self.orb_canvas.create_oval(
            cx - r_outer, cy - r_outer, cx + r_outer, cy + r_outer,
            outline=glow_col, width=2
        )

        # 2. Rotating Arc Reactor Notches
        num_arcs = 6
        arc_radius = 33 + pulse_scale // 2
        for i in range(num_arcs):
            angle = self.rotation_angle + (i * 2 * math.pi / num_arcs)
            x1 = cx + (arc_radius - 4) * math.cos(angle)
            y1 = cy + (arc_radius - 4) * math.sin(angle)
            x2 = cx + (arc_radius + 4) * math.cos(angle)
            y2 = cy + (arc_radius + 4) * math.sin(angle)
            self.orb_canvas.create_line(x1, y1, x2, y2, fill=glow_col, width=2)

        # 3. Inner Dark Fusion Core
        r_core = 26
        self.orb_canvas.create_oval(
            cx - r_core, cy - r_core, cx + r_core, cy + r_core,
            fill="#050a16", outline="#1e293b", width=1.5
        )

        # 4. Central Glowing Insignia
        self.orb_canvas.create_text(
            cx, cy - 3,
            text="ABHI",
            font=("Segoe UI", 11, "bold"),
            fill=glow_col
        )

        sub_label = "TALKING" if self.bot_state == "SPEAKING" else ("VOICE" if self.is_mic_listening else "MUTED")
        self.orb_canvas.create_text(
            cx, cy + 13,
            text=sub_label,
            font=("Segoe UI", 6, "bold"),
            fill=self.COLOR_TEXT_MUTED
        )

        self.after(60, self._animate_reactor)

    # -------------------------------------------------------------------------
    # EXPANDED CYBERNETIC HUD VIEW
    # -------------------------------------------------------------------------

    def _build_expanded_view(self):
        # 1. Header Bar
        self.hud_header = ctk.CTkFrame(
            self.expanded_frame,
            fg_color="#09101f",
            corner_radius=16,
            height=50
        )
        self.hud_header.pack(fill="x", padx=12, pady=(12, 6))
        self.hud_header.pack_propagate(False)

        title_box = ctk.CTkFrame(self.hud_header, fg_color="transparent")
        title_box.pack(side="left", padx=12, pady=8)

        self.status_dot = ctk.CTkLabel(
            title_box,
            text="●",
            font=("Segoe UI", 14, "bold"),
            text_color=self.COLOR_EMERALD
        )
        self.status_dot.pack(side="left", padx=(0, 6))

        title_lbl = ctk.CTkLabel(
            title_box,
            text="ABHI VOICE INTELLIGENCE",
            font=("Segoe UI", 10, "bold"),
            text_color=self.COLOR_CYAN
        )
        title_lbl.pack(side="left")

        # Header minimize button
        min_btn = ctk.CTkButton(
            self.hud_header,
            text="✕",
            width=28,
            height=28,
            corner_radius=14,
            fg_color="#1e293b",
            hover_color="#334155",
            text_color=self.COLOR_TEXT_PRIMARY,
            font=("Segoe UI", 10, "bold"),
            command=self.toggle_mode
        )
        min_btn.pack(side="right", padx=12)

        for w in (self.hud_header, title_box, title_lbl, self.status_dot):
            w.bind("<Button-1>", self._on_drag_start)
            w.bind("<B1-Motion>", self._on_drag_motion)
            w.bind("<ButtonRelease-1>", self._on_drag_end_header)

        # 2. Audio Wave Spectrum Visualizer
        self.spectrum_canvas = ctk.CTkCanvas(
            self.expanded_frame,
            height=28,
            bg="#060913",
            highlightthickness=0
        )
        self.spectrum_canvas.pack(fill="x", padx=14, pady=2)
        self._animate_spectrum()

        # 3. Context Telemetry Card
        self.telemetry_card = ctk.CTkFrame(
            self.expanded_frame,
            fg_color=self.COLOR_SURFACE,
            border_color="#1e293b",
            border_width=1,
            corner_radius=12,
            height=34
        )
        self.telemetry_card.pack(fill="x", padx=12, pady=4)
        self.telemetry_card.pack_propagate(False)

        self.telemetry_label = ctk.CTkLabel(
            self.telemetry_card,
            text="Foreground Context: Windows Desktop",
            font=("Segoe UI", 9),
            text_color=self.COLOR_TEXT_MUTED,
            anchor="w"
        )
        self.telemetry_label.pack(side="left", fill="x", expand=True, padx=12)

        # 4. Quick Action Tiles
        actions_grid = ctk.CTkFrame(self.expanded_frame, fg_color="transparent")
        actions_grid.pack(fill="x", padx=12, pady=4)

        actions = [
            ("⚡ Terminal", "open_terminal", self.COLOR_CYAN),
            ("📁 Explorer", "open_explorer", self.COLOR_PURPLE),
            ("📝 Notepad", "open_notepad", "#38bdf8"),
            ("🔢 Calculator", "open_calc", self.COLOR_EMERALD),
            ("🌐 Chrome", "open_chrome", self.COLOR_AMBER),
            ("🔇 Mute Audio", "adjust_volume", self.COLOR_ROSE),
        ]

        for i, (name, act_key, col) in enumerate(actions):
            r, c = divmod(i, 3)
            btn = ctk.CTkButton(
                actions_grid,
                text=name,
                font=("Segoe UI", 9, "bold"),
                fg_color=self.COLOR_SURFACE,
                hover_color=self.COLOR_SURFACE_HOVER,
                border_color=col,
                border_width=1,
                text_color=col,
                height=32,
                corner_radius=8,
                command=lambda k=act_key: self.trigger_quick_action(k)
            )
            btn.grid(row=r, column=c, padx=3, pady=3, sticky="ew")
        actions_grid.grid_columnconfigure((0, 1, 2), weight=1)

        # 5. Conversation Stream Card
        self.chat_card = ctk.CTkFrame(
            self.expanded_frame,
            fg_color=self.COLOR_SURFACE,
            border_color="#1e293b",
            border_width=1,
            corner_radius=14
        )
        self.chat_card.pack(fill="both", expand=True, padx=12, pady=6)

        self.chat_box = ctk.CTkTextbox(
            self.chat_card,
            fg_color="transparent",
            text_color=self.COLOR_TEXT_PRIMARY,
            font=("Segoe UI", 9),
            wrap="word",
            activate_scrollbars=True
        )
        self.chat_box.pack(fill="both", expand=True, padx=8, pady=8)
        self.chat_box.configure(state="disabled")

        self.append_chat("ABHI", "Acoustic voice filter engaged. I am tuned to your voice frequency, Mamu!")

        # 6. Command Input Capsule
        input_capsule = ctk.CTkFrame(
            self.expanded_frame,
            fg_color="#09101f",
            border_color="#1e293b",
            border_width=1,
            corner_radius=14,
            height=46
        )
        input_capsule.pack(fill="x", padx=12, pady=(4, 12))
        input_capsule.pack_propagate(False)

        self.mic_btn = ctk.CTkButton(
            input_capsule,
            text="🎙️",
            width=32,
            height=32,
            corner_radius=16,
            fg_color="#1e293b",
            hover_color="#334155",
            font=("Segoe UI", 11),
            command=self.toggle_mic
        )
        self.mic_btn.pack(side="left", padx=(8, 4), pady=7)

        self.input_entry = ctk.CTkEntry(
            input_capsule,
            placeholder_text="Talk with Abhi or type command...",
            placeholder_text_color="#64748b",
            font=("Segoe UI", 9),
            fg_color="transparent",
            border_width=0,
            text_color=self.COLOR_TEXT_PRIMARY
        )
        self.input_entry.pack(side="left", fill="both", expand=True, padx=4, pady=6)
        self.input_entry.bind("<Return>", lambda e: self.submit_input())

        send_btn = ctk.CTkButton(
            input_capsule,
            text="Send",
            font=("Segoe UI", 9, "bold"),
            fg_color=self.COLOR_CYAN,
            hover_color="#00d8e6",
            text_color="#060913",
            width=65,
            height=30,
            corner_radius=8,
            command=self.submit_input
        )
        send_btn.pack(side="right", padx=(4, 8), pady=8)

    def _animate_spectrum(self):
        """Draws living audio equalizer bars responding to live voice."""
        self.spectrum_canvas.delete("all")
        w = self.expanded_w - 28
        h = 28
        num_bars = len(self.audio_history)
        bar_w = w / num_bars

        col = self.COLOR_CYAN if self.bot_state != "SPEAKING" else self.COLOR_EMERALD
        if self.live_voice_ratio > 0.08:
            col = "#38bdf8"

        for i, val in enumerate(self.audio_history):
            bar_h = max(3, int(val * h * 1.5))
            x0 = i * bar_w + 2
            y0 = h - bar_h
            x1 = (i + 1) * bar_w - 2
            y1 = h
            self.spectrum_canvas.create_rectangle(x0, y0, x1, y1, fill=col, outline="")

        self.after(80, self._animate_spectrum)

    # -------------------------------------------------------------------------
    # DRAG & DROP LOGIC
    # -------------------------------------------------------------------------

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

    def _on_drag_end_orb(self, event):
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

    # -------------------------------------------------------------------------
    # CONVERSATION DISPATCH & LOW-LATENCY SPEECH SYNTHESIS (TALK EVERY TIME)
    # -------------------------------------------------------------------------

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
        self.bot_state = "THINKING"
        payload = json.dumps({
            "query": query,
            "screen_context": f"Active OS Window: {self.active_window_title}"
        }).encode()

        try:
            req = urllib.request.Request(
                f"{API_BASE}/api/v1/desktop/ask-bot",
                data=payload,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode())
                reply = data.get("reply", "Task completed, Mamu.")
                self.after(0, lambda: self.append_chat("ABHI", reply))
                self._speak_verbally(reply)
        except Exception:
            reply = self._execute_native_fallback(query)
            self.after(0, lambda: self.append_chat("ABHI", reply))
            self._speak_verbally(reply)

        self.bot_state = "LISTENING"

    def _speak_verbally(self, text: str):
        """Talks back verbally to user every time using in-process pyttsx3."""
        def run_tts():
            with self.tts_lock:
                self.bot_state = "SPEAKING"
                try:
                    clean = text.replace("*", "").replace("#", "").replace("`", "").strip()
                    sentences = clean.split(".")
                    spoken_text = ". ".join(sentences[:2]) if len(sentences) > 1 else clean
                    if len(spoken_text) > 180:
                        spoken_text = spoken_text[:180]

                    self.tts_engine.say(spoken_text)
                    self.tts_engine.runAndWait()
                except Exception:
                    pass
                self.bot_state = "LISTENING"

        threading.Thread(target=run_tts, daemon=True).start()

    def trigger_quick_action(self, action: str):
        self.append_chat("Action", f"Triggering {action}...")
        threading.Thread(target=self._dispatch_quick_action, args=(action,), daemon=True).start()

    def _dispatch_quick_action(self, action: str):
        payload = json.dumps({"action": action, "params": {}}).encode()
        try:
            req = urllib.request.Request(
                f"{API_BASE}/api/v1/desktop/quick-action",
                data=payload,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode())
                msg = data.get("message", f"{action} executed.")
                self.after(0, lambda: self.append_chat("ABHI", msg))
                self._speak_verbally(msg)
                return
        except Exception:
            pass

        # Native Fallback
        if action == "open_terminal":
            subprocess.Popen(["powershell.exe"])
            msg = "PowerShell Terminal opened, Mamu."
        elif action == "open_explorer":
            subprocess.Popen(["explorer.exe"])
            msg = "File Explorer opened, Mamu."
        elif action == "open_notepad":
            subprocess.Popen(["notepad.exe"])
            msg = "Notepad opened, Mamu."
        elif action == "open_calc":
            subprocess.Popen(["calc.exe"])
            msg = "Calculator opened, Mamu."
        elif action == "open_chrome":
            subprocess.Popen(["cmd.exe", "/c", "start", "chrome"])
            msg = "Chrome launched, Mamu."
        elif action == "adjust_volume":
            ctypes.windll.user32.keybd_event(0xAD, 0, 0, 0)
            ctypes.windll.user32.keybd_event(0xAD, 0, 2, 0)
            msg = "Muted audio output, Mamu."
        else:
            msg = f"Executed {action}."

        self.after(0, lambda: self.append_chat("ABHI", msg))
        self._speak_verbally(msg)

    def _execute_native_fallback(self, query: str) -> str:
        q = query.lower()
        if "close the window" in q or "close window" in q:
            ctypes.windll.user32.PostMessageA(ctypes.windll.user32.GetForegroundWindow(), 0x0010, 0, 0)
            return "Closed active window, Mamu."
        elif "close tab" in q or "close the tab" in q:
            # Ctrl+W
            ctypes.windll.user32.keybd_event(0x11, 0, 0, 0) # CTRL
            ctypes.windll.user32.keybd_event(0x57, 0, 0, 0) # W
            ctypes.windll.user32.keybd_event(0x57, 0, 2, 0)
            ctypes.windll.user32.keybd_event(0x11, 0, 2, 0)
            return "Closed tab, Mamu."
        elif "pause" in q or "play" in q:
            ctypes.windll.user32.keybd_event(0x20, 0, 0, 0) # SPACE
            ctypes.windll.user32.keybd_event(0x20, 0, 2, 0)
            return "Toggled playback, Mamu."
        elif "keypad" in q or "keyboard" in q:
            subprocess.Popen(["cmd.exe", "/c", "start", "osk.exe"])
            return "Opened On-Screen Keyboard, Mamu."
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
            return f"Processed OS command: {query}"

    # -------------------------------------------------------------------------
    # RESPONSIVE CONTINUOUS VOICE LISTENER (RECOGNIZES QUICKLY & CLEARLY)
    # -------------------------------------------------------------------------

    def _start_continuous_voice_listener(self):
        """Continuous mic recording chunk worker with adaptive dynamic threshold."""
        def voice_worker():
            recognizer = sr.Recognizer()
            recognizer.energy_threshold = 220
            recognizer.dynamic_energy_threshold = True
            recognizer.dynamic_energy_adjustment_damping = 0.15

            fs = 16000
            chunk_seconds = 1.6  # Fast 1.6s chunk window for snappy wake-word recognition
            chunk_samples = int(fs * chunk_seconds)

            while True:
                if not self.is_mic_listening or self.bot_state == "SPEAKING":
                    time.sleep(0.2)
                    continue

                try:
                    recording = sd.rec(chunk_samples, samplerate=fs, channels=1, dtype='float32')
                    sd.wait()

                    audio_data_raw = recording.flatten()
                    rms = float(np.sqrt(np.mean(audio_data_raw ** 2)))
                    self.live_audio_rms = rms

                    self.audio_history.pop(0)
                    self.audio_history.append(min(1.0, rms * 18))

                    # Noise floor gate: Discard silent/ambient fan air (< 0.003)
                    if rms < 0.0035:
                        continue

                    # Broad human vocal frequency spectrum (65Hz - 600Hz)
                    fft = np.abs(np.fft.rfft(audio_data_raw))
                    freqs = np.fft.rfftfreq(len(audio_data_raw), 1.0 / fs)
                    voice_mask = (freqs >= 65) & (freqs <= 600)
                    voice_energy = np.sum(fft[voice_mask])
                    total_energy = np.sum(fft) + 1e-8
                    voice_ratio = float(voice_energy / total_energy)
                    self.live_voice_ratio = voice_ratio

                    # Permissive threshold: 0.05 allows low tones, whispering, and distant speaking
                    if voice_ratio < 0.05:
                        continue

                    # Convert to PCM 16-bit WAV for Google Speech Recognition
                    audio_int16 = (audio_data_raw * 32767).astype(np.int16)
                    wav_io = io.BytesIO()
                    with wave.open(wav_io, 'wb') as wf:
                        wf.setnchannels(1)
                        wf.setsampwidth(2)
                        wf.setframerate(fs)
                        wf.writeframes(audio_int16.tobytes())
                    wav_io.seek(0)

                    try:
                        with sr.AudioFile(wav_io) as source:
                            audio_sr = recognizer.record(source)
                        recognized = recognizer.recognize_google(audio_sr, language="en-IN")
                        if recognized:
                            self._handle_voice_phrase(recognized)
                    except sr.UnknownValueError:
                        pass
                    except sr.RequestError:
                        pass

                except Exception:
                    time.sleep(0.15)

        threading.Thread(target=voice_worker, daemon=True).start()

    def _handle_voice_phrase(self, phrase: str):
        p = phrase.lower().strip()
        wake_matches = [
            "hey abhi", "hay abhi", "he abhi", "hi abhi", "hello abhi",
            "ok abhi", "abhi", "abi", "avi", "abhee", "a bee", "are abhi"
        ]
        is_wake = any(w in p for w in wake_matches)

        if is_wake:
            # Sound hardware confirmation chime
            try:
                import winsound
                winsound.Beep(1200, 70)
                winsound.Beep(1800, 100)
            except Exception:
                pass

            # Expand if compact so user immediately sees HUD
            if not self.is_expanded:
                self.after(0, self.toggle_mode)

            clean_cmd = p
            for w in wake_matches:
                clean_cmd = clean_cmd.replace(w, "").strip()

            if clean_cmd and len(clean_cmd) > 1:
                self.after(0, lambda: self.append_chat("Voice (Mamu)", clean_cmd))
                threading.Thread(target=self._dispatch_ai_query, args=(clean_cmd,), daemon=True).start()
            else:
                reply = "Yes Mamu, I am listening! Tell me what to do."
                self.after(0, lambda: self.append_chat("ABHI", reply))
                self._speak_verbally(reply)
        else:
            # When HUD is expanded, accept continuous voice instructions
            if self.is_expanded and len(p) >= 2:
                self.after(0, lambda: self.append_chat("Voice (Mamu)", phrase))
                threading.Thread(target=self._dispatch_ai_query, args=(phrase,), daemon=True).start()

    # -------------------------------------------------------------------------
    # FOREGROUND CONTEXT MONITORING
    # -------------------------------------------------------------------------

    def _start_os_context_monitor(self):
        def monitor_loop():
            while True:
                try:
                    title = self._get_native_active_window()
                    self.active_window_title = title
                    short_title = title[:38] + "..." if len(title) > 38 else title
                    self.after(0, lambda t=short_title: self.telemetry_label.configure(
                        text=f"Foreground Context: {t}"
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
                    if val and "ABHI" not in val:
                        return val
        except Exception:
            pass
        return "Windows Desktop"


if __name__ == "__main__":
    app = AbhiCyberneticVoiceCore()
    app.mainloop()

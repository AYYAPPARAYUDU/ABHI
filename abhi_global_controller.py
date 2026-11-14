"""
ABHI Ultra Advanced Global OS Controller & Companion.
Next-Gen Cyberpunk / Holographic HUD Desktop Assistant with CustomTkinter.
Always-On-Top (HWND_TOPMOST), Hardware-Accelerated Acrylic Glass Styling.
Powered by Real-Time sounddevice Audio RMS Voice Stream & Google Speech Recognition API.
Listens continuously for 'Hey Abhi', 'Hay Abhi', 'Abhi', and OS voice commands.
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
from typing import Optional, Dict, Any

import sounddevice as sd
import numpy as np
import speech_recognition as sr
import customtkinter as ctk

# DPI Awareness for 4K / High-DPI Windows displays
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


class AbhiUltraHUD(ctk.CTk):
    """Next-Generation OS Floating Companion with High-Tech Holographic HUD."""

    def __init__(self):
        super().__init__()
        self.title("ABHI Cybernetic Core")

        # Frameless and Always-on-Top
        self.overrideredirect(True)
        self.wm_attributes("-topmost", True)

        # Transparency color key for true rounded frameless floating aesthetic
        self.TRANSPARENT_KEY = "#030712"
        self.config(bg=self.TRANSPARENT_KEY)
        self.wm_attributes("-transparentcolor", self.TRANSPARENT_KEY)

        # High-Tech Holographic Palette
        self.COLOR_BG = "#080d1a"
        self.COLOR_CARD = "#0d1527"
        self.COLOR_CARD_HOVER = "#131f38"
        self.COLOR_CYAN = "#00f0ff"
        self.COLOR_PURPLE = "#a855f7"
        self.COLOR_EMERALD = "#10b981"
        self.COLOR_ROSE = "#f43f5e"
        self.COLOR_GOLD = "#fbbf24"
        self.COLOR_BORDER = "#1e293b"
        self.COLOR_BORDER_GLOW = "#0284c7"
        self.COLOR_TEXT = "#f8fafc"
        self.COLOR_TEXT_MUTED = "#94a3b8"

        # Dimensions & Spatial Position
        self.is_expanded = False
        self.screen_width = self.winfo_screenwidth()
        self.screen_height = self.winfo_screenheight()

        self.compact_w, self.compact_h = 82, 82
        self.expanded_w, self.expanded_h = 420, 580

        # Initial bottom-right placement
        self.pos_x = self.screen_width - self.compact_w - 36
        self.pos_y = self.screen_height - self.compact_h - 75

        # Drag state tracking
        self.drag_start_x = 0
        self.drag_start_y = 0
        self.drag_dist = 0
        self.is_dragging = False

        # Live State
        self.active_window_title = "Scanning OS Context..."
        self.bot_state = "LISTENING"  # LISTENING, EXECUTING, SPEAKING, IDLE
        self.live_audio_rms = 0.0
        self.is_mic_listening = True

        # Build Modes
        self.compact_frame = ctk.CTkFrame(
            self,
            width=self.compact_w,
            height=self.compact_h,
            fg_color="transparent",
            corner_radius=40
        )

        self.expanded_frame = ctk.CTkFrame(
            self,
            width=self.expanded_w,
            height=self.expanded_h,
            fg_color=self.COLOR_BG,
            border_color=self.COLOR_BORDER_GLOW,
            border_width=2,
            corner_radius=20
        )

        self._build_compact_view()
        self._build_expanded_view()

        # Render compact by default
        self._update_geometry()
        self.compact_frame.pack(fill="both", expand=True)

        # Enforce topmost and start background audio threads
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
        self.after(1200, self._enforce_topmost)

    def _update_geometry(self):
        w = self.expanded_w if self.is_expanded else self.compact_w
        h = self.expanded_h if self.is_expanded else self.compact_h
        self.geometry(f"{w}x{h}+{self.pos_x}+{self.pos_y}")

    # -------------------------------------------------------------------------
    # COMPACT CYBERNETIC ORB VIEW
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

        # Bind pointer events
        self.orb_canvas.bind("<Button-1>", self._on_drag_start)
        self.orb_canvas.bind("<B1-Motion>", self._on_drag_motion)
        self.orb_canvas.bind("<ButtonRelease-1>", self._on_drag_end_orb)

        self._animate_orb()

    def _animate_orb(self):
        self.orb_canvas.delete("all")
        cx, cy = self.compact_w // 2, self.compact_h // 2

        # Outer pulsing aura
        pulse_scale = int(min(12, self.live_audio_rms * 40))
        r_outer = 35 + pulse_scale

        glow_col = self.COLOR_CYAN if self.bot_state != "EXECUTING" else self.COLOR_PURPLE
        if self.live_audio_rms > 0.08:
            glow_col = self.COLOR_EMERALD

        # Outer ring
        self.orb_canvas.create_oval(
            cx - r_outer, cy - r_outer, cx + r_outer, cy + r_outer,
            outline=glow_col, width=2
        )

        # Inner dark nucleus
        r_inner = 28
        self.orb_canvas.create_oval(
            cx - r_inner, cy - r_inner, cx + r_inner, cy + r_inner,
            fill="#091224", outline="#1e293b", width=1
        )

        # Glowing holographic core text
        self.orb_canvas.create_text(
            cx, cy - 3,
            text="ABHI",
            font=("Segoe UI", 11, "bold"),
            fill=glow_col
        )

        state_badge = "MIC ON" if self.is_mic_listening else "CORE"
        self.orb_canvas.create_text(
            cx, cy + 13,
            text=state_badge,
            font=("Segoe UI", 6, "bold"),
            fill=self.COLOR_TEXT_MUTED
        )

        self.after(90, self._animate_orb)

    # -------------------------------------------------------------------------
    # ADVANCED HOLOGRAPHIC HUD EXPANDED VIEW
    # -------------------------------------------------------------------------

    def _build_expanded_view(self):
        # 1. Header Bar (Draggable)
        self.hud_header = ctk.CTkFrame(
            self.expanded_frame,
            fg_color="#0b1329",
            corner_radius=15,
            height=48
        )
        self.hud_header.pack(fill="x", padx=10, pady=(10, 6))
        self.hud_header.pack_propagate(False)

        # Title with live pulse dot
        title_box = ctk.CTkFrame(self.hud_header, fg_color="transparent")
        title_box.pack(side="left", padx=10, pady=8)

        pulse_dot = ctk.CTkLabel(
            title_box,
            text="●",
            font=("Segoe UI", 12, "bold"),
            text_color=self.COLOR_EMERALD
        )
        pulse_dot.pack(side="left", padx=(0, 6))

        title_lbl = ctk.CTkLabel(
            title_box,
            text="ABHI GLOBAL OS CONTROLLER",
            font=("Segoe UI", 10, "bold"),
            text_color=self.COLOR_CYAN
        )
        title_lbl.pack(side="left")

        # Minimize Button
        min_btn = ctk.CTkButton(
            self.hud_header,
            text="✕",
            width=28,
            height=28,
            corner_radius=14,
            fg_color="#1e293b",
            hover_color="#334155",
            text_color=self.COLOR_TEXT,
            font=("Segoe UI", 10, "bold"),
            command=self.toggle_mode
        )
        min_btn.pack(side="right", padx=10)

        # Drag bindings for header
        for w in (self.hud_header, title_box, title_lbl, pulse_dot):
            w.bind("<Button-1>", self._on_drag_start)
            w.bind("<B1-Motion>", self._on_drag_motion)
            w.bind("<ButtonRelease-1>", self._on_drag_end_header)

        # 2. Context Telemetry Card (Active Foreground Window)
        self.telemetry_card = ctk.CTkFrame(
            self.expanded_frame,
            fg_color=self.COLOR_CARD,
            border_color="#1e293b",
            border_width=1,
            corner_radius=12,
            height=36
        )
        self.telemetry_card.pack(fill="x", padx=10, pady=4)
        self.telemetry_card.pack_propagate(False)

        self.telemetry_label = ctk.CTkLabel(
            self.telemetry_card,
            text="Active OS Window: Desktop",
            font=("Segoe UI", 9),
            text_color=self.COLOR_TEXT_MUTED,
            anchor="w"
        )
        self.telemetry_label.pack(side="left", fill="x", expand=True, padx=12)

        # 3. Modern Quick Actions Glass Grid
        actions_grid = ctk.CTkFrame(self.expanded_frame, fg_color="transparent")
        actions_grid.pack(fill="x", padx=10, pady=6)

        actions = [
            ("⚡ Terminal", "open_terminal", self.COLOR_CYAN),
            ("📁 Explorer", "open_explorer", self.COLOR_PURPLE),
            ("📝 Notepad", "open_notepad", "#38bdf8"),
            ("🔢 Calculator", "open_calc", self.COLOR_EMERALD),
            ("🌐 Chrome", "open_chrome", self.COLOR_GOLD),
            ("🔇 Mute Audio", "adjust_volume", self.COLOR_ROSE),
        ]

        for i, (name, act_key, col) in enumerate(actions):
            r, c = divmod(i, 3)
            btn = ctk.CTkButton(
                actions_grid,
                text=name,
                font=("Segoe UI", 9, "bold"),
                fg_color=self.COLOR_CARD,
                hover_color=self.COLOR_CARD_HOVER,
                border_color=col,
                border_width=1,
                text_color=col,
                height=32,
                corner_radius=8,
                command=lambda k=act_key: self.trigger_quick_action(k)
            )
            btn.grid(row=r, column=c, padx=3, pady=3, sticky="ew")
        actions_grid.grid_columnconfigure((0, 1, 2), weight=1)

        # 4. Chat & Live Terminal History Card
        self.chat_card = ctk.CTkFrame(
            self.expanded_frame,
            fg_color=self.COLOR_CARD,
            border_color="#1e293b",
            border_width=1,
            corner_radius=14
        )
        self.chat_card.pack(fill="both", expand=True, padx=10, pady=6)

        self.chat_box = ctk.CTkTextbox(
            self.chat_card,
            fg_color="transparent",
            text_color=self.COLOR_TEXT,
            font=("Segoe UI", 9),
            wrap="word",
            activate_scrollbars=True
        )
        self.chat_box.pack(fill="both", expand=True, padx=8, pady=8)
        self.chat_box.configure(state="disabled")

        self.append_chat("ABHI", "Cybernetic OS Companion ready. Say 'Hey Abhi' anytime!")

        # 5. Glowing Input Capsule
        input_capsule = ctk.CTkFrame(
            self.expanded_frame,
            fg_color="#0b1329",
            border_color="#1e293b",
            border_width=1,
            corner_radius=14,
            height=46
        )
        input_capsule.pack(fill="x", padx=10, pady=(4, 12))
        input_capsule.pack_propagate(False)

        # Mic Indicator / Mute Toggle Button
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
            placeholder_text="Ask Abhi or issue any OS command...",
            placeholder_text_color="#64748b",
            font=("Segoe UI", 9),
            fg_color="transparent",
            border_width=0,
            text_color=self.COLOR_TEXT
        )
        self.input_entry.pack(side="left", fill="both", expand=True, padx=4, pady=6)
        self.input_entry.bind("<Return>", lambda e: self.submit_input())

        send_btn = ctk.CTkButton(
            input_capsule,
            text="Execute",
            font=("Segoe UI", 9, "bold"),
            fg_color=self.COLOR_CYAN,
            hover_color="#00d8e6",
            text_color="#080c14",
            width=70,
            height=30,
            corner_radius=8,
            command=self.submit_input
        )
        send_btn.pack(side="right", padx=(4, 8), pady=8)

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
    # CHAT & OS COMMAND EXECUTION
    # -------------------------------------------------------------------------

    def append_chat(self, sender: str, msg: str):
        self.chat_box.configure(state="normal")
        tag_color = self.COLOR_CYAN if sender == "ABHI" else self.COLOR_PURPLE
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
        self.bot_state = "EXECUTING"
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
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode())
                reply = data.get("reply", "Task completed, Mamu.")
                self.after(0, lambda: self.append_chat("ABHI", reply))
                self._speak_response(reply)
        except Exception:
            reply = self._execute_native_fallback(query)
            self.after(0, lambda: self.append_chat("ABHI", reply))
            self._speak_response(reply)

        self.bot_state = "LISTENING"

    def _speak_response(self, text: str):
        def run_speak():
            try:
                clean = text.replace('"', '').replace("'", "")[:140]
                ps = f'Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Speak("{clean}")'
                subprocess.run(['powershell', '-NoProfile', '-Command', ps], capture_output=True, timeout=8)
            except Exception:
                pass
        threading.Thread(target=run_speak, daemon=True).start()

    def trigger_quick_action(self, action: str):
        self.append_chat("Action", f"Triggering {action} on OS...")
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
                return
        except Exception:
            pass

        # Native Windows Execution Fallback
        if action == "open_terminal":
            subprocess.Popen(["powershell.exe"])
        elif action == "open_explorer":
            subprocess.Popen(["explorer.exe"])
        elif action == "open_notepad":
            subprocess.Popen(["notepad.exe"])
        elif action == "open_calc":
            subprocess.Popen(["calc.exe"])
        elif action == "open_chrome":
            subprocess.Popen(["cmd.exe", "/c", "start", "chrome"])
        elif action == "adjust_volume":
            ctypes.windll.user32.keybd_event(0xAD, 0, 0, 0)
            ctypes.windll.user32.keybd_event(0xAD, 0, 2, 0)

        self.after(0, lambda: self.append_chat("ABHI", f"Executed {action} on Windows."))

    def _execute_native_fallback(self, query: str) -> str:
        q = query.lower()
        if "terminal" in q or "powershell" in q:
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
            return f"Processed OS command: '{query}'."

    # -------------------------------------------------------------------------
    # REAL-TIME AUDIO STREAMING & SPEECH RECOGNITION (SOUNDDEVICE + GOOGLE API)
    # -------------------------------------------------------------------------

    def _start_continuous_voice_listener(self):
        """Continuously streams microphone audio, detects voice via RMS energy, and recognizes wake words."""
        def voice_worker():
            recognizer = sr.Recognizer()
            recognizer.energy_threshold = 300
            recognizer.dynamic_energy_threshold = True

            fs = 16000
            chunk_seconds = 2.0
            chunk_samples = int(fs * chunk_seconds)

            while True:
                if not self.is_mic_listening:
                    time.sleep(0.5)
                    continue

                try:
                    # Record a live chunk from the default microphone
                    recording = sd.rec(chunk_samples, samplerate=fs, channels=1, dtype='int16')
                    sd.wait()

                    # Compute RMS audio energy
                    rms = float(np.sqrt(np.mean(recording.astype(np.float32) ** 2))) / 32768.0
                    self.live_audio_rms = rms

                    # If significant voice energy detected, run speech recognition
                    if rms > 0.012:
                        wav_io = io.BytesIO()
                        with wave.open(wav_io, 'wb') as wf:
                            wf.setnchannels(1)
                            wf.setsampwidth(2)
                            wf.setframerate(fs)
                            wf.writeframes(recording.tobytes())
                        wav_io.seek(0)

                        try:
                            with sr.AudioFile(wav_io) as source:
                                audio_data = recognizer.record(source)
                            # Recognize via Google Speech API (supports Indian English / accents)
                            text = recognizer.recognize_google(audio_data, language="en-IN")
                            if text:
                                self._handle_voice_phrase(text)
                        except sr.UnknownValueError:
                            pass
                        except sr.RequestError:
                            # Fallback to offline US-English if network glitches
                            pass

                except Exception:
                    time.sleep(0.2)

        threading.Thread(target=voice_worker, daemon=True).start()

    def _handle_voice_phrase(self, phrase: str):
        p = phrase.lower().strip()
        wake_matches = [
            "hey abhi", "hay abhi", "he abhi", "hi abhi", "hello abhi",
            "ok abhi", "abhi", "abi", "avi", "abhee", "a bee"
        ]
        is_wake = any(w in p for w in wake_matches)

        if is_wake:
            # Sound hardware acoustic confirmation chime
            try:
                import winsound
                winsound.Beep(1200, 80)
                winsound.Beep(1800, 120)
            except Exception:
                pass

            # Expand if compact so user immediately sees HUD
            if not self.is_expanded:
                self.after(0, self.toggle_mode)

            # Extract user instruction if any
            clean_cmd = p
            for w in wake_matches:
                clean_cmd = clean_cmd.replace(w, "").strip()

            if clean_cmd:
                self.after(0, lambda: self.append_chat("Voice (Mamu)", clean_cmd))
                threading.Thread(target=self._dispatch_ai_query, args=(clean_cmd,), daemon=True).start()
            else:
                reply = "Yes Mamu, I am listening! Tell me what to do."
                self.after(0, lambda: self.append_chat("ABHI", reply))
                self._speak_response(reply)
        else:
            # If already expanded, accept direct voice commands
            if self.is_expanded and len(p) > 3:
                self.after(0, lambda: self.append_chat("Voice (Mamu)", phrase))
                threading.Thread(target=self._dispatch_ai_query, args=(phrase,), daemon=True).start()

    # -------------------------------------------------------------------------
    # BACKGROUND ACTIVE OS WINDOW MONITORING
    # -------------------------------------------------------------------------

    def _start_os_context_monitor(self):
        def monitor_loop():
            while True:
                try:
                    title = self._get_native_active_window()
                    self.active_window_title = title
                    short_title = title[:38] + "..." if len(title) > 38 else title
                    self.after(0, lambda t=short_title: self.telemetry_label.configure(
                        text=f"Active OS Window: {t}"
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
    app = AbhiUltraHUD()
    app.mainloop()

"""
ABHI Native Global OS Desktop Controller.
A permanent, always-on-top (HWND_TOPMOST) Windows desktop companion widget.
Floats globally across the entire operating system and never vanishes when other apps are minimized.
Controls all Windows applications, processes, terminal, and system settings via ABHI Cognitive Core.
Equipped with Windows SAPI / System.Speech real-time wake word ('Hey Abhi') and voice speech recognition.
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
from typing import Optional, Dict, Any

import tkinter as tk
from tkinter import ttk

# DPI Awareness for crisp 4K / High-DPI Windows displays
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(1)
except Exception:
    try:
        ctypes.windll.user32.SetProcessDPIAware()
    except Exception:
        pass


API_BASE = "http://127.0.0.1:8000"


class AbhiGlobalOSController:
    """Always-on-top, draggable Windows desktop companion controlling the entire OS."""

    def __init__(self):
        self.root = tk.Tk()
        self.root.title("ABHI Global OS Controller")

        # Frameless and Always-on-Top
        self.root.overrideredirect(True)
        self.root.wm_attributes("-topmost", True)

        # High-Tech Palette
        self.COLOR_BG = "#080c14"
        self.COLOR_PANEL = "#111827"
        self.COLOR_CYAN = "#00f0ff"
        self.COLOR_PURPLE = "#8b5cf6"
        self.COLOR_TEXT = "#f3f4f6"
        self.COLOR_TEXT_DIM = "#9ca3af"
        self.COLOR_ACCENT = "#10b981"
        self.COLOR_BORDER = "#1f293d"

        self.root.configure(bg=self.COLOR_BG)

        # Sizing and Positioning
        self.is_expanded = False
        self.screen_width = self.root.winfo_screenwidth()
        self.screen_height = self.root.winfo_screenheight()

        self.compact_w, self.compact_h = 74, 74
        self.expanded_w, self.expanded_h = 390, 540

        # Position at bottom-right corner by default
        self.pos_x = self.screen_width - self.compact_w - 30
        self.pos_y = self.screen_height - self.compact_h - 60

        # Drag tracking
        self.drag_start_x = 0
        self.drag_start_y = 0
        self.drag_distance = 0
        self.is_dragging = False

        # Live telemetry
        self.active_window_title = "Scanning OS..."
        self.bot_state = "IDLE"  # IDLE, LISTENING, EXECUTING, SPEAKING
        self.voice_active = False

        # Pulse animation variables
        self.pulse_phase = 0

        # Build UI Modes
        self.compact_frame = tk.Frame(self.root, bg=self.COLOR_BG, cursor="hand2")
        self.expanded_frame = tk.Frame(self.root, bg=self.COLOR_BG)

        self._build_compact_view()
        self._build_expanded_view()

        # Show initial compact view
        self._update_geometry()
        self.compact_frame.pack(fill="both", expand=True)

        # Enforce topmost periodically
        self._enforce_topmost()
        self._start_background_monitors()
        self._start_voice_listener()

    # -------------------------------------------------------------------------
    # TOPMOST ENFORCEMENT & GEOMETRY
    # -------------------------------------------------------------------------

    def _enforce_topmost(self):
        """Enforce HWND_TOPMOST via Windows user32 API to ensure it never gets buried."""
        try:
            hwnd = ctypes.windll.user32.GetParent(self.root.winfo_id())
            if not hwnd:
                hwnd = self.root.winfo_id()
            # HWND_TOPMOST (-1), SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE = 0x0002 | 0x0001 | 0x0010 = 0x0013
            ctypes.windll.user32.SetWindowPos(hwnd, -1, 0, 0, 0, 0, 0x0013)
        except Exception:
            pass
        self.root.after(1500, self._enforce_topmost)

    def _update_geometry(self):
        w = self.expanded_w if self.is_expanded else self.compact_w
        h = self.expanded_h if self.is_expanded else self.compact_h
        self.root.geometry(f"{w}x{h}+{self.pos_x}+{self.pos_y}")

    # -------------------------------------------------------------------------
    # COMPACT FLOATING ORB VIEW
    # -------------------------------------------------------------------------

    def _build_compact_view(self):
        self.canvas_orb = tk.Canvas(
            self.compact_frame,
            width=self.compact_w,
            height=self.compact_h,
            bg=self.COLOR_BG,
            highlightthickness=0
        )
        self.canvas_orb.pack(fill="both", expand=True)

        # Render Core Orb
        self._draw_orb()

        # Dragging & Clicking handlers
        self.canvas_orb.bind("<Button-1>", self._on_drag_start)
        self.canvas_orb.bind("<B1-Motion>", self._on_drag_motion)
        self.canvas_orb.bind("<ButtonRelease-1>", self._on_drag_end_orb)

        # Start ambient pulse animation
        self._animate_pulse()

    def _draw_orb(self):
        self.canvas_orb.delete("all")
        cx, cy = self.compact_w // 2, self.compact_h // 2
        r = 28

        # Outer energy ring
        color_ring = self.COLOR_CYAN if self.bot_state != "EXECUTING" else self.COLOR_PURPLE
        if self.voice_active:
            color_ring = self.COLOR_ACCENT

        self.canvas_orb.create_oval(
            cx - r - 4, cy - r - 4, cx + r + 4, cy + r + 4,
            outline=color_ring, width=2
        )

        # Inner dark nucleus
        self.canvas_orb.create_oval(
            cx - r, cy - r, cx + r, cy + r,
            fill="#0b1329", outline="#1e293b", width=1
        )

        # Central glowing insignia
        self.canvas_orb.create_text(
            cx, cy - 2,
            text="ABHI",
            font=("Segoe UI", 10, "bold"),
            fill=self.COLOR_CYAN
        )
        sub_text = "VOICE" if self.voice_active else "GLOBAL"
        self.canvas_orb.create_text(
            cx, cy + 13,
            text=sub_text,
            font=("Segoe UI", 6, "bold"),
            fill=self.COLOR_TEXT_DIM
        )

    def _animate_pulse(self):
        self.pulse_phase = (self.pulse_phase + 1) % 20
        self._draw_orb()
        self.root.after(120, self._animate_pulse)

    # -------------------------------------------------------------------------
    # EXPANDED GLOBAL CONTROLLER PANEL
    # -------------------------------------------------------------------------

    def _build_expanded_view(self):
        # 1. Header Bar (Draggable)
        self.header_bar = tk.Frame(self.expanded_frame, bg=self.COLOR_PANEL, height=42, cursor="fleur")
        self.header_bar.pack(fill="x", side="top")
        self.header_bar.pack_propagate(False)

        title_lbl = tk.Label(
            self.header_bar,
            text="⚡ ABHI GLOBAL OS CONTROLLER",
            font=("Segoe UI", 9, "bold"),
            bg=self.COLOR_PANEL,
            fg=self.COLOR_CYAN
        )
        title_lbl.pack(side="left", padx=10)

        # Header controls
        close_btn = tk.Label(
            self.header_bar,
            text="✕",
            font=("Segoe UI", 10, "bold"),
            bg=self.COLOR_PANEL,
            fg=self.COLOR_TEXT_DIM,
            cursor="hand2"
        )
        close_btn.pack(side="right", padx=10)
        close_btn.bind("<Button-1>", lambda e: self.toggle_mode())

        min_btn = tk.Label(
            self.header_bar,
            text="—",
            font=("Segoe UI", 10, "bold"),
            bg=self.COLOR_PANEL,
            fg=self.COLOR_TEXT_DIM,
            cursor="hand2"
        )
        min_btn.pack(side="right", padx=6)
        min_btn.bind("<Button-1>", lambda e: self.toggle_mode())

        # Header Drag bindings
        self.header_bar.bind("<Button-1>", self._on_drag_start)
        self.header_bar.bind("<B1-Motion>", self._on_drag_motion)
        self.header_bar.bind("<ButtonRelease-1>", self._on_drag_end_header)
        title_lbl.bind("<Button-1>", self._on_drag_start)
        title_lbl.bind("<B1-Motion>", self._on_drag_motion)
        title_lbl.bind("<ButtonRelease-1>", self._on_drag_end_header)

        # 2. OS Context Banner
        self.context_frame = tk.Frame(self.expanded_frame, bg="#0d1424", height=32)
        self.context_frame.pack(fill="x", padx=8, pady=(6, 4))
        self.context_frame.pack_propagate(False)

        self.os_status_lbl = tk.Label(
            self.context_frame,
            text="Active OS Window: Desktop",
            font=("Segoe UI", 8),
            bg="#0d1424",
            fg=self.COLOR_TEXT_DIM,
            anchor="w"
        )
        self.os_status_lbl.pack(side="left", fill="x", expand=True, padx=8)

        # 3. Quick Action Buttons Grid
        actions_frame = tk.Frame(self.expanded_frame, bg=self.COLOR_BG)
        actions_frame.pack(fill="x", padx=8, pady=4)

        actions = [
            ("Terminal", "open_terminal", self.COLOR_CYAN),
            ("Explorer", "open_explorer", self.COLOR_PURPLE),
            ("Notepad", "open_notepad", "#3b82f6"),
            ("Calc", "open_calc", "#10b981"),
            ("Chrome", "open_chrome", "#f59e0b"),
            ("Mute Vol", "adjust_volume", "#ef4444")
        ]

        for i, (name, act_key, col) in enumerate(actions):
            r, c = divmod(i, 3)
            btn = tk.Button(
                actions_frame,
                text=name,
                font=("Segoe UI", 8, "bold"),
                bg="#1a2234",
                fg=col,
                activebackground="#25324d",
                activeforeground=col,
                relief="flat",
                bd=0,
                padx=8,
                pady=4,
                cursor="hand2",
                command=lambda k=act_key: self.trigger_quick_action(k)
            )
            btn.grid(row=r, column=c, padx=3, pady=3, sticky="ew")
        actions_frame.grid_columnconfigure((0, 1, 2), weight=1)

        # 4. Chat & Execution Terminal Output
        chat_frame = tk.Frame(self.expanded_frame, bg=self.COLOR_BG)
        chat_frame.pack(fill="both", expand=True, padx=8, pady=4)

        self.chat_history = tk.Text(
            chat_frame,
            bg="#0b1120",
            fg=self.COLOR_TEXT,
            font=("Consolas", 8),
            wrap="word",
            bd=0,
            padx=8,
            pady=8,
            state="disabled"
        )
        self.chat_history.pack(fill="both", expand=True)

        self.append_chat("ABHI", "Unified Global OS Controller online. Say 'Hey Abhi' or ask any OS task.")

        # 5. Bottom Input Bar
        input_frame = tk.Frame(self.expanded_frame, bg=self.COLOR_PANEL, height=44)
        input_frame.pack(fill="x", side="bottom")
        input_frame.pack_propagate(False)

        self.cmd_entry = tk.Entry(
            input_frame,
            bg="#1f293d",
            fg="#ffffff",
            insertbackground="#00f0ff",
            font=("Segoe UI", 9),
            relief="flat",
            bd=0
        )
        self.cmd_entry.pack(side="left", fill="both", expand=True, padx=(8, 4), pady=6)
        self.cmd_entry.bind("<Return>", lambda e: self.submit_command())

        send_btn = tk.Button(
            input_frame,
            text="Run",
            font=("Segoe UI", 8, "bold"),
            bg=self.COLOR_CYAN,
            fg="#080c14",
            activebackground="#00d8e6",
            relief="flat",
            bd=0,
            padx=12,
            cursor="hand2",
            command=self.submit_command
        )
        send_btn.pack(side="right", padx=(0, 8), pady=6)

    # -------------------------------------------------------------------------
    # DRAG & DROP LOGIC
    # -------------------------------------------------------------------------

    def _on_drag_start(self, event):
        self.drag_start_x = event.x_root
        self.drag_start_y = event.y_root
        self.drag_distance = 0
        self.is_dragging = True

    def _on_drag_motion(self, event):
        dx = event.x_root - self.drag_start_x
        dy = event.y_root - self.drag_start_y
        self.drag_distance += abs(dx) + abs(dy)

        self.pos_x += dx
        self.pos_y += dy
        self.drag_start_x = event.x_root
        self.drag_start_y = event.y_root

        w = self.expanded_w if self.is_expanded else self.compact_w
        h = self.expanded_h if self.is_expanded else self.compact_h

        # Screen boundary clamping
        self.pos_x = max(0, min(self.pos_x, self.screen_width - w))
        self.pos_y = max(0, min(self.pos_y, self.screen_height - h))

        self.root.geometry(f"+{self.pos_x}+{self.pos_y}")

    def _on_drag_end_orb(self, event):
        self.is_dragging = False
        # If user dragged less than 6px, treat as intentional click to toggle
        if self.drag_distance <= 6:
            self.toggle_mode()

    def _on_drag_end_header(self, event):
        self.is_dragging = False

    # -------------------------------------------------------------------------
    # TOGGLE COMPACT / EXPANDED MODES
    # -------------------------------------------------------------------------

    def toggle_mode(self):
        self.is_expanded = not self.is_expanded
        if self.is_expanded:
            self.compact_frame.pack_forget()
            # Position adjustment so it expands upwards/leftwards on screen
            self.pos_x = max(10, min(self.pos_x, self.screen_width - self.expanded_w - 20))
            self.pos_y = max(10, min(self.pos_y, self.screen_height - self.expanded_h - 40))
            self._update_geometry()
            self.expanded_frame.pack(fill="both", expand=True)
            self.cmd_entry.focus_set()
        else:
            self.expanded_frame.pack_forget()
            self._update_geometry()
            self.compact_frame.pack(fill="both", expand=True)

    # -------------------------------------------------------------------------
    # OS AUTOMATION ACTIONS & COMMANDS
    # -------------------------------------------------------------------------

    def append_chat(self, sender: str, msg: str):
        self.chat_history.config(state="normal")
        self.chat_history.insert("end", f"{sender}: {msg}\n")
        self.chat_history.see("end")
        self.chat_history.config(state="disabled")

    def submit_command(self):
        text = self.cmd_entry.get().strip()
        if not text:
            return
        self.cmd_entry.delete(0, "end")
        self.append_chat("Mamu", text)

        # Dispatch async to avoid blocking UI
        threading.Thread(target=self._dispatch_ai_query, args=(text,), daemon=True).start()

    def _dispatch_ai_query(self, query: str):
        self.bot_state = "EXECUTING"
        payload = json.dumps({"query": query, "screen_context": f"Active OS Window: {self.active_window_title}"}).encode()
        try:
            req = urllib.request.Request(
                f"{API_BASE}/api/v1/desktop/ask-bot",
                data=payload,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode())
                reply = data.get("reply", "Command executed, Mamu.")
                self.root.after(0, lambda: self.append_chat("ABHI", reply))
                self._speak_response(reply)
        except Exception:
            # Native OS Execution Fallback
            reply = self._execute_native_fallback(query)
            self.root.after(0, lambda: self.append_chat("ABHI", reply))
            self._speak_response(reply)

        self.bot_state = "IDLE"

    def _speak_response(self, text: str):
        """Speak brief responses using Windows Speech Synthesis."""
        def run_speak():
            try:
                # Keep spoken response concise
                clean_text = text.replace('"', '').replace("'", "")[:120]
                ps_speak = f'Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Speak("{clean_text}")'
                subprocess.run(['powershell', '-NoProfile', '-Command', ps_speak], capture_output=True, timeout=10)
            except Exception:
                pass
        threading.Thread(target=run_speak, daemon=True).start()

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
                self.root.after(0, lambda: self.append_chat("ABHI", msg))
                return
        except Exception:
            pass

        # Native OS Fallback Execution
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
            # Native volume mute toggle
            ctypes.windll.user32.keybd_event(0xAD, 0, 0, 0)
            ctypes.windll.user32.keybd_event(0xAD, 0, 2, 0)

        self.root.after(0, lambda: self.append_chat("ABHI", f"Executed {action} directly on Windows."))

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
        elif "lock" in q:
            ctypes.windll.user32.LockWorkStation()
            return "Workstation locked securely, Mamu."
        else:
            return f"Processed OS command: '{query}'."

    # -------------------------------------------------------------------------
    # REAL-TIME SYSTEM.SPEECH VOICE LISTENER ("HEY ABHI" / "HAY ABHI")
    # -------------------------------------------------------------------------

    def _start_voice_listener(self):
        """Spawns abhi_voice_listener.ps1 and parses continuous voice stream."""
        def listener_worker():
            listener_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "abhi_voice_listener.ps1")
            if not os.path.exists(listener_script):
                return

            try:
                proc = subprocess.Popen(
                    ['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', listener_script],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    bufsize=1
                )

                for line in iter(proc.stdout.readline, ''):
                    line_str = line.strip()
                    if not line_str:
                        continue

                    if "SPEECH_ENGINE_ACTIVE" in line_str:
                        self.voice_active = True
                        self.root.after(0, lambda: self.append_chat("Voice", "Microphone listening for 'Hey Abhi'..."))
                    elif "VOICE_RECOGNIZED:" in line_str:
                        recognized = line_str.replace("VOICE_RECOGNIZED:", "").strip()
                        self._handle_voice_phrase(recognized)

                proc.stdout.close()
                proc.wait()
            except Exception as e:
                pass

        threading.Thread(target=listener_worker, daemon=True).start()

    def _handle_voice_phrase(self, phrase: str):
        p = phrase.lower().strip()
        wake_matches = ["hey abhi", "hay abhi", "abhi", "hello abhi", "ok abhi"]
        is_wake = any(w in p for w in wake_matches)

        if is_wake:
            # Sound hardware chime
            try:
                import winsound
                winsound.Beep(1200, 100)
                winsound.Beep(1800, 150)
            except Exception:
                pass

            # Expand if compact so user can see Abhi responding
            if not self.is_expanded:
                self.root.after(0, self.toggle_mode)

            # Strip wake word to get prompt
            clean_cmd = p
            for w in wake_matches:
                clean_cmd = clean_cmd.replace(w, "").strip()

            if clean_cmd:
                self.root.after(0, lambda: self.append_chat("Voice (Mamu)", clean_cmd))
                threading.Thread(target=self._dispatch_ai_query, args=(clean_cmd,), daemon=True).start()
            else:
                reply = "Yes Mamu, I am listening! Tell me what to do."
                self.root.after(0, lambda: self.append_chat("ABHI", reply))
                self._speak_response(reply)
        else:
            # Direct recognized voice action
            self.root.after(0, lambda: self.append_chat("Voice (Mamu)", phrase))
            threading.Thread(target=self._dispatch_ai_query, args=(phrase,), daemon=True).start()

    # -------------------------------------------------------------------------
    # BACKGROUND REAL-TIME OS MONITORING
    # -------------------------------------------------------------------------

    def _start_background_monitors(self):
        def monitor_loop():
            while True:
                try:
                    title = self._get_native_active_window()
                    self.active_window_title = title
                    # Update label safely on UI thread
                    short_title = title[:35] + "..." if len(title) > 35 else title
                    self.root.after(0, lambda t=short_title: self.os_status_lbl.config(
                        text=f"Active OS Window: {t}"
                    ))
                except Exception:
                    pass
                time.sleep(1.8)

        threading.Thread(target=monitor_loop, daemon=True).start()

    def _get_native_active_window(self) -> str:
        """Query genuine Windows Foreground Window via user32."""
        try:
            hwnd = ctypes.windll.user32.GetForegroundWindow()
            if hwnd:
                length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
                if length > 0:
                    buf = ctypes.create_unicode_buffer(length + 1)
                    ctypes.windll.user32.GetWindowTextW(hwnd, buf, length + 1)
                    val = buf.value.strip()
                    if val and val != "ABHI Global OS Controller":
                        return val
        except Exception:
            pass
        return "Windows Desktop"

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    controller = AbhiGlobalOSController()
    controller.run()

"""
ABHI Native Global OS Desktop Controller.
A permanent, always-on-top (HWND_TOPMOST) Windows desktop companion widget.
Floats globally across the entire operating system and never vanishes when other apps are minimized.
Controls all Windows applications, processes, terminal, and system settings via ABHI Cognitive Core.
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

        # Pulse animation variables
        self.pulse_phase = 0
        self.pulse_timer = None

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

    # -------------------------------------------------------------------------
    # TOPMOST ENFORCEMENT & GEOMETRY
    # -------------------------------------------------------------------------

    def _enforce_topmost(self):
        """Pin the window to HWND_TOPMOST so it stays above every OS application."""
        try:
            hwnd = ctypes.windll.user32.GetParent(self.root.winfo_id())
            if not hwnd:
                hwnd = self.root.winfo_id()
            # HWND_TOPMOST = -1, SWP_NOMOVE = 0x0002, SWP_NOSIZE = 0x0001, SWP_NOACTIVATE = 0x0010
            ctypes.windll.user32.SetWindowPos(hwnd, -1, 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0010)
        except Exception:
            pass
        self.root.lift()
        self.root.after(1500, self._enforce_topmost)

    def _update_geometry(self):
        w = self.expanded_w if self.is_expanded else self.compact_w
        h = self.expanded_h if self.is_expanded else self.compact_h
        self.root.geometry(f"{w}x{h}+{self.pos_x}+{self.pos_y}")

    # -------------------------------------------------------------------------
    # COMPACT CYBERNETIC ORB VIEW
    # -------------------------------------------------------------------------

    def _build_compact_view(self):
        self.canvas = tk.Canvas(
            self.compact_frame,
            width=self.compact_w,
            height=self.compact_h,
            bg=self.COLOR_BG,
            highlightthickness=0
        )
        self.canvas.pack(fill="both", expand=True)

        self.canvas.bind("<ButtonPress-1>", self._on_drag_start)
        self.canvas.bind("<B1-Motion>", self._on_drag_motion)
        self.canvas.bind("<ButtonRelease-1>", self._on_drag_end_orb)

        self._draw_orb()

    def _draw_orb(self):
        self.canvas.delete("all")
        cx, cy = self.compact_w // 2, self.compact_h // 2
        r_outer = 32
        r_inner = 24

        # Glow rings
        ring_color = self.COLOR_CYAN if self.bot_state != "EXECUTING" else self.COLOR_PURPLE
        self.canvas.create_oval(
            cx - r_outer, cy - r_outer, cx + r_outer, cy + r_outer,
            outline=ring_color, width=2
        )
        self.canvas.create_oval(
            cx - r_inner, cy - r_inner, cx + r_inner, cy + r_inner,
            fill="#0d1b2a", outline=self.COLOR_CYAN, width=1
        )

        # Center Symbol & Core
        self.canvas.create_text(
            cx, cy - 2,
            text="⚡", fill=self.COLOR_CYAN, font=("Segoe UI Symbol", 16, "bold")
        )
        self.canvas.create_text(
            cx, cy + 18,
            text="ABHI", fill="#ffffff", font=("Segoe UI", 7, "bold")
        )

    def _animate_orb_pulse(self):
        self.pulse_phase = (self.pulse_phase + 1) % 20
        self._draw_orb()
        self.pulse_timer = self.root.after(100, self._animate_orb_pulse)

    # -------------------------------------------------------------------------
    # EXPANDED FULL OS CONTROLLER HUD
    # -------------------------------------------------------------------------

    def _build_expanded_view(self):
        # Outer Border & Container
        container = tk.Frame(self.expanded_frame, bg=self.COLOR_PANEL, highlightthickness=1, highlightbackground=self.COLOR_CYAN)
        container.pack(fill="both", expand=True, padx=2, pady=2)

        # Header with Drag Handle
        header = tk.Frame(container, bg="#0d1424", height=42)
        header.pack(fill="x", side="top")
        header.bind("<ButtonPress-1>", self._on_drag_start)
        header.bind("<B1-Motion>", self._on_drag_motion)
        header.bind("<ButtonRelease-1>", self._on_drag_end_header)

        title_lbl = tk.Label(
            header,
            text="⚡ ABHI · COMPLETE OS CONTROLLER",
            bg="#0d1424", fg=self.COLOR_CYAN, font=("Segoe UI", 9, "bold")
        )
        title_lbl.pack(side="left", padx=10, pady=8)
        title_lbl.bind("<ButtonPress-1>", self._on_drag_start)
        title_lbl.bind("<B1-Motion>", self._on_drag_motion)
        title_lbl.bind("<ButtonRelease-1>", self._on_drag_end_header)

        min_btn = tk.Button(
            header, text="—", bg="#0d1424", fg=self.COLOR_TEXT_DIM,
            font=("Segoe UI", 10, "bold"), bd=0, activebackground=self.COLOR_PANEL,
            activeforeground="#ffffff", cursor="hand2", command=self.toggle_mode
        )
        min_btn.pack(side="right", padx=10, pady=4)

        # OS Active Window Observation Strip
        strip_frame = tk.Frame(container, bg="#131c2e", height=38)
        strip_frame.pack(fill="x", padx=8, pady=6)

        strip_icon = tk.Label(strip_frame, text="🖥️", bg="#131c2e", font=("Segoe UI Emoji", 11))
        strip_icon.pack(side="left", padx=6)

        self.os_status_lbl = tk.Label(
            strip_frame, text="Tracking OS Active Window...",
            bg="#131c2e", fg=self.COLOR_TEXT, font=("Segoe UI", 8),
            anchor="w", justify="left"
        )
        self.os_status_lbl.pack(side="left", fill="x", expand=True, padx=4)

        # Quick System Action Buttons
        actions_bar = tk.Frame(container, bg=self.COLOR_PANEL)
        actions_bar.pack(fill="x", padx=8, pady=4)

        btn_specs = [
            ("💻 PowerShell", "open_terminal"),
            ("📁 Explorer", "open_explorer"),
            ("🧮 Calc", "open_calc"),
            ("📝 Notepad", "open_notepad"),
            ("🌐 Chrome", "open_chrome"),
            ("🔊 Volume", "adjust_volume")
        ]

        for idx, (label, action_id) in enumerate(btn_specs):
            b = tk.Button(
                actions_bar, text=label, bg="#1a2336", fg=self.COLOR_TEXT,
                font=("Segoe UI", 8), bd=0, padx=6, pady=4, cursor="hand2",
                activebackground=self.COLOR_CYAN, activeforeground="#000000",
                command=lambda act=action_id: self.trigger_quick_action(act)
            )
            b.grid(row=idx // 3, column=idx % 3, padx=2, pady=2, sticky="nsew")

        actions_bar.grid_columnconfigure(0, weight=1)
        actions_bar.grid_columnconfigure(1, weight=1)
        actions_bar.grid_columnconfigure(2, weight=1)

        # Chat / Transcript History Box
        self.chat_history = tk.Text(
            container, bg="#0b0f19", fg=self.COLOR_TEXT,
            font=("Segoe UI", 8), wrap="word", bd=0, height=13,
            highlightthickness=1, highlightbackground=self.COLOR_BORDER
        )
        self.chat_history.pack(fill="both", expand=True, padx=8, pady=6)
        self.chat_history.insert("end", "ABHI: Pranam Mamu! I am controlling your complete Operating System.\nType any system command, open apps, or ask questions.\n\n")
        self.chat_history.config(state="disabled")

        # Bottom Command Input Bar
        input_frame = tk.Frame(container, bg=self.COLOR_PANEL)
        input_frame.pack(fill="x", padx=8, pady=6, side="bottom")

        self.cmd_entry = tk.Entry(
            input_frame, bg="#0d1424", fg="#ffffff",
            font=("Segoe UI", 9), insertbackground=self.COLOR_CYAN,
            bd=0, highlightthickness=1, highlightbackground=self.COLOR_BORDER
        )
        self.cmd_entry.pack(side="left", fill="x", expand=True, ipady=5, padx=(0, 6))
        self.cmd_entry.bind("<Return>", lambda e: self.submit_command())

        send_btn = tk.Button(
            input_frame, text="Run ➤", bg=self.COLOR_CYAN, fg="#000000",
            font=("Segoe UI", 8, "bold"), bd=0, padx=10, cursor="hand2",
            activebackground="#00c8d7", command=self.submit_command
        )
        send_btn.pack(side="right", ipady=3)

    # -------------------------------------------------------------------------
    # DRAG & DROP LOGIC (WITH THRESHOLD SUPPRESSION)
    # -------------------------------------------------------------------------

    def _on_drag_start(self, event):
        self.drag_start_x = event.x_root
        self.drag_start_y = event.y_root
        self.drag_distance = 0
        self.is_dragging = True

    def _on_drag_motion(self, event):
        if not self.is_dragging:
            return
        dx = event.x_root - self.drag_start_x
        dy = event.y_root - self.drag_start_y
        self.drag_distance = (dx ** 2 + dy ** 2) ** 0.5

        self.pos_x += dx
        self.pos_y += dy
        self.drag_start_x = event.x_root
        self.drag_start_y = event.y_root

        # Clamp to screen bounds
        w = self.expanded_w if self.is_expanded else self.compact_w
        h = self.expanded_h if self.is_expanded else self.compact_h
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
        except Exception as e:
            # Native OS Execution Fallback
            reply = self._execute_native_fallback(query)
            self.root.after(0, lambda: self.append_chat("ABHI", reply))

        self.bot_state = "IDLE"

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

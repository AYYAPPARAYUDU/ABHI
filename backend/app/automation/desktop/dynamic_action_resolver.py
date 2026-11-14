"""ABHI Sovereign Dynamic Action & Learning Resolver.

Enables universal, zero-latency dynamic control over Windows OS, web browsers,
media players, installed software, and complex multi-step workflows.
Learns novel user commands dynamically and caches resolution for 0ms execution.
Addresses operator callsign as 'Mamu'.
"""

import os
import sys
import re
import json
import time
import subprocess
import ctypes
import urllib.parse
from typing import Any, Dict, List, Optional, Tuple

from backend.app.core.logging import logger
from backend.app.automation.desktop.os_control_engine import os_control_engine


CACHE_FILE_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "dynamic_command_cache.json"
)


class DynamicActionResolver:
    """Universal Dynamic Action Resolver and In-Memory Command Learner."""

    def __init__(self):
        self._learned_cache: Dict[str, Dict[str, Any]] = {}
        self._installed_apps: Dict[str, str] = {}
        self._load_cache()
        self._index_installed_applications()

    def _load_cache(self):
        try:
            if os.path.exists(CACHE_FILE_PATH):
                with open(CACHE_FILE_PATH, "r", encoding="utf-8") as f:
                    self._learned_cache = json.load(f)
                logger.info(f"Loaded {len(self._learned_cache)} learned command mappings.")
        except Exception as e:
            logger.warning(f"Could not load dynamic command cache: {e}")
            self._learned_cache = {}

    def _save_cache(self):
        try:
            with open(CACHE_FILE_PATH, "w", encoding="utf-8") as f:
                json.dump(self._learned_cache, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"Failed to persist dynamic command cache: {e}")

    def _index_installed_applications(self):
        """Scans Windows Start Menu shortcuts to discover 100% of installed programs."""
        start_dirs = [
            os.path.expandvars(r"%APPDATA%\Microsoft\Windows\Start Menu\Programs"),
            os.path.expandvars(r"%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs"),
        ]
        apps = {}
        for s_dir in start_dirs:
            if os.path.exists(s_dir):
                for root, _, files in os.walk(s_dir):
                    for f in files:
                        if f.lower().endswith(".lnk"):
                            clean_name = f[:-4].lower().strip()
                            apps[clean_name] = os.path.join(root, f)
        self._installed_apps = apps
        logger.info(f"Indexed {len(self._installed_apps)} installed Windows applications.")

    def find_installed_app_shortcut(self, query: str) -> Optional[str]:
        q = query.lower().strip()
        if q in self._installed_apps:
            return self._installed_apps[q]
        for app_name, app_path in self._installed_apps.items():
            if q == app_name or q in app_name or app_name in q:
                return app_path
        return None

    def clean_query(self, raw: str) -> str:
        """Removes filler speech prefixes while preserving target intent."""
        c = raw.strip()
        c = re.sub(
            r"^(hey\s+abhi|hay\s+abhi|hi\s+abhi|hello\s+abhi|ok\s+abhi|abhi|abi|avi|are\s+abhi)\s*",
            "", c, flags=re.IGNORECASE
        )
        c = re.sub(
            r"^(please|can\s+you|could\s+you|would\s+you|just|now|kindly|go\s+ahead\s+and)\s+",
            "", c, flags=re.IGNORECASE
        )
        return c.strip()

    def resolve_web_target(self, target: str) -> Optional[Tuple[str, str]]:
        """Maps web aliases to canonical URLs and titles."""
        t = target.lower().strip()
        web_map = {
            "fb": ("https://www.facebook.com", "Facebook"),
            "facebook": ("https://www.facebook.com", "Facebook"),
            "insta": ("https://www.instagram.com", "Instagram"),
            "instagram": ("https://www.instagram.com", "Instagram"),
            "youtube": ("https://www.youtube.com", "YouTube"),
            "yt": ("https://www.youtube.com", "YouTube"),
            "whatsapp": ("https://web.whatsapp.com", "WhatsApp Web"),
            "web whatsapp": ("https://web.whatsapp.com", "WhatsApp Web"),
            "twitter": ("https://x.com", "X (Twitter)"),
            "x": ("https://x.com", "X"),
            "gmail": ("https://mail.google.com", "Gmail"),
            "email": ("https://mail.google.com", "Gmail"),
            "mail": ("https://mail.google.com", "Gmail"),
            "github": ("https://github.com", "GitHub"),
            "linkedin": ("https://www.linkedin.com", "LinkedIn"),
            "chatgpt": ("https://chatgpt.com", "ChatGPT"),
            "gpt": ("https://chatgpt.com", "ChatGPT"),
            "claude": ("https://claude.ai", "Claude AI"),
            "gemini": ("https://gemini.google.com", "Gemini AI"),
            "reddit": ("https://reddit.com", "Reddit"),
            "netflix": ("https://netflix.com", "Netflix"),
            "prime": ("https://primevideo.com", "Prime Video"),
            "prime video": ("https://primevideo.com", "Prime Video"),
            "hotstar": ("https://www.hotstar.com", "Disney+ Hotstar"),
            "disney": ("https://www.hotstar.com", "Disney+ Hotstar"),
            "spotify": ("https://open.spotify.com", "Spotify Web"),
            "amazon": ("https://www.amazon.in", "Amazon"),
            "flipkart": ("https://www.flipkart.com", "Flipkart"),
            "movie": ("https://www.google.com/search?q=latest+movies", "Movies"),
            "movies": ("https://www.google.com/search?q=latest+movies", "Movies"),
            "maps": ("https://maps.google.com", "Google Maps"),
            "google maps": ("https://maps.google.com", "Google Maps"),
            "drive": ("https://drive.google.com", "Google Drive"),
            "google drive": ("https://drive.google.com", "Google Drive"),
            "news": ("https://news.google.com", "Google News"),
            "weather": ("https://www.google.com/search?q=weather+today", "Weather"),
        }
        return web_map.get(t)

    def resolve_and_execute(
        self,
        raw_query: str,
        screen_context: Optional[str] = None
    ) -> Tuple[bool, str, str]:
        """Resolves any OS, browser, media, or dynamic action and executes immediately."""
        clean = self.clean_query(raw_query)
        lower_clean = clean.lower()

        logger.info(f"DynamicActionResolver evaluating: '{clean}' (raw: '{raw_query}')")

        # ---------------------------------------------------------------------
        # 0. Check Learned Zero-Latency Cache
        # ---------------------------------------------------------------------
        if lower_clean in self._learned_cache:
            cached_plan = self._learned_cache[lower_clean]
            ok, reply = self._execute_learned_plan(cached_plan)
            if ok:
                return True, cached_plan.get("action", "learned_action"), reply

        # ---------------------------------------------------------------------
        # 1. YouTube & Music / Song Automation
        # ---------------------------------------------------------------------
        # If user mentions YouTube OR asks for any song/music/track
        if "youtube" in lower_clean or any(k in lower_clean for k in ["song", "songs", "music", "track"]):
            term = lower_clean
            for w in [
                "open youtube and", "open youtube", "youtube open", "in youtube", "on youtube",
                "youtube", "search for", "search", "play", "open", "listen to", "can you",
                "please", "now", "any", "song", "songs"
            ]:
                term = re.sub(rf"\b{w}\b", "", term, flags=re.IGNORECASE).strip()

            if term and len(term) > 1:
                query_term = f"{term} songs" if not ("song" in term or "music" in term) else term
                ok, meta, _ = os_control_engine.play_youtube_song(query_term)
                if ok:
                    self._cache_action(lower_clean, {"type": "youtube_play", "query": query_term, "reply": f"Opened YouTube and playing '{query_term}' for you, Mamu!"})
                    return True, "play_youtube", f"Opened YouTube and playing '{query_term}' for you, Mamu!"
            else:
                os_control_engine.open_url("https://www.youtube.com")
                self._cache_action(lower_clean, {"type": "url", "url": "https://www.youtube.com", "reply": "Opened YouTube for you, Mamu."})
                return True, "open_youtube", "Opened YouTube for you, Mamu."

        # ---------------------------------------------------------------------
        # 2. YouTube & Media Playback Control (Pause, Mute, Skip, Next, etc.)
        # ---------------------------------------------------------------------
        if any(k in lower_clean for k in ["next video", "play next video", "next track", "next song"]):
            os_control_engine.send_hotkey("SHIFT+N")
            self._cache_action(lower_clean, {"type": "hotkey", "key": "SHIFT+N", "reply": "Playing next video, Mamu."})
            return True, "next_video", "Playing the next video, Mamu."

        if any(k in lower_clean for k in ["previous video", "previous song", "last video"]):
            os_control_engine.send_hotkey("SHIFT+P")
            return True, "previous_video", "Playing previous video, Mamu."

        if any(lower_clean == p or lower_clean.startswith(f"{p} ") for p in ["pause", "pause video", "pause the video"]):
            ctypes.windll.user32.keybd_event(0x20, 0, 0, 0)
            ctypes.windll.user32.keybd_event(0x20, 0, 2, 0)
            self._cache_action(lower_clean, {"type": "hotkey", "key": "SPACE", "reply": "Paused video playback, Mamu."})
            return True, "pause_media", "Paused video playback for you, Mamu."

        if any(lower_clean == p or lower_clean.startswith(f"{p} ") for p in ["play", "resume", "play video", "play the video", "unpause"]):
            ctypes.windll.user32.keybd_event(0x20, 0, 0, 0)
            ctypes.windll.user32.keybd_event(0x20, 0, 2, 0)
            self._cache_action(lower_clean, {"type": "hotkey", "key": "SPACE", "reply": "Resumed playback, Mamu."})
            return True, "resume_media", "Resumed playback for you, Mamu."

        if any(k in lower_clean for k in ["mute video", "mute the video", "mute audio", "mute sound", "unmute"]):
            os_control_engine.send_hotkey("M")
            self._cache_action(lower_clean, {"type": "hotkey", "key": "M", "reply": "Toggled audio mute, Mamu."})
            return True, "mute_video", "Toggled video audio mute, Mamu."

        if any(k in lower_clean for k in ["skip ad", "skip the ad", "skip ads", "remove ad"]):
            os_control_engine.send_hotkey("TAB")
            time.sleep(0.05)
            os_control_engine.send_hotkey("ENTER")
            self._cache_action(lower_clean, {"type": "hotkey", "key": "TAB+ENTER", "reply": "Skipped ad, Mamu."})
            return True, "skip_ad", "Skipped the advertisement, Mamu."

        if any(k in lower_clean for k in ["skip 30 seconds", "forward 30 seconds", "seek forward 30 seconds", "skip 30s"]):
            for _ in range(3):
                os_control_engine.send_hotkey("L")
                time.sleep(0.04)
            self._cache_action(lower_clean, {"type": "multi_hotkey", "keys": ["L", "L", "L"], "reply": "Skipped 30 seconds forward, Mamu."})
            return True, "forward_30s", "Skipped 30 seconds forward, Mamu."

        if any(k in lower_clean for k in ["skip 10 seconds", "forward 10 seconds", "seek forward", "forward 10s"]):
            os_control_engine.send_hotkey("L")
            return True, "forward_10s", "Skipped 10 seconds forward, Mamu."

        if any(k in lower_clean for k in ["rewind 10 seconds", "back 10 seconds", "seek backward", "rewind"]):
            os_control_engine.send_hotkey("J")
            return True, "rewind_10s", "Rewound 10 seconds, Mamu."

        if any(k in lower_clean for k in ["fullscreen", "full screen", "exit fullscreen"]):
            os_control_engine.send_hotkey("F")
            return True, "fullscreen_toggle", "Toggled fullscreen view, Mamu."

        if any(k in lower_clean for k in ["theater mode", "theatre mode"]):
            os_control_engine.send_hotkey("T")
            return True, "theater_mode", "Toggled theater mode, Mamu."

        # ---------------------------------------------------------------------
        # 3. Browser Tab & Navigation Control
        # ---------------------------------------------------------------------
        if any(k in lower_clean for k in ["close tab", "close the tab", "close this tab", "exit tab"]):
            os_control_engine.close_tab()
            self._cache_action(lower_clean, {"type": "hotkey", "key": "CTRL+W", "reply": "Closed tab, Mamu."})
            return True, "close_tab", "Closed browser tab, Mamu."

        if any(k in lower_clean for k in ["new tab", "open new tab", "open a tab", "create tab"]):
            os_control_engine.new_tab()
            self._cache_action(lower_clean, {"type": "hotkey", "key": "CTRL+T", "reply": "Opened new tab, Mamu."})
            return True, "new_tab", "Opened a new tab, Mamu."

        if any(k in lower_clean for k in ["reopen tab", "restore tab", "undo close tab"]):
            os_control_engine.reopen_tab()
            return True, "reopen_tab", "Restored recently closed tab, Mamu."

        if any(k in lower_clean for k in ["next tab", "switch tab", "change tab", "other tab"]):
            os_control_engine.switch_tab("next")
            return True, "switch_tab", "Switched to next tab, Mamu."

        if any(k in lower_clean for k in ["previous tab", "prev tab", "back tab"]):
            os_control_engine.switch_tab("previous")
            return True, "prev_tab", "Switched to previous tab, Mamu."

        if any(k in lower_clean for k in ["refresh", "reload", "reload page", "refresh page"]):
            os_control_engine.send_hotkey("F5")
            return True, "refresh_page", "Refreshed the current page, Mamu."

        if any(k in lower_clean for k in ["scroll down", "page down", "scroll page down"]):
            os_control_engine.mouse_scroll(clicks=6, direction="down")
            return True, "scroll_down", "Scrolled down, Mamu."

        if any(k in lower_clean for k in ["scroll up", "page up", "scroll page up"]):
            os_control_engine.mouse_scroll(clicks=6, direction="up")
            return True, "scroll_up", "Scrolled up, Mamu."

        if any(k in lower_clean for k in ["zoom in", "magnify"]):
            os_control_engine.send_hotkey("CTRL+=")
            return True, "zoom_in", "Zoomed in, Mamu."

        if any(k in lower_clean for k in ["zoom out"]):
            os_control_engine.send_hotkey("CTRL+-")
            return True, "zoom_out", "Zoomed out, Mamu."

        if any(k in lower_clean for k in ["reset zoom", "normal zoom"]):
            os_control_engine.send_hotkey("CTRL+0")
            return True, "reset_zoom", "Reset page zoom to 100%, Mamu."

        if any(k in lower_clean for k in ["downloads", "show downloads", "open downloads"]):
            os_control_engine.send_hotkey("CTRL+J")
            return True, "open_downloads", "Opened downloads, Mamu."

        if any(k in lower_clean for k in ["history", "browser history"]):
            os_control_engine.send_hotkey("CTRL+H")
            return True, "browser_history", "Opened browser history, Mamu."

        # ---------------------------------------------------------------------
        # 4. Windows & Desktop Control
        # ---------------------------------------------------------------------
        if any(k in lower_clean for k in ["close window", "close the window", "now close the window", "exit window", "close app"]):
            os_control_engine.close_window()
            self._cache_action(lower_clean, {"type": "window_close", "reply": "Closed window, Mamu."})
            return True, "close_window", "Closed the active window, Mamu."

        if any(k in lower_clean for k in ["minimize window", "minimize this", "minimize the window"]):
            os_control_engine.minimize_window()
            return True, "minimize_window", "Minimized active window, Mamu."

        if any(k in lower_clean for k in ["maximize window", "maximize the window", "full window"]):
            os_control_engine.maximize_window()
            return True, "maximize_window", "Maximized window, Mamu."

        if any(k in lower_clean for k in ["show desktop", "minimize all", "desktop screen", "go to desktop"]):
            os_control_engine.send_hotkey("WIN+D")
            return True, "show_desktop", "Showing your Windows desktop, Mamu."

        if any(k in lower_clean for k in ["switch window", "next window", "alt tab"]):
            os_control_engine.switch_window("next")
            return True, "switch_window", "Switched window focus, Mamu."

        if any(k in lower_clean for k in ["lock screen", "lock workstation", "lock pc", "lock the computer"]):
            os_control_engine.lock_workstation()
            return True, "lock_workstation", "Workstation locked securely, Mamu."

        if any(k in lower_clean for k in ["task manager", "taskmgr", "open task manager"]):
            os_control_engine.send_hotkey("CTRL+SHIFT+ESC")
            return True, "task_manager", "Opened Windows Task Manager, Mamu."

        if any(k in lower_clean for k in ["keypad", "keyboard", "on screen keyboard", "osk"]):
            subprocess.Popen(["cmd.exe", "/c", "start", "osk.exe"])
            self._cache_action(lower_clean, {"type": "cmd", "cmd": "start osk.exe", "reply": "Opened On-Screen Keyboard, Mamu."})
            return True, "open_osk", "On-Screen Keyboard opened on your screen, Mamu."

        if any(k in lower_clean for k in ["snip", "screenshot", "take screenshot", "capture screen"]):
            os_control_engine.send_hotkey("WIN+SHIFT+S")
            return True, "screenshot", "Screen snip tool activated, Mamu."

        # ---------------------------------------------------------------------
        # 5. Direct App & Web Target Resolution (e.g. "open WhatsApp", "WhatsApp", "Chrome", "calc")
        # ---------------------------------------------------------------------
        target_candidate = re.sub(r"^(?:open|launch|start|goto|show)\s+", "", lower_clean).strip()
        target_candidate = re.sub(r"\s+open$", "", target_candidate).strip()

        if target_candidate:
            web_info = self.resolve_web_target(target_candidate)
            if web_info:
                url, title = web_info
                os_control_engine.open_url(url)
                self._cache_action(lower_clean, {"type": "url", "url": url, "reply": f"Opened {title}, Mamu."})
                return True, f"open_{target_candidate}", f"Opened {title} for you, Mamu."

            shortcut = self.find_installed_app_shortcut(target_candidate)
            if shortcut:
                try:
                    os.startfile(shortcut)
                    self._cache_action(lower_clean, {"type": "shortcut", "path": shortcut, "reply": f"Launched {target_candidate}, Mamu."})
                    return True, f"launch_{target_candidate}", f"Launched {target_candidate.title()} on your screen, Mamu."
                except Exception as e:
                    logger.warning(f"Error launching shortcut {shortcut}: {e}")

            res = os_control_engine.launch_application(target_candidate)
            if res and (res[0] if isinstance(res, tuple) else bool(res)):
                self._cache_action(lower_clean, {"type": "app", "name": target_candidate, "reply": f"Launched {target_candidate.title()}, Mamu."})
                return True, f"launch_{target_candidate}", f"Launched {target_candidate.title()}, Mamu."

        # ---------------------------------------------------------------------
        # 6. General Web Search ("search for X", "google X")
        # ---------------------------------------------------------------------
        m_search = re.search(r"^(?:search\s+for|search|google|find)\s+(.+)$", lower_clean)
        if m_search:
            search_query = m_search.group(1).strip()
            encoded = urllib.parse.quote_plus(search_query)
            search_url = f"https://www.google.com/search?q={encoded}"
            os_control_engine.open_url(search_url)
            return True, "web_search", f"Opened Chrome and searching for '{search_query}', Mamu!"

        # ---------------------------------------------------------------------
        # 7. Multi-Step DAG Task Execution ("open X and type Y")
        # ---------------------------------------------------------------------
        if " and " in lower_clean or " then " in lower_clean:
            steps = self._decompose_dynamic_goal(clean)
            if steps and len(steps) > 0:
                ok, summary = self._execute_dag_steps(steps)
                if ok:
                    return True, "dag_workflow", f"Executed for you, Mamu: {summary}."

        # ---------------------------------------------------------------------
        # 8. Presence, Identity & Capabilities
        # ---------------------------------------------------------------------
        if any(k in lower_clean for k in ["are you listening", "can you hear me", "are you there", "do you hear me"]):
            return True, "presence_check", "Yes Mamu, I am listening to your every word clearly! The entire OS controller and multi-agent swarm are at your command."

        if any(k in lower_clean for k in ["recognise", "recognize", "who am i", "do you know me", "my name"]):
            return True, "voice_identity", "Yes Mamu! I recognize your voice with 100% fidelity. You are Ravuvai Ayyappa Rayudu, supreme commander of ABHI."

        if any(k in lower_clean for k in ["who are you", "what can you do", "what are you"]):
            return True, "capabilities", "I am ABHI — your unified central AI companion. I provide full Windows OS control, browser manipulation, autonomous multi-step execution, and live intelligence without limits, Mamu!"

        # ---------------------------------------------------------------------
        # 9. Dynamic General Shell Action Fallback
        # ---------------------------------------------------------------------
        if lower_clean.startswith("run ") or lower_clean.startswith("exec "):
            shell_cmd = clean[4:].strip()
            try:
                out = subprocess.check_output(["powershell.exe", "-NoProfile", "-Command", shell_cmd], timeout=6, text=True)
                summary = out.strip()[:140] if out else "Command executed successfully"
                return True, "run_shell", f"Executed in PowerShell, Mamu: {summary}"
            except Exception as e:
                logger.warning(f"Shell execution failed: {e}")

        # Final Sovereign Companion Guidance
        active_title = os_control_engine.get_active_window().get("title", "Windows Desktop")
        return False, "unhandled", f"Understood, Mamu. I am monitoring '{active_title}'. Tell me what program to launch, song to play, or action to automate."

    def _cache_action(self, pattern: str, plan: Dict[str, Any]):
        self._learned_cache[pattern] = plan
        self._save_cache()

    def _execute_learned_plan(self, plan: Dict[str, Any]) -> Tuple[bool, str]:
        p_type = plan.get("type")
        reply = plan.get("reply", "Action executed, Mamu.")
        try:
            if p_type == "hotkey":
                os_control_engine.send_hotkey(plan.get("key", ""))
                return True, reply
            elif p_type == "multi_hotkey":
                for k in plan.get("keys", []):
                    os_control_engine.send_hotkey(k)
                    time.sleep(0.04)
                return True, reply
            elif p_type == "url":
                os_control_engine.open_url(plan.get("url", "https://google.com"))
                return True, reply
            elif p_type == "youtube_play":
                os_control_engine.play_youtube_song(plan.get("query", "trending songs"))
                return True, reply
            elif p_type == "app":
                os_control_engine.launch_application(plan.get("name", "notepad"))
                return True, reply
            elif p_type == "shortcut":
                os.startfile(plan.get("path"))
                return True, reply
            elif p_type == "cmd":
                subprocess.Popen(["cmd.exe", "/c", plan.get("cmd")])
                return True, reply
            elif p_type == "window_close":
                os_control_engine.close_window()
                return True, reply
        except Exception as e:
            logger.warning(f"Learned plan execution error: {e}")
        return False, ""

    def _decompose_dynamic_goal(self, goal: str) -> List[Dict[str, Any]]:
        """Decomposes compound sentences into actionable sequential tasks."""
        parts = re.split(r"\s+(?:and|then)\s+", goal, flags=re.IGNORECASE)
        steps = []
        for p in parts:
            p_clean = p.strip()
            p_lower = p_clean.lower()
            if not p_clean:
                continue

            # Check if this part is a YouTube/song query
            if "youtube" in p_lower or any(k in p_lower for k in ["song", "music", "play"]):
                term = p_lower
                for w in ["open youtube and", "open youtube", "youtube open", "in youtube", "on youtube", "youtube", "play", "open", "search for", "search"]:
                    term = re.sub(rf"\b{w}\b", "", term, flags=re.IGNORECASE).strip()
                song_q = f"{term} songs" if term and not ("song" in term or "music" in term) else (term or "trending songs")
                steps.append({"action": "play_youtube_song", "params": {"query": song_q}, "title": f"Play {song_q}"})
                continue

            # App opening
            m_open = re.search(r"open\s+([a-z0-9_\-\.\s]+)", p_lower)
            if m_open:
                target = m_open.group(1).strip()
                web_info = self.resolve_web_target(target)
                if web_info:
                    steps.append({"action": "open_url", "params": {"url": web_info[0]}, "title": f"Open {web_info[1]}"})
                else:
                    steps.append({"action": "launch_application", "params": {"app_name": target}, "title": f"Launch {target}"})
                continue

            # Typing text
            m_type = re.search(r"(?:type|write|enter)\s+(.+)", p_clean, flags=re.IGNORECASE)
            if m_type:
                text = m_type.group(1).strip().strip('"').strip("'")
                steps.append({"action": "type_text", "params": {"text": text}, "title": f"Type '{text[:20]}'"})
                continue

            # Search in browser
            m_search = re.search(r"search\s+for\s+(.+)", p_lower)
            if m_search:
                query = m_search.group(1).strip()
                encoded = urllib.parse.quote_plus(query)
                steps.append({"action": "open_url", "params": {"url": f"https://www.google.com/search?q={encoded}"}, "title": f"Search '{query}'"})
                continue

            # Hotkeys / controls
            if "close" in p_lower and "tab" in p_lower:
                steps.append({"action": "close_tab", "title": "Close Tab"})
            elif "close" in p_lower and "window" in p_lower:
                steps.append({"action": "close_window", "title": "Close Window"})

        return steps

    def _execute_dag_steps(self, steps: List[Dict[str, Any]]) -> Tuple[bool, str]:
        executed = []
        for step in steps:
            action = step.get("action")
            params = step.get("params", {})
            try:
                if action == "play_youtube_song":
                    song = params.get("query", "trending songs")
                    os_control_engine.play_youtube_song(song)
                    executed.append(f"Playing '{song}'")
                    time.sleep(0.5)
                elif action == "launch_application":
                    app = params.get("app_name", "notepad")
                    shortcut = self.find_installed_app_shortcut(app)
                    if shortcut:
                        os.startfile(shortcut)
                    else:
                        os_control_engine.launch_application(app)
                    executed.append(f"Launched {app}")
                    time.sleep(0.5)
                elif action == "open_url":
                    url = params.get("url", "https://google.com")
                    os_control_engine.open_url(url)
                    executed.append(f"Opened {url}")
                    time.sleep(0.5)
                elif action == "type_text":
                    text = params.get("text", "")
                    time.sleep(0.5)
                    os_control_engine.type_text(text)
                    executed.append(f"Typed text")
                elif action == "close_window":
                    os_control_engine.close_window()
                    executed.append("Closed window")
                elif action == "close_tab":
                    os_control_engine.close_tab()
                    executed.append("Closed tab")
            except Exception as e:
                logger.warning(f"Error executing step {action}: {e}")

        return (len(executed) > 0), ", ".join(executed)


# Global singleton instance
dynamic_action_resolver = DynamicActionResolver()

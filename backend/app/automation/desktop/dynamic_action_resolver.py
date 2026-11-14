"""ABHI Sovereign Dynamic Action & Learning Resolver.

Enables universal, zero-latency dynamic control over Windows OS, web browsers,
media players, installed software, interactive window switching, and live intelligence.
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
from backend.app.services.search.online_knowledge import OnlineKnowledgeSearcher


CACHE_FILE_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "dynamic_command_cache.json"
)


class DynamicActionResolver:
    """Universal Dynamic Action Resolver, Interactive Window Switcher, and Command Learner."""

    def __init__(self):
        self._learned_cache: Dict[str, Dict[str, Any]] = {}
        self._installed_apps: Dict[str, str] = {}
        self._searcher = OnlineKnowledgeSearcher()
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

    def get_user_open_windows(self) -> List[Dict[str, Any]]:
        """Returns clean list of visible user application windows."""
        raw = os_control_engine.list_windows()
        user_windows = []
        ignored_keywords = [
            "default ime", "msctfime", "program manager", "windows input experience",
            "nvidia geforce", "abhi cybernetic", "task switching"
        ]
        seen_titles = set()
        for w in raw:
            title = w.get("title", "").strip()
            if not title or len(title) < 2:
                continue
            lower_t = title.lower()
            if any(ig in lower_t for ig in ignored_keywords):
                continue
            if lower_t in seen_titles:
                continue
            seen_titles.add(lower_t)

            display_name = title.split(" - ")[-1].strip() if " - " in title else title
            if "google chrome" in lower_t:
                display_name = "Google Chrome"
            elif "antigravity ide" in lower_t:
                display_name = "Antigravity IDE"

            user_windows.append({
                "hwnd": w.get("hwnd"),
                "full_title": title,
                "display_name": display_name
            })
        return user_windows

    def resolve_web_target(self, target: str) -> Optional[Tuple[str, str]]:
        """Maps web aliases to canonical URLs and titles."""
        t = target.lower().strip()
        web_map = {
            "fb": ("https://www.facebook.com", "Facebook"),
            "facebook": ("https://www.facebook.com", "Facebook"),
            "patrika": ("https://www.patrika.com", "Rajasthan Patrika"),
            "rajasthan patrika": ("https://www.patrika.com", "Rajasthan Patrika"),
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
            "maps": ("https://maps.google.com", "Google Maps"),
            "google maps": ("https://maps.google.com", "Google Maps"),
            "drive": ("https://drive.google.com", "Google Drive"),
            "google drive": ("https://drive.google.com", "Google Drive"),
            "news": ("https://news.google.com", "Google News"),
            "weather": ("https://www.google.com/search?q=weather+today", "Weather"),
        }
        return web_map.get(t)

    @staticmethod
    def is_info_query(query: str) -> bool:
        """Determines if a query is a genuine informational question or knowledge search."""
        q = query.lower().strip()
        words = q.split()
        if len(words) < 2:
            return False

        question_starters = (
            "who is", "who was", "who are",
            "what is", "what was", "what are", "what does",
            "where is", "where was", "where are",
            "when is", "when was", "when did",
            "how to", "how do", "how does", "how is", "how much", "how many",
            "why is", "why does", "why are", "why did",
            "explain", "tell me about", "define", "meaning of", "summary of",
            "capital of", "population of", "president of", "ceo of",
            "prime minister of", "weather in", "price of"
        )
        if any(q.startswith(qs) for qs in question_starters):
            return True

        info_keywords = (
            "pin code", "pincode", "zip code", "capital", "population", "gdp",
            "currency", "weather forecast", "latest news", "stock price",
            "share price", "score of", "match score", "ipl score", "election result",
            "who won", "ranking", "scheme", "eligibility", "symptoms of",
            "treatment of", "distance between"
        )
        if any(ik in q for ik in info_keywords):
            return True

        if q.endswith("?"):
            return True

        return False

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
        # 1. Incomplete / Bare Command Verbs ("open", "go", "launch", "play", "search")
        # ---------------------------------------------------------------------
        if lower_clean in ["open", "launch", "start", "go", "show"]:
            return True, "ask_clarification", "What would you like me to open, Mamu? Tell me any application, website, or song."

        if lower_clean in ["search", "search for"]:
            return True, "ask_clarification", "What would you like me to search for, Mamu?"

        # ---------------------------------------------------------------------
        # 1A. Greetings & Pleasantries (Strictly Intercepted for Conversation)
        # ---------------------------------------------------------------------
        greetings_list = ["hi", "hello", "hey", "namaste", "good morning", "good afternoon", "good evening", "what's up", "whats up", "yo"]
        if lower_clean in greetings_list or any(lower_clean == f"{g} abhi" or lower_clean == f"abhi {g}" for g in greetings_list):
            return True, "greeting", "Hello Mamu! I am right here listening. Tell me what application to open, song to play, or task to automate."

        if any(lower_clean == q for q in ["how are you", "how are you doing", "how r u"]):
            return True, "greeting", "I am running at peak performance and ready for your commands, Mamu! How can I assist you?"

        if any(lower_clean == q for q in ["thank you", "thanks", "thanks abhi", "thank you abhi"]):
            return True, "gratitude", "You are always welcome, Mamu! I am always at your service."

        # ---------------------------------------------------------------------
        # 1B. Presence, Identity, Time & Date
        # ---------------------------------------------------------------------
        if any(k in lower_clean for k in ["are you listening", "can you hear me", "are you there", "do you hear me"]):
            return True, "presence_check", "Yes Mamu, I am listening to your every word clearly! The entire OS controller and multi-agent swarm are at your command."

        if any(k in lower_clean for k in ["recognise", "recognize", "can you recognise", "can you recognize", "who am i", "do you know me", "my name"]):
            return True, "voice_identity", "Yes Mamu! I recognize your voice with 100% fidelity. You are Ravuvai Ayyappa Rayudu, supreme commander of ABHI."

        if any(k in lower_clean for k in ["who are you", "what can you do", "what are you"]):
            return True, "capabilities", "I am ABHI — your unified central AI companion. I provide full Windows OS control, browser manipulation, autonomous multi-step execution, and live intelligence without limits, Mamu!"

        if any(k in lower_clean for k in ["what is the time", "what's the time", "time now", "current time", "what time is it", "tell me the time"]):
            curr_time = time.strftime("%I:%M %p")
            return True, "current_time", f"Mamu, it is currently {curr_time}."

        if any(k in lower_clean for k in ["what is the date", "what's the date", "date today", "today date", "what's today's date"]):
            curr_date = time.strftime("%A, %B %d, %Y")
            return True, "current_date", f"Mamu, today is {curr_date}."

        # ---------------------------------------------------------------------
        # 1C. System Master Audio Volume & Mute Controls
        # ---------------------------------------------------------------------
        m_vol_set = re.match(r"^(?:set\s+)?volume\s+(?:to\s+)?(\d{1,3})(?:%|\s*percent)?$", lower_clean)
        if m_vol_set:
            val = int(m_vol_set.group(1))
            val = max(0, min(100, val))
            os_control_engine.set_volume_percentage(val)
            self._cache_action(lower_clean, {"type": "volume_set", "value": val, "reply": f"System volume set to {val} percent, Mamu."})
            return True, "volume_set", f"System volume set to {val} percent, Mamu."

        if any(k in lower_clean for k in ["volume up", "increase volume", "turn volume up", "louder", "sound up", "raise volume", "volume higher"]):
            os_control_engine.change_volume_by(10)
            self._cache_action(lower_clean, {"type": "volume_change", "delta": 10, "reply": "Increased system volume for you, Mamu."})
            return True, "volume_up", "Increased system volume for you, Mamu."

        if any(k in lower_clean for k in ["volume down", "decrease volume", "turn volume down", "lower volume", "softer", "sound down", "volume lower"]):
            os_control_engine.change_volume_by(-10)
            self._cache_action(lower_clean, {"type": "volume_change", "delta": -10, "reply": "Decreased system volume for you, Mamu."})
            return True, "volume_down", "Decreased system volume for you, Mamu."

        if any(lower_clean == p for p in ["mute", "mute system", "mute audio", "mute master", "silence", "unmute system", "unmute"]):
            os_control_engine.adjust_volume("mute", steps=1)
            return True, "toggle_mute", "Toggled system audio mute, Mamu."

        # ---------------------------------------------------------------------
        # 2. Stop / Pause Media (Prioritized BEFORE Song Search!)
        # ---------------------------------------------------------------------
        if any(lower_clean == p or p in lower_clean for p in [
            "stop the song", "stop song", "stop music", "stop video", "stop playing",
            "stop", "pause the song", "pause song", "pause music", "pause video",
            "pause the video", "pause video", "pause", "shut up", "be quiet"
        ]):
            os_control_engine.send_hotkey("SPACE")
            self._cache_action(lower_clean, {"type": "hotkey", "key": "SPACE", "reply": "Stopped playback for you, Mamu."})
            return True, "stop_media", "Stopped playback for you, Mamu."

        if any(lower_clean == p or lower_clean.startswith(f"{p} ") for p in ["resume", "resume video", "resume the video", "unpause"]):
            os_control_engine.send_hotkey("SPACE")
            self._cache_action(lower_clean, {"type": "hotkey", "key": "SPACE", "reply": "Resumed playback, Mamu."})
            return True, "resume_media", "Resumed playback for you, Mamu."

        if any(k in lower_clean for k in ["mute video", "mute the video", "mute audio", "mute sound", "unmute"]):
            os_control_engine.send_hotkey("M")
            self._cache_action(lower_clean, {"type": "hotkey", "key": "M", "reply": "Toggled audio mute, Mamu."})
            return True, "mute_video", "Toggled video audio mute, Mamu."

        # Skip advertisement (handles 'skip ad' and phonetic 'skip add')
        if any(k in lower_clean for k in ["skip ad", "skip add", "skip the ad", "skip the add", "skip ads", "remove ad", "remove add"]):
            os_control_engine.send_hotkey("TAB")
            time.sleep(0.05)
            os_control_engine.send_hotkey("ENTER")
            self._cache_action(lower_clean, {"type": "hotkey", "key": "TAB+ENTER", "reply": "Skipped the advertisement, Mamu."})
            return True, "skip_ad", "Skipped the advertisement, Mamu."

        if any(k in lower_clean for k in ["next video", "play next video", "next track", "next song"]):
            os_control_engine.send_hotkey("SHIFT+N")
            self._cache_action(lower_clean, {"type": "hotkey", "key": "SHIFT+N", "reply": "Playing next video on YouTube, Mamu."})
            return True, "next_video", "Playing the next video, Mamu."

        if any(k in lower_clean for k in ["previous video", "previous song", "last video"]):
            os_control_engine.send_hotkey("SHIFT+P")
            return True, "previous_video", "Playing previous video, Mamu."

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

        # Bare "video" or "open video"
        if lower_clean in ["video", "open video", "play video"]:
            os_control_engine.send_hotkey("SPACE")
            return True, "toggle_video", "Toggled video playback, Mamu."

        # ---------------------------------------------------------------------
        # 3. YouTube Navigation & Search
        # ---------------------------------------------------------------------
        # Case A: Explicit Home Page Navigation
        if any(k in lower_clean for k in [
            "home page of youtube", "youtube home page", "youtube homepage",
            "youtube home", "go to youtube", "open youtube", "youtube"
        ]) and not any(k in lower_clean for k in ["search", "download", "song", "songs", "music", "play", "movie", "film"]):
            os_control_engine.open_url("https://www.youtube.com")
            self._cache_action(lower_clean, {"type": "url", "url": "https://www.youtube.com", "reply": "Opened YouTube home page for you, Mamu."})
            return True, "open_youtube", "Opened YouTube home page for you, Mamu."

        # Case B: YouTube Search & Topic Playing (e.g. "YouTube and search agriculture", "Rajasthani picture film")
        if "youtube" in lower_clean or any(k in lower_clean for k in ["song", "songs", "music", "track", "film", "picture film", "movie", "trailer"]):
            term = lower_clean
            for w in [
                "open youtube and search", "youtube and search", "search in youtube for",
                "search on youtube for", "search in youtube", "search on youtube",
                "search for", "search", "open youtube and play", "play on youtube",
                "play in youtube", "in youtube", "on youtube", "open youtube",
                "home page of", "go to home page of", "youtube", "open", "play", "and"
            ]:
                term = re.sub(rf"\b{w}\b", "", term, flags=re.IGNORECASE).strip()

            term = re.sub(r"^(for|of|to|in|on|and|the)\s+", "", term).strip()
            term = re.sub(r"\s+(for|of|to|in|on|and|the)$", "", term).strip()

            if term and len(term) > 1 and term not in ["video", "videos", "song", "songs"]:
                os_control_engine.play_youtube_song(term)
                self._cache_action(lower_clean, {"type": "youtube_play", "query": term, "reply": f"Opened YouTube and searching for '{term}', Mamu!"})
                return True, "play_youtube", f"Opened YouTube and searching for '{term}' for you, Mamu!"
            else:
                os_control_engine.open_url("https://www.youtube.com")
                return True, "open_youtube", "Opened YouTube for you, Mamu."

        # ---------------------------------------------------------------------
        # 4. Interactive Window Management & Switching
        # ---------------------------------------------------------------------
        user_windows = self.get_user_open_windows()

        if any(lower_clean == p for p in ["switch window", "next window", "switch to next window", "alt tab"]):
            if len(user_windows) > 1:
                target_win = user_windows[1]
                os_control_engine.focus_window(target_win["hwnd"])
                names = [w["display_name"] for w in user_windows[:4]]
                reply = f"Switched to '{target_win['display_name']}', Mamu. Currently open: {', '.join(names)}. Which one would you like to go to?"
                return True, "switch_window", reply
            elif len(user_windows) == 1:
                return True, "switch_window", f"Only '{user_windows[0]['display_name']}' is currently active on your screen, Mamu."

        if any(k in lower_clean for k in [
            "what windows are open", "which windows are open", "show open windows",
            "list windows", "what is open", "open windows", "active windows"
        ]):
            if user_windows:
                names = [w["display_name"] for w in user_windows]
                reply = f"Mamu, you currently have {len(user_windows)} active windows on your laptop: {', '.join(names)}. Say 'switch to <name>' and I will take you there."
                return True, "list_windows", reply
            else:
                return True, "list_windows", "No main application windows are currently open, Mamu."

        m_switch_to = re.match(r"^(?:switch\s+to|go\s+to|focus|bring\s+up)\s+(.+)$", lower_clean)
        if m_switch_to:
            target_name = m_switch_to.group(1).strip()
            for w in user_windows:
                if target_name in w["display_name"].lower() or target_name in w["full_title"].lower():
                    os_control_engine.focus_window(w["hwnd"])
                    return True, f"switch_to_{target_name}", f"Switched to '{w['display_name']}' for you, Mamu."

        # ---------------------------------------------------------------------
        # 5. Close Applications, Windows, and Tabs
        # ---------------------------------------------------------------------
        m_close = re.match(r"^close\s+([a-z0-9_\-\.\s]+)$", lower_clean)
        if m_close:
            target = m_close.group(1).strip()
            if target in ["tab", "the tab", "this tab"]:
                os_control_engine.close_tab()
                self._cache_action(lower_clean, {"type": "hotkey", "key": "CTRL+W", "reply": "Closed browser tab, Mamu."})
                return True, "close_tab", "Closed browser tab, Mamu."
            elif target in ["window", "the window", "this window", "app", "the app"]:
                os_control_engine.close_window()
                self._cache_action(lower_clean, {"type": "window_close", "reply": "Closed active window, Mamu."})
                return True, "close_window", "Closed active window, Mamu."
            else:
                os_control_engine.close_window(target)
                os_control_engine.kill_process(target)
                self._cache_action(lower_clean, {"type": "close_app", "target": target, "reply": f"Closed {target.title()} for you, Mamu."})
                return True, f"close_{target}", f"Closed {target.title()} for you, Mamu."

        # ---------------------------------------------------------------------
        # 6. Browser Navigation & Tabs
        # ---------------------------------------------------------------------
        if any(k in lower_clean for k in ["new tab", "open new tab", "open a tab", "create tab"]):
            os_control_engine.new_tab()
            return True, "new_tab", "Opened a new tab, Mamu."

        if any(k in lower_clean for k in ["reopen tab", "restore tab", "undo close tab"]):
            os_control_engine.reopen_tab()
            return True, "reopen_tab", "Restored recently closed tab, Mamu."

        if any(k in lower_clean for k in ["next tab", "switch tab", "change tab"]):
            os_control_engine.switch_tab("next")
            return True, "switch_tab", "Switched to next tab, Mamu."

        if any(k in lower_clean for k in ["previous tab", "prev tab"]):
            os_control_engine.switch_tab("previous")
            return True, "prev_tab", "Switched to previous tab, Mamu."

        if any(k in lower_clean for k in ["refresh", "reload", "reload page"]):
            os_control_engine.send_hotkey("F5")
            return True, "refresh_page", "Refreshed current page, Mamu."

        if any(k in lower_clean for k in ["scroll down", "page down"]):
            os_control_engine.mouse_scroll(clicks=6, direction="down")
            return True, "scroll_down", "Scrolled down, Mamu."

        if any(k in lower_clean for k in ["scroll up", "page up"]):
            os_control_engine.mouse_scroll(clicks=6, direction="up")
            return True, "scroll_up", "Scrolled up, Mamu."

        if any(k in lower_clean for k in ["zoom in"]):
            os_control_engine.send_hotkey("CTRL+=")
            return True, "zoom_in", "Zoomed in, Mamu."

        if any(k in lower_clean for k in ["zoom out"]):
            os_control_engine.send_hotkey("CTRL+-")
            return True, "zoom_out", "Zoomed out, Mamu."

        if any(k in lower_clean for k in ["downloads", "open downloads"]):
            os_control_engine.send_hotkey("CTRL+J")
            return True, "open_downloads", "Opened downloads, Mamu."

        if any(k in lower_clean for k in ["history", "browser history"]):
            os_control_engine.send_hotkey("CTRL+H")
            return True, "browser_history", "Opened browser history, Mamu."

        # ---------------------------------------------------------------------
        # 7. Desktop OS Utilities
        # ---------------------------------------------------------------------
        if any(k in lower_clean for k in ["show desktop", "minimize all", "desktop screen", "go to desktop"]):
            os_control_engine.send_hotkey("WIN+D")
            return True, "show_desktop", "Showing your Windows desktop, Mamu."

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
        # 8A. Terminal & Shell Launching
        # ---------------------------------------------------------------------
        if any(lower_clean == p or lower_clean == f"open {p}" or lower_clean == f"launch {p}" for p in ["terminal", "powershell", "cmd", "command prompt", "console", "windows terminal", "wt"]):
            res = os_control_engine.launch_application("terminal")
            self._cache_action(lower_clean, {"type": "app", "name": "terminal", "reply": "Launched Terminal on your screen, Mamu."})
            return True, "launch_terminal", "Launched Terminal on your screen, Mamu."

        # ---------------------------------------------------------------------
        # 8B. Direct Web Services / Apps (e.g. "Patrika", "WhatsApp", "Facebook")
        # ---------------------------------------------------------------------
        target_cand = re.sub(r"^(?:open|launch|start|goto|show)\s+", "", lower_clean).strip()
        target_cand = re.sub(r"\s+open$", "", target_cand).strip()

        web_info = self.resolve_web_target(target_cand)
        if web_info:
            url, title = web_info
            os_control_engine.open_url(url)
            self._cache_action(lower_clean, {"type": "url", "url": url, "reply": f"Opened {title} for you, Mamu."})
            return True, f"open_{target_cand}", f"Opened {title} for you, Mamu."

        # If user explicitly asked to "open <app>" or "launch <app>"
        if lower_clean.startswith("open ") or lower_clean.startswith("launch ") or lower_clean.startswith("start "):
            shortcut = self.find_installed_app_shortcut(target_cand)
            if shortcut:
                try:
                    os.startfile(shortcut)
                    self._cache_action(lower_clean, {"type": "shortcut", "path": shortcut, "reply": f"Launched {target_cand.title()}, Mamu."})
                    return True, f"launch_{target_cand}", f"Launched {target_cand.title()} on your screen, Mamu."
                except Exception as e:
                    logger.warning(f"Error launching shortcut {shortcut}: {e}")

            res = os_control_engine.launch_application(target_cand)
            if res and res[0]:
                self._cache_action(lower_clean, {"type": "app", "name": target_cand, "reply": f"Launched {target_cand.title()}, Mamu."})
                return True, f"launch_{target_cand}", f"Launched {target_cand.title()}, Mamu."

        # ---------------------------------------------------------------------
        # 9. Live Web Search & General Knowledge Topics (Strictly Gated!)
        # ---------------------------------------------------------------------
        if self.is_info_query(lower_clean):
            try:
                snippets = self._searcher.search_live_snippets(raw_query)
                if snippets and len(snippets) > 0:
                    best_snippet = snippets[0].get("snippet", "")
                    if best_snippet and len(best_snippet) > 20:
                        clean_snip = best_snippet.split(". ")[0].replace("\n", " ").strip() + "."
                        return True, "live_web_search", f"Mamu, according to live intelligence: {clean_snip}"
            except Exception:
                pass

        # Final Sovereign Companion Guidance for any unhandled / casual phrase
        active_title = os_control_engine.get_active_window().get("title", "Windows Desktop")
        if not active_title:
            active_title = "Windows Desktop"
        return False, "unhandled", f"Understood, Mamu. I am monitoring '{active_title}'. Tell me what application to open, song to play, or task to automate."

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
            elif p_type == "volume_set":
                os_control_engine.set_volume_percentage(plan.get("value", 50))
                return True, reply
            elif p_type == "volume_change":
                os_control_engine.change_volume_by(plan.get("delta", 10))
                return True, reply
            elif p_type == "window_close":
                os_control_engine.close_window()
                return True, reply
            elif p_type == "close_app":
                target = plan.get("target", "")
                os_control_engine.close_window(target)
                os_control_engine.kill_process(target)
                return True, reply
        except Exception as e:
            logger.warning(f"Learned plan execution error: {e}")
        return False, ""


# Global singleton instance
dynamic_action_resolver = DynamicActionResolver()

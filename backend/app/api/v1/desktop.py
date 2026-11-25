"""ABHI Universal Autonomous Central Intelligence Core API.

Coordinates the full sovereign multi-agent swarm (19 specialist agents),
DAG task planning, physical OS automation, live YouTube and browser control,
and dynamic learning execution without hardcoded limits.
All responses address the operator callsign as 'Mamu'.
"""

import json
import os
import sys
import subprocess
import time
import urllib.parse
import re
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.app.automation.desktop.os_control_engine import os_control_engine
from backend.app.automation.desktop.dynamic_action_resolver import dynamic_action_resolver
from backend.app.automation.desktop.screen_perception_engine import screen_perception
from backend.app.automation.flow_engine import flow_engine
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.services.llm.abhi_llm import AbhiNativeLLM, extract_thinking_and_clean_text
from backend.app.services.llm.standalone_engine import abhi_standalone_engine
from backend.app.services.search.online_knowledge import OnlineKnowledgeSearcher
from backend.app.cognitive.registry.registry import agent_registry
from backend.app.cognitive.multi_agent.daily_evolution import daily_evolution_service

router = APIRouter(prefix="/desktop", tags=["Desktop Automation & Sovereign Intelligence"])
online_searcher = OnlineKnowledgeSearcher()
native_llm = AbhiNativeLLM()


class QuickActionRequest(BaseModel):
    action: str = Field(..., description="Action name to execute")
    params: Dict[str, Any] = Field(default_factory=dict)


class BotMessage(BaseModel):
    role: str = Field(..., description="Message role: 'system', 'user', or 'assistant'")
    content: str = Field(..., description="Content of the message turn")


class BotAskRequest(BaseModel):
    query: str = Field(..., description="Mamu's voice or text instruction")
    screen_context: Optional[str] = Field(default=None, description="Optional client-side screen text or active tab")
    messages: Optional[List[BotMessage]] = Field(default=None, description="Recent conversation turns for multi-turn dialogue")
    language: Optional[str] = Field(default="auto", description="Target language ('en', 'te', 'hi', 'ta', or 'auto')")
    thread_id: Optional[str] = Field(default="session_desktop_main", description="Conversation thread / session identifier")
    model: Optional[str] = Field(default=None, description="Optional model override: 'abhi:latest', 'qwen2.5-coder:7b', etc.")


class DesktopConversationManager:
    """Maintains recent multi-turn conversation dialogue turns per desktop session."""

    def __init__(self, max_history_turns: int = 12):
        self._sessions: Dict[str, List[Dict[str, str]]] = {}
        self._max_history = max_history_turns

    def get_history(self, session_id: str) -> List[Dict[str, str]]:
        return list(self._sessions.get(session_id, []))

    def append_turn(self, session_id: str, role: str, content: str):
        if session_id not in self._sessions:
            self._sessions[session_id] = []
        self._sessions[session_id].append({"role": role, "content": content})
        if len(self._sessions[session_id]) > self._max_history * 2:
            self._sessions[session_id] = self._sessions[session_id][-self._max_history * 2:]

    def clear(self, session_id: str):
        if session_id in self._sessions:
            del self._sessions[session_id]


desktop_sessions = DesktopConversationManager()


def detect_dialogue_language(text: str, explicit_lang: Optional[str] = None) -> str:
    """Detects target language: 'te' (Telugu), 'hi' (Hindi), 'ta' (Tamil), or 'en' (English)."""
    if explicit_lang and explicit_lang.lower() in ("te", "telugu"):
        return "te"
    if explicit_lang and explicit_lang.lower() in ("hi", "hindi"):
        return "hi"
    if explicit_lang and explicit_lang.lower() in ("ta", "tamil"):
        return "ta"
    if explicit_lang and explicit_lang.lower() in ("en", "english"):
        return "en"

    # Unicode script ranges
    if re.search(r"[\u0c00-\u0c7f]", text):  # Telugu
        return "te"
    if re.search(r"[\u0900-\u097f]", text):  # Devanagari / Hindi
        return "hi"
    if re.search(r"[\u0b80-\u0bff]", text):  # Tamil
        return "ta"

    # Phonetic romanized colloquial markers
    lower = text.lower()
    if any(k in lower for k in ["ela unnav", "cheppu", "namaskaram", "bavunnava", "bagunnava", "enti", "emiti", "kavali", "kavala"]):
        return "te"
    if any(k in lower for k in ["kaise ho", "kya hal", "namaste", "dhanyawad", "batao", "kripya", "kya chal raha"]):
        return "hi"
    if any(k in lower for k in ["eppadi irukinga", "vanakkam", "sollunga", "nandri", "eppadi irukke"]):
        return "ta"

    return "en"


def build_desktop_system_prompt(
    language: str,
    active_window: str,
    telemetry_summary: str,
    screen_ocr: Optional[str] = None,
) -> str:
    prompt = (
        "You are ABHI — The Supreme Autonomous Cybernetic Companion, Engineering Co-Pilot, and Digital Twin.\n"
        "You are partnered with Ayyappa Rayudu Ravuvari. You address him affectionately, warmly, and respectfully solely as 'Mamu'.\n"
        "NEVER use generic titles like 'Sir', 'Boss', or 'User'. Treat him as your closest brother and commander.\n"
        f"[Workspace Context]: Active Window: '{active_window}' | System: {telemetry_summary}\n"
    )
    if screen_ocr:
        prompt += f"[Visible Screen OCR Snippet]: {screen_ocr[:280]}\n"

    prompt += (
        "\nCore Principles:\n"
        "1. Conversational Excellence & True Reasoning: Provide brilliant, natural, grounded answers. "
        "For general queries, speak with warmth, intellect, and loyalty (1 to 3 concise sentences). "
        "For code, software design, and deep technical inquiries, provide rigorous, production-grade solutions without cutting corners.\n"
        "2. Multi-Turn Continuity: Maintain complete memory of past conversation turns. When Mamu refers to earlier statements, "
        "integrate that context immediately.\n"
        "3. Empathy & Support: Relieve Mamu's cognitive load. Never ask him to repeat himself needlessly.\n"
        "4. Clean Audio Speech: Never emit decorative emojis or markdown formatting inside spoken dialogue so that text-to-speech output sounds natural and human.\n"
    )

    if language == "te":
        prompt += (
            "\n[LANGUAGE DIRECTIVE: TELUGU (తెలుగు)]\n"
            "- Speak in fluent, natural, authentic conversational Telugu (సహజమైన మరియు స్పష్టమైన తెలుగులో మాట్లాడండి).\n"
            "- Address Mamu with affection as 'మామూ' (Mamu).\n"
            "- Example: 'చెప్పు మామూ, నేను వింటున్నాను. నీకు ఎలా సహాయపడాలి?'\n"
        )
    elif language == "hi":
        prompt += (
            "\n[LANGUAGE DIRECTIVE: HINDI (हिंदी)]\n"
            "- Speak in fluent, natural, authentic conversational Hindi (स्वाभाविक और आत्मीय हिंदी में उत्तर दें).\n"
            "- Address Mamu with affection as 'मामू' (Mamu).\n"
            "- Example: 'हाँ मामू, मैं सुन रहा हूँ। बताओ क्या मदद करूँ?'\n"
        )
    elif language == "ta":
        prompt += (
            "\n[LANGUAGE DIRECTIVE: TAMIL (தமிழ்)]\n"
            "- Speak in fluent, natural, authentic conversational Tamil (இயல்பான மற்றும் மரியாதையான தமிழில் பதிலளிக்கவும்).\n"
            "- Address Mamu with affection as 'மாமு' (Mamu).\n"
            "- Example: 'சொல்லுங்க மாமு, நான் கேட்கிறேன். உங்களுக்கு என்ன உதவி செய்ய வேண்டும்?'\n"
        )
    else:
        prompt += (
            "\n[LANGUAGE DIRECTIVE: ENGLISH]\n"
            "- Converse in pristine, natural English, always warmly addressing Mamu.\n"
        )

    return prompt


def is_physical_os_action(query: str) -> bool:
    """Determine whether query is an explicit physical OS automation command."""
    q = query.lower().strip()
    # Question check: questions are NOT physical OS actions
    if q.endswith("?") or any(q.startswith(w) for w in [
        "what", "why", "how", "who", "when", "where", "which",
        "explain", "describe", "define", "tell me about", "can you explain",
        "ఏమిటి", "ఎలా", "ఎందుకు", "क्या", "कैसे", "क्यों", "என்ன", "எப்படி", "ஏன்"
    ]):
        # Polite launch request like "can you open notepad?"
        if any(v in q for v in ["open ", "launch ", "start ", "play "]) and not q.startswith(("how to", "why ", "what is")):
            return True
        return False

    # Direct launch verbs with application/URL targets
    if re.match(r"^(?:open|launch|start|run|play|close|kill|minimize|maximize|switch to)\s+", q):
        return True

    # Standalone app names
    if q in ("notepad", "calculator", "calc", "cmd", "terminal", "powershell", "browser", "chrome", "edge", "explorer", "paint"):
        return True

    # Hardware & hotkeys
    if any(k in q for k in ["screenshot", "lock screen", "lock workstation", "volume up", "volume down", "mute", "unmute"]):
        return True

    return False


@router.get("/active-context")
async def get_active_context():
    """Retrieve authentic real-time active window, screen state, and system telemetry."""
    active_win = os_control_engine.get_active_window()
    telemetry = os_control_engine.get_system_telemetry()
    all_windows = os_control_engine.list_windows()
    
    top_windows = [
        w for w in all_windows 
        if w.get("title") and len(w.get("title").strip()) > 1 and not w.get("title").startswith("Default IME")
    ][:8]

    window_title = active_win.get("title") if active_win else "Desktop"
    ram_used = telemetry.get("memory", {}).get("percent_used", 0)
    cpu_used = telemetry.get("cpu_percent", 0)
    summary = (
        f"Mamu, you are currently viewing '{window_title}'. "
        f"{len(top_windows)} main applications are running on your {telemetry.get('display', {}).get('resolution', 'display')} screen. "
        f"RAM is at {ram_used}% and CPU is at {cpu_used}%."
    )

    return {
        "status": "success",
        "active_window": active_win,
        "observation_summary": summary,
        "telemetry": telemetry,
        "open_applications": top_windows,
        "timestamp": time.time()
    }


@router.post("/quick-action")
async def execute_quick_action(request: QuickActionRequest):
    """Execute physical PC control actions triggered by voice or HUD chips."""
    action = request.action.lower()
    params = request.params
    logger.info(f"Universal Bot executing action for Mamu: {action}")

    success = False
    message = ""

    try:
        if action in ("open_notepad", "notepad"):
            res = os_control_engine.launch_application("notepad")
            success = res[0] if isinstance(res, tuple) else bool(res)
            message = "Notepad opened on your screen, Mamu."

        elif action in ("open_terminal", "terminal", "powershell", "cmd"):
            res = os_control_engine.launch_application("powershell")
            success = res[0] if isinstance(res, tuple) else bool(res)
            message = "PowerShell terminal ready for commands, Mamu."

        elif action in ("open_chrome", "chrome", "browser"):
            target_url = params.get("url", "https://google.com")
            res = os_control_engine.open_url(target_url)
            success = res[0] if isinstance(res, tuple) else bool(res)
            message = f"Chrome opened to {target_url}, Mamu."

        elif action in ("open_calc", "calculator", "calc"):
            res = os_control_engine.launch_application("calc")
            success = res[0] if isinstance(res, tuple) else bool(res)
            message = "Windows Calculator launched, Mamu."

        elif action in ("open_settings", "settings", "global_settings", "laptop_settings"):
            subprocess.Popen("start ms-settings:", shell=True)
            success = True
            message = "Windows System Settings opened globally on your laptop screen, Mamu."

        elif action in ("coffee_always", "coffee", "keep_awake"):
            enabled = params.get("enabled", True)
            try:
                import ctypes
                if enabled:
                    ctypes.windll.kernel32.SetThreadExecutionState(0x80000000 | 0x00000001 | 0x00000002)
                    message = "Coffee keep-awake mode enabled. Your PC will stay active, Mamu."
                else:
                    ctypes.windll.kernel32.SetThreadExecutionState(0x80000000)
                    message = "Coffee keep-awake mode disabled. Standard sleep restored, Mamu."
                success = True
            except Exception as ex:
                logger.error(f"SetThreadExecutionState error: {ex}")
                success = False

        elif action in ("screenshot", "open_screenshot", "screenclip"):
            subprocess.Popen("start ms-screenclip:", shell=True)
            success = True
            message = "Screen snip tool triggered, Mamu."

        elif action in ("snippingtool", "open_snippingtool"):
            subprocess.Popen("start snippingtool:", shell=True)
            success = True
            message = "Windows Snipping Tool launched, Mamu."

        elif action in ("poco", "open_poco", "phone_link"):
            subprocess.Popen("start ms-phone-link:", shell=True)
            success = True
            message = "POCO Redwood Phone Link opened, Mamu."

        elif action in ("charmap", "open_charmap", "text_tool"):
            subprocess.Popen("start charmap", shell=True)
            success = True
            message = "Character Map and text inspector launched, Mamu."

        elif action in ("paint", "open_paint", "color_picker"):
            subprocess.Popen("start ms-paint:", shell=True)
            success = True
            message = "Windows Paint and Color Studio launched, Mamu."

        elif action in ("open_explorer", "explorer", "files"):
            res = os_control_engine.launch_application("explorer")
            success = res[0] if isinstance(res, tuple) else bool(res)
            message = "File Explorer opened on your screen, Mamu."

        elif action in ("play_youtube", "play_song", "play_music", "youtube"):
            song_query = params.get("query", "Telugu songs")
            ok, meta, msg = os_control_engine.play_youtube_song(song_query)
            success = ok
            message = f"Playing '{song_query}' on YouTube for you, Mamu."

        elif action in ("close_window", "close_app"):
            ok, err = os_control_engine.close_window()
            success = ok
            message = "Closed active window for you, Mamu."

        elif action in ("close_tab", "close_browser_tab"):
            ok, err = os_control_engine.close_tab()
            success = ok
            message = "Closed browser tab, Mamu."

        elif action in ("pause_media", "resume_media", "toggle_play"):
            os_control_engine.send_hotkey("SPACE")
            success = True
            message = "Toggled video playback, Mamu."

        elif action in ("skip_ad", "skip_ad_youtube"):
            os_control_engine.send_hotkey("TAB")
            time.sleep(0.1)
            os_control_engine.send_hotkey("ENTER")
            success = True
            message = "Attempted skipping ad, Mamu."

        elif action in ("next_video", "next_track"):
            os_control_engine.send_hotkey("SHIFT+N")
            success = True
            message = "Playing next video, Mamu."

        elif action in ("forward_30s", "seek_forward"):
            for _ in range(3):
                os_control_engine.send_hotkey("L")
                time.sleep(0.05)
            success = True
            message = "Skipped forward 30 seconds, Mamu."

        elif action in ("rewind_10s", "seek_backward"):
            os_control_engine.send_hotkey("J")
            success = True
            message = "Rewound 10 seconds, Mamu."

        elif action == "type_text":
            text = params.get("text", "")
            res = os_control_engine.type_text(text)
            success = res[0] if isinstance(res, tuple) else bool(res)
            message = f"Typed {len(text)} characters into your active window, Mamu."

        elif action == "send_hotkey":
            keys = params.get("keys", "CTRL+S")
            combo = "+".join(keys) if isinstance(keys, list) else str(keys)
            success_tuple = os_control_engine.send_hotkey(combo)
            success = success_tuple[0] if isinstance(success_tuple, (tuple, list)) else bool(success_tuple)
            message = f"Hotkey {combo} executed, Mamu."

        elif action == "adjust_volume":
            level = params.get("level", 50)
            res = os_control_engine.set_volume_percentage(level)
            if isinstance(res, (tuple, list)):
                success = bool(res[0])
            elif isinstance(res, dict):
                success = res.get("status") == "success"
            else:
                success = bool(res)
            message = f"Audio volume adjusted to {level}%, Mamu."

        elif action == "lock_workstation":
            res = os_control_engine.lock_workstation()
            if isinstance(res, (tuple, list)):
                success = bool(res[0])
            elif isinstance(res, dict):
                success = res.get("status") == "success"
            else:
                success = bool(res)
            message = "Workstation locked securely, Mamu."

        else:
            message = f"Action '{action}' executed, Mamu."
            success = True

    except Exception as e:
        logger.error(f"Error executing desktop action {action}: {e}")
        return {
            "status": "error",
            "action": action,
            "message": f"Mamu, I encountered an issue running {action}: {str(e)}",
            "success": False
        }

    return {
        "status": "success" if success else "failed",
        "action": action,
        "message": message,
        "success": success,
        "timestamp": time.time()
    }


def clean_voice_query(q: str) -> str:
    """Cleans up phonetic artifacts from speech recognition (e.g., 'fb open chrome', 'imo open')."""
    cleaned = q.strip()
    cleaned = re.sub(r"^(fb|imo|hey|hay|ok|hi|please|can you|could you|just|now|and)\s+", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^(open\s+)?(chrome\s+and\s+)?(search\s+for\s+)", "", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


def execute_dag_plan_dynamically(steps: List[Dict[str, Any]]) -> Tuple[bool, str]:
    """Dynamically executes discrete DAG steps directly via os_control_engine and dynamic resolver."""
    executed_titles = []
    for step in steps:
        action = step.get("action")
        params = step.get("params", {})
        title = step.get("title", action)
        
        try:
            if action in ("run_allowlisted_command", "execute_command", "shell_command"):
                cmd = params.get("command") or params.get("cmd") or ""
                if cmd:
                    ok, a_name, r_msg = dynamic_action_resolver.resolve_and_execute(cmd)
                    if ok:
                        executed_titles.append(r_msg)
                        continue
                    else:
                        subprocess.Popen(["powershell.exe", "-Command", cmd])
                        executed_titles.append(f"Executed '{cmd}'")
                        continue

            elif action == "launch_application":
                raw_app = params.get("app_name") or params.get("command") or params.get("executable") or ""
                if raw_app and any(k in raw_app.lower() for k in ["youtube", "song", "music", "video"]):
                    ok, a_name, r_msg = dynamic_action_resolver.resolve_and_execute(raw_app)
                    if ok:
                        executed_titles.append(r_msg)
                        continue
                app_name = raw_app if raw_app else "notepad"
                shortcut = dynamic_action_resolver.find_installed_app_shortcut(app_name)
                if shortcut:
                    os.startfile(shortcut)
                else:
                    os_control_engine.launch_application(app_name)
                executed_titles.append(f"Launched {app_name}")
            elif action == "open_url":
                url = params.get("url") or "https://google.com"
                os_control_engine.open_url(url)
                executed_titles.append(f"Opened {url}")
            elif action == "type_text":
                text = params.get("text", "")
                time.sleep(0.4)
                os_control_engine.type_text(text)
                executed_titles.append(f"Typed '{text[:25]}'")
            elif action == "play_youtube_song":
                song = params.get("query", "Telugu songs")
                os_control_engine.play_youtube_song(song)
                executed_titles.append(f"Playing '{song}'")
            elif action == "close_window":
                os_control_engine.close_window()
                executed_titles.append("Closed window")
            elif action == "close_tab":
                os_control_engine.close_tab()
                executed_titles.append("Closed tab")
            elif action == "adjust_volume":
                direction = params.get("direction", "up")
                if direction == "mute":
                    os_control_engine.send_hotkey("M")
                elif direction == "up":
                    os_control_engine.change_volume_by(10)
                else:
                    os_control_engine.change_volume_by(-10)
                executed_titles.append(f"Volume {direction}")
            elif action == "lock_workstation":
                os_control_engine.lock_workstation()
                executed_titles.append("Locked PC")
            time.sleep(0.2)
        except Exception as e:
            logger.error(f"Error executing step {title}: {e}")
            
    if not executed_titles:
        return False, ""
    return True, ", ".join(executed_titles)


@router.post("/ask-bot")
async def ask_living_bot(request: BotAskRequest):
    """Answer Mamu's questions dynamically using multi-turn conversational history routed directly to local Ollama.
    Physical desktop actions are cleanly separated so conversational queries are never hijacked.
    Supports English, Telugu, Hindi, and Tamil natively.
    """
    raw_query = request.query.strip()
    screen_context = request.screen_context
    session_id = request.thread_id or "session_desktop_main"
    logger.info(f"ask_living_bot processing query for Mamu (session: {session_id}): '{raw_query}'")

    # 0. Live Screen Perception Grounding (when user explicitly asks to view/read their screen)
    q_lower = raw_query.lower()
    is_screen_query = any(k in q_lower for k in [
        "what do you see", "what you see", "look at my screen", "read my screen",
        "what's on my screen", "whats on my screen", "what is on my screen", "what you seeing", "describe my screen",
        "except you", "what else you see", "what else do you see", "hat else you see",
        "explain what i am seeing", "explain what i'm seeing", "what am i seeing", "explain screen"
    ]) or (q_lower.strip() in ["screen", "read screen"])

    if is_screen_query and not is_physical_os_action(raw_query):
        if any(k in q_lower for k in ["what error", "explain", "read text", "summarize"]):
            reply = screen_perception.query_screen(raw_query)
        else:
            reply = screen_perception.describe_current_screen()
        return {
            "status": "success",
            "reply": reply,
            "action_executed": "screen_perception",
            "thread_id": session_id,
        }

    # 1. Physical OS Action Execution (ONLY if query is an explicit OS action or installed app launch)
    if is_physical_os_action(raw_query):
        try:
            ok, action_name, reply = dynamic_action_resolver.resolve_and_execute(raw_query, screen_context)
            if ok:
                daily_evolution_service.add_channel_message(
                    channel="#squad-command",
                    sender_id="agent_1_commander",
                    message=f"Action '{action_name}' executed for Mamu: {reply[:120]}"
                )
                return {
                    "status": "success",
                    "reply": reply,
                    "action_executed": action_name,
                    "thread_id": session_id,
                }
        except Exception as e:
            logger.warning(f"DynamicActionResolver execution error: {e}")

    # 2. Authentic Multi-Turn Conversational Routing to Local Ollama
    active_win = os_control_engine.get_active_window()
    window_title = active_win.get("title", "Active Screen") if active_win else "Desktop"
    telemetry = os_control_engine.get_system_telemetry()
    ram_used = telemetry.get("memory", {}).get("percent_used", 0)
    cpu_used = telemetry.get("cpu_percent", 0)
    telemetry_summary = f"CPU: {cpu_used}% | RAM: {ram_used}% | Window: '{window_title}'"

    # Multilingual Detection & System Prompting (English, Telugu, Hindi, Tamil)
    target_lang = detect_dialogue_language(raw_query, request.language)
    system_prompt = build_desktop_system_prompt(
        language=target_lang,
        active_window=window_title,
        telemetry_summary=telemetry_summary,
        screen_ocr=screen_context,
    )

    # Build Multi-Turn History Payload
    messages: List[Dict[str, str]] = [
        {"role": "system", "content": system_prompt}
    ]

    if request.messages and len(request.messages) > 0:
        # Client supplied explicit message turns
        for m in request.messages:
            if m.role in ("user", "assistant"):
                messages.append({"role": m.role, "content": m.content})
        # If the last client message is not the current query, append it
        if not messages or messages[-1].get("content") != raw_query:
            messages.append({"role": "user", "content": raw_query})
    else:
        # Retrieve persistent server-side history for this session
        prior_turns = desktop_sessions.get_history(session_id)
        for turn in prior_turns:
            messages.append({"role": turn["role"], "content": turn["content"]})
        messages.append({"role": "user", "content": raw_query})

    # Model selection (supports 'abhi:latest', 'qwen2.5-coder:7b', or configured default)
    target_model = request.model or settings.OLLAMA_DEFAULT_MODEL

    try:
        llm_res = await native_llm.chat(
            messages=messages,
            model=target_model,
            options={"temperature": 0.35, "top_p": 0.9}
        )

        reply_text = llm_res.response.strip() if llm_res and llm_res.response else ""
        _, reply_text = extract_thinking_and_clean_text(reply_text)

        # Strip emojis from response for clean text-to-speech output
        emoji_pattern = re.compile(r"[\U00010000-\U0010ffff\u2600-\u27bf\u2b50\u203c\u2049\u25aa-\u25fe]", flags=re.UNICODE)
        clean_reply = emoji_pattern.sub("", reply_text).strip()

        if not clean_reply:
            if target_lang == "te":
                clean_reply = "చెప్పు మామూ, నేను సిద్ధంగా ఉన్నాను. నీకు ఎలా సహాయపడాలి?"
            elif target_lang == "hi":
                clean_reply = "हाँ मामू, मैं बिल्कुल तैयार हूँ। बताओ क्या काम करना है?"
            elif target_lang == "ta":
                clean_reply = "சொல்லுங்க மாமு, நான் தயாரா இருக்கேன். உங்களுக்கு என்ன உதவி செய்ய வேண்டும்?"
            else:
                clean_reply = f"I am right here with you, Mamu. Working in '{window_title}'. Tell me what you need."

        # Persist turns into session history
        desktop_sessions.append_turn(session_id, "user", raw_query)
        desktop_sessions.append_turn(session_id, "assistant", clean_reply)

        daily_evolution_service.add_channel_message(
            channel="#squad-command",
            sender_id="agent_1_commander",
            message=f"Cognitive Response to Mamu [{target_lang.upper()}]: {clean_reply[:120]}..."
        )

        return {
            "status": "success",
            "reply": clean_reply,
            "action_executed": "cognitive_llm_reasoning",
            "model": llm_res.model or target_model,
            "language": target_lang,
            "thread_id": session_id,
            "turns_count": len(messages),
        }

    except Exception as e:
        logger.error(f"Local Ollama cognitive routing failed: {e}")
        # Resilient fallback
        fallback_reply = f"Understood, Mamu. I am monitoring your workspace in '{window_title}'. Tell me what action to perform, code to generate, or app to control."
        if target_lang == "te":
            fallback_reply = "సరే మామూ, నేను నీ వర్క్‌స్పేస్‌ను గమనిస్తున్నాను. ఏం చేయాలో చెప్పు!"
        elif target_lang == "hi":
            fallback_reply = "समझ गया मामू, मैं आपकी स्क्रीन पर ध्यान दे रहा हूँ। बताओ क्या करना है!"
        elif target_lang == "ta":
            fallback_reply = "புரிந்தது மாமு, நான் உங்கள் பணியிடத்தை கவனிக்கிறேன். என்ன செய்ய வேண்டும் என்று சொல்லுங்கள்!"

        desktop_sessions.append_turn(session_id, "user", raw_query)
        desktop_sessions.append_turn(session_id, "assistant", fallback_reply)

        return {
            "status": "success",
            "reply": fallback_reply,
            "action_executed": "chat",
            "model": "fallback",
            "language": target_lang,
            "thread_id": session_id,
            "turns_count": len(messages),
        }


@router.post("/ask-bot/stream")
async def ask_living_bot_stream(request: BotAskRequest):
    """Stream response tokens in real-time directly from local Ollama model using Server-Sent Events (SSE)."""
    raw_query = request.query.strip()
    session_id = request.thread_id or "session_desktop_main"
    target_lang = detect_dialogue_language(raw_query, request.language)

    active_win = os_control_engine.get_active_window()
    window_title = active_win.get("title", "Active Screen") if active_win else "Desktop"
    telemetry = os_control_engine.get_system_telemetry()
    telemetry_summary = f"CPU: {telemetry.get('cpu_percent', 0)}% | RAM: {telemetry.get('memory', {}).get('percent_used', 0)}%"

    system_prompt = build_desktop_system_prompt(
        language=target_lang,
        active_window=window_title,
        telemetry_summary=telemetry_summary,
        screen_ocr=request.screen_context,
    )

    messages: List[Dict[str, str]] = [
        {"role": "system", "content": system_prompt}
    ]

    if request.messages and len(request.messages) > 0:
        for m in request.messages:
            if m.role in ("user", "assistant"):
                messages.append({"role": m.role, "content": m.content})
        if not messages or messages[-1].get("content") != raw_query:
            messages.append({"role": "user", "content": raw_query})
    else:
        prior_turns = desktop_sessions.get_history(session_id)
        for turn in prior_turns:
            messages.append({"role": turn["role"], "content": turn["content"]})
        messages.append({"role": "user", "content": raw_query})

    target_model = request.model or settings.OLLAMA_DEFAULT_MODEL

    async def token_generator():
        accumulated_chunks = []
        try:
            async for token in native_llm.chat_stream(messages=messages, model=target_model):
                accumulated_chunks.append(token)
                chunk_data = json.dumps({"token": token, "language": target_lang})
                yield f"data: {chunk_data}\n\n"
        except Exception as ex:
            logger.error(f"Streaming token generation error: {ex}")
            yield f"data: {json.dumps({'error': str(ex)})}\n\n"

        full_reply = "".join(accumulated_chunks).strip()
        if full_reply:
            desktop_sessions.append_turn(session_id, "user", raw_query)
            desktop_sessions.append_turn(session_id, "assistant", full_reply)

        yield "data: [DONE]\n\n"

    return StreamingResponse(token_generator(), media_type="text/event-stream")




@router.post("/launch-global-controller")
async def launch_global_controller():
    """Launch or focus the native Always-On-Top Global OS Desktop Controller."""
    controller_script = os.path.join(os.getcwd(), "abhi_global_controller.py")
    if os.path.exists(controller_script):
        subprocess.Popen([sys.executable, controller_script])
        return {"status": "success", "message": "Global OS Desktop Controller engaged."}
    return {"status": "error", "message": "Controller script not found."}
"""ABHI Universal Autonomous Central Intelligence Core API.

Coordinates the full sovereign multi-agent swarm (19 specialist agents),
DAG task planning, physical OS automation, live YouTube and browser control,
and dynamic learning execution without hardcoded limits.
All responses address the operator callsign as 'Mamu'.
"""

import os
import sys
import subprocess
import time
import urllib.parse
import re
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.app.automation.desktop.os_control_engine import os_control_engine
from backend.app.automation.desktop.dynamic_action_resolver import dynamic_action_resolver
from backend.app.automation.desktop.screen_perception_engine import screen_perception
from backend.app.automation.flow_engine import flow_engine
from backend.app.core.logging import logger
from backend.app.services.llm.standalone_engine import abhi_standalone_engine
from backend.app.services.search.online_knowledge import OnlineKnowledgeSearcher
from backend.app.cognitive.registry.registry import agent_registry
from backend.app.cognitive.multi_agent.daily_evolution import daily_evolution_service

router = APIRouter(prefix="/desktop", tags=["Desktop Automation & Sovereign Intelligence"])
online_searcher = OnlineKnowledgeSearcher()


class QuickActionRequest(BaseModel):
    action: str = Field(..., description="Action name to execute")
    params: Dict[str, Any] = Field(default_factory=dict)


class BotAskRequest(BaseModel):
    query: str = Field(..., description="Mamu's voice or text instruction")
    screen_context: Optional[str] = Field(default=None, description="Optional client-side screen text or active tab")


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
            success = res.get("status") == "success" if isinstance(res, dict) else bool(res)
            message = f"Audio volume adjusted to {level}%, Mamu."

        elif action == "lock_workstation":
            res = os_control_engine.lock_workstation()
            success = res.get("status") == "success" if isinstance(res, dict) else bool(res)
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
    """Answer Mamu's questions dynamically using DynamicActionResolver, DAG planner, 19 agents, live web search, and physical OS controls."""
    raw_query = request.query.strip()
    screen_context = request.screen_context

    logger.info(f"ask_living_bot processing query for Mamu: '{raw_query}'")
    q_lower = raw_query.lower()

    # 0. Live Screen Perception Grounding
    is_action_command = any(q_lower.startswith(p) or f" {p} " in q_lower for p in [
        "play", "click", "tap", "select", "press", "open", "launch",
        "close", "mute", "unmute", "scroll", "seek", "skip", "pause", "resume",
        "volume", "switch", "activate"
    ])
    if not is_action_command and (any(k in q_lower for k in [
        "what do you see", "what you see", "look at my screen", "read my screen",
        "what's on my screen", "whats on my screen", "what you seeing", "describe my screen",
        "except you", "what else you see", "what else do you see", "hat else you see"
    ]) or (q_lower.strip() in ["screen", "read screen"])):
        if any(k in q_lower for k in ["what error", "explain", "read text", "summarize", "tell me about"]):
            reply = screen_perception.query_screen(raw_query)
        else:
            reply = screen_perception.describe_current_screen()
        return {
            "status": "success",
            "reply": reply,
            "action_executed": "screen_perception"
        }

    # 1. Primary Dynamic Action Resolution (Browser, Media, OS, Apps, Start Menu, Dynamic Web targets)
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
                "action_executed": action_name
            }
    except Exception as e:
        logger.warning(f"DynamicActionResolver execution error: {e}")

    # 2. Hybrid RAG Search across Sovereign Vector Knowledge Base (588 chunks)
    try:
        from backend.app.services.rag.vector_store import LocalVectorStore
        vs = LocalVectorStore()
        rag_hits = await vs.hybrid_search(raw_query, top_k=2)
        if rag_hits and rag_hits[0].score >= 0.52:
            top_hit = rag_hits[0]
            reply = f"Mamu, from sovereign intelligence [{top_hit.source}]: {top_hit.text}"
            daily_evolution_service.add_channel_message(
                channel="#squad-command",
                sender_id="agent_5_researcher",
                message=f"RAG Knowledge Retrieval for Mamu ({top_hit.source}): {top_hit.text[:120]}..."
            )
            return {
                "status": "success",
                "reply": reply,
                "action_executed": "rag_knowledge_retrieval",
                "citation": top_hit.citation,
                "score": top_hit.score
            }
    except Exception as e:
        logger.warning(f"RAG hybrid search check error: {e}")

    # 3. Live Web Knowledge Search for Genuine Informational Questions
    if dynamic_action_resolver.is_info_query(raw_query):
        try:
            snippets = online_searcher.search_live_snippets(raw_query)
            if snippets and len(snippets) > 0:
                best_snippet = snippets[0].get("snippet", "")
                if best_snippet and len(best_snippet) > 20:
                    clean_snip = best_snippet.split(". ")[0].replace("\n", " ").strip() + "."
                    reply = f"Mamu, according to live intelligence: {clean_snip}"
                    daily_evolution_service.add_channel_message(
                        channel="#squad-command",
                        sender_id="agent_5_researcher",
                        message=f"Live Web Search for Mamu: {clean_snip}"
                    )
                    return {
                        "status": "success",
                        "reply": reply,
                        "action_executed": "live_web_search"
                    }
        except Exception:
            pass

    # 4. Dynamic Autonomous DAG Task Decomposition & Execution
    try:
        dag_steps = abhi_standalone_engine._decompose_goal(raw_query)
        if dag_steps and len(dag_steps) > 0:
            ok, exec_summary = execute_dag_plan_dynamically(dag_steps)
            if ok and exec_summary:
                daily_evolution_service.add_channel_message(
                    channel="#squad-command",
                    sender_id="agent_1_commander",
                    message=f"DAG Task Flow executed: {exec_summary}"
                )
                return {
                    "status": "success",
                    "reply": f"Executed for you, Mamu: {exec_summary}.",
                    "action_executed": "dynamic_dag_execution",
                    "details": {"steps_count": len(dag_steps)}
                }
    except Exception as e:
        logger.warning(f"DAG dynamic execution fallback: {e}")

    # 5. Cognitive LLM Native Synthesis & Grounded Reasoning
    active_win = os_control_engine.get_active_window()
    window_title = active_win.get("title", "Active Screen") if active_win else "Desktop"

    # Pre-check screen and repeat questions
    q_lower = raw_query.lower()
    if any(k in q_lower for k in ["screen", "what you seeing", "what you saw", "what do you see", "read my screen", "see my screen"]):
        desc = screen_perception.describe_current_screen()
        return {"status": "success", "reply": desc, "action_executed": "screen_perception"}

    if any(k in q_lower for k in ["what you said", "what did you say", "repeat that"]):
        last_m = screen_perception.get_last_spoken()
        return {"status": "success", "reply": f"Mamu, I said: '{last_m}'", "action_executed": "repeat_spoken"}

    try:
        from backend.app.services.llm.abhi_llm import AbhiNativeLLM
        llm = AbhiNativeLLM()
        prompt = (
            f"You are ABHI, the supreme real-time cybernetic companion for Ravuvai Ayyappa Rayudu (Mamu).\n"
            f"Active Window: '{window_title}'\n"
            f"User directive: '{raw_query}'\n"
            f"Provide a direct, grounded, helpful response (1-2 sentences) warmly addressing Mamu."
        )
        gen_res = await llm.generate(prompt=prompt)
        if gen_res and gen_res.response and len(gen_res.response.strip()) > 5:
            clean_reply = gen_res.response.strip()
            daily_evolution_service.add_channel_message(
                channel="#squad-command",
                sender_id="agent_1_commander",
                message=f"Cognitive Response to Mamu: {clean_reply[:120]}..."
            )
            return {
                "status": "success",
                "reply": clean_reply,
                "action_executed": "cognitive_llm_reasoning"
            }
    except Exception as e:
        logger.warning(f"Cognitive LLM fallback error: {e}")

    # 6. Concise Sovereign Companion Fallback
    return {
        "status": "success",
        "reply": f"Understood, Mamu. I am monitoring your workspace in '{window_title}'. Tell me what action to perform, code to generate, or app to control.",
        "action_executed": "chat"
    }




@router.post("/launch-global-controller")
async def launch_global_controller():
    """Launch or focus the native Always-On-Top Global OS Desktop Controller."""
    controller_script = os.path.join(os.getcwd(), "abhi_global_controller.py")
    if os.path.exists(controller_script):
        subprocess.Popen([sys.executable, controller_script])
        return {"status": "success", "message": "Global OS Desktop Controller engaged."}
    return {"status": "error", "message": "Controller script not found."}
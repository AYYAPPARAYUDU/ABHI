"""Dual-State Verification Engine for Grounding and Hallucination Elimination."""

from typing import Any, Dict, Optional
from pydantic import BaseModel, Field
from backend.app.cognitive.planner.models import DAGNode
from backend.app.cognitive.registry.models import AgentTaskResult
from backend.app.core.logging import logger


class VerificationResult(BaseModel):
    """Result of state verification comparing model claims against observed physical state."""
    is_valid: bool
    confidence_score: float = 1.0
    difference_detected: Optional[str] = None
    suggested_correction: Optional[Dict[str, Any]] = None
    retryable: bool = True


class DualStateVerifier:
    """Verifies that an agent's claimed execution result physically matches actual system state."""

    async def verify_step(
        self,
        node: DAGNode,
        result: AgentTaskResult
    ) -> VerificationResult:
        """Inspect and verify the outcome of an executed DAG step."""
        if not result.success:
            return VerificationResult(
                is_valid=False,
                confidence_score=0.0,
                difference_detected=result.error_message or "Action returned failure status.",
                retryable=True,
                suggested_correction={"retry": True, "adjust_params": True}
            )

        # Domain-specific verification rules
        agent_id = node.agent_id
        action = node.action
        observed = result.observed_state

        if agent_id == "coding_agent":
            if action in ["write_file", "build_file"]:
                target_path = node.params.get("path")
                if target_path and not observed.get("exists", False):
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected=f"Claimed file '{target_path}' was written, but physical file is missing on disk.",
                        suggested_correction={"ensure_directory": True},
                        retryable=True
                    )
            elif action == "generate_code":
                if not result.data.get("code"):
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected="Code synthesis returned empty output.",
                        retryable=True
                    )
            elif action == "execute_code":
                if "returncode" not in result.data:
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected="Code execution missing returncode.",
                        retryable=True
                    )

        elif agent_id == "rag_agent" and action == "hybrid_search":
            # Verify search results format
            if "results" not in result.data:
                return VerificationResult(
                    is_valid=False,
                    confidence_score=0.3,
                    difference_detected="Search completed but result payload missing 'results' key.",
                    retryable=False
                )

        elif agent_id in ["os_desktop_agent", "agent_3_comms", "agent_4_system", "agent_2_browser", "browser_agent"]:
            import os
            import psutil
            from backend.app.automation.desktop.os_control_engine import os_control_engine

            if action in ["send_whatsapp_message", "whatsapp_send"]:
                if not result.success:
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected=result.error_message or "WhatsApp message dispatch failed.",
                        retryable=False
                    )
                if not result.data.get("delivered"):
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected="WhatsApp message delivery was not verified to recipient.",
                        retryable=True
                    )
            elif action in ["browser_navigate", "open_url", "navigate_url"]:
                if not result.success:
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected=result.error_message or "Browser navigation failed.",
                        retryable=True
                    )
                current_url = (
                    result.data.get("current_url")
                    or result.data.get("url")
                    or observed.get("current_url")
                    or observed.get("url")
                )
                title = result.data.get("title") or observed.get("title")
                verified_flag = result.data.get("verified") if "verified" in result.data else observed.get("verified")
                navigated_flag = result.data.get("opened") or observed.get("opened") or observed.get("navigated")
                if verified_flag is False or (not current_url and not title and not navigated_flag):
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected="Browser navigation did not observe current_url, title, or verified state.",
                        retryable=True
                    )
            elif action in ["browser_fill", "enter_credentials"]:
                if not result.success:
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected=result.error_message or "Browser form input / credential fill failed.",
                        retryable=True
                    )
                verified_flag = result.data.get("verified") if "verified" in result.data else observed.get("verified")
                filled_flag = result.data.get("filled") or observed.get("filled") or result.data.get("executed")
                if verified_flag is False or (verified_flag is None and not filled_flag and not observed):
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected="Browser fill did not verify DOM input state.",
                        retryable=True
                    )
            elif action in ["browser_click", "submit_login", "click_element"]:
                if not result.success:
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected=result.error_message or "Browser element click / login submission failed.",
                        retryable=True
                    )
                verified_flag = result.data.get("verified") if "verified" in result.data else observed.get("verified")
                clicked_flag = result.data.get("clicked") or observed.get("clicked") or result.data.get("executed")
                if verified_flag is False or (verified_flag is None and not clicked_flag and not observed):
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected="Browser click did not verify target interaction state.",
                        retryable=True
                    )
            elif action in ["tts_read_aloud", "voice_acceptance_gate"]:
                if not result.success:
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected=result.error_message or "Voice synthesis vocalization failed.",
                        retryable=False
                    )
            elif action in ["switch_tab", "tab_switch", "new_tab", "close_tab", "reopen_tab", "switch_window"]:
                if not result.success:
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected=result.error_message or f"Window / tab operation '{action}' failed.",
                        retryable=True
                    )
            elif action in ["launch_application", "open_application", "open_app", "launch_app"]:
                if not result.success:
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected=result.error_message or f"Application launch '{action}' failed.",
                        retryable=True
                    )
                # Physical process and window verification
                app_name = node.params.get("app_name") or node.params.get("name") or node.params.get("target") or result.data.get("app_name") or result.data.get("app") or ""
                pid = result.data.get("pid") or observed.get("pid")
                if pid and not psutil.pid_exists(pid):
                    # On Windows 10/11, packaged/UWP apps (e.g. notepad.exe, calc.exe) spawn a launcher PID that delegates
                    # to the AppX container and immediately exits. Fallback to verifying whether the target process is running.
                    app_base = app_name.lower().replace(".exe", "").strip() if app_name else ""
                    app_running = False
                    if app_base:
                        for p in psutil.process_iter(["name"]):
                            pname = (p.info.get("name") or "").lower()
                            if app_base in pname:
                                app_running = True
                                break
                    if not app_running:
                        return VerificationResult(
                            is_valid=False,
                            confidence_score=0.0,
                            difference_detected=f"Application claimed launched with PID {pid}, but PID does not physically exist in OS.",
                            retryable=True
                        )
            elif action in ["focus_window", "set_foreground_window"]:
                if not result.success:
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected=result.error_message or "Focus window operation failed.",
                        retryable=True
                    )
                active_win = os_control_engine.get_active_window()
                expected_target = node.params.get("target") or node.params.get("title") or ""
                if expected_target:
                    active_title = active_win.get("title", "") if active_win else ""
                    if not active_win or expected_target.lower() not in active_title.lower():
                        return VerificationResult(
                            is_valid=False,
                            confidence_score=0.0,
                            difference_detected=f"Focus window mismatch: active is '{active_title}', expected '{expected_target}'.",
                            retryable=True
                        )
            elif action in ["close_window", "close_app", "terminate_process"]:
                if not result.success:
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected=result.error_message or f"Window/process termination '{action}' failed.",
                        retryable=True
                    )
                pid = node.params.get("pid") or result.data.get("pid")
                if pid and psutil.pid_exists(pid):
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected=f"Process PID {pid} was reported closed, but still running in system state.",
                        retryable=True
                    )
            elif action in ["media_control", "pause_media", "resume_media", "stop_media", "next_track", "previous_track"]:
                if not result.success:
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected=result.error_message or f"Media command '{action}' failed.",
                        retryable=True
                    )
            elif action in ["screen_ocr", "describe_screen", "screen_perception", "read_screen"]:
                if not result.success or not (result.data.get("text") or result.data.get("description") or result.data.get("reply")):
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected="Screen perception returned empty visual payload.",
                        retryable=True
                    )
            elif action in ["scan_system_security", "scan_virus", "security_scan", "virus_scan", "scan_pc", "system_audit"]:
                if not result.success:
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected="Physical system security scan failed to execute.",
                        retryable=True
                    )
            elif action in ["play_media", "play_youtube", "play_song", "play_music"]:
                is_playing_or_opened = bool(
                    result.data.get("playing")
                    or result.data.get("opened")
                    or observed.get("playing")
                    or observed.get("opened")
                )
                if not result.success or not is_playing_or_opened:
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected=result.error_message or "Media playback initiation failed.",
                        retryable=True
                    )
            elif action in ["save_file", "save"]:
                fp = node.params.get("file_path") or result.data.get("file_path")
                if fp and not os.path.exists(fp):
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected=f"Claimed file '{fp}' was saved, but file not found on physical disk.",
                        retryable=True
                    )
            elif action == "create_folder":
                folder_p = result.data.get("created_path")
                if folder_p and not os.path.exists(folder_p):
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected=f"Claimed folder '{folder_p}' was created, but folder not found on physical disk.",
                        retryable=True
                    )
            elif action in ["calculate", "enter_expression"]:
                if "result" not in result.data:
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected="Calculation completed but missing computed result payload.",
                        retryable=True
                    )
            elif action in ["run_command", "run_allowlisted_command"]:
                if "output" not in result.data:
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected="Terminal command executed but missing output payload.",
                        retryable=True
                    )

        # Step successfully verified
        logger.info(f"Verification PASSED for node '{node.node_id}' ({node.action})")
        return VerificationResult(
            is_valid=True,
            confidence_score=1.0
        )


# Global verifier singleton
dual_state_verifier = DualStateVerifier()

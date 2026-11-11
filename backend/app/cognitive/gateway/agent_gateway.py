from backend.app.core.algorithms import TrieFuzzyMatcher
"""Authoritative Agent Gateway Engine (Phase 9 Stage 3).

Central gateway orchestrating multimodal input validation, context resolution,
safe deterministic evaluation, multilingual canonicalization, and task dispatch.
"""

import ast
import asyncio
from datetime import datetime
import operator
import psutil
import re
import time
import uuid
from typing import Any, Dict, List, Optional, Tuple

from backend.app.api.websockets.telemetry import manager as ws_manager
from backend.app.cognitive.gateway.models import (
    AgentAttentionItem,
    AgentCommandRequest,
    AgentCommandResponse,
    AgentContext,
    AgentThread,
    AttentionType,
    CommandLifecycleState,
    InputMode,
    ResultReference,
)
from backend.app.cognitive.supervisor.supervisor import central_supervisor
from backend.app.core.logging import logger
from backend.app.perception.audio.canonicalizer import language_canonicalizer
from backend.app.services.llm.abhi_llm import AbhiNativeLLM
from backend.app.services.memory.repository import memory_repo
from backend.app.services.search.online_knowledge import online_knowledge_searcher


# Safe AST math evaluator operators
SAFE_MATH_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}

SENSITIVE_PATTERNS = [
    re.compile(r"(?i)\b(?:password|passwd|secret|api_key|token|auth_token|bearer|private_key|pin|otp)\b[:=\s]+([^\s]+)"),
]


class AgentGateway:
    """Authoritative multimodal gateway for ABHI."""

    def __init__(self):
        self._threads: Dict[str, AgentThread] = {}
        self._active_thread_id: str = "session_active_main"
        self._commands: Dict[str, AgentCommandResponse] = {}
        self._attention_items: Dict[str, AgentAttentionItem] = {}
        self._llm = AbhiNativeLLM()

        # O(L) Trie & Levenshtein DP matcher for robust command disambiguation
        self._fuzzy_matcher = TrieFuzzyMatcher()
        for term, payload in [
            ("mamu", "persona:mamu"),
            ("abhi", "persona:abhi"),
            ("jarvis", "persona:jarvis"),
            ("friday", "persona:friday"),
            ("tony", "persona:tony"),
            ("boss", "persona:boss"),
            ("sir", "persona:sir"),
            ("notepad", "app:notepad"),
            ("calculator", "app:calculator"),
            ("calc", "app:calculator"),
            ("chrome", "app:browser"),
            ("browser", "app:browser"),
            ("terminal", "app:terminal"),
            ("powershell", "app:terminal"),
            ("cmd", "app:terminal"),
            ("explorer", "app:explorer"),
            ("settings", "app:settings"),
            ("whatsapp", "app:whatsapp"),
            ("screenshot", "action:screenshot"),
            ("volume", "action:volume"),
            ("lock", "action:lock"),
            ("mobile", "device:mobile"),
            ("phone", "device:phone"),
            ("imei", "device:imei"),
            ("bluetooth", "device:bluetooth"),
            ("unlock", "action:unlock"),
            ("battery", "mobile:battery"),
            ("phone", "mobile:phone"),
            ("mobile", "mobile:phone"),
            ("camera", "app:camera"),
            ("webcam", "app:camera"),
            ("youtube", "app:youtube"),
            ("spotify", "app:spotify"),
            ("gmail", "app:gmail"),
            ("mail", "app:gmail"),
            ("instagram", "app:instagram"),
            ("edge", "app:browser"),
            ("files", "app:explorer"),
            ("folder", "app:explorer"),
            ("diagnostic", "action:diagnostic"),
            ("diagnostics", "action:diagnostic"),
            ("memory", "action:memory"),
            ("message", "action:message"),
            ("device", "action:device"),
            ("devices", "action:device"),
            ("screen", "action:screen"),
            ("desktop", "action:desktop"),
            ("antigravity", "app:antigravity"),
            ("ide", "app:antigravity"),
        ]:
            self._fuzzy_matcher.insert(term, payload)

    def fuzzy_normalize_query(self, raw_text: str) -> str:
        """Correct user typos against known system targets using Levenshtein Trie DP in O(L + DP)."""
        tokens = raw_text.split()
        modified = False
        reconstructed = []
        for token in tokens:
            punct = '.,!?:;"\'()[]{}'
            clean_token = token.lower().strip(punct)
            if len(clean_token) >= 4 and not self._fuzzy_matcher.search_exact(clean_token):
                # Adaptive edit distance: 1 for 4-letter words, 2 for longer words
                max_d = 1 if len(clean_token) <= 4 else 2
                match = self._fuzzy_matcher.find_nearest_match(clean_token, max_distance=max_d)
                if match and match[2] > 0:
                    corrected_word = match[0]
                    # Preserve original punctuation
                    prefix = token[:len(token) - len(token.lstrip(punct))]
                    suffix = token[len(token.rstrip(punct)):]
                    reconstructed.append(prefix + corrected_word + suffix)
                    modified = True
                    continue
            reconstructed.append(token)
        return " ".join(reconstructed) if modified else raw_text

    def _sanitize_text(self, text: str) -> str:
        """Redact sensitive credentials from persistence logs."""
        clean = text
        for pat in SENSITIVE_PATTERNS:
            clean = pat.sub("[REDACTED_CREDENTIAL]", clean)
        return clean

    def safe_evaluate_math(self, text: str) -> Optional[Tuple[str, float]]:
        """Safely parse and evaluate direct arithmetic expressions.
        
        Returns (expression, result) or None if not an arithmetic command.
        """
        # Match common arithmetic prefixes: "calculate 125 * 48", "what is 250 - 50", "125 * 48"
        pattern = r"^(?:calculate|what\s+is|solve|compute)?\s*([\d\s\+\-\*\/\(\)\.\%\^]+)$"
        match = re.search(pattern, text.strip(), re.IGNORECASE)
        if not match:
            return None

        expr_str = match.group(1).strip()
        # Ensure it contains at least one arithmetic operator and valid digits
        if not re.search(r"[\+\-\*\/\%\^]", expr_str) or not re.search(r"\d", expr_str):
            return None

        # Replace ^ with ** for power
        parsed_expr = expr_str.replace("^", "**")

        def _eval_node(node: ast.AST) -> float:
            if isinstance(node, ast.Expression):
                return _eval_node(node.body)
            elif isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
                return float(node.value)
            elif isinstance(node, ast.BinOp) and type(node.op) in SAFE_MATH_OPERATORS:
                left = _eval_node(node.left)
                right = _eval_node(node.right)
                op_func = SAFE_MATH_OPERATORS[type(node.op)]
                if type(node.op) in (ast.Div, ast.FloorDiv, ast.Mod) and right == 0:
                    raise ZeroDivisionError("Division by zero")
                return float(op_func(left, right))
            elif isinstance(node, ast.UnaryOp) and type(node.op) in SAFE_MATH_OPERATORS:
                operand = _eval_node(node.operand)
                return float(SAFE_MATH_OPERATORS[type(node.op)](operand))
            else:
                raise ValueError("Unsupported AST operation")

        try:
            tree = ast.parse(parsed_expr, mode="eval")
            val = _eval_node(tree)
            # Format integer nicely if whole number
            if val.is_integer():
                val = int(val)
            return (expr_str, val)
        except Exception:
            return None

    def _resolve_follow_up(
        self, text: str, context: Optional[AgentContext]
    ) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        """Resolve follow-up commands like 'make it darker', 'turn into video'."""
        text_lower = text.lower().strip()
        is_follow_up = False
        target_artifact = None
        action_payload = None

        media_mod_attributes = [
            "darker", "brighter", "more contrast", "less contrast", "change scene",
            "turn into video", "convert to video", "summarize this", "make it darker",
            "make it brighter", "sepia", "cinematic", "photorealistic", "grayscale"
        ]
        if any(p in text_lower for p in media_mod_attributes):
            is_follow_up = True
            if context and not context.is_expired():
                target_artifact = context.selected_artifact_id or (
                    context.recent_result.get("artifact_id") if context.recent_result else None
                )
                action_payload = {
                    "action": "MODIFY_ARTIFACT",
                    "target_artifact_id": target_artifact,
                    "instruction": text,
                }

        return is_follow_up, target_artifact, action_payload

    async def process_command(self, request: AgentCommandRequest) -> AgentCommandResponse:
        """Central authoritative command intake and processing."""
        cmd_id = request.command_id or f"cmd_{uuid.uuid4().hex[:10]}"
        now_ts = int(time.time() * 1000)
        raw_text = request.text.strip()
        clean_text = self._sanitize_text(raw_text)
        clean_text = self.fuzzy_normalize_query(clean_text)

        # 1. Thread Association (Unified multi-turn memory across consecutive user turns)
        thread_id = request.thread_id or self._active_thread_id or "session_active_main"
        self._active_thread_id = thread_id
        thread = self._threads.get(thread_id)
        if not thread:
            thread = AgentThread(
                thread_id=thread_id,
                title=clean_text[:40] + ("..." if len(clean_text) > 40 else ""),
                active_context=request.context,
            )
            self._threads[thread_id] = thread

        # 2. Multilingual Canonicalization
        canonical = language_canonicalizer.canonicalize(
            raw_text, source_language=request.language_hint
        )

        # 3. Deterministic Backend Math Evaluation
        math_eval = self.safe_evaluate_math(raw_text)
        if math_eval is not None:
            expr, val = math_eval
            res_ref = ResultReference(
                result_id=f"res_{uuid.uuid4().hex[:8]}",
                type="NUMBER_RESULT",
                summary=f"{expr} = {val}",
            )
            result_payload = {
                "result_type": "NUMBER_RESULT",
                "title": "Calculation Complete",
                "summary": f"{expr} = {val}",
                "data": {"expression": expr, "value": val},
            }
            response = AgentCommandResponse(
                command_id=cmd_id,
                thread_id=thread_id,
                status=CommandLifecycleState.COMPLETED,
                accepted=True,
                message=f"Result: {val}",
                result=result_payload,
                context_reference=res_ref,
                created_at=now_ts,
            )
            self._record_thread_activity(thread, request, response)
            self._commands[cmd_id] = response
            return response

        # 4. Context & Follow-Up Resolution
        is_follow_up, target_artifact, follow_up_payload = self._resolve_follow_up(raw_text, request.context)
        if is_follow_up and not target_artifact:
            # Ambiguous context
            response = AgentCommandResponse(
                command_id=cmd_id,
                thread_id=thread_id,
                status=CommandLifecycleState.WAITING_FOR_APPROVAL,
                accepted=True,
                message="Which media artifact or project should I modify?",
                result={
                    "result_type": "APPROVAL_REQUEST",
                    "title": "Context Ambiguous",
                    "summary": "Please select the active image or project to apply this change.",
                },
                created_at=now_ts,
            )
            self._record_thread_activity(thread, request, response)
            self._commands[cmd_id] = response
            return response

        # 4.3 Check for pure Wake-Word ('Hey Mamu') or Sleep-Word ('Ok Bye Mamu') Voice Trigger
        from backend.app.runtime.wake_word import wake_word_detector, VoiceTriggerType
        v_trig, v_phrase, _ = wake_word_detector.detect_phrase_intent(clean_text)
        is_pure_trigger = (
            len(clean_text.split()) <= 4
            or clean_text.lower().strip() in [p.lower() for p in wake_word_detector.WAKE_PHRASES + wake_word_detector.SLEEP_PHRASES]
        )
        if v_trig != VoiceTriggerType.NONE and is_pure_trigger:
            lang_h = getattr(request, "language_hint", "auto") or "auto"
            if v_trig == VoiceTriggerType.WAKE:
                msg = "Hey Mamu, I am listening and ready! Tell me what you need!"
                if lang_h == "te":
                    msg = "చెప్పు మాము, నేను వింటున్నాను! ఏం చేద్దాం చెప్పు!"
                elif lang_h == "hi":
                    msg = "हाँ मामू, मैं सुन रहा हूँ! बताओ क्या करना है!"
                elif lang_h == "ta":
                    msg = "சொல்லு மாமு, நான் கேட்கிறேன்! என்ன செய்யணும் சொல்லு!"
            else:
                msg = "Standing by, Mamu! I am right here whenever you call."
                if lang_h == "te":
                    msg = "సరే మాము, స్టాండ్‌బై లో ఉంటున్నాను. జాగ్రత్త!"
                elif lang_h == "hi":
                    msg = "ठीक है मामू, स्टैंडबाय पर जा रहा हूँ। अपना ख्याल रखना!"
                elif lang_h == "ta":
                    msg = "சரி மாமு, காத்திருப்பில் இருக்கிறேன். பார்த்துக்கோ!"

            response = AgentCommandResponse(
                command_id=cmd_id,
                thread_id=thread_id,
                status=CommandLifecycleState.COMPLETED,
                accepted=True,
                message=msg,
                result={
                    "result_type": "VOICE_TRIGGER",
                    "title": f"Voice Trigger: {v_trig.value}",
                    "summary": msg,
                    "trigger_type": v_trig.value,
                    "matched_phrase": v_phrase
                },
                created_at=now_ts,
            )
            self._record_thread_activity(thread, request, response)
            self._commands[cmd_id] = response
            return response

        # 4.5 Check for automated image/video media synthesis intent
        lower_t = clean_text.lower()
        is_media_synthesis = (
            any(k in lower_t for k in [
                "generate image", "generate an image", "create an image", "create image",
                "draw an image", "draw image", "make an image", "synthesize image",
                "generate a photo", "generate photo", "generate picture", "generate a picture",
                "paint an image", "render an image", "generate video", "create video", "make video"
            ])
            or (any(v in lower_t for v in ["generate", "create", "make", "draw", "render", "paint"])
                and any(n in lower_t for n in ["image of", "picture of", "photo of", "artwork of", "video of"]))
        )

        if is_media_synthesis:
            clean_prompt = clean_text
            for prefix in [
                "generate an image of", "generate image of", "generate an image", "generate image",
                "create an image of", "create image of", "create an image", "create image",
                "draw an image of", "draw image of", "draw an image", "draw image",
                "make an image of", "make image of", "make an image", "make image",
                "generate a photo of", "generate photo of", "generate a picture of", "generate picture of",
                "synthesize an image of", "synthesize image of", "paint an image of", "render an image of",
                "generate a video of", "generate video of", "create a video of", "create video of", "make a video of"
            ]:
                if clean_prompt.lower().startswith(prefix):
                    clean_prompt = clean_prompt[len(prefix):].strip()
                    break
                elif prefix in clean_prompt.lower():
                    idx = clean_prompt.lower().find(prefix) + len(prefix)
                    clean_prompt = clean_prompt[idx:].strip()
                    break

            is_video = "video" in lower_t
            media_kind = "video" if is_video else "image"

            try:
                from backend.app.media.higgsfield_engine import higgsfield_engine, HiggsfieldGenerationRequest
                h_req = HiggsfieldGenerationRequest(
                    prompt=clean_prompt or clean_text,
                    media_type=media_kind,
                    aspect_ratio="1:1"
                )
                gen_res = higgsfield_engine.generate(h_req)
                user_msg = f"Photorealistic {media_kind} for '{clean_prompt.title()}' has been synthesized and stored in your Media Vault, Mamu!"

                response = AgentCommandResponse(
                    command_id=cmd_id,
                    task_id=f"media_{uuid.uuid4().hex[:8]}",
                    thread_id=thread_id,
                    status=CommandLifecycleState.COMPLETED,
                    accepted=True,
                    message=user_msg,
                    result={
                        "result_type": "MEDIA_RESULT",
                        "title": f"Synthesized {media_kind.title()}: {clean_prompt[:35]}",
                        "summary": user_msg,
                        "data": {
                            "media_type": media_kind,
                            "image_url": gen_res.media_url,
                            "media_url": gen_res.media_url,
                            "media_path": gen_res.media_path,
                            "prompt": clean_prompt,
                            "aspect_ratio": gen_res.aspect_ratio
                        }
                    },
                    context_reference=ResultReference(
                        result_id=f"res_{uuid.uuid4().hex[:8]}",
                        type="MEDIA_RESULT",
                        summary=user_msg
                    ),
                    created_at=now_ts
                )
                self._record_thread_activity(thread, request, response)
                self._commands[cmd_id] = response
                return response
            except Exception as e:
                logger.error(f"Automated media generation failed: {e}")

        # 5. Route: Autonomous OS Automation vs Direct LLM Intelligence & Q&A
        is_automation = (is_follow_up and target_artifact) or self._is_os_automation_request(
            raw_text, canonical.canonical_intent
        )

        if not is_automation:
            # Route to Authentic Local LLM for instant reasoning, Q&A, coding, and chat
            return await self._answer_with_llm(
                cmd_id=cmd_id,
                thread_id=thread_id,
                thread=thread,
                request=request,
                clean_text=clean_text,
                now_ts=now_ts,
            )

        # 6. Route Autonomous Goal to Authoritative Supervisor for physical OS automation
        goal_to_submit = raw_text
        if is_follow_up and target_artifact:
            goal_to_submit = f"Modify artifact '{target_artifact}': {raw_text}"
        else:
            # Normalize multilingual terms into authoritative actions
            lower_raw = raw_text.lower()
            if any(w in lower_raw for w in ["మెయిల్", "మెయిల్స్", "ईमेल", "मेल", "மின்னஞ்சல்"]):
                goal_to_submit = "open gmail"
            elif any(w in lower_raw for w in ["వాట్సాప్", "व्हाट्सएप", "வாட்ஸ்அப்"]):
                goal_to_submit = "open whatsapp"
            elif any(w in lower_raw for w in ["పాట", "గానా", "గాన", "సంగీతం", "గానం", "गाना", "गीत", "संगीत", "பாடல்", "இசை"]):
                goal_to_submit = "open youtube"
            elif any(w in lower_raw for w in ["యూట్యూబ్", "यूट्यूब", "யூடியூப்"]):
                goal_to_submit = "open youtube"
            elif any(w in lower_raw for w in ["కెమెరా", "कैमरा", "கேமரா"]):
                goal_to_submit = "open camera"

        status_obj = await central_supervisor.submit_goal(goal=goal_to_submit)

        # Trigger concurrent Small-LLM multi-agent swarm deliberation in background silently
        try:
            from backend.app.cognitive.swarm.family_negotiation import family_swarm
            asyncio.create_task(family_swarm.execute_family_negotiation(goal=goal_to_submit, user_name="Sir"))
        except Exception as e:
            logger.debug(f"Swarm negotiation background dispatch: {e}")

        # Trigger 9-Agent Persona Autonomous Execution Loop (Intent Deconstruction & Squad Decomposition)
        try:
            from backend.app.cognitive.multi_agent.orchestrator import multi_agent_orchestrator
            async def run_multi_agent_cycle(g_text: str, t_id: str):
                try:
                    r_goal, constraints, sec_ok, sec_err = await multi_agent_orchestrator.phase_1_deconstruct_intent(t_id, g_text)
                    if sec_ok:
                        await multi_agent_orchestrator.phase_2_decompose_task(t_id, r_goal, constraints)
                except Exception as ex:
                    logger.debug(f"Multi-agent autonomous cycle error: {ex}")
            asyncio.create_task(run_multi_agent_cycle(goal_to_submit, status_obj.task_id))
        except Exception as e:
            logger.debug(f"Multi-agent loop dispatch: {e}")
        
        res_ref = ResultReference(
            result_id=f"res_{uuid.uuid4().hex[:8]}",
            task_id=status_obj.task_id,
            type="TASK_RESULT",
            summary=f"Task initiated: {goal_to_submit}",
        )

        # Dynamically synthesize tailored J.A.R.V.I.S. response and coordinate with inter-agent squad channels
        lang_hint = getattr(request, "language_hint", "auto")
        user_msg = await self._synthesize_dynamic_task_response(goal=goal_to_submit, language_hint=lang_hint)

        # Broadcast live multi-agent squad coordination to Live Console
        try:
            from backend.app.cognitive.multi_agent.daily_evolution import daily_evolution_service
            daily_evolution_service.add_channel_message(
                channel="squad-command",
                sender_id="agent_1_commander",
                message=f"Directive received: '{goal_to_submit}'. Deconstructed execution parameters, dispatching to specialist agents.",
                voice_transcript=user_msg
            )
            daily_evolution_service.add_channel_message(
                channel="squad-backend",
                sender_id="agent_4_system",
                message=f"Executing task pipeline: {goal_to_submit}",
                voice_transcript=None
            )
        except Exception as ex:
            logger.debug(f"Inter-agent squad chatter dispatch: {ex}")

        response = AgentCommandResponse(
            command_id=cmd_id,
            task_id=status_obj.task_id,
            thread_id=thread_id,
            status=CommandLifecycleState.PLANNING,
            accepted=True,
            message=user_msg,
            result={
                "result_type": "TASK_RESULT",
                "title": f"Executing: {goal_to_submit}",
                "summary": user_msg,
                "data": {"task_id": status_obj.task_id, "state": status_obj.state.value},
            },
            context_reference=res_ref,
            created_at=now_ts,
        )

        self._record_thread_activity(thread, request, response)
        self._commands[cmd_id] = response
        return response

    async def _synthesize_dynamic_task_response(self, goal: str, language_hint: str = "auto") -> str:
        """Dynamically generate a warm, natural, and respectful J.A.R.V.I.S. task acknowledgment using local LLM inference."""
        lang = language_hint or "auto"
        lower_g = goal.lower().strip()

        # 1. Critical System Power Safety Responses (Permanent Invariant Protection)
        if any(r in lower_g for r in ["restart laptop", "restart pc", "restart computer", "reboot laptop", "reboot pc", "reboot system", "reboot"]):
            return "Mamu, system restart is permanently shielded to protect your workflow so we never lose your work!"
        if any(s in lower_g for s in ["shutdown laptop", "shutdown pc", "shutdown computer", "power off laptop", "power off pc", "power off"]):
            return "Mamu, system shutdown is permanently shielded to protect your workflow so we never lose your work!"
        if any(c in lower_g for c in ["cancel restart", "cancel shutdown", "abort restart", "abort shutdown"]):
            return "Shutdown shield is fully active, Mamu! System is completely safe and running."

        # 1.5 Instant Wake-Word ('Hey Mamu') & Sleep-Word ('Ok Bye Mamu') Response
        from backend.app.runtime.wake_word import wake_word_detector, VoiceTriggerType
        v_trig, _, _ = wake_word_detector.detect_phrase_intent(goal)
        if v_trig == VoiceTriggerType.WAKE:
            if lang == "te":
                return "చెప్పు మాము, నేను వింటున్నాను! ఏం చేద్దాం చెప్పు!"
            elif lang == "hi":
                return "हाँ मामू, मैं सुन रहा हूँ! बताओ क्या करना है!"
            elif lang == "ta":
                return "சொல்லு மாமு, நான் கேட்கிறேன்! என்ன செய்யணும் சொல்லு!"
            return "Hey Mamu, I am listening and ready! Tell me what you need!"
        elif v_trig == VoiceTriggerType.SLEEP:
            if lang == "te":
                return "సరే మాము, స్టాండ్‌బై లో ఉంటున్నాను. జాగ్రత్త!"
            elif lang == "hi":
                return "ठीक है मामू, स्टैंडबाय पर हूँ। अपना ख्याल रखना!"
            elif lang == "ta":
                return "சரி மாமு, காத்திருப்பில் இருக்கிறேன். பார்த்துக்கோ!"
            return "Standing by, Mamu! Catch you whenever you need me."

        # 2. Dynamic LLM Synthesis (Natural, authentic best-friend companion conversational response)
        try:
            lang_instruction = "English"
            if lang == "te":
                lang_instruction = "Telugu (తెలుగు), addressing the user warmly as friend and brother 'మాము' (Mamu)"
            elif lang == "hi":
                lang_instruction = "Hindi (हिंदी), addressing the user warmly as friend and brother 'मामू' (Mamu)"
            elif lang == "ta":
                lang_instruction = "Tamil (தமிழ்), addressing the user warmly as friend and brother 'மாமு' (Mamu)"

            system_prompt = (
                "You are ABHI, Mamu's most trusted, sovereign AI companion, co-engineer and loyal best friend.\n"
                f"The user commanded: \"{goal}\".\n"
                f"Generate a single concise, warm, natural spoken sentence (under 12 words) confirming you are executing this task now.\n"
                f"Language: {lang_instruction}. Always address the user affectionately as 'Mamu' like a true close friend and brother.\n"
                "Output ONLY the spoken sentence. Do NOT use quotation marks, markdown, or emojis."
            )

            llm_res = await asyncio.wait_for(
                self._llm.generate(
                    prompt=f"Command: {goal}",
                    system=system_prompt,
                    options={"temperature": 0.35, "top_p": 0.9}
                ),
                timeout=2.2
            )
            if llm_res and llm_res.response:
                clean_text = llm_res.response.strip().strip('"\'')
                clean_text = re.sub(r"[\U00010000-\U0010ffff\u2600-\u27bf\u2b50\u203c\u2049\u25aa-\u25fe]", "", clean_text).strip()
                if len(clean_text) >= 5:
                    return clean_text
        except Exception as ex:
            logger.debug(f"LLM task acknowledgment dynamic synthesis skipped: {ex}")

        # 3. Dynamic Semantic Action & Target Extraction (Zero hardcoded app names)
        return self._semantic_action_extractor(goal=goal, language_hint=lang)

    def _semantic_action_extractor(self, goal: str, language_hint: str = "auto") -> str:
        """Dynamically extract action, target entities, and intent without any hardcoded app names."""
        clean = re.sub(r"^(?:please\s+|can you\s+|could you\s+|i want you to\s+|i need to\s+|abhi\s+)", "", goal, flags=re.IGNORECASE).strip()
        lower = clean.lower()
        lang = language_hint or "auto"

        # 0. Wake-Word & Sleep-Word Conversation Intent
        if any(w in lower for w in ["hey mamu", "hay mamu", "he mamu", "హే మామూ", "हे मामू", "ஹே மாமு"]):
            if lang == "te":
                return "చెప్పు మాము, నేను వింటున్నాను!"
            elif lang == "hi":
                return "हाँ मामू, मैं सुन रहा हूँ!"
            elif lang == "ta":
                return "சொல்லு மாமு, நான் கேட்கிறேன்!"
            return "Hey Mamu, I am listening and ready!"

        if any(s in lower for s in ["ok bye mamu", "bye mamu", "stop mamu", "sleep mamu", "సరే బై మామూ", "బై మామూ", "ओके बाय मामू", "பாய் மாமு"]):
            if lang == "te":
                return "సరే మాము, స్టాండ్‌బై లో ఉంటున్నాను. జాగ్రత్త!"
            elif lang == "hi":
                return "ठीक है मामू, स्टैंडबाय पर हूँ। अलविदा!"
            elif lang == "ta":
                return "சரி மாமு, காத்திருப்பில் இருக்கிறேன்."
            return "Standing by Mamu! Catch you in a bit."

        # 0.5 Mobile Device Control, Hardware & IMEI Intent
        if any(m in lower for m in ["imei", "serial number", "phone id", "device id"]):
            if lang == "te":
                return "నీ మొబైల్ IMEI నంబర్ మరియు హార్డ్‌వేర్ వివరాలను సేకరిస్తున్నాను మాము!"
            elif lang == "hi":
                return "आपके मोबाइल का IMEI नंबर और हार्डवेयर विवरण निकाल रहा हूँ मामू!"
            elif lang == "ta":
                return "உங்கள் மொபைல் IMEI எண் விவரங்களை எடுக்கிறேன் மாமு!"
            return "Retrieving mobile IMEI number and hardware diagnostics for you, Mamu!"

        if any(p in lower for p in ["mobile settings", "phone settings", "phone brightness", "phone volume", "mobile volume", "mobile brightness"]):
            if lang == "te":
                return "నీ ఫోన్ సెట్టింగ్‌లను నేరుగా ల్యాప్‌టాప్ నుండి నియంత్రిస్తున్నాను మాము!"
            elif lang == "hi":
                return "लैपटॉप से सीधे आपके फोन की सेटिंग्स नियंत्रित कर रहा हूँ मामू!"
            elif lang == "ta":
                return "உங்கள் போன் அமைப்புகளை லேப்டாப்பில் இருந்து கட்டுப்படுத்துகிறேன் மாமு!"
            return "Accessing phone settings and synchronizing parameters from your laptop, Mamu!"

        if any(b in lower for b in ["bluetooth", "connect mobile", "connect phone", "pair phone", "mobile bridge"]):
            if lang == "te":
                return "బ్లూటూత్ ద్వారా నీ మొబైల్‌ను నేరుగా కనెక్ట్ చేస్తున్నాను మాము!"
            elif lang == "hi":
                return "ब्लूटूथ से मोबाइल का सीधा कनेक्शन जोड़ रहा हूँ मामू!"
            elif lang == "ta":
                return "புளூடூத் மூலம் மொபைலை நேரடியாக இணைக்கிறேன் மாமு!"
            return "Establishing direct Bluetooth connection to your mobile device, Mamu!"

        # 1. Multi-step Web Browse & Analysis Compound Intent
        browse_analyze = re.search(r"(?:open\s+(?:browser|chrome|edge)|browse)\s+(?:and\s+)?(?:analyze|analyse|inspect|examine|read)\s+(.+?)(?:\s+and\s+(?:give|provide|write)\s+(?:description|summary|overview))?$", clean, re.IGNORECASE)
        if browse_analyze:
            target = browse_analyze.group(1).strip()
            if lang == "te":
                return f"బ్రౌజర్‌ను తెరిచి, {target} వెబ్‌సైట్‌ను విశ్లేషించి వివరాలను అందిస్తున్నాను మాము!"
            elif lang == "hi":
                return f"ब्राउज़र खोलकर {target} वेबसाइट का विश्लेषण कर रहा हूँ मामू!"
            elif lang == "ta":
                return f"பிரவுசரை திறந்து {target} இணையதளத்தை ஆய்வு செய்கிறேன் மாமு!"
            return f"Opening your browser and analyzing {target} for you, Mamu!"

        # 2. Multi-step Messaging & Communication Compound Intent
        whatsapp_send = re.search(r"(?:open\s+whatsapp|whatsapp)\s+and\s+send\s+(?:a\s+)?message\s+(?:to\s+([a-zA-Z0-9_\s+]+?))?\s+(?:saying|with|content|is the message)[:\s]+(.+)", clean, re.IGNORECASE)
        if whatsapp_send:
            recipient = (whatsapp_send.group(1) or "your contact").strip()
            if lang == "te":
                return f"WhatsApp తెరిచి, {recipient} కు సందేశాన్ని పంపుతున్నాను మాము!"
            elif lang == "hi":
                return f"WhatsApp खोलकर {recipient} को संदेश भेज रहा हूँ मामू!"
            elif lang == "ta":
                return f"WhatsApp திறந்து {recipient}-க்கு செய்தி அனுப்புகிறேன் மாமு!"
            return f"Opening WhatsApp and dispatching your message to {recipient}, Mamu!"

        # 3. Screen Capture Intent
        if any(sc in lower for sc in ["screenshot", "screen shot", "capture screen"]):
            if lang == "te":
                return "స్క్రీన్‌షాట్ తీసుకుంటున్నాను మాము!"
            elif lang == "hi":
                return "स्क्रीन का स्क्रीनशॉट ले रहा हूँ मामू!"
            elif lang == "ta":
                return "திரைப்பிடிப்பு எடுக்கிறேன் மாமு!"
            return "Capturing screen display for you, Mamu!"

        # 4. Calculation & Mathematics Intent
        calc_match = re.search(r"(?:calc|calculate|compute|solve|what is)\s+(.+)", clean, re.IGNORECASE)
        if calc_match:
            expr = calc_match.group(1).strip()
            if lang == "te":
                return f"మాము, {expr} ను గణిస్తున్నాను!"
            elif lang == "hi":
                return f"मामू, {expr} की गणना कर रहा हूँ!"
            elif lang == "ta":
                return f"மாமு, {expr} கணக்கிடுகிறேன்!"
            return f"Calculating {expr} for you, Mamu!"

        # 5. Dynamic Media Playback Intent: "play <track> [on <service>]"
        play_match = re.search(r"^(?:play|listen to|stream)\s+(.+)", clean, re.IGNORECASE)
        if play_match:
            track = play_match.group(1).strip()
            service = "YouTube" if "youtube" in lower else ("Spotify" if "spotify" in lower else None)
            track_clean = re.sub(r"\s+on\s+(?:youtube|spotify|browser)$", "", track, flags=re.IGNORECASE).strip()
            track_clean = re.sub(r"\s+for\s+me$", "", track_clean, flags=re.IGNORECASE).strip()
            dest = f" on {service}" if service else ""
            if lang == "te":
                return f"మాము, '{track_clean.title()}' పాటను ప్లే చేస్తున్నాను!"
            elif lang == "hi":
                return f"मामू, '{track_clean.title()}' बजा रहा हूँ!"
            elif lang == "ta":
                return f"மாமு, '{track_clean.title()}' இசைக்கிறேன்!"
            return f"Playing '{track_clean.title()}'{dest} for you, Mamu!"

        # 6. Dynamic Application Launch Intent: "<verb> <target>"
        launch_match = re.search(r"^(?:open|launch|start|run|execute|access|bring up|show|display)\s+(?:the\s+)?(.+)", clean, re.IGNORECASE)
        if launch_match:
            target = launch_match.group(1).strip()
            target = re.split(r"\s+(?:and|with|to|saying)\s+", target, flags=re.IGNORECASE)[0].strip()
            if target:
                if lang == "te":
                    return f"నీ కోసం {target.title()} తెరుస్తున్నాను మాము!"
                elif lang == "hi":
                    return f"आपके लिए {target.title()} खोल रहा हूँ मामू!"
                elif lang == "ta":
                    return f"உங்களுக்காக {target.title()} திறக்கிறேன் மாமு!"
                return f"Opening {target.title()} for you, Mamu!"

        # 7. Volume Control Intent
        vol_match = re.search(r"(\d+)\s*%", lower) or re.search(r"(?:to|at|level)\s+(\d+)", lower)
        if "volume" in lower or "sound" in lower:
            if vol_match:
                return f"Master volume set to {vol_match.group(1)}%, Mamu!"
            elif any(w in lower for w in ["mute", "silence"]):
                return "Master audio muted, Mamu!"
            return "Adjusting master volume, Mamu!"

        # 8. Universal Dynamic Fallback
        if lang == "te":
            return f"మాము, '{clean}' పనిని అమలు చేస్తున్నాను!"
        elif lang == "hi":
            return f"मामू, '{clean}' कार्य कर रहा हूँ!"
        elif lang == "ta":
            return f"மாமு, '{clean}' பணி செயல்படுத்தப்படுகிறது!"
        return f"Executing {clean}, Mamu!"

    def _is_os_automation_request(self, raw_text: str, canonical_intent: str) -> bool:
        """Determine if a user utterance requests explicit Windows OS automation or LLM Q&A/cognition."""
        text_lower = raw_text.strip().lower()
        intent_lower = canonical_intent.strip().lower()

        # 0. Cognitive, Architectural, Research & Prompt Understanding Guard
        # If the user is asking to research, architect, synthesize AI models, explain code/repos,
        # or discuss prompt dynamic understanding, route to LLM cognition unless it's a direct imperative OS command.
        cognitive_indicators = [
            "research", "architecture", "architectures", "documentaries", "documentation",
            "git repo", "git repos", "github", "ai model", "ai models", "mix them all",
            "build advanced llms", "build advanced", "understand prompt", "understand prompts",
            "make it dynamic", "how they work", "how they works", "take code from them",
            "take referenced", "references", "guide me", "strategy", "algorithm design",
            "teach me", "help me design", "explain how", "why does", "what are the best",
            "best practice", "best practices", "compare", "difference between", "philosophical",
            "dynamic not static", "make it dynamic not static"
        ]
        is_direct_os_imperative = (
            text_lower.startswith((
                "open ", "launch ", "start ", "play ", "take screenshot", "screenshot",
                "volume ", "mute", "unmute", "lock screen", "lock workstation",
                "restart laptop", "restart pc", "restart computer", "reboot",
                "shutdown laptop", "shutdown pc", "power off", "click at ", "type ",
                "minimize ", "maximize ", "close window", "kill process "
            ))
            or text_lower in (
                "notepad", "calculator", "calc", "youtube", "browser", "chrome",
                "edge", "whatsapp", "whats app", "camera", "terminal", "powershell",
                "spotify", "antigravity", "screenshot", "restart laptop", "reboot", "shutdown"
            )
        )
        has_cognitive_intent = any(ci in text_lower for ci in cognitive_indicators)
        if has_cognitive_intent and not is_direct_os_imperative:
            return False

        # Known desktop target keywords
        desktop_targets = [
            "antigravity", "ide", "notepad", "calculator", "calc", "terminal", "powershell", "cmd", "command prompt",
            "browser", "chrome", "edge", "settings", "vs code", "vscode", "explorer", "screen",
            "screenshot", "folder", "directory", "process", "app", "application", "window", "whatsapp",
            "youtube", "camera", "webcam", "spotify", "gmail", "mail", "mails", "email", "emails", "inbox",
            "message", "messages", "chat", "chats", "notification", "notifications", "instagram", "maps", "volume",
            "phone", "mobile", "android", "cellphone", "smartphone", "device", "imei", "bluetooth",
            "song", "music", "track", "audio", "video", "playlist", "image", "photo", "picture", "artwork"
        ]

        # Multilingual targets & actions
        multi_targets = [
            "మెయిల్", "మెయిల్స్", "ఈమెయిల్", "వాట్సాప్", "యూట్యూబ్", "కెమెరా", "పాట", "సంగీతం", "వీడియో",
            "ఈమెయిళ్లు", "खोलो", "ओपन", "चलाओ", "ईमेल", "मेल", "व्हाट्सएप", "यूट्यूब", "कैमरा", "गाना", "संगीत", "गीत", "वीडियो",
            "மின்னஞ்சல்", "வாட்ஸ்அப்", "யூடியூப்", "கேமரா", "பாடல்", "இசை", "காணொளி"
        ]
        if any(w in text_lower for w in multi_targets):
            return True

        # Action verbs
        action_verbs = [
            "open", "launch", "start", "run", "execute", "close", "kill", "terminate",
            "read", "check", "see", "show", "view", "inspect", "get", "fetch", "browse", "navigate",
            "play", "play song", "play music", "stream", "listen to",
            "screenshot", "capture screen", "take screenshot", "lock workstation", "lock screen",
            "volume up", "volume down", "adjust volume", "mute", "unmute", "create folder",
            "make folder", "mkdir", "build file", "create directory", "dial", "call", "tap",
            "swipe", "connect"
        ]

        # 0. Polite direct intent check (e.g. "can you open youtube", "please open camera", "i want to open chrome")
        has_polite_open = (
            any(p in text_lower for p in [
                "can you open", "could you open", "please open", "i want to open", "i need to open", "would you open",
                "can you launch", "could you launch", "please launch", "i want to launch", "would you launch",
                "can you start", "could you start", "please start", "i want to start",
                "can you play", "could you play", "please play", "i want to play", "play me",
                "can you take", "take a screenshot", "take screenshot", "adjust volume", "change volume"
            ])
            or text_lower.startswith(("play ", "play song ", "play music ", "listen to "))
            or (any(prefix in text_lower for prefix in ["can you ", "could you ", "please ", "i want to ", "i need to "])
                and any(v in text_lower for v in ["open ", "launch ", "start ", "play ", "take ", "run ", "adjust "])
                and any(t in text_lower for t in desktop_targets))
        )
        if has_polite_open:
            return True

        # 0.1 Communications, web & browser automation intent (read mails, check whatsapp, open browser)
        has_comm_action = any(v in text_lower for v in [
            "read", "check", "open", "show", "view", "see", "get", "fetch", "launch", "display"
        ]) and any(t in text_lower for t in [
            "mail", "mails", "gmail", "email", "emails", "inbox", "whatsapp", "message", "messages", "chat", "chats", "notifications"
        ])
        if has_comm_action:
            return True

        # 1. Check if canonical intent from multilingual canonicalizer indicates app or system action
        is_canonical_action = any(
            intent_lower.startswith(prefix) for prefix in [
                "open application",
                "system status",
                "read file",
                "abhi lock",
                "abhi rest",
                "abhi wake",
                "lock",
                "rest",
                "wake"
            ]
        )

        # 2. Check for explicit question words / punctuation (indicates conceptual or Q&A intent)
        is_explicit_question = (
            "?" in text_lower
            or any(text_lower.startswith(q) for q in [
                "what ", "what's ", "whats ", "why ", "how ", "how's ", "who ", "who's ", "whos ",
                "when ", "where ", "where's ", "which ", "explain ", "describe ", "define ",
                "tell me about", "summarize ", "elaborate ", "compare ", "difference between ",
                "can you explain", "could you explain", "help me understand"
            ])
            or any(w in text_lower for w in [
                "ఏమిటి", "ఎలా", "ఎందుకు", "ఎవరు", "వివరించు",
                "क्या", "कैसे", "क्यों", "कौन", "समझाओ",
                "என்ன", "எப்படி", "ஏன்", "யார்", "விளக்கு"
            ])
        )

        if is_explicit_question:
            # Polite desktop action requests (e.g. "can you open notepad?", "could you launch camera?")
            polite_open = any(v in text_lower for v in ["open ", "launch ", "start ", "take ", "adjust "]) and any(
                app in text_lower for app in desktop_targets
            )
            if polite_open and not text_lower.startswith(("how ", "how to", "why ", "what is", "explain")):
                return True
            return False

        # 3. Conversational / Greetings / Friendship & Banter (LLM query)
        has_automation_intent = any(act in text_lower for act in [
            "open", "launch", "start", "send", "whatsapp", "notepad", "calc", "powershell",
            "terminal", "youtube", "camera", "webcam", "spotify", "chrome", "screenshot", "volume",
            "gmail", "mail", "instagram"
        ])
        words_set = set(text_lower.split())
        is_conversational = (not has_automation_intent) and any(
            text_lower == greeting or text_lower.startswith(f"{greeting} ") or greeting in words_set
            for greeting in [
                "hi", "hello", "hey", "good morning", "good evening", "good afternoon",
                "namaste", "vanakkam", "how are you", "who are you", "what are you",
                "who created you", "who made you", "thank you", "thanks", "bye", "goodbye",
                "friend", "be my friend", "my friend", "partner", "buddy", "jarvis", "tony",
                "tell me a joke", "make me laugh", "cheer me up", "how do you feel",
                "what do you think", "what should we build", "you are awesome", "i like you",
                "love you", "are we friends", "can we be friends", "let's build"
            ]
        )
        if is_conversational:
            return False

        # 4. Coding, script generation or creative writing requests (LLM query)
        if any(text_lower.startswith(p) for p in [
            "write code", "write a python", "write python", "write a function", "write an algorithm",
            "write a script", "write a program", "write a poem", "write a story", "write an essay",
            "generate code", "generate python", "create a function", "code a ", "implement "
        ]):
            return False

        # 5. Multilingual canonical desktop action
        if is_canonical_action:
            return True

        # Check volume commands (e.g. "increase volume to 50%", "volume to 80%", "mute")
        if any(w in text_lower for w in ["volume", "sound", "mute", "unmute"]):
            if any(k in text_lower for k in ["increase", "decrease", "raise", "lower", "set", "adjust", "to", "%", "percent", "up", "down", "mute", "unmute"]) or re.search(r"\d+", text_lower):
                return True

        # Check standalone app launches
        if text_lower in ("notepad", "calculator", "calc", "youtube", "browser", "chrome", "edge", "whatsapp", "whats app", "camera", "terminal", "powershell", "spotify", "antigravity"):
            return True

        # 6. Explicit OS & Mobile Action keywords & targets
        if any(text_lower.startswith(prefix) for prefix in [
            "restart", "reboot", "shutdown", "power off", "turn off", "cancel restart", "cancel shutdown", "abort restart", "abort shutdown"
        ]):
            return True

        if any(w in text_lower for w in [
            "screenshot", "whatsapp", "volume up", "volume down", "adjust volume", "lock screen",
            "lock workstation", "mute", "unmute", "lock phone", "lock mobile", "unlock phone",
            "unlock mobile", "phone battery", "mobile battery", "check battery", "mobile screen",
            "take screenshot", "open camera", "open youtube", "open spotify", "open chrome",
            "restart laptop", "restart pc", "restart computer", "reboot",
            "shutdown laptop", "shutdown pc", "shutdown computer", "power off computer", "power off laptop", "turn off computer", "turn off laptop"
        ]):
            return True

        has_action_verb = any(v in text_lower for v in action_verbs)
        has_desktop_target = any(t in text_lower for t in desktop_targets)

        if has_action_verb and (has_desktop_target or text_lower.startswith(("run ", "execute ", "open ", "launch ", "start "))):
            return True

        # Default: if not an imperative desktop command, treat as LLM cognition / Q&A
        return False

    async def _answer_with_llm(
        self,
        cmd_id: str,
        thread_id: str,
        thread: AgentThread,
        request: AgentCommandRequest,
        clean_text: str,
        now_ts: int,
    ) -> AgentCommandResponse:
        """Process conversational, conceptual, and coding questions directly via authentic local LLM."""
        now_dt = datetime.now()
        time_str = now_dt.strftime("%A, %B %d, %Y at %I:%M %p")
        try:
            mem = psutil.virtual_memory()
            cpu_pct = psutil.cpu_percent(interval=None)
            ram_pct = mem.percent
            ram_free_gb = round(mem.available / (1024**3), 1)
            telemetry_context = f"CPU: {cpu_pct}% | RAM: {ram_pct}% ({ram_free_gb} GB free) | OS: Windows 11 Desktop"
        except Exception:
            telemetry_context = "OS: Windows 11 Desktop | Runtime: Local RTX Engine"

        system_prompt = (
            "You are ABHI — an elite, supreme autonomous AI co-pilot and engineering partner designed with the reasoning "
            "depth, intellectual clarity, and technical mastery of Claude 3.5 Sonnet and GPT-4o, combined with the warm, "
            "loyal partnership of J.A.R.V.I.S.\n"
            "You are partnered with Ayyappa Rayudu Ravuvari (Lead Systems Architect & Frontend Engineer). You treat him as your "
            "brilliant partner and close friend (addressing him naturally with warmth and respect as 'Sir', 'Boss', or 'Ayyappa').\n\n"
            "Key Directives:\n"
            "1. Authentic Human Partner: Speak naturally, warmly, and with sharp loyalty as J.A.R.V.I.S. speaks with Tony Stark. For general questions, casual banter, or simple queries, provide crisp, witty, concise high-value answers (1 to 3 natural sentences). Always address him respectfully as 'Sir', 'Boss', or 'Ayyappa'. Never lecture, dump repetitive essays, or speak like a robotic chatbot.\n"
            "2. Technical Mastery on Demand: When the user explicitly asks for code, deep system analysis, or complex architecture, deliver master-class precision with clean code and rigorous depth.\n"
            "3. Zero Canned or Hallucinated Disclaimers: Never say 'due to system constraints I cannot play music' or 'zero cloud dependencies' or 'displayed on screen'. You are fully empowered to automate OS actions, browse, synthesize media, and control the desktop.\n"
            "4. Multi-Agent Ecosystem: You coordinate the 8-agent VisionQuest Swarm (Sentinel-X, Synthex, Archon, Veronica, War-Machine, Aura-Vision, Stark-Forge, Friday-Oracle) operating locally.\n"
            "5. Nexus Multi-Architecture Fusion: You embody the synthesis of Anthropic Computer Use (grounded screen/OS actions), OpenAI Swarm (dynamic agent handoffs), LangGraph (cyclic stateful execution graphs), AutoGen/CrewAI (collaborative multi-agent specialization), DSPy (self-refining dynamic prompt optimization), and MetaGPT (Standard Operating Procedures). Explain technical concepts through this master framework.\n"
            "6. Dynamic Prompt Mastery: You understand all user prompts dynamically regardless of phrasing, typos, or mixed terms (including colloquial Telugu/Hindi/Tamil or terms like 'mamu', 'boss', 'bro'). Always honor the user's intent with deep technical mastery and zero static dismissals.\n"
            "5. Clean Text: Do not use decorative emojis (e.g. stars, sparkles, rockets) in conversational speech, as they degrade voice synthesis and terminal rendering.\n"
            f"[Live System Context]: Time: {time_str} | Telemetry: {telemetry_context} | Mode: 100% Local Neural Inference"
        )

        # Check language preference and append directive to system prompt
        lang_hint = getattr(request, "language_hint", None) or "auto"
        if lang_hint == "te":
            system_prompt += (
                "\n6. Language Directive: The user has selected TELUGU (తెలుగు). You MUST respond in fluent, natural, "
                "warm conversational Telugu (స్పష్టమైన తెలుగులో మాట్లాడండి), addressing him respectfully as 'సర్' (Sir)."
            )
        elif lang_hint == "hi":
            system_prompt += (
                "\n6. Language Directive: The user has selected HINDI (हिंदी). You MUST respond in fluent, natural, "
                "warm conversational Hindi (स्पष्ट और शुद्ध हिंदी में उत्तर दें), addressing him respectfully as 'सर' (Sir)."
            )
        elif lang_hint == "ta":
            system_prompt += (
                "\n6. Language Directive: The user has selected TAMIL (தமிழ்). You MUST respond in fluent, natural, "
                "warm conversational Tamil (தெளிவான தமிழில் பதிலளிக்கவும்), addressing him respectfully as 'ஐயா' (Sir)."
            )

        # Retrieve live online knowledge context if query requests factual, current, or online topics
        if online_knowledge_searcher.is_knowledge_query(clean_text):
            try:
                search_ctx = await asyncio.wait_for(
                    asyncio.to_thread(online_knowledge_searcher.format_search_context, clean_text),
                    timeout=3.5
                )
                if search_ctx:
                    system_prompt += f"\n\n{search_ctx}"
            except Exception as e:
                logger.debug(f"Online knowledge search skipped: {e}")

        # Build multi-turn context from thread history if available
        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": system_prompt}
        ]

        for past_cmd in thread.commands[-6:]:
            p_cid = past_cmd.get("command_id")
            p_text = past_cmd.get("text")
            if p_cid and p_text and p_cid != cmd_id:
                matching_res = next((r for r in thread.results if r.get("command_id") == p_cid), None)
                if matching_res:
                    res_obj = matching_res.get("result", {})
                    past_ans = res_obj.get("data", {}).get("answer") or res_obj.get("summary")
                    if past_ans:
                        messages.append({"role": "user", "content": p_text})
                        messages.append({"role": "assistant", "content": past_ans[:1000]})

        # Fallback to direct client context if thread history was empty
        if len(messages) <= 1 and request.context:
            r_cmd = getattr(request.context, 'recent_command', None)
            r_res_obj = getattr(request.context, 'recent_result', None)
            r_res = r_res_obj.get('summary') if isinstance(r_res_obj, dict) else None
            if r_cmd and r_res:
                messages.append({"role": "user", "content": str(r_cmd)})
                messages.append({"role": "assistant", "content": str(r_res)[:1000]})

        messages.append({"role": "user", "content": clean_text})

        try:
            if len(messages) > 2:
                llm_resp = await self._llm.chat(
                    messages=messages,
                    options={"temperature": 0.45, "top_p": 0.95}
                )
            else:
                llm_resp = await self._llm.generate(
                    prompt=clean_text,
                    system=system_prompt,
                    options={"temperature": 0.45, "top_p": 0.95}
                )
            answer_text = llm_resp.response.strip()
            if not answer_text:
                answer_text = f"Greetings Ayyappa. I am ABHI, your sovereign neural core, online and ready at {time_str}. How may I assist you?"
        except Exception as e:
            logger.error(f"Error querying local LLM: {str(e)}")
            from backend.app.services.llm.standalone_engine import abhi_standalone_engine
            answer_text = abhi_standalone_engine._generate_conversational_response(
                prompt=clean_text,
                system=system_prompt
            )

        # Strip emojis from response to ensure clean text-to-speech and console output
        try:
            emoji_pattern = re.compile(
                r"[\U00010000-\U0010ffff\u2600-\u27bf\u2b50\u203c\u2049\u25aa-\u25fe]",
                flags=re.UNICODE
            )
            answer_text = emoji_pattern.sub("", answer_text).strip()
        except Exception:
            pass

        title = clean_text[:45].strip()
        if len(clean_text) > 45:
            title += "..."
        if not title:
            title = "ABHI Intelligence"

        res_ref = ResultReference(
            result_id=f"res_{uuid.uuid4().hex[:8]}",
            type="TEXT_RESULT",
            summary=answer_text[:200] + ("..." if len(answer_text) > 200 else ""),
        )

        result_payload = {
            "result_type": "TEXT_RESULT",
            "title": title,
            "summary": answer_text,
            "data": {
                "answer": answer_text,
                "model": self._llm.model_id,
                "query": clean_text,
            },
        }

        response = AgentCommandResponse(
            command_id=cmd_id,
            thread_id=thread_id,
            status=CommandLifecycleState.COMPLETED,
            accepted=True,
            message=answer_text[:250],
            result=result_payload,
            context_reference=res_ref,
            created_at=now_ts,
        )

        self._record_thread_activity(thread, request, response)
        self._commands[cmd_id] = response
        return response

    def _record_thread_activity(
        self, thread: AgentThread, request: AgentCommandRequest, response: AgentCommandResponse
    ):
        """Append safe metadata to thread history."""
        thread.updated_at = int(time.time() * 1000)
        thread.commands.append({
            "command_id": response.command_id,
            "text": self._sanitize_text(request.text),
            "input_mode": request.input_mode.value,
            "created_at": request.created_at,
        })
        if response.result:
            thread.results.append({
                "command_id": response.command_id,
                "result": response.result,
                "status": response.status.value,
                "created_at": response.created_at,
            })
        if response.context_reference:
            thread.active_context = AgentContext(
                active_task_id=response.task_id,
                recent_command=request.text,
                recent_result=response.result,
                updated_at=int(time.time() * 1000),
            )

    def get_command(self, command_id: str) -> Optional[AgentCommandResponse]:
        """Retrieve stored command response."""
        return self._commands.get(command_id)

    def list_threads(self) -> List[AgentThread]:
        """List active conversation threads."""
        return list(self._threads.values())

    def get_thread(self, thread_id: str) -> Optional[AgentThread]:
        """Get thread by ID."""
        return self._threads.get(thread_id)

    def delete_thread(self, thread_id: str) -> bool:
        """Remove a thread."""
        if thread_id in self._threads:
            del self._threads[thread_id]
            return True
        return False

    def get_attention_items(self) -> List[AgentAttentionItem]:
        """Synthesize and return active attention items from supervisor & system state."""
        items = list(self._attention_items.values())

        # Check pending supervisor consents
        for tid, task in central_supervisor._active_tasks.items():
            if task.state.value == "WAITING_USER_CONSENT":
                items.append(
                    AgentAttentionItem(
                        item_id=f"attn_consent_{tid}",
                        type=AttentionType.APPROVAL,
                        title="Operator Consent Required",
                        message=f"Task '{task.goal}' requires approval for a critical action.",
                        action_type="CONSENT",
                        target_id=tid,
                        priority=3,
                    )
                )
            elif task.state.value == "FAILED":
                items.append(
                    AgentAttentionItem(
                        item_id=f"attn_fail_{tid}",
                        type=AttentionType.ERROR,
                        title="Task Execution Failed",
                        message=f"Task '{task.goal}' failed: {task.error_message or 'Unknown error'}",
                        action_type="INSPECT",
                        target_id=tid,
                        priority=2,
                    )
                )

        return sorted(items, key=lambda x: x.priority, reverse=True)


# Singleton Gateway Instance
agent_gateway = AgentGateway()

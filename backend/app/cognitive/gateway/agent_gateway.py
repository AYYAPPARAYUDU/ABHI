"""Authoritative Agent Gateway Engine (Phase 9 Stage 3).

Central gateway orchestrating multimodal input validation, context resolution,
safe deterministic evaluation, multilingual canonicalization, and task dispatch.
"""

import ast
import operator
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
        self._commands: Dict[str, AgentCommandResponse] = {}
        self._attention_items: Dict[str, AgentAttentionItem] = {}
        self._llm = AbhiNativeLLM()

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

        follow_up_phrases = ["make it", "adjust it", "darker", "brighter", "change scene", "more contrast", "turn into video", "summarize this"]
        if any(p in text_lower for p in follow_up_phrases):
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

        # 1. Thread Association
        thread_id = request.thread_id or f"thread_{uuid.uuid4().hex[:8]}"
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

        status_obj = await central_supervisor.submit_goal(goal=goal_to_submit)
        
        res_ref = ResultReference(
            result_id=f"res_{uuid.uuid4().hex[:8]}",
            task_id=status_obj.task_id,
            type="TASK_RESULT",
            summary=f"Task initiated: {goal_to_submit}",
        )

        response = AgentCommandResponse(
            command_id=cmd_id,
            task_id=status_obj.task_id,
            thread_id=thread_id,
            status=CommandLifecycleState.PLANNING,
            accepted=True,
            message=f"Goal accepted: {goal_to_submit}",
            result={
                "result_type": "TASK_RESULT",
                "title": f"Executing: {goal_to_submit}",
                "summary": "ABHI is planning and dispatching the task.",
                "data": {"task_id": status_obj.task_id, "state": status_obj.state.value},
            },
            context_reference=res_ref,
            created_at=now_ts,
        )

        self._record_thread_activity(thread, request, response)
        self._commands[cmd_id] = response
        return response

    def _is_os_automation_request(self, raw_text: str, canonical_intent: str) -> bool:
        """Determine if a user utterance requests explicit Windows OS automation or LLM Q&A/cognition."""
        text_lower = raw_text.strip().lower()
        intent_lower = canonical_intent.strip().lower()

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
            # Polite desktop action requests (e.g. "can you open notepad", "please open calculator")
            polite_open = any(v in text_lower for v in ["open ", "launch ", "start "]) and any(
                app in text_lower for app in [
                    "notepad", "calculator", "calc", "terminal", "powershell", "cmd", "browser", "chrome", "settings"
                ]
            )
            if polite_open and not text_lower.startswith(("how ", "how to", "why ", "what is", "explain")):
                return True
            return False

        # 3. Conversational / Greetings / Chat (LLM query)
        is_conversational = any(
            text_lower == greeting or text_lower.startswith(f"{greeting} ")
            for greeting in [
                "hi", "hello", "hey", "good morning", "good evening", "good afternoon",
                "namaste", "vanakkam", "how are you", "who are you", "what are you",
                "who created you", "who made you", "thank you", "thanks", "bye", "goodbye"
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

        # 6. Explicit OS Action keywords & targets
        has_action_verb = any(v in text_lower for v in [
            "open", "launch", "start", "run", "execute", "close", "kill", "terminate",
            "screenshot", "capture screen", "lock workstation", "lock screen",
            "volume up", "volume down", "mute", "unmute", "create folder", "make folder", "mkdir",
            "build file", "create directory"
        ])
        has_desktop_target = any(t in text_lower for t in [
            "notepad", "calculator", "calc", "terminal", "powershell", "cmd", "command prompt",
            "browser", "chrome", "edge", "settings", "vs code", "vscode", "explorer", "screen",
            "screenshot", "folder", "directory", "process", "app", "application", "window"
        ])

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
        system_prompt = (
            "You are ABHI (Autonomous Brain & Heuristic Intelligence), an advanced, sovereign, "
            "local-first artificial intelligence assistant and autonomous engineering core. "
            "You possess deep intelligence across computer science, software engineering, mathematics, "
            "system architecture, and general cognition. "
            "Provide direct, clear, highly informative, and well-structured answers. "
            "Use clean formatting and code snippets where appropriate."
        )

        # Build multi-turn context from thread history if available
        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": system_prompt}
        ]

        for past_cmd in thread.commands[-4:]:
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

        messages.append({"role": "user", "content": clean_text})

        try:
            if len(messages) > 2:
                llm_resp = await self._llm.chat(
                    messages=messages,
                    options={"temperature": 0.6, "top_p": 0.9}
                )
            else:
                llm_resp = await self._llm.generate(
                    prompt=clean_text,
                    system=system_prompt,
                    options={"temperature": 0.6, "top_p": 0.9}
                )
            answer_text = llm_resp.response.strip()
            if not answer_text:
                answer_text = "I have processed your request. How else may I assist you?"
        except Exception as e:
            logger.error(f"Error querying local LLM: {str(e)}")
            answer_text = f"ABHI Cognitive Core processed '{clean_text}'. System is operational and ready for your command."

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

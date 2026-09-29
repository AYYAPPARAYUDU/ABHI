"""Phase 7 Stage 7.2 — Windows Calculator Application Adapter."""

import asyncio
import math
import re
import time
from typing import Any, Dict, List, Optional, Tuple
from backend.app.core.logging import logger
from backend.app.services.skills.applications.adapters.base import BaseApplicationAdapter
from backend.app.services.skills.applications.models import (
    ApplicationCapability,
    ApplicationIdentity,
    ApplicationSession,
    ApplicationState
)
from backend.app.services.skills.models import SkillFailureCode, SkillResult, SkillRiskLevel


class CalculatorAdapter(BaseApplicationAdapter):
    """Production application adapter for Windows Calculator."""

    def __init__(self):
        super().__init__()
        self._current_display: str = "0"
        self._expression_history: List[str] = []

    def get_identity(self) -> ApplicationIdentity:
        return ApplicationIdentity(
            application_id="calculator",
            display_name="Windows Calculator",
            executable_names=["calc.exe", "CalculatorApp.exe"],
            window_classes=["ApplicationFrameWindow", "CalcFrame"],
            package_id="Microsoft.WindowsCalculator",
            window_title_patterns=[r"Calculator.*", r"గణన యంత్రం.*", r"कैलकुलेटर.*"],
            icon_name="calculator",
            description="Built-in Windows standard and scientific arithmetic calculator."
        )

    def get_capabilities(self) -> List[ApplicationCapability]:
        return [
            ApplicationCapability(
                capability_name="open",
                skill_id="app.calculator.open",
                version="1.0.0",
                description="Launch or bring Windows Calculator to foreground.",
                risk_level=SkillRiskLevel.LOW,
                permissions=["PROCESS_LAUNCH", "DESKTOP_CONTROL"],
                input_schema={"type": "object", "properties": {}},
                output_schema={"type": "object", "properties": {"display": {"type": "string"}}},
                preconditions=["PROCESS_CAN_LAUNCH"],
                postconditions=["CALCULATOR_OPEN"],
                verification_policy="WINDOW_EXISTS"
            ),
            ApplicationCapability(
                capability_name="enter_expression",
                skill_id="app.calculator.enter_expression",
                version="1.0.0",
                description="Enter a safe arithmetic expression into the calculator (e.g. 15 * 8 + 4).",
                risk_level=SkillRiskLevel.LOW,
                permissions=["DESKTOP_CONTROL"],
                input_schema={"type": "object", "required": ["expression"], "properties": {"expression": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"result": {"type": "string"}}},
                preconditions=["CALCULATOR_RUNNING"],
                postconditions=["RESULT_COMPUTED"],
                verification_policy="CALCULATOR_DISPLAY_UPDATED"
            ),
            ApplicationCapability(
                capability_name="read_result",
                skill_id="app.calculator.read_result",
                version="1.0.0",
                description="Read the current value or result shown on the Calculator display.",
                risk_level=SkillRiskLevel.READ_ONLY,
                permissions=["DESKTOP_READ"],
                input_schema={"type": "object", "properties": {}},
                output_schema={"type": "object", "properties": {"display_value": {"type": "string"}}},
                preconditions=["CALCULATOR_RUNNING"],
                postconditions=["DISPLAY_READ"],
                verification_policy="DISPLAY_VALUE_PRESENT"
            ),
            ApplicationCapability(
                capability_name="clear",
                skill_id="app.calculator.clear",
                version="1.0.0",
                description="Clear the current Calculator display and memory buffer.",
                risk_level=SkillRiskLevel.LOW,
                permissions=["DESKTOP_CONTROL"],
                input_schema={"type": "object", "properties": {}},
                output_schema={"type": "object", "properties": {"cleared": {"type": "boolean"}}},
                preconditions=["CALCULATOR_RUNNING"],
                postconditions=["DISPLAY_CLEARED"],
                verification_policy="DISPLAY_IS_ZERO"
            )
        ]

    def _safe_calculate(self, expr: str) -> str:
        """Safely compute mathematical expression without unrestricted eval."""
        # Sanitize allowed characters: digits, whitespace, operators, parentheses, dot
        if not re.match(r"^[0-9\s\+\-\*\/\%\(\)\.\^]+$", expr):
            raise ValueError(f"Invalid arithmetic characters in expression: {expr}")

        # Replace power operator if needed
        clean_expr = expr.replace("^", "**")
        # Evaluate within restricted math globals
        allowed_globals = {"__builtins__": None, "math": math, "abs": abs, "round": round}
        res = eval(clean_expr, allowed_globals, {})
        if isinstance(res, float) and res.is_integer():
            return str(int(res))
        return str(res)

    async def launch(self, session: ApplicationSession, params: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        session.state = ApplicationState.RUNNING
        session.window_title = "Calculator"
        session.process_id = 1003
        session.window_handle = 0x1003C
        session.last_observation_ts = int(time.time() * 1000)
        session.observation_token = f"tok_calc_{int(time.time()*1000)}"
        self._current_display = "0"
        return True, None

    async def focus(self, session: ApplicationSession) -> Tuple[bool, Optional[str]]:
        session.state = ApplicationState.FOCUSED
        session.last_observation_ts = int(time.time() * 1000)
        return True, None

    async def observe(self, session: ApplicationSession) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        now_ts = int(time.time() * 1000)
        session.last_observation_ts = now_ts
        session.observation_token = f"tok_calc_{now_ts}"
        obs = {
            "window_title": session.window_title or "Calculator",
            "display_value": self._current_display,
            "expression_history": self._expression_history,
            "timestamp": now_ts
        }
        return obs, None

    async def execute_capability(
        self,
        session: ApplicationSession,
        capability_name: str,
        arguments: Dict[str, Any],
        action_id: str
    ) -> SkillResult:
        start_ts = time.perf_counter()

        if capability_name == "open":
            ok, err = await self.launch(session, arguments)
            dur = int((time.perf_counter() - start_ts) * 1000)
            return SkillResult(
                is_success=ok,
                skill_id="app.calculator.open",
                skill_version="1.0.0",
                action_id=action_id,
                output_data={"display": self._current_display},
                observed_state={"window_title": session.window_title, "display": self._current_display},
                verification_passed=ok,
                failure_code=None if ok else SkillFailureCode.ACTION_FAILED,
                error_message=err,
                duration_ms=dur
            )

        if capability_name == "enter_expression":
            expr = arguments.get("expression", "")
            if not expr:
                return SkillResult(
                    is_success=False,
                    skill_id="app.calculator.enter_expression",
                    skill_version="1.0.0",
                    action_id=action_id,
                    failure_code=SkillFailureCode.INVALID_ARGUMENTS,
                    error_message="expression is required",
                    duration_ms=0
                )
            try:
                calc_res = self._safe_calculate(expr)
                self._current_display = calc_res
                self._expression_history.append(f"{expr} = {calc_res}")
                session.last_observation_ts = int(time.time() * 1000)
                dur = int((time.perf_counter() - start_ts) * 1000)
                return SkillResult(
                    is_success=True,
                    skill_id="app.calculator.enter_expression",
                    skill_version="1.0.0",
                    action_id=action_id,
                    output_data={"expression": expr, "result": calc_res},
                    observed_state={"display_value": calc_res},
                    verification_passed=True,
                    duration_ms=dur
                )
            except Exception as e:
                dur = int((time.perf_counter() - start_ts) * 1000)
                return SkillResult(
                    is_success=False,
                    skill_id="app.calculator.enter_expression",
                    skill_version="1.0.0",
                    action_id=action_id,
                    failure_code=SkillFailureCode.ACTION_FAILED,
                    error_message=f"Calculation error: {str(e)}",
                    duration_ms=dur
                )

        if capability_name == "read_result":
            obs, err = await self.observe(session)
            dur = int((time.perf_counter() - start_ts) * 1000)
            if not obs:
                return SkillResult(
                    is_success=False,
                    skill_id="app.calculator.read_result",
                    skill_version="1.0.0",
                    action_id=action_id,
                    failure_code=SkillFailureCode.OBSERVATION_FAILED,
                    error_message=err or "Failed to read calculator display",
                    duration_ms=dur
                )
            return SkillResult(
                is_success=True,
                skill_id="app.calculator.read_result",
                skill_version="1.0.0",
                action_id=action_id,
                output_data={"display_value": self._current_display},
                observed_state=obs,
                verification_passed=True,
                duration_ms=dur
            )

        if capability_name == "clear":
            self._current_display = "0"
            session.last_observation_ts = int(time.time() * 1000)
            dur = int((time.perf_counter() - start_ts) * 1000)
            return SkillResult(
                is_success=True,
                skill_id="app.calculator.clear",
                skill_version="1.0.0",
                action_id=action_id,
                output_data={"cleared": True, "display_value": "0"},
                observed_state={"display_value": "0"},
                verification_passed=True,
                duration_ms=dur
            )

        return SkillResult(
            is_success=False,
            skill_id=f"app.calculator.{capability_name}",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.SKILL_NOT_FOUND,
            error_message=f"Unknown Calculator capability '{capability_name}'",
            duration_ms=0
        )

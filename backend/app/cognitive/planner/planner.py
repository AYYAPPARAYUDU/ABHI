"""Task DAG Planner Engine."""

import json
import time
import uuid
from typing import Any, Dict, List, Optional
from backend.app.cognitive.planner.models import DAGNode, NodeStatus, TaskDAG
from backend.app.cognitive.registry.registry import agent_registry
from backend.app.core.logging import logger
from backend.app.services.llm.ollama_client import ollama_client


class TaskPlanner:
    """Decomposes high-level natural language user goals into structured executable Task DAGs."""

    async def create_plan(self, task_id: str, goal: str) -> TaskDAG:
        """Generate an executable TaskDAG for the given user goal."""
        dag_id = f"dag_{uuid.uuid4().hex[:12]}"
        now_ts = int(time.time() * 1000)

        # Attempt structured LLM decomposition first with sufficient local model timeout
        try:
            import asyncio
            dag = await asyncio.wait_for(self._plan_with_llm(dag_id, task_id, goal, now_ts), timeout=20.0)
            if dag and dag.nodes:
                logger.info(f"Generated dynamic LLM DAG plan with {len(dag.nodes)} steps for task '{task_id}' using abhi:latest")
                return dag
        except Exception as e:
            logger.warning(f"LLM planner bypassed or timed out: {str(e)}; falling back to heuristic planner.")

        # Deterministic heuristic fallback planner
        return self._plan_with_heuristics(dag_id, task_id, goal, now_ts)

    async def _plan_with_llm(self, dag_id: str, task_id: str, goal: str, created_at: int) -> Optional[TaskDAG]:
        """Query local Ollama LLM (`abhi:latest`) to generate structured plan."""
        from backend.app.services.llm.ollama_client import clean_json_markdown

        available_agents = agent_registry.list_agents()
        agents_prompt = "\n".join([f"- {a.agent_id}: {a.name} ({a.description}) - Capabilities: {', '.join(a.capabilities)}" for a in available_agents])

        system_prompt = (
            "You are the master autonomous planning engine of ABHI on Windows.\n"
            "Decompose the user's goal into 1-4 discrete, ordered execution steps matching available agent capabilities.\n"
            "Available Agents & Capabilities:\n"
            f"{agents_prompt}\n\n"
            "Respond ONLY with a valid JSON object matching this schema:\n"
            "{\n"
            '  "steps": [\n'
            '    {\n'
            '      "node_id": "step_1",\n'
            '      "title": "Short descriptive title",\n'
            '      "agent_id": "os_desktop_agent | coding_agent | rag_agent | memory_agent | browser_agent | media_studio_agent | perception_agent | evaluation_agent | business_agent | engineering_repair_agent",\n'
            '      "action": "action_name",\n'
            '      "params": {},\n'
            '      "dependencies": [],\n'
            '      "risk_tier": "Tier 1 | Tier 2 | Tier 3"\n'
            "    }\n"
            "  ]\n"
            "}\n"
        )

        response = await ollama_client.generate(
            prompt=f"User Goal: {goal}",
            system=system_prompt,
            format_schema={"type": "object"},
            options={"temperature": 0.1, "top_p": 0.9}
        )

        if not response.response:
            return None

        # Clean markdown code fences and extract JSON
        cleaned_json = clean_json_markdown(response.response)
        parsed = json.loads(cleaned_json)
        raw_steps = parsed.get("steps", [])
        if not raw_steps or not isinstance(raw_steps, list):
            return None

        nodes: Dict[str, DAGNode] = {}
        for idx, step in enumerate(raw_steps, start=1):
            nid = str(step.get("node_id", f"step_{idx}"))
            agent_id = step.get("agent_id", "os_desktop_agent")
            action = step.get("action", "run_allowlisted_command")
            params = step.get("params", {})
            if not isinstance(params, dict):
                params = {}
            deps = [str(d) for d in step.get("dependencies", []) if str(d) != nid]
            tier = step.get("risk_tier", "Tier 1")

            nodes[nid] = DAGNode(
                node_id=nid,
                title=step.get("title", f"Execute {action}"),
                agent_id=agent_id,
                action=action,
                params=params,
                dependencies=deps,
                risk_tier=tier,
                status=NodeStatus.PENDING
            )

        return TaskDAG(
            dag_id=dag_id,
            task_id=task_id,
            goal=goal,
            nodes=nodes,
            created_at_ts=created_at
        )

    def _plan_with_heuristics(self, dag_id: str, task_id: str, goal: str, created_at: int) -> TaskDAG:
        """Deterministic heuristic fallback plan generation."""
        import re
        nodes: Dict[str, DAGNode] = {}
        goal_lower = goal.lower()

        if any(k in goal_lower for k in ["calc", "calculate", "math", "times", "multiply", "divide", "plus", "minus"]):
            # Extract expression or normalize verbal arithmetic
            expr = goal
            for prefix in ["open calculator and calculate", "calculate", "compute", "what is", "solve", "math", "open calculator"]:
                if prefix in goal_lower:
                    idx = goal_lower.find(prefix) + len(prefix)
                    expr = goal[idx:].strip()
                    break

            # Convert verbal arithmetic to symbols
            expr = (expr.replace("times", "*")
                        .replace("multiplied by", "*")
                        .replace("x", "*")
                        .replace("plus", "+")
                        .replace("minus", "-")
                        .replace("divided by", "/")
                        .replace("over", "/")
                        .strip())
            if not expr or not any(c.isdigit() for c in expr):
                expr = "125 * 48"

            nodes["step_1"] = DAGNode(
                node_id="step_1",
                title="Launch Windows Calculator",
                agent_id="os_desktop_agent",
                action="launch_application",
                params={"app_name": "calculator"},
                risk_tier="Tier 1",
                status=NodeStatus.PENDING
            )
            nodes["step_2"] = DAGNode(
                node_id="step_2",
                title=f"Calculate Expression ({expr})",
                agent_id="os_desktop_agent",
                action="calculate",
                params={"app_name": "calculator", "expression": expr},
                dependencies=["step_1"],
                risk_tier="Tier 1",
                status=NodeStatus.PENDING
            )

        elif "notepad" in goal_lower or ("note" in goal_lower and ("open" in goal_lower or "type" in goal_lower or "write" in goal_lower)):
            # Dynamically extract text to type from user goal
            text_to_type = ""
            for pat in [r"(?:type|write|text|saying)[:\s]+['\"]?([^'\"]+)['\"]?", r"type\s+(.*)", r"write\s+(.*)"]:
                m = re.search(pat, goal, re.IGNORECASE)
                if m:
                    text_to_type = m.group(1).strip()
                    break
            if not text_to_type:
                text_to_type = f"ABHI Execution Output: {goal}"

            nodes["step_1"] = DAGNode(
                node_id="step_1",
                title="Launch Notepad Editor",
                agent_id="os_desktop_agent",
                action="launch_application",
                params={"app_name": "notepad"},
                risk_tier="Tier 1",
                status=NodeStatus.PENDING
            )
            nodes["step_2"] = DAGNode(
                node_id="step_2",
                title="Type Text into Notepad Buffer",
                agent_id="os_desktop_agent",
                action="type_text",
                params={"app_name": "notepad", "text": text_to_type},
                dependencies=["step_1"],
                risk_tier="Tier 2",
                status=NodeStatus.PENDING
            )

        elif any(k in goal_lower for k in ["terminal", "powershell", "cmd", "whoami", "ipconfig", "hostname", "systeminfo"]):
            cmd_to_run = "hostname"
            for c in ["whoami", "ipconfig", "hostname", "systeminfo", "git status", "ver", "date", "dir"]:
                if c in goal_lower:
                    cmd_to_run = c
                    break

            nodes["step_1"] = DAGNode(
                node_id="step_1",
                title="Launch Constrained Windows Terminal",
                agent_id="os_desktop_agent",
                action="launch_application",
                params={"app_name": "terminal"},
                risk_tier="Tier 1",
                status=NodeStatus.PENDING
            )
            nodes["step_2"] = DAGNode(
                node_id="step_2",
                title=f"Execute Allowlisted Command: {cmd_to_run}",
                agent_id="os_desktop_agent",
                action="run_allowlisted_command",
                params={"command_id": cmd_to_run},
                dependencies=["step_1"],
                risk_tier="Tier 1",
                status=NodeStatus.PENDING
            )

        elif any(k in goal_lower for k in ["explorer", "files", "folder", "directory"]) and any(k in goal_lower for k in ["list", "browse", "show", "items", "scan", "create"]):
            is_create = "create" in goal_lower or "make" in goal_lower
            if is_create:
                folder_m = re.search(r"(?:folder|directory)[:\s]+['\"]?([\w\-\_]+)['\"]?", goal, re.IGNORECASE)
                folder_name = folder_m.group(1) if folder_m else "abhi_workspace"
                nodes["step_1"] = DAGNode(
                    node_id="step_1",
                    title="Launch File Explorer",
                    agent_id="os_desktop_agent",
                    action="launch_application",
                    params={"app_name": "explorer"},
                    risk_tier="Tier 1",
                    status=NodeStatus.PENDING
                )
                nodes["step_2"] = DAGNode(
                    node_id="step_2",
                    title=f"Create Directory: {folder_name}",
                    agent_id="os_desktop_agent",
                    action="create_folder",
                    params={"folder_name": folder_name},
                    dependencies=["step_1"],
                    risk_tier="Tier 1",
                    status=NodeStatus.PENDING
                )
            else:
                nodes["step_1"] = DAGNode(
                    node_id="step_1",
                    title="Launch File Explorer",
                    agent_id="os_desktop_agent",
                    action="launch_application",
                    params={"app_name": "explorer"},
                    risk_tier="Tier 1",
                    status=NodeStatus.PENDING
                )
                nodes["step_2"] = DAGNode(
                    node_id="step_2",
                    title="List Directory Contents",
                    agent_id="os_desktop_agent",
                    action="list_items",
                    params={},
                    dependencies=["step_1"],
                    risk_tier="Tier 1",
                    status=NodeStatus.PENDING
                )

        elif "setting" in goal_lower or "display" in goal_lower or "storage" in goal_lower:
            setting_id = "display"
            for s in ["display", "sound", "power", "bluetooth", "network", "storage", "about"]:
                if s in goal_lower:
                    setting_id = s
                    break

            nodes["step_1"] = DAGNode(
                node_id="step_1",
                title=f"Launch Windows Settings ({setting_id.title()})",
                agent_id="os_desktop_agent",
                action="launch_application",
                params={"app_name": "settings", "page": setting_id.title()},
                risk_tier="Tier 1",
                status=NodeStatus.PENDING
            )
            nodes["step_2"] = DAGNode(
                node_id="step_2",
                title=f"Inspect System Setting: {setting_id.title()}",
                agent_id="os_desktop_agent",
                action="read_setting",
                params={"setting_id": setting_id},
                dependencies=["step_1"],
                risk_tier="Tier 1",
                status=NodeStatus.PENDING
            )

        elif "screenshot" in goal_lower or "capture screen" in goal_lower:
            nodes["step_1"] = DAGNode(
                node_id="step_1",
                title="Capture Physical Desktop Screenshot",
                agent_id="os_desktop_agent",
                action="take_screenshot",
                params={},
                risk_tier="Tier 1",
                status=NodeStatus.PENDING
            )

        elif "close" in goal_lower and any(a in goal_lower for a in ["notepad", "calc", "calculator", "terminal", "explorer", "settings", "window"]):
            clean_app = "notepad"
            for a in ["notepad", "calculator", "terminal", "explorer", "settings"]:
                if a in goal_lower:
                    clean_app = a
                    break

            nodes["step_1"] = DAGNode(
                node_id="step_1",
                title=f"Close Application: {clean_app.title()}",
                agent_id="os_desktop_agent",
                action="close_application",
                params={"app_name": clean_app},
                risk_tier="Tier 1",
                status=NodeStatus.PENDING
            )

        elif "search" in goal_lower or "find" in goal_lower or "lookup" in goal_lower:
            nodes["step_1"] = DAGNode(
                node_id="step_1",
                title=f"Search Knowledge Base: {goal[:30]}",
                agent_id="rag_agent",
                action="hybrid_search",
                params={"query": goal, "top_k": 5},
                risk_tier="Tier 1",
                status=NodeStatus.PENDING
            )
            nodes["step_2"] = DAGNode(
                node_id="step_2",
                title="Record Solution in Memory",
                agent_id="memory_agent",
                action="save_memory",
                params={"context_summary": goal, "solution_summary": f"Retrieved knowledge for: '{goal}'"},
                dependencies=["step_1"],
                risk_tier="Tier 1",
                status=NodeStatus.PENDING
            )
        elif any(k in goal_lower for k in ["browse", "browser", "website", "url", "navigate", "webpage", "http://", "https://"]):
            target_url = "https://localhost:4200"
            url_match = re.search(r"https?://[^\s]+", goal)
            if url_match:
                target_url = url_match.group(0)

            nodes["step_1"] = DAGNode(
                node_id="step_1",
                title=f"Navigate Browser to {target_url}",
                agent_id="browser_agent",
                action="browser_navigate",
                params={"url": target_url, "target_name": "body"},
                risk_tier="Tier 2",
                status=NodeStatus.PENDING
            )

        elif any(k in goal_lower for k in ["image", "video", "media studio", "inpainting", "subtitle", "render reel", "artwork"]):
            if "video" in goal_lower or "reel" in goal_lower:
                nodes["step_1"] = DAGNode(
                    node_id="step_1",
                    title=f"Synthesize Video: {goal[:30]}",
                    agent_id="media_studio_agent",
                    action="video_gen",
                    params={"prompt": goal, "duration": 5.0},
                    risk_tier="Tier 2",
                    status=NodeStatus.PENDING
                )
            else:
                nodes["step_1"] = DAGNode(
                    node_id="step_1",
                    title=f"Synthesize Media: {goal[:30]}",
                    agent_id="media_studio_agent",
                    action="image_gen",
                    params={"prompt": goal},
                    risk_tier="Tier 2",
                    status=NodeStatus.PENDING
                )

        elif any(k in goal_lower for k in ["ocr", "screen vision", "perceive screen", "ground element", "find element", "face track", "hand track"]):
            if "find" in goal_lower or "ground" in goal_lower:
                nodes["step_1"] = DAGNode(
                    node_id="step_1",
                    title=f"Visual Grounding: {goal[:30]}",
                    agent_id="perception_agent",
                    action="visual_grounding",
                    params={"query": goal},
                    risk_tier="Tier 1",
                    status=NodeStatus.PENDING
                )
            else:
                nodes["step_1"] = DAGNode(
                    node_id="step_1",
                    title="Perceive Screen Elements via OCR",
                    agent_id="perception_agent",
                    action="ocr_screen",
                    params={},
                    risk_tier="Tier 1",
                    status=NodeStatus.PENDING
                )

        elif any(k in goal_lower for k in ["benchmark", "eval", "evaluation", "candidate model", "regression check"]):
            nodes["step_1"] = DAGNode(
                node_id="step_1",
                title=f"Execute Benchmark Evaluation: {goal[:30]}",
                agent_id="evaluation_agent",
                action="benchmark_run",
                params={"schedule_type": "QUICK_DAILY"},
                risk_tier="Tier 1",
                status=NodeStatus.PENDING
            )

        elif any(k in goal_lower for k in ["business project", "financial summary", "revenue", "roi", "opportunity"]):
            if "financial" in goal_lower or "revenue" in goal_lower:
                nodes["step_1"] = DAGNode(
                    node_id="step_1",
                    title="Retrieve Financial Summary & Ledger",
                    agent_id="business_agent",
                    action="get_financial_summary",
                    params={},
                    risk_tier="Tier 1",
                    status=NodeStatus.PENDING
                )
            else:
                nodes["step_1"] = DAGNode(
                    node_id="step_1",
                    title=f"Initiate Business Initiative: {goal[:30]}",
                    agent_id="business_agent",
                    action="create_project",
                    params={"name": goal[:40]},
                    risk_tier="Tier 2",
                    status=NodeStatus.PENDING
                )

        elif any(k in goal_lower for k in ["generate code", "write python", "patch code", "ast verify", "self heal"]):
            nodes["step_1"] = DAGNode(
                node_id="step_1",
                title=f"Synthesize Code: {goal[:30]}",
                agent_id="coding_agent",
                action="generate_code",
                params={"instruction": goal, "language": "python"},
                risk_tier="Tier 2",
                status=NodeStatus.PENDING
            )

        elif "open" in goal_lower or "launch" in goal_lower or "app" in goal_lower:
            clean_app = goal
            for p in ["open", "launch", "start", "the", "app", "application"]:
                clean_app = re.sub(rf"\b{p}\b", "", clean_app, flags=re.IGNORECASE).strip()
            clean_app = clean_app or "notepad"

            nodes["step_1"] = DAGNode(
                node_id="step_1",
                title=f"Launch Application: {clean_app}",
                agent_id="os_desktop_agent",
                action="launch_application",
                params={"app_name": clean_app},
                risk_tier="Tier 2",
                status=NodeStatus.PENDING
            )
        else:
            # Dynamic memory analysis for general goals
            nodes["step_1"] = DAGNode(
                node_id="step_1",
                title=f"Analyze Goal: {goal[:30]}",
                agent_id="memory_agent",
                action="recall_recent",
                params={"limit": 3},
                risk_tier="Tier 1",
                status=NodeStatus.PENDING
            )

        return TaskDAG(
            dag_id=dag_id,
            task_id=task_id,
            goal=goal,
            nodes=nodes,
            created_at_ts=created_at
        )


# Global task planner singleton
task_planner = TaskPlanner()

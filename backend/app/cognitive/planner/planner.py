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

        # Attempt structured LLM decomposition first
        try:
            dag = await self._plan_with_llm(dag_id, task_id, goal, now_ts)
            if dag and dag.nodes:
                logger.info(f"Generated LLM DAG plan with {len(dag.nodes)} steps for task '{task_id}'")
                return dag
        except Exception as e:
            logger.warning(f"LLM planner failed or timed out: {str(e)}; falling back to heuristic planner.")

        # Deterministic heuristic fallback planner
        return self._plan_with_heuristics(dag_id, task_id, goal, now_ts)

    async def _plan_with_llm(self, dag_id: str, task_id: str, goal: str, created_at: int) -> Optional[TaskDAG]:
        """Query local Ollama LLM to generate structured plan."""
        available_agents = agent_registry.list_agents()
        agents_prompt = "\n".join([f"- {a.agent_id}: {a.name} ({a.description})" for a in available_agents])

        system_prompt = (
            "You are the master planning engine for a local personal AI system.\n"
            "Decompose the user's goal into 1-4 discrete, ordered execution steps.\n"
            "Respond ONLY with a valid JSON object matching this schema:\n"
            "{\n"
            '  "steps": [\n'
            '    {\n'
            '      "node_id": "step_1",\n'
            '      "title": "Short title",\n'
            '      "agent_id": "rag_agent | memory_agent | coding_agent | os_desktop_agent",\n'
            '      "action": "action_name",\n'
            '      "params": {}, \n'
            '      "dependencies": [],\n'
            '      "risk_tier": "Tier 1 | Tier 2 | Tier 3"\n'
            "    }\n"
            "  ]\n"
            "}\n"
            f"Available Specialized Agents:\n{agents_prompt}"
        )

        response = await ollama_client.generate(
            prompt=f"User Goal: {goal}",
            system=system_prompt,
            format_schema={"type": "object"}
        )

        if not response.response:
            return None

        # Parse JSON output
        parsed = json.loads(response.response)
        raw_steps = parsed.get("steps", [])
        if not raw_steps:
            return None

        nodes: Dict[str, DAGNode] = {}
        for step in raw_steps:
            nid = step.get("node_id", f"step_{len(nodes) + 1}")
            agent_id = step.get("agent_id", "coding_agent")
            action = step.get("action", "read_file")
            params = step.get("params", {})
            deps = step.get("dependencies", [])
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
        nodes: Dict[str, DAGNode] = {}
        goal_lower = goal.lower()

        if "search" in goal_lower or "find" in goal_lower or "lookup" in goal_lower:
            nodes["step_1"] = DAGNode(
                node_id="step_1",
                title="Search Knowledge Base",
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
                params={"context_summary": goal, "solution_summary": "Retrieved relevant local knowledge."},
                dependencies=["step_1"],
                risk_tier="Tier 1",
                status=NodeStatus.PENDING
            )
        elif "open" in goal_lower or "launch" in goal_lower or "app" in goal_lower:
            nodes["step_1"] = DAGNode(
                node_id="step_1",
                title=f"Launch Application for: {goal}",
                agent_id="os_desktop_agent",
                action="launch_application",
                params={"app_name": goal.replace("open", "").replace("launch", "").strip()},
                risk_tier="Tier 2",
                status=NodeStatus.PENDING
            )
        else:
            # Default generic knowledge lookup
            nodes["step_1"] = DAGNode(
                node_id="step_1",
                title="Analyze and Retrieve Memory",
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

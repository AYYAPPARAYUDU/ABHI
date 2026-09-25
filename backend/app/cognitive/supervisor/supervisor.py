"""Central Supervisor Agent & Master State Machine."""

import asyncio
import time
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from backend.app.api.websockets.telemetry import manager as ws_manager
from backend.app.cognitive.planner.models import DAGNode, NodeStatus, TaskDAG
from backend.app.cognitive.planner.planner import task_planner
from backend.app.cognitive.registry.models import AgentTaskRequest
from backend.app.cognitive.registry.registry import agent_registry
from backend.app.cognitive.verification.verifier import dual_state_verifier
from backend.app.core.logging import logger
from backend.app.services.memory.repository import memory_repo


class SupervisorState(str, Enum):
    IDLE = "IDLE"
    PARSING_INTENT = "PARSING_INTENT"
    PLANNING = "PLANNING"
    WAITING_USER_CONSENT = "WAITING_USER_CONSENT"
    DISPATCHING = "DISPATCHING"
    VERIFYING = "VERIFYING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class TaskStatusResponse(BaseModel):
    task_id: str
    goal: str
    state: SupervisorState
    dag: Optional[TaskDAG] = None
    active_node_id: Optional[str] = None
    consent_required_node: Optional[DAGNode] = None
    error_message: Optional[str] = None
    created_at_ts: int = 0
    duration_ms: int = 0


class CentralSupervisor:
    """Central Orchestrator coordinating Planning, Agent Dispatching, Verification, and Human Consent."""

    def __init__(self):
        self._active_tasks: Dict[str, TaskStatusResponse] = {}
        self._pending_consents: Dict[str, asyncio.Event] = {}

    async def _emit_telemetry(self, task_id: str, event_type: str, payload: Dict[str, Any]):
        """Emit real-time telemetry message to all connected WebSocket clients."""
        await ws_manager.broadcast({
            "channel": "supervisor",
            "type": event_type,
            "task_id": task_id,
            "timestamp": int(time.time() * 1000),
            "payload": payload
        })

    async def submit_goal(self, goal: str, task_id: Optional[str] = None) -> TaskStatusResponse:
        """Entry point for initiating a new user goal."""
        import uuid
        tid = task_id or f"task_{uuid.uuid4().hex[:12]}"
        now_ts = int(time.time() * 1000)

        status_obj = TaskStatusResponse(
            task_id=tid,
            goal=goal,
            state=SupervisorState.PLANNING,
            created_at_ts=now_ts
        )
        self._active_tasks[tid] = status_obj

        # Persist task record in SQLite
        await memory_repo.create_task(goal=goal, task_id=tid)
        await self._emit_telemetry(tid, "TASK_CREATED", {"goal": goal, "state": "PLANNING"})

        # Spawn asynchronous background orchestration loop
        asyncio.create_task(self._orchestrate_task(tid, goal))
        return status_obj

    def get_task_status(self, task_id: str) -> Optional[TaskStatusResponse]:
        """Retrieve current in-memory or persisted task status."""
        return self._active_tasks.get(task_id)

    async def provide_consent(self, task_id: str, node_id: str, approved: bool) -> bool:
        """Handle human-in-the-loop consent approval for Tier 3 Critical actions."""
        status_obj = self._active_tasks.get(task_id)
        if not status_obj or status_obj.state != SupervisorState.WAITING_USER_CONSENT:
            return False

        if task_id in self._pending_consents:
            status_obj.consent_required_node = None
            if approved:
                logger.info(f"User APPROVED Tier 3 action on node '{node_id}' for task '{task_id}'")
                status_obj.state = SupervisorState.DISPATCHING
                self._pending_consents[task_id].set()
                return True
            else:
                logger.warning(f"User REJECTED Tier 3 action on node '{node_id}' for task '{task_id}'")
                status_obj.state = SupervisorState.CANCELLED
                status_obj.error_message = "Action rejected by user."
                self._pending_consents[task_id].set()
                return True
        return False

    async def cancel_task(self, task_id: str) -> bool:
        """Emergency Stop & Task Cancellation."""
        status_obj = self._active_tasks.get(task_id)
        if not status_obj:
            return False

        logger.warning(f"Emergency Stop invoked for task '{task_id}'")
        status_obj.state = SupervisorState.CANCELLED
        status_obj.error_message = "Task cancelled by emergency stop."

        if task_id in self._pending_consents:
            self._pending_consents[task_id].set()

        await memory_repo.update_task_state(task_id=task_id, state="CANCELLED", error_message="Cancelled by user")
        await self._emit_telemetry(task_id, "TASK_CANCELLED", {"reason": "Emergency Stop"})
        return True

    async def _orchestrate_task(self, task_id: str, goal: str):
        """Autonomous execution loop traversing the Task DAG."""
        status_obj = self._active_tasks[task_id]
        start_ts = time.perf_counter()

        try:
            # 1. Generate Task DAG Plan
            dag = await task_planner.create_plan(task_id=task_id, goal=goal)
            status_obj.dag = dag
            await memory_repo.update_task_state(task_id=task_id, state="PLANNING", dag_data=dag.model_dump())
            await self._emit_telemetry(task_id, "PLAN_GENERATED", {"nodes_count": len(dag.nodes)})

            # 2. Execute DAG nodes topologically
            while not dag.is_complete and not dag.is_failed:
                if status_obj.state == SupervisorState.CANCELLED:
                    break

                runnable_nodes = dag.get_runnable_nodes()
                if not runnable_nodes:
                    # Check if all completed or stuck in dependency deadlock
                    if dag.is_complete:
                        break
                    else:
                        raise RuntimeError("DAG execution deadlocked: no runnable nodes found.")

                for node in runnable_nodes:
                    if status_obj.state == SupervisorState.CANCELLED:
                        break

                    # Check Tier 3 Consent Gate
                    if node.risk_tier == "Tier 3":
                        status_obj.state = SupervisorState.WAITING_USER_CONSENT
                        status_obj.consent_required_node = node
                        node.status = NodeStatus.WAITING_CONSENT
                        await self._emit_telemetry(task_id, "CONSENT_REQUIRED", {
                            "node_id": node.node_id,
                            "title": node.title,
                            "action": node.action
                        })

                        event = asyncio.Event()
                        self._pending_consents[task_id] = event
                        await event.wait()
                        del self._pending_consents[task_id]

                        if status_obj.state == SupervisorState.CANCELLED:
                            node.status = NodeStatus.SKIPPED
                            break

                    # Dispatch Node Execution
                    status_obj.state = SupervisorState.DISPATCHING
                    status_obj.active_node_id = node.node_id
                    node.status = NodeStatus.RUNNING
                    await self._emit_telemetry(task_id, "NODE_STARTED", {"node_id": node.node_id, "title": node.title})

                    req = AgentTaskRequest(
                        task_id=task_id,
                        node_id=node.node_id,
                        action=node.action,
                        params=node.params
                    )
                    exec_result = await agent_registry.dispatch(req, node.agent_id)

                    # Verification Pass
                    status_obj.state = SupervisorState.VERIFYING
                    await self._emit_telemetry(task_id, "VERIFYING_NODE", {"node_id": node.node_id})
                    ver_result = await dual_state_verifier.verify_step(node, exec_result)

                    if ver_result.is_valid:
                        dag.update_node_status(
                            node_id=node.node_id,
                            status=NodeStatus.COMPLETED,
                            result_data=exec_result.data,
                            duration_ms=exec_result.execution_duration_ms
                        )
                        await self._emit_telemetry(task_id, "NODE_COMPLETED", {
                            "node_id": node.node_id,
                            "duration_ms": exec_result.execution_duration_ms
                        })
                    else:
                        # Auto-correction / Retry logic
                        node.retry_count += 1
                        if node.retry_count <= node.max_retries and ver_result.retryable:
                            logger.warning(
                                f"Node '{node.node_id}' failed verification (Attempt {node.retry_count}/{node.max_retries}). Retrying..."
                            )
                            node.status = NodeStatus.PENDING
                        else:
                            dag.update_node_status(
                                node_id=node.node_id,
                                status=NodeStatus.FAILED,
                                error_message=ver_result.difference_detected
                            )
                            status_obj.state = SupervisorState.FAILED
                            status_obj.error_message = f"Node '{node.node_id}' failed: {ver_result.difference_detected}"
                            break

            # 3. Finalize Task Outcome
            duration = int((time.perf_counter() - start_ts) * 1000)
            status_obj.duration_ms = duration
            if dag.is_complete and status_obj.state != SupervisorState.CANCELLED:
                status_obj.state = SupervisorState.COMPLETED
                status_obj.active_node_id = None
                await memory_repo.update_task_state(
                    task_id=task_id,
                    state="COMPLETED",
                    dag_data=dag.model_dump(),
                    duration_ms=duration
                )
                await self._emit_telemetry(task_id, "TASK_COMPLETED", {"duration_ms": duration})
            elif status_obj.state != SupervisorState.CANCELLED:
                status_obj.state = SupervisorState.FAILED
                await memory_repo.update_task_state(
                    task_id=task_id,
                    state="FAILED",
                    dag_data=dag.model_dump(),
                    error_message=status_obj.error_message,
                    duration_ms=duration
                )
                await self._emit_telemetry(task_id, "TASK_FAILED", {"error": status_obj.error_message})

        except Exception as e:
            duration = int((time.perf_counter() - start_ts) * 1000)
            logger.error(f"Supervisor error orchestrating task '{task_id}': {str(e)}")
            status_obj.state = SupervisorState.FAILED
            status_obj.error_message = str(e)
            status_obj.duration_ms = duration
            await memory_repo.update_task_state(
                task_id=task_id,
                state="FAILED",
                error_message=str(e),
                duration_ms=duration
            )
            await self._emit_telemetry(task_id, "TASK_FAILED", {"error": str(e)})


# Global Central Supervisor singleton
central_supervisor = CentralSupervisor()

"""Integration tests for Supervisor state machine and autonomous orchestration."""

import asyncio
import pytest
from backend.app.cognitive.supervisor.supervisor import SupervisorState, central_supervisor
import backend.app.cognitive.registry.builtin_agents # Ensure agents registered
from backend.app.services.memory.database import init_db


@pytest.mark.asyncio
async def test_supervisor_goal_submission_and_completion():
    await init_db()
    status_obj = await central_supervisor.submit_goal(goal="search local documentation for architecture")
    assert status_obj.task_id is not None

    # Wait for async execution loop to complete (up to 30 seconds for local 8B LLM)
    for _ in range(60):
        await asyncio.sleep(0.5)
        current = central_supervisor.get_task_status(status_obj.task_id)
        if current and current.state in [SupervisorState.COMPLETED, SupervisorState.FAILED, SupervisorState.CANCELLED]:
            break

    final_status = central_supervisor.get_task_status(status_obj.task_id)
    assert final_status is not None
    assert final_status.state in [SupervisorState.COMPLETED, SupervisorState.FAILED]


@pytest.mark.asyncio
async def test_supervisor_emergency_stop():
    await init_db()
    status_obj = await central_supervisor.submit_goal(goal="long running task to cancel")
    # Cancel task immediately
    cancelled = await central_supervisor.cancel_task(status_obj.task_id)
    assert cancelled is True

    final_status = central_supervisor.get_task_status(status_obj.task_id)
    assert final_status.state == SupervisorState.CANCELLED

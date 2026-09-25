"""Unit tests for Supervisor Pause, Resume, and Emergency Stop state transitions."""

import pytest
from backend.app.cognitive.supervisor.supervisor import central_supervisor, SupervisorState
from backend.app.services.memory.database import init_db


@pytest.mark.asyncio
async def test_supervisor_pause_and_resume():
    await init_db()
    task = await central_supervisor.submit_goal("Test goal for pause and resume")
    tid = task.task_id

    # Pause task
    ok_pause = await central_supervisor.pause_task(tid, reason="Mouse motion detected")
    assert ok_pause is True
    status = central_supervisor.get_task_status(tid)
    assert status.state == SupervisorState.PAUSED_USER_INTERFERENCE

    # Resume task
    ok_resume = await central_supervisor.resume_task(tid)
    assert ok_resume is True
    status_resumed = central_supervisor.get_task_status(tid)
    assert status_resumed.state in [SupervisorState.DISPATCHING, SupervisorState.COMPLETED, SupervisorState.PLANNING]


@pytest.mark.asyncio
async def test_supervisor_cancel_while_paused():
    await init_db()
    task = await central_supervisor.submit_goal("Test cancel during pause")
    tid = task.task_id

    await central_supervisor.pause_task(tid, reason="User manual control")
    status = central_supervisor.get_task_status(tid)
    assert status.state == SupervisorState.PAUSED_USER_INTERFERENCE

    # Cancel while paused
    ok_cancel = await central_supervisor.cancel_task(tid)
    assert ok_cancel is True
    assert central_supervisor.get_task_status(tid).state == SupervisorState.CANCELLED


@pytest.mark.asyncio
async def test_supervisor_emergency_stop_while_paused():
    await init_db()
    task = await central_supervisor.submit_goal("Test emergency stop during pause")
    tid = task.task_id

    await central_supervisor.pause_task(tid, reason="Contention")
    assert central_supervisor.get_task_status(tid).state == SupervisorState.PAUSED_USER_INTERFERENCE

    # Emergency stop
    ok_stop = await central_supervisor.emergency_stop(tid)
    assert ok_stop is True
    assert central_supervisor.get_task_status(tid).state == SupervisorState.EMERGENCY_STOPPED

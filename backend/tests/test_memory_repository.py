"""Unit tests for SQLite memory repository (Tasks, Episodic Memory, User Profile)."""

import pytest
from backend.app.services.memory.database import init_db
from backend.app.services.memory.repository import memory_repo


@pytest.mark.asyncio
async def test_task_execution_lifecycle():
    await init_db()
    task = await memory_repo.create_task(goal="Test Task Goal")
    assert task.task_id is not None
    assert task.state == "PLANNING"
    assert task.goal == "Test Task Goal"

    # Update state
    updated = await memory_repo.update_task_state(
        task_id=task.task_id,
        state="COMPLETED",
        dag_data={"steps": ["s1", "s2"]},
        duration_ms=120
    )
    assert updated.state == "COMPLETED"
    assert updated.duration_ms == 120
    assert updated.completed_at is not None


@pytest.mark.asyncio
async def test_episodic_memory_crud():
    await init_db()
    rec = await memory_repo.save_episodic_memory(
        context_summary="User asked for weather lookup",
        solution_summary="Opened weather API and returned 24C sunny",
        category="weather",
        tags="weather,api"
    )
    assert rec.memory_id.startswith("mem_")
    assert rec.category == "weather"

    memories = await memory_repo.list_recent_memories(limit=5, category="weather")
    assert len(memories) > 0
    assert any(m.memory_id == rec.memory_id for m in memories)


@pytest.mark.asyncio
async def test_user_profile_preferences():
    await init_db()
    await memory_repo.set_user_profile("theme", {"mode": "dark", "accent": "#00f0ff"})
    val = await memory_repo.get_user_profile("theme")
    assert val == {"mode": "dark", "accent": "#00f0ff"}

    # Update
    await memory_repo.set_user_profile("theme", {"mode": "cyberpunk", "accent": "#ff007f"})
    val_updated = await memory_repo.get_user_profile("theme")
    assert val_updated == {"mode": "cyberpunk", "accent": "#ff007f"}

"""Unit tests for Agent Registry and specialized agent dispatch."""

import pytest
from backend.app.cognitive.registry.models import AgentTaskRequest
from backend.app.cognitive.registry.registry import agent_registry
import backend.app.cognitive.registry.builtin_agents # Ensure built-in agents are registered
from backend.app.services.memory.database import init_db


@pytest.mark.asyncio
async def test_agent_registry_discovery():
    agents = agent_registry.list_agents()
    assert len(agents) >= 4
    agent_ids = [a.agent_id for a in agents]
    assert "rag_agent" in agent_ids
    assert "memory_agent" in agent_ids
    assert "coding_agent" in agent_ids
    assert "os_desktop_agent" in agent_ids


@pytest.mark.asyncio
async def test_agent_dispatch_success(tmp_path):
    await init_db()
    test_file = str(tmp_path / "hello.txt")

    # Dispatch write_file to coding_agent
    req_write = AgentTaskRequest(
        task_id="t1",
        node_id="n1",
        action="write_file",
        params={"path": test_file, "content": "Hello Autonomous Agent"}
    )
    res_write = await agent_registry.dispatch(req_write, "coding_agent")
    assert res_write.success is True
    assert res_write.data.get("bytes_written") == len("Hello Autonomous Agent")

    # Dispatch read_file to coding_agent
    req_read = AgentTaskRequest(
        task_id="t1",
        node_id="n2",
        action="read_file",
        params={"path": test_file}
    )
    res_read = await agent_registry.dispatch(req_read, "coding_agent")
    assert res_read.success is True
    assert res_read.data.get("content") == "Hello Autonomous Agent"

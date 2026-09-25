"""Unit tests for Dual-State Verification Engine."""

import pytest
from backend.app.cognitive.planner.models import DAGNode, NodeStatus
from backend.app.cognitive.registry.models import AgentTaskResult
from backend.app.cognitive.verification.verifier import dual_state_verifier


@pytest.mark.asyncio
async def test_verification_success():
    node = DAGNode(
        node_id="n1",
        title="Search Action",
        agent_id="rag_agent",
        action="hybrid_search"
    )
    result = AgentTaskResult(
        task_id="t1",
        node_id="n1",
        agent_id="rag_agent",
        action="hybrid_search",
        success=True,
        data={"results": [{"source": "a.txt", "score": 0.9}]}
    )
    ver = await dual_state_verifier.verify_step(node, result)
    assert ver.is_valid is True
    assert ver.confidence_score == 1.0


@pytest.mark.asyncio
async def test_verification_failure_detection():
    node = DAGNode(
        node_id="n2",
        title="Failed Write",
        agent_id="coding_agent",
        action="write_file",
        params={"path": "non_existent_folder/file.txt"}
    )
    result = AgentTaskResult(
        task_id="t2",
        node_id="n2",
        agent_id="coding_agent",
        action="write_file",
        success=False,
        error_message="Permission denied"
    )
    ver = await dual_state_verifier.verify_step(node, result)
    assert ver.is_valid is False
    assert ver.retryable is True
    assert "Permission denied" in ver.difference_detected

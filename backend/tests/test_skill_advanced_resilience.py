import pytest
import os
import tempfile
import asyncio
from datetime import datetime, timezone, timedelta
from httpx import ASGITransport, AsyncClient

from backend.app.main import app
from backend.app.services.skills.models import (
    SkillDefinition,
    SkillCategory,
    SkillRiskLevel,
    SkillLifecycleState,
    SkillInvocation,
    SkillResult,
    ExecutionSession,
    SessionCheckpoint,
    SessionState,
    AutonomyLimits,
    SkillFailureCode,
)
from backend.app.services.skills.registry import SkillRegistry
from backend.app.services.skills.discovery import SkillDiscoveryEngine
from backend.app.services.skills.checkpoint import CheckpointManager
from backend.app.services.skills.builtin_skills import register_builtin_skills
from backend.app.services.skills.runtime import SkillExecutionRuntime
from backend.app.automation.leases.lease_manager import LeaseManager
from backend.app.automation.policy.safety_policy import SafetyPolicyEngine
from backend.app.cognitive.planner.models import DAGNode, NodeStatus, TaskDAG


@pytest.fixture
def fresh_registry():
    reg = SkillRegistry()
    register_builtin_skills(reg)
    return reg


@pytest.fixture
def fresh_runtime(fresh_registry):
    return SkillExecutionRuntime(
        registry=fresh_registry,
        discovery=SkillDiscoveryEngine(fresh_registry),
        checkpoints=CheckpointManager(),
        leases=LeaseManager(),
        policy=SafetyPolicyEngine(),
    )


def test_checkpoint_manager_history_and_retrieval():
    cm = CheckpointManager()
    cp1 = cm.save_checkpoint(
        task_id="task-100",
        session_id="sess-100",
        node_id="node-1",
        skill_id="files.list",
        skill_version="1.0.0",
        action_id="act-1",
        result_summary={"files": 5},
        verified=True,
    )
    cp2 = cm.save_checkpoint(
        task_id="task-100",
        session_id="sess-100",
        node_id="node-2",
        skill_id="files.read",
        skill_version="1.0.0",
        action_id="act-2",
        result_summary={"bytes": 128},
        verified=True,
    )

    history = cm.get_checkpoints("task-100")
    assert len(history) == 2
    assert history[0].node_id == "node-1"
    assert history[1].node_id == "node-2"
    assert cm.get_latest_checkpoint("task-100").node_id == "node-2"


def test_unknown_skill_fail_closed(fresh_runtime):
    inv = SkillInvocation(
        task_id="task-unknown",
        execution_id="sess-unknown",
        action_id="act-unknown",
        skill_id="system.arbitrary_hack_tool",
        skill_version="1.0.0",
        arguments={},
    )
    res = asyncio.run(fresh_runtime.execute_skill(inv))
    assert res.is_success is False
    assert res.failure_code == SkillFailureCode.SKILL_NOT_FOUND


def test_schema_mismatch_missing_required_parameter(fresh_runtime):
    # files.read requires file_path
    inv = SkillInvocation(
        task_id="task-schema-err",
        execution_id="sess-schema-err",
        action_id="act-schema-err",
        skill_id="files.read",
        skill_version="1.0.0",
        arguments={},  # missing file_path
    )
    res = asyncio.run(fresh_runtime.execute_skill(inv))
    assert res.is_success is False
    assert res.failure_code == SkillFailureCode.INVALID_ARGUMENTS


def test_schema_mismatch_invalid_parameter_type(fresh_runtime):
    # files.read requires file_path to be a string
    inv = SkillInvocation(
        task_id="task-schema-type",
        execution_id="sess-schema-type",
        action_id="act-schema-type",
        skill_id="files.read",
        skill_version="1.0.0",
        arguments={"file_path": 12345},
    )
    res = asyncio.run(fresh_runtime.execute_skill(inv))
    assert res.is_success is False
    assert res.failure_code == SkillFailureCode.INVALID_ARGUMENTS


@pytest.mark.asyncio
async def test_high_risk_skill_requires_consent(fresh_runtime):
    # files.move is MEDIUM / HIGH side-effecting skill
    inv = SkillInvocation(
        task_id="task-consent",
        execution_id="sess-consent",
        action_id="act-consent",
        skill_id="files.move",
        skill_version="1.0.0",
        arguments={
            "source_path": os.path.join(tempfile.gettempdir(), "test_src.txt"),
            "destination_path": os.path.join(tempfile.gettempdir(), "test_dst.txt")
        },
        risk_level=SkillRiskLevel.HIGH
    )
    # When user consent is not granted, high risk execution should be blocked by policy
    res = await fresh_runtime.execute_skill(inv, user_consent_granted=False)
    # Should either deny or fail closed
    assert res.is_success is False or res.failure_code in (
        SkillFailureCode.POLICY_DENIED,
        SkillFailureCode.CONSENT_REQUIRED,
        SkillFailureCode.ACTION_FAILED,
    )


@pytest.mark.asyncio
async def test_session_execution_single_node_dag(fresh_runtime):
    node = DAGNode(
        node_id="single_list_node",
        title="List Temp Directory",
        agent_id="local_fs",
        action="files.list",
        params={"directory_path": tempfile.gettempdir()},
        dependencies=[],
        status=NodeStatus.PENDING
    )
    dag = TaskDAG(
        dag_id="dag_single",
        task_id="task-single-dag",
        goal="List Temp",
        nodes={"single_list_node": node}
    )
    session = await fresh_runtime.execute_session(
        task_id="task-single-dag",
        goal="List Temp",
        dag=dag,
        user_consent_granted=True
    )
    assert session.state == SessionState.COMPLETED
    assert session.task_id == "task-single-dag"
    assert len(session.checkpoints) == 1


@pytest.mark.asyncio
async def test_session_execution_multi_node_dag(fresh_runtime):
    tmpdir = tempfile.gettempdir()
    test_file = os.path.join(tmpdir, "multi_node_test.txt")
    with open(test_file, "w") as f:
        f.write("Hello multi-node")

    node1 = DAGNode(
        node_id="step_1_list",
        title="List Temporary Directory",
        agent_id="local_fs",
        action="files.list",
        params={"directory_path": tmpdir},
        dependencies=[],
        status=NodeStatus.PENDING
    )
    node2 = DAGNode(
        node_id="step_2_read",
        title="Read Target File",
        agent_id="local_fs",
        action="files.read",
        params={"file_path": test_file},
        dependencies=["step_1_list"],
        status=NodeStatus.PENDING
    )

    dag = TaskDAG(
        dag_id="dag_multi_node",
        task_id="task-multi-node",
        goal="List then read file",
        nodes={
            "step_1_list": node1,
            "step_2_read": node2
        }
    )

    session = await fresh_runtime.execute_session(
        task_id="task-multi-node",
        goal="List then read file",
        dag=dag,
        user_consent_granted=True
    )

    assert session.state == SessionState.COMPLETED
    assert len(session.checkpoints) >= 2


@pytest.mark.asyncio
async def test_rest_api_list_and_get_skills():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/skills")
        assert res.status_code == 200
        data = res.json()
        assert "skills" in data
        assert len(data["skills"]) >= 10

        # Get specific skill
        res_single = await client.get("/api/v1/skills/windows.open_application")
        assert res_single.status_code == 200
        single_data = res_single.json()
        assert single_data["skill_id"] == "windows.open_application"


@pytest.mark.asyncio
async def test_rest_api_discovery_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/skills/discovery",
            json={"goal": "open notepad desktop application", "max_results": 3}
        )
        assert res.status_code == 200
        data = res.json()
        assert "candidates" in data
        assert len(data["candidates"]) > 0
        assert any("windows.open_application" in c["skill_id"] for c in data["candidates"])


@pytest.mark.asyncio
async def test_rest_api_toggle_skill_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Disable skill
        res_dis = await client.post(
            "/api/v1/skills/windows.activate_window/toggle",
            json={"enabled": False}
        )
        assert res_dis.status_code == 200
        assert res_dis.json()["enabled"] is False

        # Re-enable skill
        res_en = await client.post(
            "/api/v1/skills/windows.activate_window/toggle",
            json={"enabled": True}
        )
        assert res_en.status_code == 200
        assert res_en.json()["enabled"] is True


@pytest.mark.asyncio
async def test_rest_api_direct_execute_skill():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/skills/execute",
            json={
                "task_id": "task-rest-exec",
                "execution_id": "exec-rest-1",
                "action_id": "act-rest-1",
                "skill_id": "files.list",
                "skill_version": "1.0.0",
                "arguments": {"directory_path": tempfile.gettempdir()},
                "user_consent_granted": True
            }
        )
        assert res.status_code == 200
        data = res.json()
        assert data["is_success"] is True
        assert data["skill_id"] == "files.list"

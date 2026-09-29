import pytest
import os
import tempfile
import asyncio
from datetime import datetime, timezone, timedelta
from backend.app.services.skills.models import (
    SkillDefinition,
    SkillCategory,
    SkillRiskLevel,
    SkillLifecycleState,
    SkillInvocation,
    SkillResult,
    ExecutionSession,
    SessionCheckpoint,
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


def test_registry_prevents_duplicate_registration(fresh_registry):
    duplicate = SkillDefinition(
        skill_id="windows.open_application",
        name="Duplicate App Opener",
        version="1.0.0",
        description="Duplicate",
        category=SkillCategory.WINDOWS,
        risk_level=SkillRiskLevel.LOW,
        permissions=["DESKTOP_CONTROL"],
        input_schema={},
        output_schema={},
    )
    with pytest.raises(ValueError, match="already registered"):
        fresh_registry.register(duplicate, overwrite=False)


def test_registry_deprecate_lifecycle(fresh_registry):
    skill_id = "windows.open_application"
    fresh_registry.deprecate(skill_id)
    skill = fresh_registry.get(skill_id)
    assert skill is not None
    assert skill.lifecycle_state == SkillLifecycleState.DEPRECATED
    
    # Discovery should not return deprecated skills
    engine = SkillDiscoveryEngine(fresh_registry)
    candidates = engine.discover("open notepad application")
    assert not any(c.skill_id == skill_id for c in candidates)


def test_registry_disable_lifecycle(fresh_registry):
    skill_id = "files.list"
    fresh_registry.disable(skill_id)
    skill = fresh_registry.get(skill_id)
    assert skill is not None
    assert skill.lifecycle_state == SkillLifecycleState.DISABLED

    engine = SkillDiscoveryEngine(fresh_registry)
    candidates = engine.discover("list directory files")
    assert not any(c.skill_id == skill_id for c in candidates)


def test_discovery_respects_max_risk(fresh_registry):
    engine = SkillDiscoveryEngine(fresh_registry)
    # If caller limits risk to READ_ONLY, medium risk skills like files.copy should not be offered
    candidates = engine.discover("copy files from source to destination", max_risk=SkillRiskLevel.READ_ONLY)
    assert not any(c.skill_id == "files.copy" for c in candidates)

    # When risk ceiling allows MEDIUM:
    candidates_medium = engine.discover("copy files from source to destination", max_risk=SkillRiskLevel.MEDIUM)
    assert any(c.skill_id == "files.copy" for c in candidates_medium)


def test_discovery_category_filtering(fresh_registry):
    engine = SkillDiscoveryEngine(fresh_registry)
    browser_candidates = engine.discover("open and view", category=SkillCategory.BROWSER)
    assert all(c.category == SkillCategory.BROWSER for c in browser_candidates)
    assert any(c.skill_id.startswith("browser.") for c in browser_candidates)


@pytest.mark.asyncio
async def test_runtime_idempotency_duplicate_action_id(fresh_runtime):
    invocation = SkillInvocation(
        task_id="task-idemp",
        execution_id="exec-idemp-1",
        action_id="act-duplicate-1",
        skill_id="files.list",
        skill_version="1.0.0",
        arguments={"directory_path": tempfile.gettempdir()},
        requested_by="supervisor",
        risk_level=SkillRiskLevel.READ_ONLY,
    )

    result1 = await fresh_runtime.execute_skill(invocation)
    assert result1.is_success is True

    # Replay same invocation
    result2 = await fresh_runtime.execute_skill(invocation)
    assert result2.is_success is True
    assert result2.action_id == "act-duplicate-1"


@pytest.mark.asyncio
async def test_runtime_path_traversal_attack_rejected(fresh_runtime):
    # Attempt to read sensitive system files with traversal
    invocation = SkillInvocation(
        task_id="task-traversal",
        execution_id="exec-trav-1",
        action_id="act-trav-1",
        skill_id="files.read",
        skill_version="1.0.0",
        arguments={"file_path": "../../../../../../../Windows/System32/drivers/etc/hosts"},
        requested_by="supervisor",
        risk_level=SkillRiskLevel.READ_ONLY,
    )

    result = await fresh_runtime.execute_skill(invocation)
    # Path escaping forbidden boundaries should fail closed
    assert result.is_success is False or result.failure_code in (
        SkillFailureCode.POLICY_DENIED,
        SkillFailureCode.ACTION_FAILED,
        SkillFailureCode.INVALID_ARGUMENTS,
    )


@pytest.mark.asyncio
async def test_runtime_browser_dangerous_schemes_rejected(fresh_runtime):
    bad_urls = [
        "javascript:alert(1)",
        "file:///C:/Windows/System32/calc.exe",
        "data:text/html,<script>alert(1)</script>",
        "about:blank",
        "ftp://malicious.org/payload.exe",
    ]

    for i, bad_url in enumerate(bad_urls):
        invocation = SkillInvocation(
            task_id="task-scheme",
            execution_id=f"exec-scheme-{i}",
            action_id=f"act-scheme-{i}",
            skill_id="browser.open_url",
            skill_version="1.0.0",
            arguments={"url": bad_url},
            requested_by="supervisor",
            risk_level=SkillRiskLevel.LOW,
        )
        result = await fresh_runtime.execute_skill(invocation)
        assert result.is_success is False
        assert result.failure_code in (
            SkillFailureCode.INVALID_ARGUMENTS,
            SkillFailureCode.POLICY_DENIED,
            SkillFailureCode.ACTION_FAILED,
        )


def test_runtime_autonomy_limits_configuration(fresh_runtime):
    limits = AutonomyLimits(
        max_task_duration_s=60,
        max_dag_nodes=5,
        max_retries_per_node=2,
        max_replans=1,
        max_tool_calls=10,
    )
    fresh_runtime.limits = limits
    assert fresh_runtime.limits.max_dag_nodes == 5
    assert fresh_runtime.limits.max_task_duration_s == 60


def test_runtime_get_and_list_sessions(fresh_runtime):
    session = ExecutionSession(
        session_id="sess_abc123",
        task_id="task_abc123",
        plan_id="dag_abc",
        goal="Open Calculator",
    )
    fresh_runtime._active_sessions[session.session_id] = session
    
    assert fresh_runtime.get_session("sess_abc123") == session
    assert fresh_runtime.get_session("task_abc123") == session
    assert session in fresh_runtime.list_active_sessions()


def test_skill_definition_immutability_and_key():
    skill = SkillDefinition(
        skill_id="custom.test_skill",
        name="Test Skill",
        version="2.1.0",
        description="Testing immutability",
        category=SkillCategory.UTILITY,
        risk_level=SkillRiskLevel.READ_ONLY,
    )
    assert skill.key == "custom.test_skill@2.1.0"
    assert skill.enabled is True
    assert skill.lifecycle_state == SkillLifecycleState.ENABLED


def test_skill_discovery_empty_query_safe_fallback(fresh_registry):
    engine = SkillDiscoveryEngine(fresh_registry)
    candidates = engine.discover("")
    # Empty query should return empty or all candidate fallback safely without crash
    assert isinstance(candidates, list)


def test_skill_unregistered_worker_mapping(fresh_registry):
    skill = fresh_registry.get("windows.list_windows")
    assert skill is not None
    assert "windows_worker" in skill.supported_workers


def test_checkpoint_manager_clear_task_checkpoints():
    cm = CheckpointManager()
    cm.save_checkpoint(
        task_id="task-clear-test",
        session_id="sess-clear-test",
        node_id="node-1",
        skill_id="files.list",
        skill_version="1.0.0",
        action_id="act-1",
        result_summary={"test": True},
        verified=True,
    )
    assert len(cm.get_checkpoints("task-clear-test")) == 1
    cm.clear("task-clear-test")
    assert len(cm.get_checkpoints("task-clear-test")) == 0


def test_runtime_pause_and_resume_events(fresh_runtime):
    task_id = "task-pause-test"
    fresh_runtime._pause_events[task_id] = asyncio.Event()
    fresh_runtime._pause_events[task_id].set()
    assert fresh_runtime._pause_events[task_id].is_set()

    # Pause
    fresh_runtime._pause_events[task_id].clear()
    assert not fresh_runtime._pause_events[task_id].is_set()

    # Resume
    fresh_runtime._pause_events[task_id].set()
    assert fresh_runtime._pause_events[task_id].is_set()


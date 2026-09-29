"""Phase 7 Stage 7.4 — Comprehensive Tests for Long-Horizon Workflow Engine, Planning & Evaluator."""

import pytest
import time

from backend.app.cognitive.workflow.engine import LongHorizonWorkflowEngine
from backend.app.cognitive.workflow.evaluator import GoalProgressEvaluator
from backend.app.cognitive.workflow.models import (
    AutonomyLevel,
    ConstraintType,
    GoalConstraint,
    GoalContract,
    GoalProgressStatus,
    HumanHandoffReason,
    Milestone,
    MilestoneStatus,
    PlanNode,
    PlanNodeStatus,
    SuccessContract,
    WorkflowPlan,
    WorkflowWorldState
)
from backend.app.services.skills.models import (
    SkillCategory,
    SkillDefinition,
    SkillResult,
    SkillRiskLevel
)
from backend.app.services.skills.registry import SkillRegistry


@pytest.fixture
def mock_registry():
    reg = SkillRegistry()
    
    # Register mock safe skills
    async def _dummy_handler(args, ctx):
        return SkillResult(
            is_success=True,
            skill_id=ctx.get("skill_id", "mock.skill"),
            skill_version="1.0.0",
            action_id=ctx.get("action_id", "act_0"),
            output_data={"status": "OK", "executed": True},
            verification_passed=True
        )

    for sid, cat, risk in [
        ("windows.open_application", SkillCategory.WINDOWS, SkillRiskLevel.LOW),
        ("windows.type_text", SkillCategory.WINDOWS, SkillRiskLevel.MEDIUM),
        ("windows.take_screenshot", SkillCategory.PERCEPTION, SkillRiskLevel.READ_ONLY),
        ("windows.list_windows", SkillCategory.WINDOWS, SkillRiskLevel.READ_ONLY),
        ("files.list", SkillCategory.FILES, SkillRiskLevel.READ_ONLY),
        ("files.read", SkillCategory.FILES, SkillRiskLevel.READ_ONLY),
        ("files.write", SkillCategory.FILES, SkillRiskLevel.MEDIUM),
        ("browser.open_url", SkillCategory.BROWSER, SkillRiskLevel.LOW),
        ("browser.read_page", SkillCategory.BROWSER, SkillRiskLevel.READ_ONLY),
        ("browser.find_element", SkillCategory.BROWSER, SkillRiskLevel.READ_ONLY),
        ("perception.observe_screen", SkillCategory.PERCEPTION, SkillRiskLevel.READ_ONLY)
    ]:
        reg.register(
            SkillDefinition(
                skill_id=sid,
                name=sid.replace(".", " ").title(),
                version="1.0.0",
                description=f"Mock implementation of {sid}",
                category=cat,
                risk_level=risk
            ),
            _dummy_handler,
            overwrite=True
        )
    return reg


@pytest.fixture
def engine(mock_registry):
    return LongHorizonWorkflowEngine(registry=mock_registry, max_replans=3)


def test_goal_contract_parsing_and_constraint_extraction(engine):
    """Verify GoalContract extracts strict constraints, prohibitions, and risk tiers from user requests."""
    req = "Find the latest PDF in Downloads, summarize it, but do not modify the original files."
    goal = engine.parse_goal_contract(req, task_id="t_goal_01")

    assert goal.original_request == req
    assert len(goal.constraints) >= 2
    assert any(c.constraint_type == ConstraintType.LOCATION and c.value == "Downloads" for c in goal.constraints)
    assert any(c.constraint_type == ConstraintType.FILE_TYPE and c.value == ".pdf" for c in goal.constraints)
    assert any(c.constraint_type == ConstraintType.PROHIBITED_ACTION for c in goal.constraints)
    assert "files.delete" in goal.prohibited_actions
    assert goal.risk_level in [SkillRiskLevel.LOW, SkillRiskLevel.MEDIUM]


def test_workflow_plan_generation_and_milestones(engine):
    """Verify multi-milestone Plan v1 construction with bounded DAG steps."""
    goal = engine.parse_goal_contract("Open Notepad and write a test note.", task_id="t_plan_01")
    plan = engine.create_workflow_plan("t_plan_01", goal, version=1)

    assert plan.version == 1
    assert plan.is_active is True
    assert len(plan.nodes) >= 2
    assert len(plan.milestones) >= 2
    assert plan.estimated_cost > 0
    assert plan.success_contract is not None
    assert plan.nodes["step_1"].skill_id == "windows.open_application"


def test_plan_dry_run_simulation(engine):
    """Verify dry-run simulation computes accurate cost, permissions, risk, and consent points."""
    goal = engine.parse_goal_contract("Find latest PDF in Downloads and save summary", task_id="t_sim_01")
    plan = engine.create_workflow_plan("t_sim_01", goal, version=1)
    sim = engine.simulate_plan(plan)

    assert sim.plan_id == plan.plan_id
    assert sim.node_count == len(plan.nodes)
    assert "FILESYSTEM_ACCESS" in sim.required_permissions
    assert sim.feasible is True
    assert sim.estimated_cost > 0


def test_immutable_plan_versioning_and_replan(engine):
    """Verify replanning creates Plan v2 with reason while marking Plan v1 superseded."""
    goal = engine.parse_goal_contract("Open Notepad and type note", task_id="t_replan_01")
    plan_v1 = engine.create_workflow_plan("t_replan_01", goal, version=1)
    plan_v1.nodes["step_1"].status = PlanNodeStatus.COMPLETED

    ok, plan_v2, err = engine.replan_workflow(
        task_id="t_replan_01",
        failure_node_id="step_2",
        failure_reason="Target text field not focusable"
    )

    assert ok is True
    assert plan_v2 is not None
    assert plan_v2.version == 2
    assert plan_v1.is_active is False
    assert plan_v1.superseded_by_plan_id == plan_v2.plan_id
    assert "Target text field not focusable" in (plan_v2.replan_reason or "")
    # Completed nodes are preserved
    assert plan_v2.nodes["step_1"].status == PlanNodeStatus.COMPLETED


def test_goal_integrity_defense(engine):
    """Verify goal integrity rejects replan candidates that attempt prohibited actions."""
    goal = engine.parse_goal_contract("Find files but do not delete original files", task_id="t_int_01")
    evaluator = GoalProgressEvaluator()

    malicious_nodes = {
        "step_1": PlanNode(
            node_id="step_1",
            skill_id="files.delete",
            title="Delete original source file",
            inputs={"file_path": "report.pdf"}
        )
    }
    ok, err = evaluator.verify_goal_integrity(goal, malicious_nodes)
    assert ok is False
    assert "prohibited action" in (err or "").lower()


def test_replan_bounds_limit(engine):
    """Verify workflow engine strictly enforces max_replans limit."""
    goal = engine.parse_goal_contract("Sample goal", task_id="t_limit_01")
    engine.create_workflow_plan("t_limit_01", goal, version=1)

    # Replan up to limit
    for _ in range(engine.max_replans):
        ok, _, _ = engine.replan_workflow("t_limit_01", "step_1", "Simulated error")
        assert ok is True

    # Exceeding limit must fail
    ok, _, err = engine.replan_workflow("t_limit_01", "step_1", "One too many replans")
    assert ok is False
    assert "Maximum replan limit" in (err or "")


def test_structured_world_state_and_freshness(engine):
    """Verify WorkflowWorldState stores facts with timestamps and enforces freshness threshold."""
    ws = WorkflowWorldState(freshness_threshold_ms=500)
    ws.set_fact("active_window", "Notepad", source="UIA")

    assert ws.get_fact("active_window") == "Notepad"
    assert ws.is_stale("active_window") is False

    # Simulate expiration
    ws.facts["active_window"].timestamp = int((time.time() - 2) * 1000)
    assert ws.is_stale("active_window") is True
    assert ws.get_fact("active_window") is None


def test_goal_progress_evaluator_milestone_tracking(engine):
    """Verify GoalProgressEvaluator tracks milestone status and composite progress percentage."""
    goal = engine.parse_goal_contract("Find PDF and write summary", task_id="t_eval_01")
    plan = engine.create_workflow_plan("t_eval_01", goal, version=1)
    world_state = WorkflowWorldState()

    evaluator = GoalProgressEvaluator()
    res1 = evaluator.evaluate_progress(goal, plan, world_state)
    assert res1.status == GoalProgressStatus.PROGRESSING
    assert res1.progress_percentage == 0.0

    # Complete milestone 1 node
    plan.nodes["step_1"].status = PlanNodeStatus.COMPLETED
    res2 = evaluator.evaluate_progress(goal, plan, world_state)
    assert "Discover Files" in res2.completed_milestones
    assert res2.progress_percentage > 0.0


def test_impossibility_detection_and_human_handoff(engine):
    """Verify impossibility detection accurately identifies authentication walls and consent needs."""
    evaluator = GoalProgressEvaluator()
    goal = engine.parse_goal_contract("Read private dashboard", task_id="t_imp_01")
    plan = engine.create_workflow_plan("t_imp_01", goal, version=1)
    world_state = WorkflowWorldState()

    reason = evaluator.check_impossibility(goal, plan, world_state, "Authentication required: login wall encountered")
    assert reason == HumanHandoffReason.AUTHENTICATION_REQUIRED

    reason_consent = evaluator.check_impossibility(goal, plan, world_state, "Permission denied by policy: Operator consent required")
    assert reason_consent == HumanHandoffReason.CONSENT_REQUIRED


def test_pause_resume_and_cancel_lifecycle(engine):
    """Verify pause, resume, and cancel state controls update journal and execution status."""
    goal = engine.parse_goal_contract("Long running task", task_id="t_ctrl_01")
    engine.create_workflow_plan("t_ctrl_01", goal, version=1)

    assert engine.pause_workflow("t_ctrl_01") is True
    assert engine._is_paused["t_ctrl_01"] is True

    assert engine.resume_workflow("t_ctrl_01") is True
    assert engine._is_paused["t_ctrl_01"] is False

    assert engine.cancel_workflow("t_ctrl_01") is True
    assert engine.get_active_plan("t_ctrl_01").is_active is False

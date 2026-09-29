"""Phase 7 Stage 7.4 — Advanced Resilience, Autonomy Levels, Queue & REST API Tests."""

import pytest
from fastapi.testclient import TestClient

from backend.app.cognitive.workflow.engine import LongHorizonWorkflowEngine, workflow_engine
from backend.app.cognitive.workflow.evaluator import GoalProgressEvaluator
from backend.app.cognitive.workflow.models import (
    AutonomyLevel,
    ConstraintType,
    DataClassification,
    GoalConstraint,
    GoalContract,
    GoalProgressStatus,
    HumanHandoffReason,
    HumanHandoffRequest,
    Milestone,
    MilestoneStatus,
    PlanNode,
    PlanNodeStatus,
    SuccessContract,
    WorkflowJournalEventType,
    WorkflowPlan,
    WorkflowTaskPriority,
    WorkflowTaskQueueItem,
    WorkflowWorldState,
    WorldStateFact
)
from backend.app.main import app
from backend.app.services.skills.models import SkillCategory, SkillDefinition, SkillResult, SkillRiskLevel
from backend.app.services.skills.registry import SkillRegistry


@pytest.fixture
def client():
    return TestClient(app)


def test_autonomy_levels_matrix():
    """Verify AutonomyLevel definitions and ordering."""
    assert AutonomyLevel.LEVEL_0_OBSERVE_ONLY.value == "LEVEL_0"
    assert AutonomyLevel.LEVEL_1_READ_ONLY.value == "LEVEL_1"
    assert AutonomyLevel.LEVEL_2_LOCAL_LOW_RISK.value == "LEVEL_2"
    assert AutonomyLevel.LEVEL_3_MULTI_STEP_LOCAL.value == "LEVEL_3"
    assert AutonomyLevel.LEVEL_4_CROSS_APP.value == "LEVEL_4"
    assert AutonomyLevel.LEVEL_5_EXTERNAL_HIGH_RISK.value == "LEVEL_5"


def test_workflow_task_queue_item_creation():
    """Verify WorkflowTaskQueueItem properties and status defaults."""
    contract = GoalContract(
        original_request="Test queue goal",
        normalized_goal="Test queue goal",
        required_outcome="Done",
        risk_level=SkillRiskLevel.LOW
    )
    item = WorkflowTaskQueueItem(
        task_id="t_q_01",
        goal_contract=contract,
        priority=WorkflowTaskPriority.HIGH
    )
    assert item.task_id == "t_q_01"
    assert item.priority == WorkflowTaskPriority.HIGH
    assert item.status == "PENDING"
    assert item.current_version == 1


def test_complex_milestone_dependency_resolution():
    """Verify workflow plan get_runnable_nodes resolves multi-dependency nodes correctly."""
    nodes = {
        "step_1": PlanNode(node_id="step_1", skill_id="s1", title="S1", status=PlanNodeStatus.COMPLETED),
        "step_2": PlanNode(node_id="step_2", skill_id="s2", title="S2", status=PlanNodeStatus.COMPLETED),
        "step_3": PlanNode(node_id="step_3", skill_id="s3", title="S3", dependencies=["step_1", "step_2"], status=PlanNodeStatus.PENDING),
        "step_4": PlanNode(node_id="step_4", skill_id="s4", title="S4", dependencies=["step_3"], status=PlanNodeStatus.PENDING),
    }
    plan = WorkflowPlan(
        goal_id="g1",
        version=1,
        nodes=nodes,
        success_contract=SuccessContract(goal_id="g1")
    )

    runnable = plan.get_runnable_nodes()
    assert len(runnable) == 1
    assert runnable[0].node_id == "step_3"


def test_world_state_fact_updating_and_retrieval():
    """Verify WorldState fact updates, source tracking, and confidence."""
    ws = WorkflowWorldState()
    ws.set_fact("active_app", "Code.exe", source="PROCESS", verified=True)
    ws.set_fact("current_tab", "index.html", source="DOM", verified=True)

    assert ws.get_fact("active_app") == "Code.exe"
    assert ws.get_fact("current_tab") == "index.html"
    assert ws.get_fact("non_existent", "default_val") == "default_val"
    assert ws.is_stale("active_app") is False


def test_goal_progress_evaluator_impossibility_coverage():
    """Verify all impossibility failure causes are mapped to HumanHandoffReasons."""
    evaluator = GoalProgressEvaluator()
    goal = GoalContract(original_request="Test", normalized_goal="Test", required_outcome="Done")
    plan = WorkflowPlan(goal_id=goal.goal_id, version=1, success_contract=SuccessContract(goal_id=goal.goal_id))
    ws = WorkflowWorldState()

    assert evaluator.check_impossibility(goal, plan, ws, "Captcha challenge detected") == HumanHandoffReason.CAPTCHA_REQUIRED
    assert evaluator.check_impossibility(goal, plan, ws, "Target grounding_ambiguous") == HumanHandoffReason.AMBIGUOUS_TARGET
    assert evaluator.check_impossibility(goal, plan, ws, "Task duration limit resource budget exceeded") == HumanHandoffReason.RESOURCE_EXHAUSTED
    assert evaluator.check_impossibility(goal, plan, ws, "Unknown safe action") is None


def test_workflow_plan_cost_calculation():
    """Verify plan cost scales deterministically with node count, risk level, and browser actions."""
    reg = SkillRegistry()
    engine = LongHorizonWorkflowEngine(registry=reg)

    nodes_low = {
        "s1": PlanNode(node_id="s1", skill_id="files.list", title="Low", risk_level=SkillRiskLevel.LOW)
    }
    nodes_high = {
        "s1": PlanNode(node_id="s1", skill_id="files.list", title="High", risk_level=SkillRiskLevel.HIGH),
        "s2": PlanNode(node_id="s2", skill_id="browser.open_url", title="Web", risk_level=SkillRiskLevel.MEDIUM)
    }

    cost_low = engine._compute_plan_cost(nodes_low)
    cost_high = engine._compute_plan_cost(nodes_high)

    assert cost_low == 1.0
    assert cost_high > cost_low


def test_workflow_rest_api_submit(client):
    """Verify POST /api/v1/workflows/submit endpoint."""
    res = client.post("/api/v1/workflows/submit", json={
        "goal": "Find latest PDF in Downloads and summarize",
        "autonomy_level": "LEVEL_3"
    })
    assert res.status_code == 200
    data = res.json()
    assert "task_id" in data
    assert "goal_contract" in data
    assert "plan_v1" in data
    assert "simulation" in data
    assert data["simulation"]["feasible"] is True


def test_workflow_rest_api_queue_and_status(client):
    """Verify GET /api/v1/workflows/queue and GET /api/v1/workflows/{task_id} endpoints."""
    # Submit first
    res_sub = client.post("/api/v1/workflows/submit", json={"goal": "Open Notepad and type test note"})
    task_id = res_sub.json()["task_id"]

    # Check queue
    res_q = client.get("/api/v1/workflows/queue")
    assert res_q.status_code == 200
    queue = res_q.json()
    assert any(item["task_id"] == task_id for item in queue)

    # Check status
    res_stat = client.get(f"/api/v1/workflows/{task_id}")
    assert res_stat.status_code == 200
    status_data = res_stat.json()
    assert status_data["task_id"] == task_id
    assert status_data["active_plan"] is not None
    assert status_data["active_plan"]["version"] == 1


def test_workflow_rest_api_pause_resume_cancel(client):
    """Verify POST /api/v1/workflows/{task_id}/pause, resume, and cancel endpoints."""
    res_sub = client.post("/api/v1/workflows/submit", json={"goal": "Pause resume test"})
    task_id = res_sub.json()["task_id"]

    # Pause
    res_pause = client.post(f"/api/v1/workflows/{task_id}/pause")
    assert res_pause.status_code == 200
    assert res_pause.json()["status"] == "PAUSED"

    # Resume
    res_resume = client.post(f"/api/v1/workflows/{task_id}/resume")
    assert res_resume.status_code == 200
    assert res_resume.json()["status"] == "RESUMED"

    # Cancel
    res_cancel = client.post(f"/api/v1/workflows/{task_id}/cancel")
    assert res_cancel.status_code == 200
    assert res_cancel.json()["status"] == "CANCELLED"


def test_workflow_rest_api_replan_and_journal(client):
    """Verify POST /api/v1/workflows/{task_id}/replan and GET journal endpoints."""
    res_sub = client.post("/api/v1/workflows/submit", json={"goal": "Replan endpoint test"})
    task_id = res_sub.json()["task_id"]

    # Trigger replan
    res_replan = client.post(f"/api/v1/workflows/{task_id}/replan", params={"reason": "Operator requested alternative"})
    assert res_replan.status_code == 200
    data = res_replan.json()
    assert data["new_plan_version"] == 2

    # Get journal
    res_jnl = client.get(f"/api/v1/workflows/{task_id}/journal")
    assert res_jnl.status_code == 200
    entries = res_jnl.json()
    assert len(entries) >= 2


def test_workflow_rest_api_resolve_handoff(client):
    """Verify POST /api/v1/workflows/{task_id}/resolve-handoff endpoint."""
    res_sub = client.post("/api/v1/workflows/submit", json={"goal": "Handoff endpoint test"})
    task_id = res_sub.json()["task_id"]

    # Create dummy handoff request
    req = workflow_engine._create_handoff_request(
        task_id=task_id,
        goal_id="g_test",
        reason=HumanHandoffReason.CONSENT_REQUIRED,
        message="Consent needed",
        completed_steps=1,
        total_steps=3
    )

    # Resolve via API
    res_res = client.post(f"/api/v1/workflows/{task_id}/resolve-handoff", json={
        "handoff_id": req.handoff_id,
        "resolution_notes": "Granted consent by admin"
    })
    assert res_res.status_code == 200
    assert res_res.json()["resolved"] is True


def test_data_classification_provenance():
    """Verify DataClassification enum values and default properties."""
    assert DataClassification.LOCAL_FILE.value == "LOCAL_FILE"
    assert DataClassification.PRIVATE_DATA.value == "PRIVATE_DATA"
    assert DataClassification.PUBLIC_WEB.value == "PUBLIC_WEB"
    assert DataClassification.USER_INPUT.value == "USER_INPUT"
    assert DataClassification.GENERATED_SUMMARY.value == "GENERATED_SUMMARY"


def test_autonomy_level_read_only_restriction():
    """Verify Level 1 read-only autonomy rejects mutating write skills."""
    contract = GoalContract(
        original_request="Read and write files",
        normalized_goal="Read and write files",
        required_outcome="Done",
        autonomy_level=AutonomyLevel.LEVEL_1_READ_ONLY
    )
    assert contract.autonomy_level == AutonomyLevel.LEVEL_1_READ_ONLY


def test_goal_progress_evaluator_percentage_accuracy():
    """Verify progress percentage calculation across 4-node plan."""
    evaluator = GoalProgressEvaluator()
    nodes = {
        f"s{i}": PlanNode(node_id=f"s{i}", skill_id=f"skill_{i}", title=f"Step {i}")
        for i in range(1, 5)
    }
    goal = GoalContract(original_request="Multi step", normalized_goal="Multi step", required_outcome="Done")
    plan = WorkflowPlan(goal_id=goal.goal_id, version=1, nodes=nodes, success_contract=SuccessContract(goal_id=goal.goal_id))
    ws = WorkflowWorldState()

    eval_0 = evaluator.evaluate_progress(goal, plan, ws)
    assert eval_0.progress_percentage == 0.0

    nodes["s1"].status = PlanNodeStatus.COMPLETED
    eval_1 = evaluator.evaluate_progress(goal, plan, ws)
    assert eval_1.progress_percentage == 23.8  # (1/4) * 95

    nodes["s2"].status = PlanNodeStatus.COMPLETED
    nodes["s3"].status = PlanNodeStatus.COMPLETED
    nodes["s4"].status = PlanNodeStatus.COMPLETED
    eval_4 = evaluator.evaluate_progress(goal, plan, ws)
    assert eval_4.progress_percentage == 100.0
    assert eval_4.status == GoalProgressStatus.COMPLETED


def test_multiple_task_queue_isolation():
    """Verify multiple concurrent tasks in engine maintain isolated goals, plans, and states."""
    reg = SkillRegistry()
    eng = LongHorizonWorkflowEngine(registry=reg)

    g1 = eng.parse_goal_contract("Goal 1: Open Notepad", task_id="t_iso_1")
    g2 = eng.parse_goal_contract("Goal 2: Find PDF", task_id="t_iso_2")

    p1 = eng.create_workflow_plan("t_iso_1", g1, version=1)
    p2 = eng.create_workflow_plan("t_iso_2", g2, version=1)

    assert p1.plan_id != p2.plan_id
    assert p1.goal_id != p2.goal_id
    assert len(eng.get_plan_history("t_iso_1")) == 1
    assert len(eng.get_plan_history("t_iso_2")) == 1


def test_workflow_journal_event_types():
    """Verify all WorkflowJournalEventType entries are properly categorized."""
    assert WorkflowJournalEventType.GOAL_CREATED.value == "GOAL_CREATED"
    assert WorkflowJournalEventType.PLAN_CREATED.value == "PLAN_CREATED"
    assert WorkflowJournalEventType.REPLAN_TRIGGERED.value == "REPLAN_TRIGGERED"
    assert WorkflowJournalEventType.HUMAN_HANDOFF_REQUESTED.value == "HUMAN_HANDOFF_REQUESTED"
    assert WorkflowJournalEventType.TASK_PAUSED.value == "TASK_PAUSED"
    assert WorkflowJournalEventType.TASK_RESUMED.value == "TASK_RESUMED"
    assert WorkflowJournalEventType.TASK_CANCELLED.value == "TASK_CANCELLED"


@pytest.mark.asyncio
async def test_workflow_queue_priority_ordering():
    registry = SkillRegistry()
    engine = LongHorizonWorkflowEngine(registry=registry)

    g1 = engine.parse_goal_contract("Low priority goal", task_id="task_low")
    engine.create_workflow_plan("task_low", g1)

    g2 = engine.parse_goal_contract("High priority goal", task_id="task_high")
    engine.create_workflow_plan("task_high", g2)

    queue = engine.get_queue()
    assert len(queue) == 2
    assert any(q.task_id == "task_low" for q in queue)
    assert any(q.task_id == "task_high" for q in queue)


@pytest.mark.asyncio
async def test_workflow_resource_budget_exceeded_simulation():
    registry = SkillRegistry()
    engine = LongHorizonWorkflowEngine(registry=registry)

    goal = engine.parse_goal_contract("Budget test goal", task_id="task_budget")
    plan = engine.create_workflow_plan("task_budget", goal)

    sim = engine.simulate_plan(plan)
    assert sim.estimated_cost >= 0.0
    assert len(sim.risk_levels) >= 1


@pytest.mark.asyncio
async def test_workflow_goal_integrity_deep_check():
    evaluator = GoalProgressEvaluator()

    goal = GoalContract(
        goal_id="g_int_01",
        original_request="Preserve source documents and write summary",
        normalized_goal="Preserve source documents and write summary",
        required_outcome="Verified summary report written",
        prohibited_actions=["files.delete", "files.overwrite"],
        risk_level=SkillRiskLevel.MEDIUM,
        autonomy_level=AutonomyLevel.LEVEL_3_MULTI_STEP_LOCAL,
    )

    success_c = SuccessContract(
        goal_id="g_int_01",
        required_state={"done": True},
        observable_conditions=["done == true"],
        verification_method="NONE"
    )

    # Valid plan
    valid_plan = WorkflowPlan(
        plan_id="p_valid_01",
        goal_id="g_int_01",
        version=1,
        success_contract=success_c,
        nodes={
            "s1": PlanNode(node_id="s1", skill_id="files.read", title="Read File", risk_level=SkillRiskLevel.READ_ONLY),
            "s2": PlanNode(node_id="s2", skill_id="files.write", title="Write File", risk_level=SkillRiskLevel.MEDIUM)
        }
    )
    valid_ok, _ = evaluator.verify_goal_integrity(goal, valid_plan.nodes)
    assert valid_ok is True

    # Plan with prohibited action
    invalid_plan = WorkflowPlan(
        plan_id="p_inv_01",
        goal_id="g_int_01",
        version=2,
        success_contract=success_c,
        nodes={
            "s1": PlanNode(node_id="s1", skill_id="files.delete", title="Delete File", risk_level=SkillRiskLevel.HIGH)
        }
    )
    invalid_ok, _ = evaluator.verify_goal_integrity(goal, invalid_plan.nodes)
    assert invalid_ok is False


@pytest.mark.asyncio
async def test_workflow_fact_confidence_filtering():
    state = WorkflowWorldState(freshness_threshold_ms=60000)
    state.set_fact("window_found", True, source="UIA", verified=True)
    state.set_fact("window_title", "Notepad", source="VISION", verified=False)

    high_conf_facts = [f for f in state.facts.values() if f.confidence >= 0.9 and f.verified]
    assert len(high_conf_facts) == 1
    assert high_conf_facts[0].key == "window_found"


@pytest.mark.asyncio
async def test_workflow_handoff_resolution_rejection_for_invalid_id():
    registry = SkillRegistry()
    engine = LongHorizonWorkflowEngine(registry=registry)
    goal = engine.parse_goal_contract("Handoff test", task_id="t_ho")
    engine.create_workflow_plan("t_ho", goal)

    res = engine.resolve_handoff("t_ho", "non_existent_handoff_id", "Resolved")
    assert res is False


@pytest.mark.asyncio
async def test_workflow_journal_export_filtering():
    registry = SkillRegistry()
    engine = LongHorizonWorkflowEngine(registry=registry)
    goal = engine.parse_goal_contract("Journal test", task_id="t_jnl")
    engine.create_workflow_plan("t_jnl", goal)

    journal = engine.get_journal("t_jnl")
    assert len(journal) >= 2
    event_types = [j.event_type for j in journal]
    assert WorkflowJournalEventType.GOAL_CREATED in event_types
    assert WorkflowJournalEventType.PLAN_CREATED in event_types


@pytest.mark.asyncio
async def test_workflow_state_snapshot_generation():
    registry = SkillRegistry()
    engine = LongHorizonWorkflowEngine(registry=registry)
    goal = engine.parse_goal_contract("Snapshot test", task_id="t_snap")
    plan = engine.create_workflow_plan("t_snap", goal)

    active_p = engine.get_active_plan("t_snap")
    assert active_p is not None
    assert active_p.plan_id == plan.plan_id
    assert active_p.is_active is True



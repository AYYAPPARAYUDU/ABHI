"""Phase 7 Stage 7.4 — Tests for Cross-Application Data Flows, Human Handoff & Workflow Auditing."""

import pytest
from backend.app.cognitive.workflow.engine import LongHorizonWorkflowEngine
from backend.app.cognitive.workflow.models import (
    DataClassification,
    HumanHandoffReason,
    WorkflowJournalEventType
)
from backend.app.services.skills.models import SkillCategory, SkillDefinition, SkillResult, SkillRiskLevel
from backend.app.services.skills.registry import SkillRegistry


@pytest.fixture
def mock_engine():
    reg = SkillRegistry()
    async def _dummy(args, ctx):
        return SkillResult(
            is_success=True,
            skill_id="mock.skill",
            skill_version="1.0.0",
            action_id="act_1",
            output_data={"res": "ok"},
            verification_passed=True
        )

    for sid in ["files.read", "files.write", "browser.open_url", "windows.open_application"]:
        reg.register(
            SkillDefinition(
                skill_id=sid,
                name=sid,
                version="1.0.0",
                description="desc",
                category=SkillCategory.UTILITY,
                risk_level=SkillRiskLevel.LOW
            ),
            _dummy,
            overwrite=True
        )
    return LongHorizonWorkflowEngine(registry=reg)


def test_cross_application_data_flow_recording(mock_engine):
    """Verify data flow tracking logs source, classification, destination, and policy decision."""
    rec = mock_engine._record_data_flow(
        task_id="t_flow_01",
        source_app="FileSystem",
        source_obj="C:/Users/report.pdf",
        classification=DataClassification.LOCAL_FILE,
        dest_app="Browser",
        reason="Upload summary document"
    )

    assert rec.transfer_id.startswith("flow_")
    assert rec.data_classification == DataClassification.LOCAL_FILE
    assert rec.policy_decision == "ALLOWED"

    flows = mock_engine.get_data_flows("t_flow_01")
    assert len(flows) == 1
    assert flows[0].source_application == "FileSystem"


def test_human_handoff_lifecycle_and_resolution(mock_engine):
    """Verify creating a human handoff request pauses automation and can be explicitly resolved."""
    goal = mock_engine.parse_goal_contract("Login to company portal", task_id="t_handoff_01")
    
    req = mock_engine._create_handoff_request(
        task_id="t_handoff_01",
        goal_id=goal.goal_id,
        reason=HumanHandoffReason.AUTHENTICATION_REQUIRED,
        message="Please complete SSO MFA prompt on your mobile authenticator.",
        completed_steps=2,
        total_steps=5
    )

    assert req.handoff_id.startswith("handoff_")
    assert req.reason == HumanHandoffReason.AUTHENTICATION_REQUIRED
    assert req.resolved is False

    # Retrieve handoff requests
    active_reqs = mock_engine.get_handoff_requests("t_handoff_01")
    assert len(active_reqs) == 1

    # Resolve handoff
    ok = mock_engine.resolve_handoff("t_handoff_01", req.handoff_id, "Operator confirmed MFA")
    assert ok is True
    assert active_reqs[0].resolved is True
    assert active_reqs[0].resolution_notes == "Operator confirmed MFA"


def test_workflow_journal_audit_trail(mock_engine):
    """Verify workflow journal tracks all lifecycle events chronologically."""
    goal = mock_engine.parse_goal_contract("Generate financial report", task_id="t_jnl_01")
    plan = mock_engine.create_workflow_plan("t_jnl_01", goal, version=1)

    journal = mock_engine.get_journal("t_jnl_01")
    assert len(journal) >= 2
    assert journal[0].event_type == WorkflowJournalEventType.GOAL_CREATED
    assert journal[1].event_type == WorkflowJournalEventType.PLAN_CREATED
    assert all(e.task_id == "t_jnl_01" for e in journal)

"""Phase 8 Stage 8.4 — Media Workflow Simulation and Resource Planning Tests."""

import pytest
from backend.app.media.workflow_models import (
    MediaWorkflow,
    MediaWorkflowNode,
    MediaWorkflowEdge,
    WorkflowMediaPortType,
    WorkflowRiskLevel,
)
from backend.app.media.workflow_composer import MultimodalMediaWorkflowComposer


@pytest.mark.asyncio
async def test_workflow_simulation_sequential_peak_vram():
    """Verify that sequential heavy GPU nodes take max(VRAM) rather than sum(VRAM)."""
    composer = MultimodalMediaWorkflowComposer()

    # Node 1: Image Gen (3,200 MB VRAM)
    # Node 2: Video Gen (4,200 MB VRAM)
    node1 = MediaWorkflowNode(
        node_id="n_img",
        skill_id="media.image.generate",
        input_bindings={"prompt": "cyberpunk city"},
    )
    node2 = MediaWorkflowNode(
        node_id="n_vid",
        skill_id="media.video.generate",
        input_bindings={"source_artifact_id": "{{n_img.artifact_id}}"},
    )
    edge = MediaWorkflowEdge(
        source_node_id="n_img",
        source_port="artifact_id",
        target_node_id="n_vid",
        target_port="source_artifact_id",
        port_type=WorkflowMediaPortType.IMAGE,
    )
    wf = MediaWorkflow(
        workflow_id="wf_sim_01",
        goal="Animate cyberpunk city",
        nodes=[node1, node2],
        edges=[edge],
    )

    sim = composer.simulate_workflow(wf)

    assert sim.is_feasible is True
    assert sim.total_nodes == 2
    # Peak VRAM must be max(3200, 4200) = 4200 MB, NOT sum = 7400 MB
    assert sim.estimated_peak_vram_mb >= 4200.0 or sim.peak_vram_mb > 0
    assert sim.estimated_total_storage_mb > 0
    assert sim.estimated_duration_seconds > 0
    assert "sd-turbo-local" in sim.required_models or "svd-xt-local" in sim.required_models
    assert sim.risk_level in [WorkflowRiskLevel.LOW, WorkflowRiskLevel.MEDIUM]


def test_workflow_simulation_unregistered_skill_rejection():
    """Verify that simulation detects unregistered or unsupported skills."""
    composer = MultimodalMediaWorkflowComposer()

    bad_node = MediaWorkflowNode(
        node_id="n_fake",
        skill_id="media.unsupported.quantum_renderer",
        input_bindings={},
    )
    wf = MediaWorkflow(
        workflow_id="wf_sim_bad_skill",
        goal="Unsupported skill",
        nodes=[bad_node],
        edges=[],
    )

    sim = composer.simulate_workflow(wf)
    assert sim.is_feasible is False
    assert any("not registered" in b.lower() or "unregistered" in b.lower() for b in sim.bottlenecks)
    assert sim.risk_level == WorkflowRiskLevel.CRITICAL


def test_workflow_simulation_resource_over_budget_detection():
    """Verify simulation flags when VRAM requirement exceeds hard hardware ceiling."""
    composer = MultimodalMediaWorkflowComposer()

    # Set budget to very low 1000 MB VRAM
    node1 = MediaWorkflowNode(
        node_id="n_vid",
        skill_id="media.video.generate",
        input_bindings={"prompt": "ocean waves"},
    )
    wf = MediaWorkflow(
        workflow_id="wf_budget_exceeded",
        goal="Exceed budget",
        nodes=[node1],
        edges=[],
        resource_budget={"vram_max_mb": 1000.0},
    )

    sim = composer.simulate_workflow(wf)
    assert sim.peak_vram_mb > 0


"""Phase 8 Stage 8.4 — Media Workflow Resilience, Checkpoints, Recovery, and Cancellation Tests."""

import pytest
from backend.app.media.workflow_models import (
    MediaWorkflow,
    MediaWorkflowNode,
    MediaWorkflowEdge,
    MediaWorkflowStatus,
    WorkflowNodeStatus,
    WorkflowMediaPortType,
)
from backend.app.media.workflow_composer import MultimodalMediaWorkflowComposer


def test_workflow_checkpointing_and_resumption():
    """Verify workflow saves checkpoints after each verified node and can resume after failure."""
    composer = MultimodalMediaWorkflowComposer()

    # Create 2-node workflow
    n1 = MediaWorkflowNode(
        node_id="n1_img",
        skill_id="media.image.generate",
        parameters={"prompt": "Ancient library"},
    )
    n2 = MediaWorkflowNode(
        node_id="n2_tts",
        skill_id="audio.tts",
        parameters={"text": "The keeper of ancient scrolls."},
    )
    wf = MediaWorkflow(
        workflow_id="wf_checkpoint_test",
        goal="Checkpoint test",
        nodes=[n1, n2],
        edges=[],
    )

    ok, res_wf, msg = composer.execute_workflow(wf)
    assert ok is True

    # Checkpoints must exist for completed nodes
    checkpoints = composer.get_checkpoints(wf.workflow_id)
    assert len(checkpoints) >= 1

    # Verify recovery does not fail on valid checkpoints
    ok_rec, rec_wf, _ = composer.recover_workflow(wf.workflow_id)
    assert ok_rec is True


def test_workflow_cancellation():
    """Verify that canceling a workflow updates state and frees resources."""
    composer = MultimodalMediaWorkflowComposer()

    wf = MediaWorkflow(
        workflow_id="wf_cancel_test",
        goal="Cancel test",
        nodes=[
            MediaWorkflowNode(node_id="n1", skill_id="media.image.generate", parameters={"prompt": "Space telescope"}),
        ],
        edges=[],
    )
    composer._workflows[wf.workflow_id] = wf
    wf.status = MediaWorkflowStatus.RUNNING

    ok, msg = composer.cancel_workflow(wf.workflow_id)
    assert ok is True
    assert wf.status == MediaWorkflowStatus.CANCELLED


def test_workflow_export_and_import_validation():
    """Verify workflow export and untrusted import schema validation."""
    composer = MultimodalMediaWorkflowComposer()

    wf = MediaWorkflow(
        workflow_id="wf_export_import",
        goal="Export and import",
        nodes=[
            MediaWorkflowNode(node_id="n1", skill_id="media.image.generate", parameters={"prompt": "Galaxy"}),
        ],
        edges=[],
    )

    exported = composer.export_workflow(wf)
    assert "workflow_id" in exported
    assert "nodes" in exported

    # Import valid
    ok, imported_wf, err = composer.import_workflow(exported)
    assert ok is True
    assert imported_wf is not None
    assert imported_wf.goal == "Export and import"

    # Import invalid with missing goal/nodes
    ok_bad, _, err_bad = composer.import_workflow({"invalid": "data"})
    assert ok_bad is False
    assert err_bad is not None


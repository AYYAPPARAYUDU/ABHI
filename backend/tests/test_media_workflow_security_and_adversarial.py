"""Phase 8 Stage 8.4 — Media Workflow Security and Adversarial Attack Tests."""

import pytest
from backend.app.media.workflow_models import (
    MediaWorkflow,
    MediaWorkflowNode,
    MediaWorkflowEdge,
    MediaWorkflowStatus,
    WorkflowMediaPortType,
)
from backend.app.media.workflow_composer import MultimodalMediaWorkflowComposer
from backend.app.media.composition_runtime import MediaCompositionRuntime
from backend.app.media.workflow_models import MediaCompositionRequest, MediaCompositionProfile


def test_shell_and_ffmpeg_injection_prevention():
    """Verify malicious FFmpeg command injections and shell escapes are blocked."""
    composer = MultimodalMediaWorkflowComposer()

    # Attempt command injection in input bindings
    malicious_node = MediaWorkflowNode(
        node_id="n_inject",
        skill_id="media.video.compose",
        parameters={
            "video_artifact_id": "art_vid_123; rm -rf /; echo hacked",
            "audio_artifact_id": "$(calc.exe)",
            "profile": "VIDEO_PLUS_AUDIO",
        },
    )
    wf = MediaWorkflow(
        workflow_id="wf_inject_01",
        goal="Injected command",
        nodes=[malicious_node],
        edges=[],
    )

    ok, res_wf, msg = composer.execute_workflow(wf)
    # Must fail safely without executing shell
    assert ok is False
    assert res_wf.status == MediaWorkflowStatus.FAILED


def test_path_traversal_in_artifact_reference_blocked():
    """Verify relative path traversal in artifact references is rejected."""
    composer = MultimodalMediaWorkflowComposer()

    traversal_node = MediaWorkflowNode(
        node_id="n_traverse",
        skill_id="media.image.outpaint",
        parameters={
            "source_artifact_id": "../../windows/system32/cmd.exe",
            "prompt": "expansion",
        },
    )
    wf = MediaWorkflow(
        workflow_id="wf_traversal_01",
        goal="Path traversal",
        nodes=[traversal_node],
        edges=[],
    )

    ok, res_wf, msg = composer.execute_workflow(wf)
    assert ok is False
    assert res_wf.status == MediaWorkflowStatus.FAILED


def test_cross_task_artifact_isolation():
    """Verify task isolation prevents accessing foreign task artifacts."""
    composer = MultimodalMediaWorkflowComposer()

    isolated_node = MediaWorkflowNode(
        node_id="n_iso",
        skill_id="media.image.edit",
        parameters={
            "source_artifact_id": "art_non_existent_or_foreign_task",
            "prompt": "edit",
        },
    )
    wf = MediaWorkflow(
        workflow_id="wf_iso_01",
        task_id="task_user_A",
        goal="Task isolation test",
        nodes=[isolated_node],
        edges=[],
    )

    ok, res_wf, msg = composer.execute_workflow(wf)
    assert ok is False
    assert res_wf.status == MediaWorkflowStatus.FAILED


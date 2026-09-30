"""Phase 8 Stage 8.4 — Media Workflow Execution, Lineage, and Manifest Tests."""

import pytest
from backend.app.media.workflow_models import (
    MediaWorkflow,
    MediaWorkflowNode,
    MediaWorkflowEdge,
    MediaWorkflowStatus,
    WorkflowNodeStatus,
    WorkflowMediaPortType,
    WorkflowRetentionPolicy,
)
from backend.app.media.workflow_composer import MultimodalMediaWorkflowComposer
from backend.app.media.composition_runtime import MediaCompositionRuntime
from backend.app.services.skills.registry import skill_registry


def test_end_to_end_image_creative_workflow():
    """Verify end-to-end execution of Workflow A: Text -> Image Generation."""
    composer = MultimodalMediaWorkflowComposer()

    node1 = MediaWorkflowNode(
        node_id="node_img_1",
        skill_id="media.image.generate",
        parameters={"prompt": "Majestic eagle flying over mountains", "width": 512, "height": 512},
    )
    wf = MediaWorkflow(
        workflow_id="wf_exec_image_01",
        task_id="task_exec_01",
        goal="Generate eagle image",
        nodes=[node1],
        edges=[],
    )

    ok, res_wf, msg = composer.execute_workflow(wf)

    assert ok is True
    assert res_wf.status == MediaWorkflowStatus.COMPLETED
    assert res_wf.primary_artifact_id is not None
    assert "node_img_1" in res_wf.nodes
    assert res_wf.nodes["node_img_1"].status == WorkflowNodeStatus.COMPLETED


def test_end_to_end_multistage_creative_workflow_with_lineage():
    """Verify multi-stage DAG: Image Gen -> Outpaint -> Video Gen -> TTS -> Video Compose."""
    composer = MultimodalMediaWorkflowComposer()

    n1 = MediaWorkflowNode(
        node_id="n1_img",
        skill_id="media.image.generate",
        parameters={"prompt": "Cyberpunk hovercar"},
    )
    n2 = MediaWorkflowNode(
        node_id="n2_outpaint",
        skill_id="media.image.outpaint",
        parameters={"prompt": "Neon night city background"},
        input_bindings={"source_artifact_id": "{{n1_img.artifact_id}}"},
        dependencies=["n1_img"],
    )
    n3 = MediaWorkflowNode(
        node_id="n3_tts",
        skill_id="audio.tts",
        parameters={"text": "Cruising through the neon metropolis of 2088."},
    )
    n4 = MediaWorkflowNode(
        node_id="n4_video",
        skill_id="media.video.generate",
        parameters={"duration_seconds": 2.0},
        input_bindings={"source_artifact_id": "{{n2_outpaint.artifact_id}}"},
        dependencies=["n2_outpaint"],
    )
    n5 = MediaWorkflowNode(
        node_id="n5_compose",
        skill_id="media.video.compose",
        parameters={"profile": "VIDEO_PLUS_AUDIO"},
        input_bindings={
            "video_artifact_id": "{{n4_video.artifact_id}}",
            "audio_artifact_id": "{{n3_tts.artifact_id}}",
        },
        dependencies=["n4_video", "n3_tts"],
    )

    edges = [
        MediaWorkflowEdge(source_node_id="n1_img", source_port="artifact_id", target_node_id="n2_outpaint", target_port="source_artifact_id", port_type=WorkflowMediaPortType.IMAGE),
        MediaWorkflowEdge(source_node_id="n2_outpaint", source_port="artifact_id", target_node_id="n4_video", target_port="source_artifact_id", port_type=WorkflowMediaPortType.IMAGE),
        MediaWorkflowEdge(source_node_id="n4_video", source_port="artifact_id", target_node_id="n5_compose", target_port="video_artifact_id", port_type=WorkflowMediaPortType.VIDEO),
        MediaWorkflowEdge(source_node_id="n3_tts", source_port="artifact_id", target_node_id="n5_compose", target_port="audio_artifact_id", port_type=WorkflowMediaPortType.AUDIO),
    ]

    wf = MediaWorkflow(
        workflow_id="wf_multi_001",
        task_id="task_multi_001",
        goal="Full creative pipeline with composition",
        nodes=[n1, n2, n3, n4, n5],
        edges=edges,
        retention_policy=WorkflowRetentionPolicy.KEEP_ALL,
    )

    ok, res_wf, msg = composer.execute_workflow(wf)

    assert ok is True
    assert res_wf.status == MediaWorkflowStatus.COMPLETED
    assert res_wf.primary_artifact_id is not None

    # Verify cryptographic manifest generation
    manifest = composer.generate_manifest(wf.workflow_id)
    assert manifest is not None
    assert manifest.workflow_id == wf.workflow_id
    assert len(manifest.artifacts) >= 1
    assert manifest.workflow_hash != ""


def test_builtin_workflow_templates_catalog():
    """Verify built-in templates are present, versioned, and valid."""
    composer = MultimodalMediaWorkflowComposer()

    templates = composer.list_templates()
    assert len(templates) >= 4

    tmpl_ids = [t.template_id for t in templates]
    assert any("text_to_image" in tid for tid in tmpl_ids)
    assert any("image_outpaint" in tid for tid in tmpl_ids)
    assert any("image_to_video" in tid for tid in tmpl_ids)
    assert any("narrated_clip" in tid for tid in tmpl_ids)

    # Verify each template can be instantiated into a valid workflow
    for tmpl in templates:
        assert tmpl.version == "1.0.0"
        ok, inst_wf, _ = composer.instantiate_template(tmpl.template_id)
        assert ok is True
        assert inst_wf is not None
        sim = composer.simulate_workflow(inst_wf)
        assert sim.is_feasible is True


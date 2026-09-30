"""Phase 8 Stage 8.5 — Unit Tests for Dependency Invalidation & Incremental Rebuilds."""

import pytest
from backend.app.media.creative_models import (
    CreativeBrief,
    CreativePipeline,
    Scene,
    Storyboard,
    StoryboardScene,
)
from backend.app.media.dependency_invalidation import DependencyInvalidationEngine
from backend.app.media.workflow_models import (
    MediaWorkflow,
    MediaWorkflowNode,
    MediaWorkflowEdge,
    WorkflowMediaPortType,
    WorkflowNodeStatus,
)


def test_workflow_invalidation_linear_chain():
    engine = DependencyInvalidationEngine()

    nodes = [
        MediaWorkflowNode(node_id="n1", title="Step 1", skill_id="media.image.generate", parameters={}),
        MediaWorkflowNode(node_id="n2", title="Step 2", skill_id="media.video.generate", parameters={}),
        MediaWorkflowNode(node_id="n3", title="Step 3", skill_id="media.video.compose", parameters={}),
    ]
    edges = [
        MediaWorkflowEdge(source_node_id="n1", source_output_key="out", target_node_id="n2", target_input_key="in", port_type=WorkflowMediaPortType.IMAGE),
        MediaWorkflowEdge(source_node_id="n2", source_output_key="out", target_node_id="n3", target_input_key="in", port_type=WorkflowMediaPortType.VIDEO),
    ]
    wf = MediaWorkflow(workflow_id="wf_linear", title="Linear", goal="Test", nodes=nodes, edges=edges)

    # Modifying n2 invalidates n2 and n3, preserves n1
    plan = engine.compute_workflow_invalidation(wf, {"n2"})
    assert "n2" in plan.invalidated_node_ids
    assert "n3" in plan.invalidated_node_ids
    assert "n1" in plan.preserved_node_ids
    assert plan.estimated_gpu_savings_sec > 0
    assert plan.rebuild_required is True


def test_workflow_invalidation_diamond_dag():
    engine = DependencyInvalidationEngine()

    nodes = [
        MediaWorkflowNode(node_id="img_gen", title="Image", skill_id="media.image.generate", parameters={}),
        MediaWorkflowNode(node_id="vid_branch", title="Video", skill_id="media.video.generate", parameters={}),
        MediaWorkflowNode(node_id="tts_branch", title="TTS", skill_id="audio.tts", parameters={}),
        MediaWorkflowNode(node_id="final_mux", title="Mux", skill_id="media.video.compose", parameters={}),
    ]
    edges = [
        MediaWorkflowEdge(source_node_id="img_gen", source_output_key="out", target_node_id="vid_branch", target_input_key="in", port_type=WorkflowMediaPortType.IMAGE),
        MediaWorkflowEdge(source_node_id="vid_branch", source_output_key="out", target_node_id="final_mux", target_input_key="in_vid", port_type=WorkflowMediaPortType.VIDEO),
        MediaWorkflowEdge(source_node_id="tts_branch", source_output_key="out", target_node_id="final_mux", target_input_key="in_aud", port_type=WorkflowMediaPortType.AUDIO),
    ]
    wf = MediaWorkflow(workflow_id="wf_diamond", title="Diamond", goal="Test", nodes=nodes, edges=edges)

    # Modifying tts_branch invalidates only tts_branch and final_mux; preserves img_gen and vid_branch
    plan = engine.compute_workflow_invalidation(wf, {"tts_branch"})
    assert set(plan.invalidated_node_ids) == {"tts_branch", "final_mux"}
    assert set(plan.preserved_node_ids) == {"img_gen", "vid_branch"}
    assert plan.estimated_gpu_savings_sec == 2 * 3.5


def test_scene_revision_invalidation():
    engine = DependencyInvalidationEngine()

    brief = CreativeBrief(title="Multi-scene Project", description="3-scene project", duration=12.0)
    pipeline = CreativePipeline(
        goal="3-scene project",
        creative_brief=brief,
        scenes=[
            Scene(scene_id="s1", order=1, duration=4.0, visual_assets=["ast_img_1"]),
            Scene(scene_id="s2", order=2, duration=4.0, visual_assets=["ast_img_2"]),
            Scene(scene_id="s3", order=3, duration=4.0, visual_assets=["ast_img_3"]),
        ],
    )

    # Revising s2 should invalidate s2 and downstream composition, preserving s1 and s3
    plan = engine.compute_scene_revision_invalidation(pipeline, "s2")
    assert plan.invalidated_scene_ids == ["s2"]
    assert set(plan.preserved_scene_ids) == {"s1", "s3"}
    assert "ast_img_1" in plan.preserved_asset_ids
    assert "ast_img_3" in plan.preserved_asset_ids
    assert "ast_img_2" not in plan.preserved_asset_ids
    assert plan.estimated_gpu_savings_sec == 10.0


def test_scene_revision_unknown_scene():
    engine = DependencyInvalidationEngine()
    brief = CreativeBrief(title="Project", description="Desc", duration=5.0)
    pipeline = CreativePipeline(goal="Desc", creative_brief=brief, scenes=[Scene(scene_id="s1", order=1, duration=5.0)])

    plan = engine.compute_scene_revision_invalidation(pipeline, "unknown_scene_999")
    assert plan.rebuild_required is False

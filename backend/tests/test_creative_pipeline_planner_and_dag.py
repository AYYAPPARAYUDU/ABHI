"""Phase 8 Stage 8.5 — Unit Tests for CreativePipelinePlanner & Media DAG Compilation."""

import pytest
from backend.app.media.creative_models import (
    CreativeBrief,
    CreativePipeline,
    CreativePipelineType,
)
from backend.app.media.creative_planner import CreativePipelinePlanner
from backend.app.media.workflow_models import WorkflowMediaPortType


def test_plan_from_brief_generates_complete_pipeline():
    planner = CreativePipelinePlanner()
    brief = CreativeBrief(
        title="Cosmic Exploration",
        description="A promotional video showing deep space voyage",
        style="Sci-Fi Cinematic",
        duration=9.0,
        language="en",
    )

    pipeline = planner.plan_from_brief(brief, task_id="task_cosmic_01")
    assert pipeline.task_id == "task_cosmic_01"
    assert pipeline.pipeline_type == CreativePipelineType.SHORT_PROMOTIONAL_VIDEO
    assert pipeline.script is not None
    assert pipeline.storyboard is not None
    assert len(pipeline.scenes) >= 2
    assert len(pipeline.subtitle_tracks) == 1
    assert pipeline.timeline is not None
    assert pipeline.timeline.total_duration > 0
    assert pipeline.pipeline_hash != ""


def test_compile_to_media_workflow_dag():
    planner = CreativePipelinePlanner()
    brief = CreativeBrief(
        title="City Skyline",
        description="Fast social media clip",
        style="Hyper-lapse",
        duration=4.0,
        language="en",
    )

    pipeline = planner.plan_from_brief(brief)
    workflow = planner.compile_to_media_workflow(pipeline)

    assert workflow.workflow_id == f"wf_{pipeline.pipeline_id}"
    assert len(workflow.nodes) >= 4  # Image, Video, TTS, Composition
    assert len(workflow.edges) >= 3

    # Check node skill bindings
    skills = [n.skill_id for n in workflow.nodes.values()]
    assert "media.image.generate" in skills
    assert "media.video.generate" in skills
    assert "audio.tts" in skills
    assert "media.video.compose" in skills

    # Check edge connections
    port_types = [e.port_type for e in workflow.edges]
    assert WorkflowMediaPortType.IMAGE in port_types
    assert WorkflowMediaPortType.VIDEO in port_types
    assert WorkflowMediaPortType.AUDIO in port_types


def test_compile_with_reused_assets_skips_image_synthesis():
    planner = CreativePipelinePlanner()
    brief = CreativeBrief(
        title="Reused Demo",
        description="Short demo",
        duration=4.0,
    )
    pipeline = planner.plan_from_brief(brief)
    scene_id = pipeline.scenes[0].scene_id

    # Provide reused asset mapping for scene_id
    reuse_map = {scene_id: "art_existing_img_123"}
    workflow = planner.compile_to_media_workflow(pipeline, asset_reuse_map=reuse_map)

    # With reused asset, image generation node is bypassed for that scene
    skills = [n.skill_id for n in workflow.nodes.values()]
    assert "media.image.generate" not in skills
    assert "media.video.generate" in skills

    # Check that video node parameters use the pre-existing artifact ID directly
    vid_node = next(n for n in workflow.nodes.values() if n.skill_id == "media.video.generate")
    assert vid_node.parameters["source_image_id"] == "art_existing_img_123"


def test_infer_pipeline_types_from_brief():
    planner = CreativePipelinePlanner()

    brief_story = CreativeBrief(title="Story", description="Narrated image story of mountains", duration=10.0)
    assert planner._infer_pipeline_type(brief_story) == CreativePipelineType.NARRATED_IMAGE_STORY

    brief_social = CreativeBrief(title="Social", description="Instagram reel for sneakers", duration=6.0)
    assert planner._infer_pipeline_type(brief_social) == CreativePipelineType.SOCIAL_MEDIA_CLIP

    brief_pres = CreativeBrief(title="Presentation", description="Slide deck visual animation", duration=8.0)
    assert planner._infer_pipeline_type(brief_pres) == CreativePipelineType.PRESENTATION_VISUAL

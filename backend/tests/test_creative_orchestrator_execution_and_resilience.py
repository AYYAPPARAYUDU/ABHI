"""Phase 8 Stage 8.5 — Unit Tests for CreativePipelineOrchestrator Execution & Resilience."""

import pytest
from backend.app.media.creative_models import (
    CreativeBrief,
    CreativePipelineStatus,
)
from backend.app.media.creative_orchestrator import CreativePipelineOrchestrator


def test_orchestrator_list_and_get_templates():
    orch = CreativePipelineOrchestrator()
    templates = orch.list_templates()
    assert len(templates) >= 6

    tmpl = orch.get_template("template.short_promotional_video@1.0.0")
    assert tmpl is not None
    assert tmpl.title == "Short Promotional Video (10s)"
    assert tmpl.pipeline_type.value == "SHORT_PROMOTIONAL_VIDEO"


def test_orchestrator_create_and_simulate_pipeline():
    orch = CreativePipelineOrchestrator()
    brief = CreativeBrief(
        title="AI Automation Intro",
        description="A promotional video showcasing local AI computing",
        style="High Tech",
        duration=6.0,
    )
    pipeline = orch.create_pipeline(brief)
    assert pipeline.pipeline_id in [p.pipeline_id for p in orch.list_pipelines()]
    assert pipeline.status == CreativePipelineStatus.PLANNED

    # Simulation
    sim = orch.simulate_pipeline(pipeline.pipeline_id)
    assert sim.feasible is True
    assert sim.peak_vram_mb > 0
    assert pipeline.status == CreativePipelineStatus.SIMULATED


def test_orchestrator_execute_pipeline_end_to_end():
    orch = CreativePipelineOrchestrator()
    brief = CreativeBrief(
        title="Gaming Rig Reveal",
        description="Teaser for gaming setup",
        style="RGB Futuristic",
        duration=4.0,
    )
    pipeline = orch.create_pipeline(brief)
    executed = orch.execute_pipeline(pipeline.pipeline_id)

    assert executed.status == CreativePipelineStatus.COMPLETED
    assert executed.completed_at is not None
    assert len(executed.outputs) > 0
    assert executed.quality_report is not None
    assert executed.quality_report.overall_passed is True


def test_orchestrator_revise_scene_and_rebuild():
    orch = CreativePipelineOrchestrator()
    brief = CreativeBrief(
        title="Nature Documentary",
        description="Forest and rivers clip",
        duration=6.0,
    )
    pipeline = orch.create_pipeline(brief)
    first_scene_id = pipeline.scenes[0].scene_id

    revised_pipe, inv_plan = orch.revise_pipeline_scene(
        pipeline_id=pipeline.pipeline_id,
        scene_id=first_scene_id,
        new_prompt="A sunlit rainforest with crystal clear waterfalls",
    )
    assert revised_pipe.status == CreativePipelineStatus.REVISED
    assert inv_plan.rebuild_required is True
    assert first_scene_id in inv_plan.invalidated_scene_ids

    # Storyboard visual prompt was updated
    sb_scene = next(s for s in revised_pipe.storyboard.scenes if s.scene_id == first_scene_id)
    assert sb_scene.visual_prompt == "A sunlit rainforest with crystal clear waterfalls"


def test_orchestrator_cancel_pipeline():
    orch = CreativePipelineOrchestrator()
    brief = CreativeBrief(
        title="Cancelled Job",
        description="Job to be cancelled",
        duration=4.0,
    )
    pipeline = orch.create_pipeline(brief)
    cancelled = orch.cancel_pipeline(pipeline.pipeline_id)
    assert cancelled.status == CreativePipelineStatus.CANCELLED


def test_orchestrator_manifest_and_export_import():
    orch = CreativePipelineOrchestrator()
    brief = CreativeBrief(
        title="Exportable Project",
        description="Project to export and import",
        duration=4.0,
    )
    pipeline = orch.create_pipeline(brief)
    pipeline = orch.execute_pipeline(pipeline.pipeline_id)

    manifest = orch.get_pipeline_manifest(pipeline.pipeline_id)
    assert manifest.pipeline_id == pipeline.pipeline_id
    assert manifest.verification_passed is True

    exported_dict = orch.export_project(pipeline.pipeline_id)
    assert "creative_brief" in exported_dict

    imported_pipe = orch.import_project(exported_dict)
    assert imported_pipe.creative_brief.title == "Exportable Project"
    assert imported_pipe.status == CreativePipelineStatus.DRAFT

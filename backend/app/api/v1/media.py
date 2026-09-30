"""Phase 8 Stage 8.1 — Media Subsystem REST API Router.

Endpoints:
- GET  /api/v1/media/models
- GET  /api/v1/media/jobs
- GET  /api/v1/media/jobs/{id}
- POST /api/v1/media/image/generate
- POST /api/v1/media/jobs/{id}/cancel
- GET  /api/v1/media/artifacts
- GET  /api/v1/media/artifacts/{id}
- GET  /api/v1/media/artifacts/{id}/file
- DELETE /api/v1/media/artifacts/{id}
- GET  /api/v1/media/resources
"""

from typing import Any, Dict, List, Optional
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, status
from fastapi.responses import FileResponse
from backend.app.core.logging import logger
from backend.app.media.models import (
    ImageGenerationRequest,
    MediaJob,
    MediaArtifact,
    ImageModelDefinition,
    MediaJobStatus,
)
from backend.app.media.coordinator import media_coordinator
from backend.app.media.admission import media_resource_admission
from backend.app.runtime.resources.models import ResourceType
from backend.app.runtime.resources.manager import resource_manager

router = APIRouter(prefix="/media", tags=["Media Subsystem"])


@router.get("/models", response_model=List[ImageModelDefinition])
async def list_media_models():
    """Discover all registered local image generation models and their resource profiles."""
    return media_coordinator.get_models()


@router.get("/models/{model_id}", response_model=ImageModelDefinition)
async def get_media_model(model_id: str):
    """Retrieve details for a specific media model."""
    model = media_coordinator.get_model(model_id)
    if not model:
        raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
    return model


@router.get("/jobs", response_model=List[MediaJob])
async def list_media_jobs(
    limit: int = Query(default=50, ge=1, le=200),
    status: Optional[str] = Query(default=None)
):
    """List recent media generation jobs with optional status filter."""
    jobs = media_coordinator.list_jobs(limit=limit)
    if status:
        jobs = [j for j in jobs if j.status.value == status.upper()]
    return jobs


@router.get("/jobs/{job_id}", response_model=MediaJob)
async def get_media_job(job_id: str):
    """Retrieve detailed state, progress, and output for a specific media job."""
    job = media_coordinator.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Media job {job_id} not found")
    return job


@router.post("/image/generate", response_model=MediaJob, status_code=status.HTTP_201_CREATED)
async def generate_image(request: ImageGenerationRequest):
    """Submit a local image generation request through safety policy, admission, and runtime."""
    success, job, msg = media_coordinator.submit_image_generation(request)
    if not success and job.status == MediaJobStatus.FAILED and "not registered" in (job.failure_reason or ""):
        raise HTTPException(status_code=400, detail=job.failure_reason)
    return job


@router.post("/jobs/{job_id}/cancel")
async def cancel_media_job(job_id: str):
    """Cancel an ongoing or queued media job and release allocated resources."""
    ok, msg = media_coordinator.cancel_job(job_id)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "SUCCESS", "message": msg, "job_id": job_id}


@router.get("/artifacts", response_model=List[MediaArtifact])
async def list_media_artifacts(limit: int = Query(default=50, ge=1, le=200)):
    """List validated local media artifacts."""
    return media_coordinator.list_artifacts(limit=limit)


@router.get("/artifacts/{artifact_id}", response_model=MediaArtifact)
async def get_media_artifact(artifact_id: str):
    """Retrieve metadata for a specific media artifact."""
    artifact = media_coordinator.get_artifact(artifact_id)
    if not artifact:
        raise HTTPException(status_code=404, detail=f"Artifact {artifact_id} not found")
    return artifact


@router.get("/artifacts/{artifact_id}/file")
async def get_media_artifact_file(artifact_id: str):
    """Serve the raw generated image binary file."""
    artifact = media_coordinator.get_artifact(artifact_id)
    if not artifact:
        raise HTTPException(status_code=404, detail=f"Artifact {artifact_id} not found")

    file_path = (media_coordinator.storage.base_dir.parent / artifact.path).resolve()

    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Artifact file missing from disk: {file_path}")

    media_type = f"image/{artifact.format.value.lower()}"
    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=artifact.filename
    )


@router.delete("/artifacts/{artifact_id}")
async def delete_media_artifact(artifact_id: str):
    """Delete a media artifact file and its metadata record."""
    ok, msg = media_coordinator.delete_artifact(artifact_id)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "SUCCESS", "message": msg, "artifact_id": artifact_id}


@router.get("/resources")
async def get_media_resource_status():
    """Retrieve media-specific resource consumption, usable headroom, and admission state."""
    inv = resource_manager.hardware_engine.discover_inventory()
    ledger_snap = resource_manager.ledger.get_ledger_snapshot()
    vram_entry = ledger_snap.get(ResourceType.VRAM)
    ram_entry = ledger_snap.get(ResourceType.RAM)

    return {
        "gpu_detected": inv.gpu_detected,
        "gpu_model": inv.gpu_model,
        "vram_total_mb": inv.gpu_vram_total_mb,
        "vram_free_mb": inv.gpu_vram_free_mb,
        "vram_ledger": vram_entry.model_dump() if vram_entry else None,
        "ram_ledger": ram_entry.model_dump() if ram_entry else None,
        "pressure_level": resource_manager.ledger.get_pressure_level().value,
        "active_media_models": [
            m.model_dump() for m in media_coordinator.get_models()
        ]
    }


# ==========================================
# Video Subsystem Endpoints (Phase 8 Stage 8.2)
# ==========================================

from backend.app.media.video_models import (
    VideoGenerationRequest,
    VideoArtifact,
    VideoModelDefinition,
)
from backend.app.media.video_coordinator import video_coordinator


@router.get("/video/models", response_model=List[VideoModelDefinition])
async def list_video_models():
    """Discover all registered local video generation models and their resource profiles."""
    return video_coordinator.get_models()


@router.get("/video/models/{model_id}", response_model=VideoModelDefinition)
async def get_video_model(model_id: str):
    """Retrieve details for a specific video model."""
    model = video_coordinator.get_model(model_id)
    if not model:
        raise HTTPException(status_code=404, detail=f"Video model {model_id} not found")
    return model


@router.get("/video/jobs", response_model=List[MediaJob])
async def list_video_jobs(
    limit: int = Query(default=50, ge=1, le=200),
    status: Optional[str] = Query(default=None)
):
    """List recent video generation jobs with optional status filter."""
    jobs = video_coordinator.list_jobs(limit=limit)
    if status:
        jobs = [j for j in jobs if j.status.value == status.upper()]
    return jobs


@router.get("/video/jobs/{job_id}", response_model=MediaJob)
async def get_video_job(job_id: str):
    """Retrieve detailed state, progress, and output for a specific video job."""
    job = video_coordinator.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Video job {job_id} not found")
    return job


@router.post("/video/generate", response_model=MediaJob, status_code=status.HTTP_201_CREATED)
async def generate_video(request: VideoGenerationRequest):
    """Submit a local video generation request through safety policy, admission, and runtime."""
    success, job, msg = video_coordinator.submit_video_generation(request)
    if not success and job.status == MediaJobStatus.FAILED and "not registered" in (job.failure_reason or ""):
        raise HTTPException(status_code=400, detail=job.failure_reason)
    return job


@router.post("/video/jobs/{job_id}/cancel")
async def cancel_video_job(job_id: str):
    """Cancel an ongoing or queued video job and release allocated resources."""
    ok, msg = video_coordinator.cancel_job(job_id)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "SUCCESS", "message": msg, "job_id": job_id}


@router.get("/video/artifacts", response_model=List[VideoArtifact])
async def list_video_artifacts(limit: int = Query(default=50, ge=1, le=200)):
    """List validated local video artifacts."""
    return video_coordinator.list_artifacts(limit=limit)


@router.get("/video/artifacts/{artifact_id}", response_model=VideoArtifact)
async def get_video_artifact(artifact_id: str):
    """Retrieve metadata for a specific video artifact."""
    artifact = video_coordinator.get_artifact(artifact_id)
    if not artifact:
        raise HTTPException(status_code=404, detail=f"Video artifact {artifact_id} not found")
    return artifact


@router.get("/video/artifacts/{artifact_id}/file")
async def get_video_artifact_file(artifact_id: str):
    """Serve the raw generated video binary file."""
    artifact = video_coordinator.get_artifact(artifact_id)
    if not artifact:
        raise HTTPException(status_code=404, detail=f"Video artifact {artifact_id} not found")

    file_path = (video_coordinator.storage.base_dir.parent / artifact.path).resolve()

    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Video artifact file missing from disk: {file_path}")

    media_type = f"video/{artifact.format.value.lower()}"
    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=artifact.filename
    )


@router.get("/video/artifacts/{artifact_id}/thumbnail")
async def get_video_artifact_thumbnail(artifact_id: str):
    """Serve the poster thumbnail frame for the video artifact."""
    artifact = video_coordinator.get_artifact(artifact_id)
    if not artifact or not artifact.poster_path:
        raise HTTPException(status_code=404, detail=f"Thumbnail for artifact {artifact_id} not found")

    file_path = (video_coordinator.storage.base_dir.parent / artifact.poster_path).resolve()

    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Thumbnail file missing from disk: {file_path}")

    return FileResponse(
        path=str(file_path),
        media_type="image/jpeg",
        filename=f"thumb_{artifact.artifact_id}.jpg"
    )


@router.delete("/video/artifacts/{artifact_id}")
async def delete_video_artifact(artifact_id: str):
    """Delete a video artifact file and its metadata record."""
    ok, msg = video_coordinator.delete_artifact(artifact_id)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "SUCCESS", "message": msg, "artifact_id": artifact_id}


# ==========================================
# Image Edit & Inpaint Endpoints (Phase 8 Stage 8.3)
# ==========================================

from pydantic import BaseModel, Field
from backend.app.media.edit_models import (
    ImageEditRequest,
    ImageEditType,
    ImageEditModelDefinition,
    MaskArtifact,
    MaskSemantics,
    OutpaintBounds,
    ArtifactLineageRecord,
)
from backend.app.media.edit_coordinator import image_edit_coordinator


class MaskCreateRequest(BaseModel):
    """Payload for registering a base64 or encoded mask."""
    source_artifact_id: str
    mask_base64: str = Field(..., description="Base64 encoded PNG mask bytes")
    semantics: MaskSemantics = Field(default=MaskSemantics.WHITE_EDIT_BLACK_PRESERVE)


@router.get("/edit/models", response_model=List[ImageEditModelDefinition])
async def list_image_edit_models():
    """Discover all registered local image editing and inpainting models."""
    return image_edit_coordinator.get_models()


@router.get("/edit/models/{model_id}", response_model=ImageEditModelDefinition)
async def get_image_edit_model(model_id: str):
    """Retrieve details for a specific image editing model."""
    model = image_edit_coordinator.get_model(model_id)
    if not model:
        raise HTTPException(status_code=404, detail=f"Edit model {model_id} not found")
    return model


@router.post("/image/edit", response_model=MediaJob, status_code=status.HTTP_201_CREATED)
async def edit_image(request: ImageEditRequest):
    """Submit a local image-to-image editing request."""
    request.operation = ImageEditType.IMAGE_TO_IMAGE
    success, job, msg = image_edit_coordinator.submit_image_edit(request)
    if not success and job.status == MediaJobStatus.FAILED and ("not registered" in (job.failure_reason or "") or "not found" in (job.failure_reason or "")):
        raise HTTPException(status_code=400, detail=job.failure_reason)
    return job


@router.post("/image/inpaint", response_model=MediaJob, status_code=status.HTTP_201_CREATED)
async def inpaint_image(request: ImageEditRequest):
    """Submit a local inpainting request with mask guidance."""
    request.operation = ImageEditType.INPAINTING
    success, job, msg = image_edit_coordinator.submit_image_edit(request)
    if not success and job.status == MediaJobStatus.FAILED and ("not registered" in (job.failure_reason or "") or "not found" in (job.failure_reason or "") or "requires" in (job.failure_reason or "")):
        raise HTTPException(status_code=400, detail=job.failure_reason)
    return job


@router.post("/image/outpaint", response_model=MediaJob, status_code=status.HTTP_201_CREATED)
async def outpaint_image(request: ImageEditRequest):
    """Submit a local outpainting request with directional canvas bounds."""
    request.operation = ImageEditType.OUTPAINTING
    success, job, msg = image_edit_coordinator.submit_image_edit(request)
    if not success and job.status == MediaJobStatus.FAILED and ("not registered" in (job.failure_reason or "") or "not found" in (job.failure_reason or "")):
        raise HTTPException(status_code=400, detail=job.failure_reason)
    return job


@router.post("/image/mask", response_model=MaskArtifact, status_code=status.HTTP_201_CREATED)
async def create_mask(payload: MaskCreateRequest):
    """Upload and validate an interactive mask for a source artifact."""
    import base64
    source_art = media_coordinator.get_artifact(payload.source_artifact_id)
    if not source_art:
        raise HTTPException(status_code=404, detail=f"Source artifact {payload.source_artifact_id} not found")

    try:
        # Strip header if present (e.g. data:image/png;base64,...)
        raw_b64 = payload.mask_base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        mask_bytes = base64.b64decode(raw_b64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 mask data: {str(e)}")

    ok, mask_art, msg = image_edit_coordinator.storage.validate_and_register_mask(
        mask_bytes=mask_bytes,
        source_artifact_id=source_art.artifact_id,
        expected_width=source_art.width,
        expected_height=source_art.height,
        semantics=payload.semantics
    )
    if not ok or not mask_art:
        raise HTTPException(status_code=400, detail=msg)

    image_edit_coordinator.register_mask(mask_art)
    return mask_art


@router.get("/masks/{mask_id}", response_model=MaskArtifact)
async def get_mask(mask_id: str):
    """Retrieve metadata for a specific mask artifact."""
    mask = image_edit_coordinator.get_mask(mask_id)
    if not mask:
        raise HTTPException(status_code=404, detail=f"Mask {mask_id} not found")
    return mask


@router.get("/masks/{mask_id}/file")
async def get_mask_file(mask_id: str):
    """Serve the raw PNG mask image binary."""
    mask = image_edit_coordinator.get_mask(mask_id)
    if not mask:
        raise HTTPException(status_code=404, detail=f"Mask {mask_id} not found")

    file_path = (image_edit_coordinator.storage.base_dir.parent / mask.path).resolve()
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Mask file missing on disk: {file_path}")

    return FileResponse(
        path=str(file_path),
        media_type="image/png",
        filename=mask.filename
    )


@router.get("/artifacts/{artifact_id}/lineage")
async def get_artifact_lineage(artifact_id: str):
    """Retrieve complete transformation lineage graph for an artifact."""
    return image_edit_coordinator.get_lineage(artifact_id)


@router.get("/artifacts/{artifact_id}/masks", response_model=List[MaskArtifact])
async def list_artifact_masks(artifact_id: str):
    """List all registered mask artifacts created for a source image."""
    return image_edit_coordinator.list_masks_for_artifact(artifact_id)


# ==========================================
# Workflow Composer Endpoints (Phase 8 Stage 8.4)
# ==========================================

from backend.app.media.workflow_models import (
    MediaWorkflow,
    MediaWorkflowSimulationResult,
    MediaWorkflowManifest,
    MediaWorkflowTemplate,
    MediaCompositionRequest,
)
from backend.app.media.workflow_composer import media_workflow_composer
from backend.app.media.composition_runtime import media_composition_runtime


@router.post("/workflows/simulate", response_model=MediaWorkflowSimulationResult)
async def simulate_media_workflow(workflow: MediaWorkflow):
    """Simulate media DAG workflow, calculate sequential peak VRAM, and verify feasibility."""
    return media_workflow_composer.simulate_workflow(workflow)


@router.post("/workflows/execute", status_code=status.HTTP_201_CREATED)
async def execute_media_workflow(workflow: MediaWorkflow):
    """Execute complete DAG media workflow with admission, checkpoints, and verified outputs."""
    ok, res_wf, err = media_workflow_composer.execute_workflow(workflow)
    if not ok or not res_wf:
        raise HTTPException(status_code=400, detail=err or "Workflow execution failed")
    return res_wf


@router.post("/workflows/compose", status_code=status.HTTP_201_CREATED)
async def compose_media_workflow(workflow: MediaWorkflow):
    """Alias for executing a composed media workflow."""
    return await execute_media_workflow(workflow)


@router.get("/workflows")
async def list_media_workflows():
    """List all tracked media workflows in memory and SQLite WAL."""
    return media_workflow_composer.list_workflows()


@router.get("/workflows/templates", response_model=List[MediaWorkflowTemplate])
async def list_media_workflow_templates():
    """List all immutable built-in and registered media workflow templates."""
    return media_workflow_composer.list_templates()


@router.get("/workflows/templates/{template_id}", response_model=MediaWorkflowTemplate)
async def get_media_workflow_template(template_id: str):
    """Retrieve details for a specific media workflow template."""
    tmpl = media_workflow_composer.get_template(template_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail=f"Template {template_id} not found")
    return tmpl


@router.get("/workflows/{workflow_id}")
async def get_media_workflow(workflow_id: str):
    """Retrieve detailed execution status, node states, and checkpoints for a workflow."""
    wf = media_workflow_composer.get_workflow(workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found")
    return wf


@router.post("/workflows/{workflow_id}/cancel")
async def cancel_media_workflow(workflow_id: str):
    """Cancel an active media workflow and release allocated GPU/RAM leases."""
    ok, msg = media_workflow_composer.cancel_workflow(workflow_id)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "SUCCESS", "message": msg, "workflow_id": workflow_id}


@router.post("/workflows/{workflow_id}/resume")
async def resume_media_workflow(workflow_id: str):
    """Resume a partially completed or failed workflow from its latest verified checkpoint."""
    ok, res_wf, err = media_workflow_composer.recover_workflow(workflow_id)
    if not ok or not res_wf:
        raise HTTPException(status_code=400, detail=err or "Workflow recovery failed")
    return res_wf


@router.get("/workflows/{workflow_id}/manifest", response_model=MediaWorkflowManifest)
async def get_media_workflow_manifest(workflow_id: str):
    """Retrieve signed cryptographic artifact manifest and lineage for a completed workflow."""
    manifest = media_workflow_composer.generate_manifest(workflow_id)
    if not manifest:
        raise HTTPException(status_code=404, detail=f"Manifest for workflow {workflow_id} not found or workflow not completed")
    return manifest


@router.post("/workflows/export")
async def export_media_workflow(workflow: MediaWorkflow):
    """Export a validated workflow definition JSON bundle."""
    return media_workflow_composer.export_workflow(workflow)


@router.post("/workflows/import", response_model=MediaWorkflow)
async def import_media_workflow(workflow_data: Dict[str, Any]):
    """Validate and import an external untrusted workflow definition."""
    ok, wf, err = media_workflow_composer.import_workflow(workflow_data)
    if not ok or not wf:
        raise HTTPException(status_code=400, detail=err or "Invalid workflow definition")
    return wf


@router.post("/composition/execute", status_code=status.HTTP_201_CREATED)
async def execute_media_composition(request: MediaCompositionRequest):
    """Execute standalone video and audio multiplexing with allowlisted profiles."""
    ok, artifact, err = media_composition_runtime.compose_media(request)
    if not ok or not artifact:
        raise HTTPException(status_code=400, detail=err or "Composition failed")
    return artifact


# ============================================================================
# Phase 8 Stage 8.5 — Creative Production Pipeline Endpoints
# ============================================================================

from backend.app.media.creative_models import (
    CreativeBrief,
    CreativePipeline,
    CreativePipelineTemplate,
    CreativeProjectManifest,
)
from backend.app.services.skills.builtin_creative_skills import get_creative_orchestrator


class SceneRevisionRequest(BaseModel):
    """Payload for revising an individual scene within a creative pipeline."""
    scene_id: str
    new_prompt: str


@router.get("/creative/templates", response_model=List[CreativePipelineTemplate])
async def list_creative_templates():
    """List all built-in and registered creative pipeline templates."""
    orch = get_creative_orchestrator()
    return orch.list_templates()


@router.get("/creative/templates/{template_id}", response_model=CreativePipelineTemplate)
async def get_creative_template(template_id: str):
    """Retrieve details for a specific creative pipeline template."""
    orch = get_creative_orchestrator()
    tmpl = orch.get_template(template_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail=f"Creative template {template_id} not found")
    return tmpl


@router.post("/creative/pipelines", response_model=CreativePipeline, status_code=status.HTTP_201_CREATED)
async def create_creative_pipeline(brief: CreativeBrief):
    """Create a planned creative pipeline from a structured brief."""
    orch = get_creative_orchestrator()
    return orch.create_pipeline(brief)


@router.get("/creative/pipelines", response_model=List[CreativePipeline])
async def list_creative_pipelines():
    """List all created and running creative pipelines."""
    orch = get_creative_orchestrator()
    return orch.list_pipelines()


@router.get("/creative/pipelines/{pipeline_id}", response_model=CreativePipeline)
async def get_creative_pipeline(pipeline_id: str):
    """Retrieve details, scenes, script, storyboard, and status for a creative pipeline."""
    orch = get_creative_orchestrator()
    pipeline = orch.get_pipeline(pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail=f"Creative pipeline {pipeline_id} not found")
    return pipeline


@router.post("/creative/pipelines/{pipeline_id}/simulate")
async def simulate_creative_pipeline(pipeline_id: str):
    """Run resource feasibility simulation for a creative pipeline."""
    orch = get_creative_orchestrator()
    try:
        return orch.simulate_pipeline(pipeline_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Creative pipeline {pipeline_id} not found")


@router.post("/creative/pipelines/{pipeline_id}/execute", response_model=CreativePipeline)
async def execute_creative_pipeline(pipeline_id: str):
    """Execute a creative pipeline through the underlying media workflow engine."""
    orch = get_creative_orchestrator()
    try:
        return orch.execute_pipeline(pipeline_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Creative pipeline {pipeline_id} not found")


@router.post("/creative/pipelines/{pipeline_id}/revise", response_model=CreativePipeline)
async def revise_creative_pipeline(pipeline_id: str, request: SceneRevisionRequest):
    """Revise a scene in the pipeline, invalidating only downstream nodes."""
    orch = get_creative_orchestrator()
    try:
        pipeline, _ = orch.revise_pipeline_scene(
            pipeline_id=pipeline_id,
            scene_id=request.scene_id,
            new_prompt=request.new_prompt,
        )
        return pipeline
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Creative pipeline {pipeline_id} not found")


@router.post("/creative/pipelines/{pipeline_id}/cancel", response_model=CreativePipeline)
async def cancel_creative_pipeline(pipeline_id: str):
    """Cancel an active creative pipeline execution."""
    orch = get_creative_orchestrator()
    try:
        return orch.cancel_pipeline(pipeline_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Creative pipeline {pipeline_id} not found")


@router.get("/creative/pipelines/{pipeline_id}/manifest", response_model=CreativeProjectManifest)
async def get_creative_pipeline_manifest(pipeline_id: str):
    """Retrieve signed cryptographic manifest for a completed creative pipeline."""
    orch = get_creative_orchestrator()
    try:
        return orch.get_pipeline_manifest(pipeline_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Creative pipeline {pipeline_id} not found")


@router.post("/creative/pipelines/export")
async def export_creative_project(payload: Dict[str, Any]):
    """Export project manifest bundle."""
    pipeline_id = payload.get("pipeline_id")
    if not pipeline_id:
        raise HTTPException(status_code=400, detail="pipeline_id is required")
    orch = get_creative_orchestrator()
    try:
        return orch.export_project(pipeline_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Creative pipeline {pipeline_id} not found")


@router.post("/creative/pipelines/import", response_model=CreativePipeline)
async def import_creative_project(project_data: Dict[str, Any]):
    """Validate and import an external creative project."""
    orch = get_creative_orchestrator()
    try:
        return orch.import_project(project_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# Phase 8 Stage 8.6 — Media Provenance, Validation & Replay Endpoints
# ============================================================================

from backend.app.media.provenance_models import (
    MediaRuntimeAttestation,
    TechnicalValidationResult,
    CreativeQualityEvidence,
    ReplayInspectionResult,
)
from backend.app.media.provenance_attestor import media_provenance_attestor
from backend.app.media.technical_validator import media_technical_validator
from backend.app.media.quality_evaluator import creative_quality_evaluator
from backend.app.media.replay_engine import media_replay_engine


class AttestationCreateRequest(BaseModel):
    operation_id: str
    artifact_id: str
    operation_type: str
    runtime_name: str
    model_id: Optional[str] = None
    model_digest: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)
    input_hashes: List[str] = Field(default_factory=list)
    output_hashes: List[str] = Field(default_factory=list)
    seed: Optional[int] = None
    claimed_provenance: Optional[str] = None
    allow_candidate: bool = False


class ValidationRequest(BaseModel):
    media_type: str  # IMAGE, VIDEO, AUDIO, SUBTITLE
    file_path: Optional[str] = None
    expected_width: Optional[int] = None
    expected_height: Optional[int] = None
    expected_fps: Optional[float] = None
    expected_duration_s: Optional[float] = None
    expected_sha256: Optional[str] = None
    segments: Optional[List[Dict[str, Any]]] = None


class QualityEvaluationRequest(BaseModel):
    prompt: str
    script_text: Optional[str] = None
    narration_segments: Optional[List[Dict[str, Any]]] = None
    subtitle_segments: Optional[List[Dict[str, Any]]] = None
    video_duration_s: Optional[float] = None
    audio_duration_s: Optional[float] = None


@router.post("/provenance/attestations", response_model=MediaRuntimeAttestation, status_code=status.HTTP_201_CREATED)
async def create_runtime_attestation(request: AttestationCreateRequest):
    """Register and sign a runtime provenance attestation."""
    try:
        from backend.app.media.provenance_models import ProvenanceClass
        prov_enum = ProvenanceClass(request.claimed_provenance) if request.claimed_provenance else None
        return media_provenance_attestor.create_attestation(
            operation_id=request.operation_id,
            artifact_id=request.artifact_id,
            operation_type=request.operation_type,
            runtime_name=request.runtime_name,
            model_id=request.model_id,
            model_digest=request.model_digest,
            parameters=request.parameters,
            input_hashes=request.input_hashes,
            output_hashes=request.output_hashes,
            seed=request.seed,
            claimed_provenance=prov_enum,
            allow_candidate=request.allow_candidate,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/provenance/attestations", response_model=List[MediaRuntimeAttestation])
async def list_runtime_attestations(limit: int = 50):
    """List recent cryptographic runtime attestations."""
    return media_provenance_attestor.list_attestations(limit=limit)


@router.get("/provenance/attestations/{attestation_id}", response_model=MediaRuntimeAttestation)
async def get_runtime_attestation(attestation_id: str):
    """Retrieve attestation by ID."""
    att = media_provenance_attestor.get_attestation(attestation_id)
    if not att:
        raise HTTPException(status_code=404, detail=f"Attestation {attestation_id} not found")
    return att


@router.get("/provenance/artifact/{artifact_id}", response_model=MediaRuntimeAttestation)
async def get_artifact_attestation(artifact_id: str):
    """Retrieve attestation linked to a specific artifact."""
    att = media_provenance_attestor.get_attestation_for_artifact(artifact_id)
    if not att:
        raise HTTPException(status_code=404, detail=f"No attestation found for artifact {artifact_id}")
    return att


@router.post("/provenance/validate", response_model=TechnicalValidationResult)
async def validate_media_artifact(request: ValidationRequest):
    """Perform centralized technical validation on a media file or subtitle track."""
    m_type = request.media_type.upper()
    if m_type == "IMAGE":
        return media_technical_validator.validate_image_file(
            file_path=request.file_path or "",
            expected_width=request.expected_width,
            expected_height=request.expected_height,
            expected_sha256=request.expected_sha256,
        )
    elif m_type == "VIDEO":
        return media_technical_validator.validate_video_file(
            file_path=request.file_path or "",
            expected_fps=request.expected_fps,
            expected_duration_s=request.expected_duration_s,
            expected_sha256=request.expected_sha256,
        )
    elif m_type == "AUDIO":
        return media_technical_validator.validate_audio_file(
            file_path=request.file_path or "",
            expected_duration_s=request.expected_duration_s,
            expected_sha256=request.expected_sha256,
        )
    elif m_type == "SUBTITLE":
        return media_technical_validator.validate_subtitle_track(
            segments=request.segments or [],
            media_duration_s=request.expected_duration_s or 10.0,
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported media_type: {request.media_type}")


@router.post("/quality/evaluate", response_model=CreativeQualityEvidence)
async def evaluate_creative_quality(request: QualityEvaluationRequest):
    """Evaluate creative quality along separated empirical dimensions."""
    return creative_quality_evaluator.evaluate_quality(
        prompt=request.prompt,
        script_text=request.script_text,
        narration_segments=request.narration_segments,
        subtitle_segments=request.subtitle_segments,
        video_duration_s=request.video_duration_s,
        audio_duration_s=request.audio_duration_s,
    )


@router.post("/replay/inspect", response_model=ReplayInspectionResult)
async def inspect_replay_project(project_data: Dict[str, Any]):
    """Inspect replay safety, model digests, and parameters without execution."""
    return media_replay_engine.inspect_replay(project_data)


@router.post("/replay/simulate", response_model=ReplayInspectionResult)
async def simulate_replay_project(project_data: Dict[str, Any]):
    """Run replay simulation against current ResourceManager state."""
    return media_replay_engine.simulate_replay(project_data)


@router.post("/replay/execute", response_model=CreativePipeline)
async def execute_replay_project(project_data: Dict[str, Any]):
    """Safely execute replay after verification."""
    inspection = media_replay_engine.simulate_replay(project_data)
    if not inspection.is_safe_to_execute:
        blockers = [d.description for d in inspection.discrepancies if d.severity in ("BLOCKER", "ERROR")]
        raise HTTPException(
            status_code=400,
            detail=f"Replay safety check failed: {'; '.join(blockers) or 'Unsafe replay'}",
        )
    orch = get_creative_orchestrator()
    try:
        pipeline = orch.import_project(project_data)
        return orch.execute_pipeline(pipeline.pipeline_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))



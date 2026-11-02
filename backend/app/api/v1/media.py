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


# ============================================================================
# Phase 8 Stage 8.7 — Multimodal Media Understanding, Indexing & Retrieval
# ============================================================================

from backend.app.media.understanding_models import (
    MediaSearchRequest,
    MediaSearchResult,
    MediaUnderstandingRecord,
    MediaReuseRequest,
    MediaReuseRecommendation,
    MediaCollection,
    MediaAnalysisJob,
    SearchMode,
)
from backend.app.media.indexing_queue import media_indexing_manager
from backend.app.media.reuse_engine import media_reuse_engine


class MediaAnalyzeRequest(BaseModel):
    file_path: str
    media_type: str
    pipeline_id: Optional[str] = None
    language: str = "en"
    prompt_hint: Optional[str] = None
    model_id: Optional[str] = None
    model_digest: Optional[str] = None


class CollectionCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    collection_type: str = "PROJECT"
    tags: List[str] = Field(default_factory=list)


class CollectionAddArtifactsRequest(BaseModel):
    artifact_ids: List[str]


@router.get("/library/search", response_model=List[MediaSearchResult])
async def search_media_library_get(
    query: Optional[str] = None,
    media_type: Optional[str] = None,
    language: Optional[str] = None,
    min_duration: Optional[float] = None,
    max_duration: Optional[float] = None,
    limit: int = 20,
    offset: int = 0,
):
    """Search media library via query parameters."""
    req = MediaSearchRequest(
        query=query,
        media_types=[media_type] if media_type else None,
        languages=[language] if language else None,
        min_duration=min_duration,
        max_duration=max_duration,
        limit=limit,
        offset=offset,
    )
    return await media_indexing_manager.search_library(req)


@router.post("/library/search", response_model=List[MediaSearchResult])
async def search_media_library_post(request: MediaSearchRequest):
    """Execute hybrid semantic + technical filter media search."""
    return await media_indexing_manager.search_library(request)


@router.get("/library/artifacts/{artifact_id}", response_model=MediaUnderstandingRecord)
async def get_media_understanding(artifact_id: str):
    """Retrieve full multimodal understanding record for an artifact."""
    rec = await media_indexing_manager.get_understanding(artifact_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"Media understanding not found for {artifact_id}")
    return rec


@router.post("/library/artifacts/{artifact_id}/analyze", response_model=MediaAnalysisJob)
async def trigger_media_analysis(artifact_id: str, payload: MediaAnalyzeRequest):
    """Trigger background analysis and semantic indexing for an artifact."""
    return await media_indexing_manager.submit_indexing_job(
        artifact_id=artifact_id,
        file_path=payload.file_path,
        media_type=payload.media_type,
        pipeline_id=payload.pipeline_id,
        language=payload.language,
        prompt_hint=payload.prompt_hint,
        model_id=payload.model_id,
        model_digest=payload.model_digest,
        force_reanalysis=True,
    )


@router.post("/library/similar", response_model=List[MediaSearchResult])
async def get_similar_media(reference_artifact_id: str, limit: int = 5):
    """Retrieve semantically similar assets given a reference artifact."""
    rec = await media_indexing_manager.get_understanding(reference_artifact_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"Reference artifact {reference_artifact_id} not found in understanding library")
    req = MediaSearchRequest(
        query=f"{rec.caption} {rec.environment} {rec.visual_style}",
        media_types=[rec.media_type],
        limit=limit + 1,
    )
    results = await media_indexing_manager.search_library(req)
    return [r for r in results if r.artifact_id != reference_artifact_id][:limit]


@router.post("/library/reuse-candidate", response_model=MediaReuseRecommendation)
async def evaluate_reuse_candidate(candidate_artifact_id: str, request: MediaReuseRequest):
    """Evaluate candidate asset for creative node reuse compatibility."""
    rec = await media_indexing_manager.get_understanding(candidate_artifact_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"Candidate artifact {candidate_artifact_id} not indexed")
    return media_reuse_engine.evaluate_reuse_candidate(request=request, candidate_record=rec)


@router.get("/library/collections", response_model=List[MediaCollection])
async def list_media_collections():
    """List all user and system media collections."""
    return await media_indexing_manager.list_collections()


@router.post("/library/collections", response_model=MediaCollection, status_code=status.HTTP_201_CREATED)
async def create_media_collection(payload: CollectionCreateRequest):
    """Create a new media collection."""
    return await media_indexing_manager.create_collection(
        title=payload.title,
        description=payload.description,
        collection_type=payload.collection_type,
        tags=payload.tags,
    )


@router.post("/library/collections/{collection_id}/artifacts", response_model=MediaCollection)
async def add_artifacts_to_collection(collection_id: str, payload: CollectionAddArtifactsRequest):
    """Add artifact references to an existing collection."""
    col = await media_indexing_manager.add_to_collection(collection_id, payload.artifact_ids)
    if not col:
        raise HTTPException(status_code=404, detail=f"Collection {collection_id} not found")
    return col


@router.get("/library/jobs", response_model=List[MediaAnalysisJob])
async def list_media_indexing_jobs():
    """List background media analysis jobs."""
    return await media_indexing_manager.list_jobs()


# ============================================================================
# Dynamic Animated Media Storage Vault & Automated Studio Endpoints
# ============================================================================

import uuid
from datetime import datetime, timezone

class MediaVaultItem(BaseModel):
    id: str
    filename: str
    media_type: str  # "image" | "video" | "audio"
    extension: str
    size_bytes: int
    size_formatted: str
    created_at: float
    created_iso: str
    relative_path: str
    stream_url: str
    download_url: str
    prompt: Optional[str] = None
    model_id: Optional[str] = None
    dimensions: Optional[str] = None
    sha256: Optional[str] = None


class MediaVaultSummary(BaseModel):
    total_count: int
    image_count: int
    video_count: int
    audio_count: int
    total_bytes: int
    total_size_formatted: str
    items: List[MediaVaultItem]


class AudioGenerateRequest(BaseModel):
    prompt: str = Field(..., description="Prompt text or narration script for audio synthesis")
    voice: Optional[str] = Field(default="en-GB-RyanNeural", description="Neural voice identifier")
    style: Optional[str] = Field(default="SPEECH", description="Audio style: SPEECH or MUSIC")


class AutomatedStudioRequest(BaseModel):
    category: str = Field(..., description="'image', 'video', or 'audio'")
    prompt: str = Field(..., description="Prompt or description")
    aspect_ratio: Optional[str] = Field(default="1:1", description="1:1, 16:9, or 9:16")


VAULT_MIME_MAP = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
}


def _format_size(size_bytes: int) -> str:
    for unit in ["B", "KB", "MB", "GB"]:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} TB"


def _resolve_project_root() -> Path:
    curr = Path(__file__).resolve().parent
    for p in [curr] + list(curr.parents):
        if (p / "backend").exists() and ((p / "frontend").exists() or (p / "project_data").exists()):
            return p
    return Path(__file__).resolve().parents[4]


def _get_media_dirs() -> List[Path]:
    root = _resolve_project_root()
    dirs = [
        (root / "project_data" / "media").resolve(),
        (root / "media").resolve(),
        (root / "database" / "media").resolve(),
    ]
    (root / "project_data" / "media").mkdir(parents=True, exist_ok=True)
    return [d for d in dirs if d.exists()]


def _resolve_vault_file(relative_or_safe_path: str) -> Optional[Path]:
    clean_path = relative_or_safe_path.strip().replace("\\", "/").lstrip("/")
    if ".." in clean_path:
        return None
    root = _resolve_project_root()
    for base in _get_media_dirs():
        candidate = (base / clean_path).resolve()
        if candidate.exists() and candidate.is_file():
            if str(candidate).startswith(str(base)) or str(candidate).startswith(str(root)):
                return candidate
        # Also check direct filename match in subdirectories
        candidate_flat = (base / Path(clean_path).name).resolve()
        if candidate_flat.exists() and candidate_flat.is_file():
            return candidate_flat
        # Check recursively if single file name provided
        matches = list(base.rglob(Path(clean_path).name))
        if matches and matches[0].is_file():
            return matches[0]
    return None


@router.get("/vault", response_model=MediaVaultSummary)
async def get_media_vault(
    type: Optional[str] = Query(default=None, description="Filter by type: image, video, audio"),
    search: Optional[str] = Query(default=None, description="Search keyword in filename or prompt"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    sort: str = Query(default="newest", description="'newest', 'oldest', or 'size'")
):
    """Dynamically scan physical storage and SQLite WAL for all real generated media."""
    root = _resolve_project_root()
    media_dirs = _get_media_dirs()

    # 1. Query SQLite WAL metadata map
    db_meta: Dict[str, Dict[str, Any]] = {}
    try:
        db_paths = [
            root / "database" / "relational" / "system.db",
            root / "backend" / "database" / "relational" / "system.db"
        ]
        import sqlite3
        for db_file in db_paths:
            if db_file.exists():
                conn = sqlite3.connect(f"file:{db_file}?mode=ro", uri=True)
                cur = conn.cursor()
                try:
                    cur.execute("SELECT filename, prompt_preview, model_id, sha256, width, height FROM media_artifacts")
                    for row in cur.fetchall():
                        db_meta[row[0]] = {"prompt": row[1], "model": row[2], "sha256": row[3], "dims": f"{row[4]}x{row[5]}"}
                except Exception:
                    pass
                try:
                    cur.execute("SELECT filename, prompt_preview, model_id, sha256, width, height, fps, duration_seconds FROM video_artifacts")
                    for row in cur.fetchall():
                        db_meta[row[0]] = {"prompt": row[1], "model": row[2], "sha256": row[3], "dims": f"{row[4]}x{row[5]} @ {row[6]}fps"}
                except Exception:
                    pass
                conn.close()
    except Exception as e:
        logger.debug(f"SQLite WAL metadata query skipped: {e}")

    # Merge in-memory coordinator artifacts
    for art in media_coordinator.list_artifacts(limit=200):
        if art.filename not in db_meta:
            db_meta[art.filename] = {
                "prompt": art.prompt_preview,
                "model": art.model_id,
                "sha256": art.sha256,
                "dims": f"{art.width}x{art.height}"
            }
    for vart in video_coordinator.list_artifacts(limit=200):
        if vart.filename not in db_meta:
            db_meta[vart.filename] = {
                "prompt": vart.prompt_preview,
                "model": vart.model_id,
                "sha256": vart.sha256,
                "dims": f"{vart.width}x{vart.height}"
            }

    # 2. Dynamic Disk Scan
    raw_items = []
    seen_hashes = set()
    total_counts = {"image": 0, "video": 0, "audio": 0}
    total_bytes = 0

    for base_dir in media_dirs:
        if not base_dir.exists():
            continue
        for f in base_dir.rglob("*"):
            if not f.is_file():
                continue
            ext = f.suffix.lower()
            if ext not in VAULT_MIME_MAP:
                continue

            m_type = "image" if ext in (".png", ".jpg", ".jpeg", ".webp") else ("video" if ext in (".mp4", ".webm", ".mov") else "audio")
            try:
                st = f.stat()
            except OSError:
                continue

            # Deduplicate by (filename, size)
            dedup_key = f"{f.name}_{st.st_size}"
            if dedup_key in seen_hashes:
                continue
            seen_hashes.add(dedup_key)

            total_counts[m_type] += 1
            total_bytes += st.st_size

            # Relative path from base_dir
            try:
                rel = str(f.relative_to(base_dir)).replace("\\", "/")
            except ValueError:
                rel = f.name

            meta = db_meta.get(f.name, {})
            prompt_val = meta.get("prompt")
            if not prompt_val:
                prompt_val = f.name.replace(".png", "").replace(".mp4", "").replace(".wav", "").replace("_", " ")

            raw_items.append({
                "id": f.stem,
                "filename": f.name,
                "media_type": m_type,
                "extension": ext.lstrip("."),
                "size_bytes": st.st_size,
                "size_formatted": _format_size(st.st_size),
                "created_at": st.st_mtime,
                "created_iso": datetime.fromtimestamp(st.st_mtime, tz=timezone.utc).isoformat(),
                "relative_path": rel,
                "stream_url": f"/api/v1/media/vault/stream?path={rel}",
                "download_url": f"/api/v1/media/vault/download?path={rel}",
                "prompt": prompt_val,
                "model_id": meta.get("model"),
                "dimensions": meta.get("dims"),
                "sha256": meta.get("sha256")
            })

    # Filter by type
    if type and type.lower() != "all":
        target = type.lower()
        raw_items = [it for it in raw_items if it["media_type"] == target]

    # Filter by search
    if search:
        q = search.lower()
        raw_items = [
            it for it in raw_items
            if q in it["filename"].lower() or (it.get("prompt") and q in it["prompt"].lower())
        ]

    # Sort
    if sort == "oldest":
        raw_items.sort(key=lambda x: x["created_at"])
    elif sort == "size":
        raw_items.sort(key=lambda x: x["size_bytes"], reverse=True)
    else:  # newest
        raw_items.sort(key=lambda x: x["created_at"], reverse=True)

    paginated = raw_items[offset : offset + limit]

    return MediaVaultSummary(
        total_count=len(raw_items),
        image_count=total_counts["image"],
        video_count=total_counts["video"],
        audio_count=total_counts["audio"],
        total_bytes=total_bytes,
        total_size_formatted=_format_size(total_bytes),
        items=[MediaVaultItem(**it) for it in paginated]
    )


@router.get("/vault/stream")
async def stream_vault_media(path: str = Query(..., description="Relative path of media file")):
    """Dynamically stream any media file with byte-range support for browser playback."""
    file_path = _resolve_vault_file(path)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Media file not found in storage: {path}")

    ext = file_path.suffix.lower()
    media_type = VAULT_MIME_MAP.get(ext, "application/octet-stream")
    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=file_path.name,
        headers={"Accept-Ranges": "bytes"}
    )


@router.get("/vault/download")
async def download_vault_media(path: str = Query(..., description="Relative path of media file")):
    """Dynamically download raw media file binary."""
    file_path = _resolve_vault_file(path)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Media file not found in storage: {path}")

    return FileResponse(
        path=str(file_path),
        media_type="application/octet-stream",
        filename=file_path.name
    )


@router.post("/audio/generate", status_code=status.HTTP_201_CREATED)
async def generate_speech_or_music(payload: AudioGenerateRequest):
    """Dynamically generate speech audio or musical sequence, storing to physical vault storage."""
    from backend.app.perception.audio.tts import text_to_speech
    import time
    import hashlib

    text = payload.prompt.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Prompt must not be empty")

    root = _resolve_project_root()
    audio_dir = (root / "media" / "audio").resolve()
    audio_dir.mkdir(parents=True, exist_ok=True)
    proj_audio_dir = (root / "project_data" / "media" / "audio").resolve()
    proj_audio_dir.mkdir(parents=True, exist_ok=True)

    tts_res = await text_to_speech.synthesize(
        text=text,
        voice=payload.voice or "en-GB-RyanNeural"
    )

    file_id = f"audio_{uuid.uuid4().hex[:10]}"
    filename = f"{file_id}.wav"
    dest_path = audio_dir / filename
    with open(dest_path, "wb") as f:
        f.write(tts_res.audio_bytes)

    # Sync into project_data/media/audio
    try:
        with open(proj_audio_dir / filename, "wb") as f:
            f.write(tts_res.audio_bytes)
    except Exception:
        pass

    sha256 = hashlib.sha256(tts_res.audio_bytes).hexdigest()
    rel_path = f"audio/{filename}"

    # Register artifact in media coordinator
    try:
        from backend.app.media.models import MediaArtifact, ImageFormat, MediaType
        art = MediaArtifact(
            artifact_id=f"art_{file_id}",
            job_id=f"job_{file_id}",
            media_type=MediaType.AUDIO,
            path=f"media/{rel_path}",
            filename=filename,
            format=ImageFormat.PNG,
            width=0,
            height=0,
            size_bytes=len(tts_res.audio_bytes),
            sha256=sha256,
            created_at=time.time(),
            model_id=tts_res.engine_used,
            generation_parameters_hash=f"gen_{hash(text)}",
            prompt_preview=text[:80],
            provenance="ACTUAL"
        )
        media_coordinator.storage.register_artifact(art)
    except Exception as e:
        logger.warning(f"Failed to register audio artifact in media storage: {e}")

    return {
        "status": "SUCCESS",
        "id": file_id,
        "filename": filename,
        "media_type": "audio",
        "size_bytes": len(tts_res.audio_bytes),
        "size_formatted": _format_size(len(tts_res.audio_bytes)),
        "duration_seconds": tts_res.duration_seconds,
        "relative_path": rel_path,
        "stream_url": f"/api/v1/media/vault/stream?path={rel_path}",
        "download_url": f"/api/v1/media/vault/download?path={rel_path}",
        "prompt": text,
        "created_at": time.time(),
        "created_iso": datetime.now(timezone.utc).isoformat(),
        "sha256": sha256
    }


@router.post("/automated/generate", status_code=status.HTTP_201_CREATED)
async def automated_generate(payload: AutomatedStudioRequest):
    """Unified 1-click automated media synthesis: automates model selection, dimensions, resources."""
    prompt = payload.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")

    cat = payload.category.lower().strip()
    if cat == "image":
        dim_map = {
            "1:1": (512, 512),
            "16:9": (768, 432),
            "9:16": (432, 768),
        }
        w, h = dim_map.get(payload.aspect_ratio or "1:1", (512, 512))
        available_models = media_coordinator.get_models()
        model_id = available_models[0].model_id if available_models else "sd-turbo-local"
        from backend.app.media.models import ImageGenerationRequest, ImageFormat, QualityProfile
        req = ImageGenerationRequest(
            prompt=prompt,
            model_id=model_id,
            width=w,
            height=h,
            steps=20,
            output_format=ImageFormat.PNG,
            quality_profile=QualityProfile.STANDARD,
            preferred_device="GPU",
        )
        success, job, msg = media_coordinator.submit_image_generation(req)
        return {
            "status": "SUCCESS" if success else "FAILED",
            "category": "image",
            "job": job.model_dump() if hasattr(job, "model_dump") else job,
            "message": msg or "Image generation job submitted"
        }

    elif cat == "video":
        dim_map = {
            "1:1": (512, 512),
            "16:9": (576, 320),
            "9:16": (320, 576),
        }
        w, h = dim_map.get(payload.aspect_ratio or "1:1", (512, 512))
        v_models = video_coordinator.get_models()
        v_model_id = v_models[0].model_id if v_models else "svd-turbo-local"
        from backend.app.media.video_models import VideoGenerationRequest, VideoFormat
        v_req = VideoGenerationRequest(
            prompt=prompt,
            model_id=v_model_id,
            width=w,
            height=h,
            fps=24,
            duration_seconds=2.0,
            steps=20,
            output_format=VideoFormat.MP4,
            preferred_device="GPU",
        )
        success, job, msg = video_coordinator.submit_video_generation(v_req)
        return {
            "status": "SUCCESS" if success else "FAILED",
            "category": "video",
            "job": job.model_dump() if hasattr(job, "model_dump") else job,
            "message": msg or "Video generation job submitted"
        }

    elif cat in ("audio", "speech", "music"):
        return await generate_speech_or_music(AudioGenerateRequest(
            prompt=prompt,
            style="MUSIC" if "music" in cat else "SPEECH"
        ))
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported category: {payload.category}")





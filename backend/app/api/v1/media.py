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

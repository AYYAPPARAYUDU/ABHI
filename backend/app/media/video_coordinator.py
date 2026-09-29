"""Phase 8 Stage 8.2 — Video Pipeline & Job Coordinator.

Authoritative orchestrator unifying:
- Registered Video Models & Hardware Profile Mapping
- Safety Screening Gate
- Resource Admission & Dynamic Leases for Video
- Chunked Temporal Generation & Segment Progress
- Canonical Video Storage & 6-Step Integrity Validation
- Checkpointing, Cancellation, Timeouts, and Safe Recovery
- Asynchronous Job Lifecycle & Telemetry
"""

import time
import uuid
import threading
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
from backend.app.core.logging import logger
from backend.app.media.models import (
    MediaJob,
    MediaJobStatus,
    MediaOperation,
    MediaType,
)
from backend.app.media.video_models import (
    VideoGenerationRequest,
    VideoModelDefinition,
    VideoArtifact,
    VideoFormat,
    VideoSegmentCheckpoint,
    VideoSegmentStatus,
)
from backend.app.media.policy import media_safety_gate
from backend.app.media.video_admission import video_resource_admission
from backend.app.media.video_storage import video_storage_manager
from backend.app.media.video_runtime import video_runtime, VideoRuntime
from backend.app.runtime.resources.models import WorkloadPriority, ResourceProfile
from backend.app.runtime.resources.manager import resource_manager


class VideoCoordinator:
    """Coordinates lifecycle of all video generation requests, models, and chunked checkpoints."""

    def __init__(self, runtime: Optional[VideoRuntime] = None):
        self.runtime = runtime or video_runtime
        self.storage = video_storage_manager
        self.admission = video_resource_admission
        self.safety = media_safety_gate
        self._lock = threading.RLock()
        self._models: Dict[str, VideoModelDefinition] = {}
        self._jobs: Dict[str, MediaJob] = {}
        self._artifacts: Dict[str, VideoArtifact] = {}
        self._checkpoints: Dict[str, List[VideoSegmentCheckpoint]] = {}  # job_id -> checkpoints
        self._cancel_events: Dict[str, threading.Event] = {}
        self._init_default_models()

    def _init_default_models(self) -> None:
        """Register baseline local video generation models."""
        # 1. Stable Video Diffusion XT Local Model (Production)
        self.register_model(VideoModelDefinition(
            model_id="svd-xt-local",
            name="Stable Video Diffusion XT Local",
            version="1.1.0",
            digest="sha256:7e3d1a9b4c8f205e",
            runtime="Local-Video-Diffusion-Engine",
            format="Diffusers-Video",
            quantization="FP16",
            base_vram_mb=4200.0,
            per_second_vram_mb=280.0,
            base_ram_mb=3072.0,
            gpu_compute_percent=75.0,
            supported_resolutions=[[256, 256], [512, 512], [768, 432]],
            supported_fps=[12, 16, 24],
            max_duration_seconds=4.0,
            is_production=True,
            is_candidate=False
        ))

        # 2. AnimateDiff Lightning Local Model (Fast preview / production)
        self.register_model(VideoModelDefinition(
            model_id="animatediff-lightning-local",
            name="AnimateDiff Lightning 8-Step",
            version="1.0.0",
            digest="sha256:5b8e2f9d1a3c7406",
            runtime="Local-Video-Diffusion-Engine",
            format="Diffusers-Video",
            quantization="FP16",
            base_vram_mb=3600.0,
            per_second_vram_mb=200.0,
            base_ram_mb=2560.0,
            gpu_compute_percent=70.0,
            supported_resolutions=[[256, 256], [512, 512], [768, 768]],
            supported_fps=[12, 16, 24, 30],
            max_duration_seconds=3.0,
            is_production=True,
            is_candidate=False
        ))

        # 3. CogVideoX 2B Candidate Model (Isolated candidate evaluation)
        self.register_model(VideoModelDefinition(
            model_id="cogvideox-candidate",
            name="CogVideoX 2B (Candidate)",
            version="0.9.0",
            digest="sha256:3d7a1c9e8b2f4501",
            runtime="Local-Video-Diffusion-Engine",
            format="Diffusers-Video",
            quantization="INT8",
            base_vram_mb=5600.0,
            per_second_vram_mb=350.0,
            base_ram_mb=4096.0,
            gpu_compute_percent=88.0,
            supported_resolutions=[[512, 512], [768, 432], [768, 768]],
            supported_fps=[12, 16, 24],
            max_duration_seconds=6.0,
            is_production=False,
            is_candidate=True
        ))

    def register_model(self, model_def: VideoModelDefinition) -> VideoModelDefinition:
        """Register a video model in catalog and synchronize with Resource Manager."""
        with self._lock:
            self._models[model_def.model_id] = model_def
            resource_manager.model_manager.register_model(
                model_id=model_def.model_id,
                model_tag=f"{model_def.model_id}:{model_def.version}",
                model_digest=model_def.digest,
                format=model_def.format,
                quantization=model_def.quantization,
                parameter_count="1.5B-4B",
                runtime=model_def.runtime,
                resource_profile=ResourceProfile(
                    vram_mb=model_def.base_vram_mb,
                    ram_mb=model_def.base_ram_mb,
                    gpu_compute_percent=model_def.gpu_compute_percent
                ),
                is_production=model_def.is_production,
                is_candidate=model_def.is_candidate
            )
            logger.info(f"VideoCoordinator: Registered video model {model_def.model_id}")
            return model_def

    def get_models(self) -> List[VideoModelDefinition]:
        with self._lock:
            return list(self._models.values())

    def get_model(self, model_id: str) -> Optional[VideoModelDefinition]:
        with self._lock:
            return self._models.get(model_id)

    def submit_video_generation(
        self,
        request: VideoGenerationRequest,
        task_id: Optional[str] = None,
        execution_id: Optional[str] = None,
        priority: WorkloadPriority = WorkloadPriority.P1_INTERACTIVE_USER
    ) -> Tuple[bool, MediaJob, str]:
        """Submit and synchronously/asynchronously execute a video generation job."""
        model_def = self.get_model(request.model_id)
        if not model_def:
            job_id = f"job_vid_{uuid.uuid4().hex[:12]}"
            failed_job = MediaJob(
                job_id=job_id,
                task_id=task_id,
                media_type=MediaType.VIDEO,
                prompt=request.prompt,
                model_id=request.model_id,
                status=MediaJobStatus.FAILED,
                failure_reason=f"MODEL_NOT_FOUND: Video model {request.model_id} is not registered"
            )
            return False, failed_job, f"Video model {request.model_id} not registered"

        # 1. Safety & Policy Gate
        safety_res = self.safety.screen_prompt(request.prompt, request.negative_prompt)
        if not safety_res.is_allowed:
            job_id = f"job_vid_{uuid.uuid4().hex[:12]}"
            failed_job = MediaJob(
                job_id=job_id,
                task_id=task_id,
                media_type=MediaType.VIDEO,
                prompt=request.prompt,
                model_id=request.model_id,
                status=MediaJobStatus.FAILED,
                failure_reason="; ".join(safety_res.policy_violations)
            )
            return False, failed_job, failed_job.failure_reason

        # 2. Construct Job Object
        job_id = f"job_vid_{uuid.uuid4().hex[:12]}"
        cancel_ev = threading.Event()
        with self._lock:
            self._cancel_events[job_id] = cancel_ev

        job = MediaJob(
            job_id=job_id,
            task_id=task_id,
            execution_id=execution_id,
            media_type=MediaType.VIDEO,
            operation=MediaOperation.GENERATE,
            prompt=safety_res.sanitized_prompt,
            negative_prompt=request.negative_prompt,
            model_id=model_def.model_id,
            model_version=model_def.version,
            parameters=request.model_dump(),
            status=MediaJobStatus.QUEUED,
            progress=0.0,
            current_phase="QUEUED",
            created_at=time.time(),
            provenance="ACTUAL"
        )
        with self._lock:
            self._jobs[job_id] = job

        # 3. Execute Video Generation Workflow
        success, executed_job, msg = self._execute_job(job, request, model_def, priority, cancel_ev)
        return success, executed_job, msg

    def _execute_job(
        self,
        job: MediaJob,
        request: VideoGenerationRequest,
        model_def: VideoModelDefinition,
        priority: WorkloadPriority,
        cancel_ev: threading.Event
    ) -> Tuple[bool, MediaJob, str]:
        """Execute the end-to-end video job pipeline."""
        job.started_at = time.time()

        # Phase 1: Resource Admission
        job.status = MediaJobStatus.QUEUED
        job.current_phase = "ADMISSION_CHECK"
        admitted, lease_id, target_device, reason = self.admission.admit_video_job(
            job_id=job.job_id,
            request=request,
            model_def=model_def,
            priority=priority,
            timeout_sec=180.0
        )

        if not admitted:
            job.status = MediaJobStatus.RESOURCE_DENIED
            job.failure_reason = f"RESOURCE_ADMISSION_DENIED: {reason}"
            job.completed_at = time.time()
            return False, job, job.failure_reason

        job.lease_id = lease_id
        job.device = target_device.value if target_device else "GPU"
        job.status = MediaJobStatus.ADMITTED
        job.progress = 10.0

        vid_path, vid_rel, poster_path, poster_rel, temp_dir = self.storage.generate_video_artifact_paths(
            job.job_id, request.output_format
        )
        job.output_path = vid_rel

        try:
            # Phase 2: Chunked Generation & Progress
            job.status = MediaJobStatus.GENERATING
            job.current_phase = "GENERATING_SEGMENTS"

            def on_progress(pct: float, phase: str, details: Optional[Dict[str, Any]]):
                job.progress = pct
                job.current_phase = phase

            gen_ok, meta, gen_msg = self.runtime.generate_video(
                request=request,
                model_def=model_def,
                output_path=vid_path,
                poster_path=poster_path,
                temp_dir=temp_dir,
                device=job.device,
                progress_callback=on_progress,
                cancel_event=cancel_ev,
                timeout_sec=180.0
            )

            if not gen_ok:
                if cancel_ev.is_set():
                    job.status = MediaJobStatus.CANCELLED
                    job.failure_reason = "Cancelled by operator"
                else:
                    job.status = MediaJobStatus.FAILED
                    job.failure_reason = gen_msg
                job.completed_at = time.time()
                return False, job, gen_msg

            # Phase 3: Artifact Validation & Registration
            job.status = MediaJobStatus.VALIDATING
            job.current_phase = "VALIDATING"

            val_ok, artifact, val_msg = self.storage.validate_and_register_video_artifact(
                file_path=vid_path,
                poster_path=poster_path,
                job_id=job.job_id,
                expected_format=request.output_format,
                expected_width=request.width,
                expected_height=request.height,
                expected_fps=request.fps,
                expected_duration_seconds=request.duration_seconds,
                model_id=model_def.model_id,
                parameters_hash=request.compute_parameters_hash(),
                prompt_preview=self.safety.create_redacted_summary(request.prompt),
                provenance="ACTUAL"
            )

            if not val_ok or not artifact:
                job.status = MediaJobStatus.FAILED
                job.failure_reason = f"VIDEO_ARTIFACT_INVALID: {val_msg}"
                job.completed_at = time.time()
                return False, job, job.failure_reason

            with self._lock:
                self._artifacts[artifact.artifact_id] = artifact

            # Phase 4: Completion
            job.status = MediaJobStatus.COMPLETED
            job.current_phase = "COMPLETED"
            job.progress = 100.0
            job.artifact_id = artifact.artifact_id
            job.completed_at = time.time()
            job.duration_ms = int((job.completed_at - job.started_at) * 1000)

            logger.info(
                f"VideoCoordinator: Job {job.job_id} COMPLETED in {job.duration_ms}ms "
                f"(artifact: {artifact.artifact_id})"
            )
            return True, job, "Video generation completed successfully"

        except Exception as e:
            logger.error(f"VideoCoordinator: Uncaught exception in job {job.job_id}: {e}")
            job.status = MediaJobStatus.FAILED
            job.failure_reason = f"INTERNAL_ERROR: {str(e)}"
            job.completed_at = time.time()
            return False, job, str(e)

        finally:
            # Phase 5: Resource Release & Temporary Workspace Cleanup
            self.admission.release_job_lease(lease_id=job.lease_id, job_id=job.job_id)
            self.storage.cleanup_temp_workspace(temp_dir)
            with self._lock:
                self._cancel_events.pop(job.job_id, None)

    def cancel_job(self, job_id: str) -> Tuple[bool, str]:
        """Cancel an active or queued video job."""
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return False, f"Job {job_id} not found"

            if job.status in [MediaJobStatus.COMPLETED, MediaJobStatus.FAILED, MediaJobStatus.CANCELLED]:
                return False, f"Job {job_id} is already in terminal state ({job.status.value})"

            cancel_ev = self._cancel_events.get(job_id)
            if cancel_ev:
                cancel_ev.set()

            job.status = MediaJobStatus.CANCELLED
            job.failure_reason = "Cancelled by user"
            job.completed_at = time.time()

            if job.lease_id:
                self.admission.release_job_lease(job.lease_id, job_id)

            logger.info(f"VideoCoordinator: Successfully cancelled video job {job_id}")
            return True, f"Video job {job_id} cancelled"

    def get_job(self, job_id: str) -> Optional[MediaJob]:
        with self._lock:
            return self._jobs.get(job_id)

    def list_jobs(self, limit: int = 50) -> List[MediaJob]:
        with self._lock:
            jobs = list(self._jobs.values())
            jobs.sort(key=lambda j: j.created_at, reverse=True)
            return jobs[:limit]

    def get_artifact(self, artifact_id: str) -> Optional[VideoArtifact]:
        with self._lock:
            return self._artifacts.get(artifact_id)

    def list_artifacts(self, limit: int = 50) -> List[VideoArtifact]:
        with self._lock:
            arts = list(self._artifacts.values())
            arts.sort(key=lambda a: a.created_at, reverse=True)
            return arts[:limit]

    def delete_artifact(self, artifact_id: str) -> Tuple[bool, str]:
        with self._lock:
            art = self._artifacts.get(artifact_id)
            if not art:
                return False, f"Artifact {artifact_id} not found"

            ok, msg = self.storage.delete_video_artifact(art.path)
            if ok:
                del self._artifacts[artifact_id]
                return True, "Video artifact deleted"
            return False, msg


# Global singleton coordinator
video_coordinator = VideoCoordinator()

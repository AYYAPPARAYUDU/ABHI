"""Phase 8 Stage 8.1 — Media Domain Data Models & Typed Contracts.

Governs:
- MediaType & MediaOperation Enums (Generic architecture for Image, Video, Audio)
- MediaJob & ImageGenerationRequest Typed Contracts
- MediaArtifact & ImageModelDefinition Schemas
- Future Video Extension Placeholders
"""

from enum import Enum
import time
import hashlib
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class MediaType(str, Enum):
    """Supported and extensible media taxonomies."""
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"  # Placeholder for Phase 8 Stage 8.2
    AUDIO = "AUDIO"  # Extension placeholder


class MediaOperation(str, Enum):
    """Taxonomy of media transformation operations."""
    GENERATE = "GENERATE"
    EDIT = "EDIT"  # Extension placeholder
    VARIATION = "VARIATION"  # Extension placeholder
    UPSCALE = "UPSCALE"  # Extension placeholder


class MediaJobStatus(str, Enum):
    """Deterministic state machine for media job lifecycle."""
    QUEUED = "QUEUED"
    ADMITTED = "ADMITTED"
    LOADING_MODEL = "LOADING_MODEL"
    GENERATING = "GENERATING"
    VALIDATING = "VALIDATING"
    STORING = "STORING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    FAILED = "FAILED"
    RESOURCE_DENIED = "RESOURCE_DENIED"
    QUARANTINED = "QUARANTINED"


class ImageFormat(str, Enum):
    """Supported local image output formats."""
    PNG = "PNG"
    JPEG = "JPEG"
    WEBP = "WEBP"


class QualityProfile(str, Enum):
    """Quality and latency presets for image generation."""
    DRAFT = "DRAFT"      # 10-15 steps, fast preview
    STANDARD = "STANDARD" # 20-30 steps, balanced
    HD = "HD"            # 35-50 steps, high detail
    ULTRA = "ULTRA"      # 50 steps, max fidelity


class ImageGenerationRequest(BaseModel):
    """Typed request payload for local image generation."""
    prompt: str = Field(..., min_length=1, max_length=2000, description="Text prompt describing the desired image")
    negative_prompt: Optional[str] = Field(default=None, max_length=1000, description="Optional negative prompt conditioning")
    model_id: str = Field(default="sd-turbo-local", description="Identifier of the registered image model to use")
    width: int = Field(default=512, ge=256, le=1024, description="Image width in pixels (must be divisible by 64)")
    height: int = Field(default=512, ge=256, le=1024, description="Image height in pixels (must be divisible by 64)")
    steps: int = Field(default=20, ge=1, le=50, description="Inference sampling steps")
    guidance: float = Field(default=7.5, ge=0.0, le=20.0, description="Classifier-free guidance scale")
    seed: Optional[int] = Field(default=None, ge=0, le=2147483647, description="Deterministic random seed")
    batch_size: int = Field(default=1, ge=1, le=4, description="Number of images in batch (1 is safe default)")
    output_format: ImageFormat = Field(default=ImageFormat.PNG, description="Target image file format")
    quality_profile: QualityProfile = Field(default=QualityProfile.STANDARD, description="Quality preset")
    preferred_device: str = Field(default="GPU", description="Preferred compute device: GPU or CPU")

    @field_validator("width", "height")
    @classmethod
    def validate_dimension_alignment(cls, v: int) -> int:
        if v % 64 != 0:
            raise ValueError(f"Image dimension {v} must be a multiple of 64")
        return v

    def compute_parameters_hash(self) -> str:
        """Compute deterministic SHA-256 hash of generation parameters."""
        raw = f"{self.prompt}|{self.negative_prompt}|{self.model_id}|{self.width}|{self.height}|{self.steps}|{self.guidance}|{self.seed}|{self.batch_size}|{self.output_format.value}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class MediaArtifact(BaseModel):
    """Immutable record of a validated local media artifact."""
    artifact_id: str = Field(..., description="Unique artifact identifier")
    job_id: str = Field(..., description="Parent media job identifier")
    media_type: MediaType = Field(default=MediaType.IMAGE)
    path: str = Field(..., description="Canonical relative filesystem path")
    filename: str = Field(..., description="Sanitized filename on disk")
    format: ImageFormat = Field(default=ImageFormat.PNG)
    width: int
    height: int
    size_bytes: int
    sha256: str = Field(..., description="SHA-256 checksum of generated file")
    created_at: float = Field(default_factory=time.time)
    model_id: str
    model_version: str = "1.0.0"
    generation_parameters_hash: str
    prompt_preview: str = Field(default="", description="Sanitized / truncated preview for display")
    provenance: str = Field(default="ACTUAL", description="Data provenance: ACTUAL | MOCKED | SIMULATED")


class MediaJob(BaseModel):
    """Complete lifecycle tracking record for a media generation job."""
    job_id: str = Field(..., description="Unique job identifier")
    task_id: Optional[str] = Field(default=None, description="Associated ABHI workflow task ID")
    execution_id: Optional[str] = Field(default=None, description="Execution run ID")
    media_type: MediaType = Field(default=MediaType.IMAGE)
    operation: MediaOperation = Field(default=MediaOperation.GENERATE)
    prompt: str
    negative_prompt: Optional[str] = None
    model_id: str
    model_version: str = "1.0.0"
    parameters: Dict[str, Any] = Field(default_factory=dict)
    resource_profile: Dict[str, Any] = Field(default_factory=dict)
    policy_profile: Dict[str, Any] = Field(default_factory=dict)
    output_policy: Dict[str, Any] = Field(default_factory=dict)
    status: MediaJobStatus = Field(default=MediaJobStatus.QUEUED)
    progress: float = Field(default=0.0, ge=0.0, le=100.0)
    current_phase: str = Field(default="QUEUED")
    created_at: float = Field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    failure_reason: Optional[str] = None
    artifact_id: Optional[str] = None
    output_path: Optional[str] = None
    lease_id: Optional[str] = None
    device: str = "GPU"
    duration_ms: Optional[int] = None
    provenance: str = "ACTUAL"


class ImageModelDefinition(BaseModel):
    """Typed specification for a registered local image generation model."""
    model_id: str = Field(..., description="Unique model identifier")
    name: str = Field(..., description="Human readable model name")
    version: str = Field(default="1.0.0")
    digest: str = Field(..., description="SHA-256 digest of model weights/config")
    runtime: str = Field(default="Local-Diffusion-Engine", description="Underlying runtime engine")
    format: str = Field(default="Diffusers-Local", description="Model format: Diffusers | Safetensors | GGUF | ONNX")
    quantization: str = Field(default="FP16", description="Weight quantization: FP16 | INT8 | INT4 | FP32")
    supported_devices: List[str] = Field(default_factory=lambda: ["GPU", "CPU"])
    base_vram_mb: float = Field(default=3500.0, description="Base VRAM required at 512x512")
    base_ram_mb: float = Field(default=2048.0, description="Base RAM required on CPU fallback")
    gpu_compute_percent: float = Field(default=60.0)
    supported_resolutions: List[List[int]] = Field(
        default_factory=lambda: [[256, 256], [512, 512], [768, 768], [1024, 1024], [512, 768], [768, 512]]
    )
    max_batch: int = Field(default=4)
    capabilities: List[str] = Field(default_factory=lambda: ["text-to-image", "deterministic-seed", "negative-prompt"])
    license_metadata: str = Field(default="Open-RAIL / Apache-2.0 / Local-Use")
    source: str = Field(default="local-verified-artifact")
    status: str = Field(default="AVAILABLE")
    is_production: bool = Field(default=True)
    is_candidate: bool = Field(default=False)


# Video contracts imported from video_models for unified domain access
from backend.app.media.video_models import (
    VideoFormat,
    VideoType,
    VideoSegmentStatus,
    VideoSegmentCheckpoint,
    VideoGenerationRequest,
    VideoArtifact,
    VideoModelDefinition,
)

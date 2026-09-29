"""Phase 8 Stage 8.2 — Local Video Domain Data Models & Typed Contracts.

Governs:
- VideoFormat & VideoType Enums
- VideoGenerationRequest Typed Contract with validation
- VideoArtifact, VideoJob, and VideoModelDefinition Schemas
- VideoSegmentCheckpoint for Chunked Temporal Generation & Recovery
- VideoResourceProfile for RTX 5050 VRAM/RAM budgeting
"""

from enum import Enum
import time
import hashlib
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class VideoFormat(str, Enum):
    """Supported local video container formats."""
    MP4 = "MP4"
    WEBM = "WEBM"


class VideoType(str, Enum):
    """Supported operational modes for video synthesis."""
    TEXT_TO_VIDEO = "TEXT_TO_VIDEO"
    IMAGE_TO_VIDEO = "IMAGE_TO_VIDEO"
    VIDEO_TO_VIDEO = "VIDEO_TO_VIDEO"


class VideoSegmentStatus(str, Enum):
    """Lifecycle state of an individual chunked video segment."""
    PENDING = "PENDING"
    GENERATING = "GENERATING"
    COMPLETED = "COMPLETED"
    VERIFIED = "VERIFIED"
    FAILED = "FAILED"


class VideoSegmentCheckpoint(BaseModel):
    """Immutable checkpoint record for a chunked temporal video segment."""
    segment_id: str = Field(..., description="Unique segment identifier")
    job_id: str = Field(..., description="Parent video job identifier")
    segment_index: int = Field(..., ge=0, description="0-indexed segment sequence number")
    frame_start: int = Field(..., ge=0, description="Global starting frame index")
    frame_end: int = Field(..., ge=1, description="Global ending frame index (exclusive)")
    frame_count: int = Field(..., ge=1, description="Number of frames in segment")
    sha256: str = Field(default="", description="SHA-256 checksum of segment binary/frames")
    temp_path: Optional[str] = Field(default=None, description="Path to temporary segment video file")
    status: VideoSegmentStatus = Field(default=VideoSegmentStatus.PENDING)
    created_at: float = Field(default_factory=time.time)
    verified: bool = Field(default=False)


class VideoGenerationRequest(BaseModel):
    """Typed request contract for local video generation."""
    prompt: str = Field(..., min_length=1, max_length=2000, description="Text prompt describing the desired motion and scene")
    negative_prompt: Optional[str] = Field(default=None, max_length=1000, description="Negative prompt conditioning")
    model_id: str = Field(default="svd-xt-local", description="Identifier of registered video model")
    width: int = Field(default=512, ge=256, le=1024, description="Video width in pixels (must be multiple of 64)")
    height: int = Field(default=512, ge=256, le=1024, description="Video height in pixels (must be multiple of 64)")
    fps: int = Field(default=24, ge=12, le=30, description="Frames per second")
    duration_seconds: float = Field(default=2.0, ge=1.0, le=10.0, description="Target video duration in seconds")
    steps: int = Field(default=25, ge=1, le=50, description="Sampling steps per segment")
    seed: Optional[int] = Field(default=None, ge=0, le=2147483647, description="Deterministic random seed")
    output_format: VideoFormat = Field(default=VideoFormat.MP4, description="Output video format")
    quality_profile: str = Field(default="STANDARD", description="DRAFT | STANDARD | HD")
    preferred_device: str = Field(default="GPU", description="Preferred compute device: GPU or CPU")
    chunk_duration_seconds: float = Field(default=2.0, ge=1.0, le=4.0, description="Temporal chunk size for VRAM bounding")

    @field_validator("width", "height")
    @classmethod
    def validate_dimension_alignment(cls, v: int) -> int:
        if v % 64 != 0:
            raise ValueError(f"Video dimension {v} must be a multiple of 64")
        return v

    @field_validator("fps")
    @classmethod
    def validate_fps(cls, v: int) -> int:
        if v not in [12, 16, 24, 30]:
            raise ValueError(f"FPS {v} not supported. Allowed values: [12, 16, 24, 30]")
        return v

    @property
    def total_frame_count(self) -> int:
        return int(round(self.fps * self.duration_seconds))

    def compute_parameters_hash(self) -> str:
        """Compute deterministic SHA-256 hash of video generation parameters."""
        raw = f"{self.prompt}|{self.negative_prompt}|{self.model_id}|{self.width}|{self.height}|{self.fps}|{self.duration_seconds}|{self.steps}|{self.seed}|{self.output_format.value}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class VideoArtifact(BaseModel):
    """Immutable record of a validated local video artifact."""
    artifact_id: str = Field(..., description="Unique artifact identifier")
    job_id: str = Field(..., description="Parent video job identifier")
    media_type: str = Field(default="VIDEO")
    path: str = Field(..., description="Canonical relative filesystem path")
    filename: str = Field(..., description="Sanitized filename on disk")
    format: VideoFormat = Field(default=VideoFormat.MP4)
    width: int
    height: int
    fps: int
    duration_seconds: float
    frame_count: int
    size_bytes: int
    sha256: str = Field(..., description="SHA-256 checksum of generated video")
    poster_path: Optional[str] = Field(default=None, description="Path to generated poster thumbnail frame")
    created_at: float = Field(default_factory=time.time)
    model_id: str
    model_version: str = "1.0.0"
    generation_parameters_hash: str
    prompt_preview: str = Field(default="", description="Sanitized preview for display")
    provenance: str = Field(default="ACTUAL", description="Data provenance: ACTUAL | MOCKED | SIMULATED")


class VideoModelDefinition(BaseModel):
    """Typed specification for a registered local video generation model."""
    model_id: str = Field(..., description="Unique model identifier")
    name: str = Field(..., description="Human-readable model name")
    version: str = Field(default="1.0.0")
    digest: str = Field(..., description="SHA-256 digest of model weights")
    runtime: str = Field(default="Local-Video-Diffusion-Engine", description="Underlying runtime engine")
    format: str = Field(default="Diffusers-Video", description="Model format")
    quantization: str = Field(default="FP16", description="Weight quantization: FP16 | INT8 | FP32")
    supported_devices: List[str] = Field(default_factory=lambda: ["GPU", "CPU"])
    base_vram_mb: float = Field(default=4200.0, description="Base VRAM required for model weights at 512x512")
    per_second_vram_mb: float = Field(default=300.0, description="Additional VRAM per second of temporal chunk")
    base_ram_mb: float = Field(default=3072.0, description="Base RAM required on CPU fallback")
    gpu_compute_percent: float = Field(default=75.0)
    supported_resolutions: List[List[int]] = Field(
        default_factory=lambda: [[256, 256], [512, 512], [768, 432], [768, 768]]
    )
    supported_fps: List[int] = Field(default_factory=lambda: [12, 16, 24, 30])
    max_duration_seconds: float = Field(default=6.0)
    supported_operations: List[str] = Field(default_factory=lambda: ["TEXT_TO_VIDEO"])
    capabilities: List[str] = Field(default_factory=lambda: ["text-to-video", "temporal-consistency", "chunked-synthesis"])
    license_metadata: str = Field(default="Open-RAIL / Apache-2.0 / Local-Use")
    source: str = Field(default="local-verified-artifact")
    status: str = Field(default="AVAILABLE")
    is_production: bool = Field(default=True)
    is_candidate: bool = Field(default=False)

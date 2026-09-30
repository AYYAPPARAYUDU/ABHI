"""Phase 8 Stage 8.3 — Local Image Editing, Inpainting & Outpainting Typed Models.

Governs:
- ImageEditType & EditOperation Enums
- ImageEditRequest, InpaintRequest, OutpaintRequest Typed Contracts
- MaskArtifact & OutpaintBounds Specifications
- ArtifactLineageRecord & EditDifferenceEvidence Schemas
- ImageEditModelDefinition Contracts
"""

from enum import Enum
import time
import hashlib
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field, field_validator
from backend.app.media.models import ImageFormat, QualityProfile, MediaJobStatus, MediaType, MediaOperation


class ImageEditType(str, Enum):
    """Supported local image edit transformation operations."""
    IMAGE_TO_IMAGE = "IMAGE_TO_IMAGE"
    INPAINTING = "INPAINTING"
    OUTPAINTING = "OUTPAINTING"


class MaskSemantics(str, Enum):
    """Standardized mask color convention."""
    WHITE_EDIT_BLACK_PRESERVE = "WHITE_EDIT_BLACK_PRESERVE"
    BLACK_EDIT_WHITE_PRESERVE = "BLACK_EDIT_WHITE_PRESERVE"


class OutpaintBounds(BaseModel):
    """Canvas directional expansion bounds in pixels."""
    top: int = Field(default=0, ge=0, le=512, description="Pixels to expand at top border")
    bottom: int = Field(default=0, ge=0, le=512, description="Pixels to expand at bottom border")
    left: int = Field(default=0, ge=0, le=512, description="Pixels to expand at left border")
    right: int = Field(default=0, ge=0, le=512, description="Pixels to expand at right border")

    @field_validator("top", "bottom", "left", "right")
    @classmethod
    def validate_expansion_alignment(cls, v: int) -> int:
        if v % 8 != 0:
            raise ValueError(f"Outpaint expansion {v} must be a multiple of 8 pixels")
        return v

    @property
    def total_added_pixels(self) -> int:
        return self.top + self.bottom + self.left + self.right

    def is_zero(self) -> bool:
        return self.total_added_pixels == 0


class MaskArtifact(BaseModel):
    """Immutable metadata record for a validated local mask artifact."""
    mask_id: str = Field(..., description="Unique mask identifier")
    source_artifact_id: str = Field(..., description="Source image artifact identifier")
    path: str = Field(..., description="Canonical relative filesystem path")
    filename: str = Field(..., description="Sanitized filename on disk")
    format: ImageFormat = Field(default=ImageFormat.PNG)
    width: int
    height: int
    size_bytes: int
    sha256: str = Field(..., description="SHA-256 checksum of mask file")
    semantics: MaskSemantics = Field(default=MaskSemantics.WHITE_EDIT_BLACK_PRESERVE)
    editable_pixel_count: int = Field(default=0, description="Count of active edit pixels")
    editable_ratio: float = Field(default=0.0, ge=0.0, le=1.0, description="Ratio of editable area to total canvas")
    created_at: float = Field(default_factory=time.time)
    provenance: str = Field(default="ACTUAL")


class EditDifferenceEvidence(BaseModel):
    """Deterministic technical difference evidence between source and edited image."""
    changed_pixel_count: int = Field(default=0)
    changed_pixel_ratio: float = Field(default=0.0, ge=0.0, le=1.0)
    bounding_box: List[int] = Field(default_factory=lambda: [0, 0, 0, 0], description="[x_min, y_min, x_max, y_max]")
    source_dimensions: List[int] = Field(default_factory=lambda: [512, 512])
    output_dimensions: List[int] = Field(default_factory=lambda: [512, 512])
    mask_overlap_ratio: Optional[float] = Field(default=None, description="Ratio of changed pixels inside mask boundary")
    classification: str = Field(default="TECHNICAL_EVIDENCE", description="Explicit classification: TECHNICAL_EVIDENCE ONLY")


class ImageEditRequest(BaseModel):
    """Typed request payload for local image editing, inpainting, or outpainting."""
    source_artifact_id: str = Field(..., min_length=4, max_length=128, description="Identifier of registered source MediaArtifact")
    operation: ImageEditType = Field(default=ImageEditType.IMAGE_TO_IMAGE, description="Edit operation type")
    prompt: str = Field(..., min_length=1, max_length=2000, description="Text prompt guiding the image transformation")
    negative_prompt: Optional[str] = Field(default=None, max_length=1000, description="Negative prompt conditioning")
    model_id: str = Field(default="instruct-pix2pix-local", description="Identifier of registered edit/inpaint model")
    mask_artifact_id: Optional[str] = Field(default=None, description="Required for INPAINTING; optional for other modes")
    strength: float = Field(default=0.75, ge=0.05, le=1.0, description="Transformation strength (0.05=minimal, 1.0=full redraw)")
    outpaint_bounds: Optional[OutpaintBounds] = Field(default=None, description="Directional padding bounds for OUTPAINTING")
    width: Optional[int] = Field(default=None, ge=256, le=1536, description="Output width (overrides source width if specified)")
    height: Optional[int] = Field(default=None, ge=256, le=1536, description="Output height (overrides source height if specified)")
    steps: int = Field(default=25, ge=1, le=50, description="Inference sampling steps")
    guidance: float = Field(default=7.5, ge=0.0, le=20.0, description="Classifier-free guidance scale")
    seed: Optional[int] = Field(default=None, ge=0, le=2147483647, description="Deterministic random seed")
    output_format: ImageFormat = Field(default=ImageFormat.PNG, description="Target image file format")
    quality_profile: QualityProfile = Field(default=QualityProfile.STANDARD, description="Quality preset")
    preferred_device: str = Field(default="GPU", description="Preferred compute device: GPU or CPU")

    @field_validator("width", "height")
    @classmethod
    def validate_dimension_alignment(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v % 64 != 0:
            raise ValueError(f"Image dimension {v} must be a multiple of 64")
        return v

    def compute_parameters_hash(self) -> str:
        """Compute deterministic SHA-256 hash of edit parameters."""
        outpaint_str = f"{self.outpaint_bounds.top}_{self.outpaint_bounds.bottom}_{self.outpaint_bounds.left}_{self.outpaint_bounds.right}" if self.outpaint_bounds else "none"
        raw = (
            f"{self.source_artifact_id}|{self.operation.value}|{self.prompt}|{self.negative_prompt}|"
            f"{self.model_id}|{self.mask_artifact_id}|{self.strength}|{outpaint_str}|"
            f"{self.width}|{self.height}|{self.steps}|{self.guidance}|{self.seed}|{self.output_format.value}"
        )
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class ArtifactLineageRecord(BaseModel):
    """Immutable lineage trace connecting original, intermediate, and edited artifacts."""
    lineage_id: str = Field(..., description="Unique lineage record identifier")
    parent_artifact_id: str = Field(..., description="Parent/source artifact identifier")
    child_artifact_id: str = Field(..., description="Newly produced child artifact identifier")
    job_id: str = Field(..., description="Media job producing child artifact")
    operation: ImageEditType = Field(default=ImageEditType.IMAGE_TO_IMAGE)
    mask_artifact_id: Optional[str] = None
    prompt: str
    model_id: str
    model_version: str = "1.0.0"
    parameters_hash: str
    difference_evidence: Optional[EditDifferenceEvidence] = None
    created_at: float = Field(default_factory=time.time)
    version: int = Field(default=1, ge=1, description="Sequential lineage generation version")


class ImageEditModelDefinition(BaseModel):
    """Typed specification for a registered local image editing or inpainting model."""
    model_id: str = Field(..., description="Unique model identifier")
    name: str = Field(..., description="Human readable model name")
    version: str = Field(default="1.0.0")
    digest: str = Field(..., description="SHA-256 digest of model weights/config")
    runtime: str = Field(default="Local-ImageEdit-Diffusion-Engine")
    format: str = Field(default="Diffusers-Local")
    quantization: str = Field(default="FP16")
    supported_devices: List[str] = Field(default_factory=lambda: ["GPU", "CPU"])
    base_vram_mb: float = Field(default=3800.0, description="Base VRAM required for editing at 512x512")
    base_ram_mb: float = Field(default=2500.0, description="Base RAM required on CPU fallback")
    gpu_compute_percent: float = Field(default=65.0)
    supported_operations: List[ImageEditType] = Field(
        default_factory=lambda: [ImageEditType.IMAGE_TO_IMAGE, ImageEditType.INPAINTING, ImageEditType.OUTPAINTING]
    )
    supported_resolutions: List[List[int]] = Field(
        default_factory=lambda: [[256, 256], [512, 512], [768, 768], [1024, 1024], [512, 768], [768, 512]]
    )
    capabilities: List[str] = Field(
        default_factory=lambda: ["image-to-image", "inpainting", "outpainting", "strength-control", "mask-guidance"]
    )
    license_metadata: str = Field(default="Open-RAIL / CreativeML / Local-Use")
    source: str = Field(default="local-verified-artifact")
    status: str = Field(default="AVAILABLE")
    is_production: bool = Field(default=True)
    is_candidate: bool = Field(default=False)

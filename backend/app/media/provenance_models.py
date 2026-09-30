"""
Phase 8 Stage 8.6: Media Provenance, Attestation, and Reliability Models.

Defines unambiguous provenance classifications, runtime attestation records,
technical evidence structures, quality separation schemas, and replay inspection contracts.
"""

from __future__ import annotations

import enum
import hashlib
import json
import time
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field


class ProvenanceClass(str, enum.Enum):
    """
    Strict provenance classifications.
    Never use ambiguous 'AI-generated' or 'actual' without empirical supporting evidence.
    """
    ACTUAL_MODEL_INFERENCE = "ACTUAL_MODEL_INFERENCE"
    PROCEDURAL = "PROCEDURAL"
    SIMULATED = "SIMULATED"
    MOCKED = "MOCKED"
    ESTIMATED = "ESTIMATED"
    MEASURED = "MEASURED"


class ResourceProvenance(str, enum.Enum):
    """Provenance for resource measurements."""
    ACTUAL = "ACTUAL"
    MEASURED = "MEASURED"
    ESTIMATED = "ESTIMATED"
    SIMULATED = "SIMULATED"
    MOCKED = "MOCKED"


class EvaluationDimensionStatus(str, enum.Enum):
    """Explicit status for creative evaluation dimensions."""
    PASS = "PASS"
    FAIL = "FAIL"
    NOT_EVALUATED = "NOT_EVALUATED"
    INCONCLUSIVE = "INCONCLUSIVE"


class ReplayMode(str, enum.Enum):
    """Distinct phases of replay execution."""
    INSPECT = "INSPECT"
    SIMULATE = "SIMULATE"
    REPLAY = "REPLAY"


class TechnicalValidationStatus(str, enum.Enum):
    """Technical integrity validation status."""
    VALID = "VALID"
    INVALID = "INVALID"
    DEGRADED = "DEGRADED"
    UNKNOWN = "UNKNOWN"


def canonical_json_hash(data: Any) -> str:
    """Computes a deterministic SHA-256 hash over canonically serialized JSON."""
    if isinstance(data, BaseModel):
        data_dict = data.model_dump(mode="json")
    elif isinstance(data, dict):
        data_dict = data
    else:
        data_dict = {"value": data}

    serialized = json.dumps(data_dict, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


class MediaRuntimeAttestation(BaseModel):
    """
    Immutable cryptographic attestation of a media runtime operation.
    Links the exact model, runtime, device, parameters, inputs, and outputs.
    """
    attestation_id: str = Field(..., description="Unique attestation ID")
    operation_id: str = Field(..., description="Job or execution node ID")
    artifact_id: str = Field(..., description="ID of generated or verified artifact")
    operation_type: str = Field(..., description="e.g. TEXT_TO_IMAGE, IMAGE_TO_VIDEO, EDIT, TTS, COMPOSE")
    model_id: Optional[str] = Field(None, description="Registered model ID")
    model_digest: Optional[str] = Field(None, description="SHA-256 digest of weights")
    runtime_name: str = Field(..., description="e.g. LocalImageDiffusionRuntime, ProceduralSynthEngine")
    runtime_version: str = Field(..., description="Version of the executing runtime")
    adapter_version: str = Field(default="1.0.0", description="Skill adapter version")
    device: str = Field(default="CPU", description="Executing device (GPU:0, CPU, etc.)")
    driver_version: Optional[str] = Field(None, description="Host graphics driver or CUDA version")
    compute_runtime: Optional[str] = Field(None, description="e.g. PyTorch 2.5, ONNX Runtime, OpenCV")
    provenance_class: ProvenanceClass = Field(..., description="Strict provenance classification")
    precision: Optional[str] = Field(None, description="FP16, FP32, INT8, BF16")
    quantization: Optional[str] = Field(None, description="Quantization mode if applied")
    parameters_hash: str = Field(..., description="SHA-256 hash of execution parameters")
    input_hashes: List[str] = Field(default_factory=list, description="SHA-256 hashes of input artifacts/prompts")
    output_hashes: List[str] = Field(default_factory=list, description="SHA-256 hashes of generated artifacts")
    seed: Optional[int] = Field(None, description="RNG seed used")
    started_at: float = Field(default_factory=time.time)
    completed_at: float = Field(default_factory=time.time)
    attestation_hash: str = Field(default="", description="Canonical SHA-256 hash of this attestation")

    def compute_attestation_hash(self) -> str:
        dump = self.model_dump(mode="json", exclude={"attestation_hash"})
        return canonical_json_hash(dump)


class ResourceMeasurementEvidence(BaseModel):
    """
    Empirical resource measurements with explicit provenance labels.
    """
    peak_vram_mb: float = Field(default=0.0)
    vram_provenance: ResourceProvenance = Field(default=ResourceProvenance.ESTIMATED)
    peak_ram_mb: float = Field(default=0.0)
    ram_provenance: ResourceProvenance = Field(default=ResourceProvenance.ESTIMATED)
    gpu_utilization_pct: float = Field(default=0.0)
    cpu_utilization_pct: float = Field(default=0.0)
    storage_peak_bytes: int = Field(default=0)
    resource_wait_time_ms: float = Field(default=0.0)
    model_load_time_ms: float = Field(default=0.0)
    model_switch_count: int = Field(default=0)


class TechnicalValidationCheck(BaseModel):
    """Single technical validation check result."""
    check_name: str
    passed: bool
    status: TechnicalValidationStatus = TechnicalValidationStatus.VALID
    detail: str = ""
    measured_value: Optional[Any] = None
    expected_value: Optional[Any] = None


class TechnicalValidationResult(BaseModel):
    """
    Centralized technical validation result covering container, codec,
    dimensions, timing alignment, and cryptographic hashes.
    """
    is_valid: bool = True
    status: TechnicalValidationStatus = TechnicalValidationStatus.VALID
    checks: List[TechnicalValidationCheck] = Field(default_factory=list)
    duration_s: Optional[float] = None
    resolution_actual: Optional[Tuple[int, int]] = None
    fps_actual: Optional[float] = None
    frame_count_actual: Optional[int] = None
    codec_actual: Optional[str] = None
    audio_channels_actual: Optional[int] = None
    sample_rate_actual: Optional[int] = None
    subtitle_segment_count: Optional[int] = None
    file_size_bytes: int = 0
    sha256_actual: str = ""
    lineage_verified: bool = True
    manifest_link_verified: bool = True
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class CreativeQualityEvidence(BaseModel):
    """
    Separated creative quality measurements.
    Never infer creative excellence from technical validity.
    Dimensions without empirical evaluators must remain NOT_EVALUATED.
    """
    prompt_adherence: EvaluationDimensionStatus = EvaluationDimensionStatus.NOT_EVALUATED
    prompt_adherence_score: Optional[float] = None
    visual_coherence: EvaluationDimensionStatus = EvaluationDimensionStatus.NOT_EVALUATED
    visual_coherence_score: Optional[float] = None
    temporal_coherence: EvaluationDimensionStatus = EvaluationDimensionStatus.NOT_EVALUATED
    temporal_coherence_score: Optional[float] = None
    style_consistency: EvaluationDimensionStatus = EvaluationDimensionStatus.NOT_EVALUATED
    style_consistency_score: Optional[float] = None
    narrative_alignment: EvaluationDimensionStatus = EvaluationDimensionStatus.NOT_EVALUATED
    narrative_alignment_score: Optional[float] = None
    audio_alignment: EvaluationDimensionStatus = EvaluationDimensionStatus.NOT_EVALUATED
    audio_alignment_score: Optional[float] = None
    subtitle_correctness: EvaluationDimensionStatus = EvaluationDimensionStatus.NOT_EVALUATED
    subtitle_correctness_score: Optional[float] = None
    evaluator_metadata: Dict[str, Any] = Field(default_factory=dict)
    notes: List[str] = Field(default_factory=list)


class MediaExecutionEvidence(BaseModel):
    """
    Standard evidence record linking operation parameters, runtime attestation,
    resource usage, and technical validation.
    """
    evidence_id: str
    operation: str
    provenance_class: ProvenanceClass
    model_id: Optional[str] = None
    model_digest: Optional[str] = None
    runtime_name: str
    input_hashes: List[str] = Field(default_factory=list)
    output_hash: str
    duration_seconds: float
    resolution: Optional[Tuple[int, int]] = None
    fps: Optional[float] = None
    frame_count: Optional[int] = None
    seed: Optional[int] = None
    resource_usage: ResourceMeasurementEvidence = Field(default_factory=ResourceMeasurementEvidence)
    technical_verification: TechnicalValidationResult = Field(default_factory=TechnicalValidationResult)
    quality_evidence: CreativeQualityEvidence = Field(default_factory=CreativeQualityEvidence)
    attestation_id: Optional[str] = None
    created_at: float = Field(default_factory=time.time)


class ReplayDiscrepancy(BaseModel):
    """Identified discrepancy during replay inspection."""
    field: str
    recorded_value: Any
    current_value: Any
    severity: str = "WARNING"  # WARNING, ERROR, BLOCKER
    description: str = ""


class ReplayInspectionResult(BaseModel):
    """
    Controlled replay inspection report before any execution.
    """
    pipeline_id: str
    mode: ReplayMode
    is_safe_to_execute: bool
    schema_valid: bool
    models_authenticated: bool
    capabilities_available: bool
    resource_feasible: bool
    policy_compliant: bool
    discrepancies: List[ReplayDiscrepancy] = Field(default_factory=list)
    node_inspections: List[Dict[str, Any]] = Field(default_factory=list)
    reusable_artifact_count: int = 0
    regenerate_node_count: int = 0
    estimated_duration_s: float = 0.0
    estimated_peak_vram_mb: float = 0.0
    inspection_timestamp: float = Field(default_factory=time.time)

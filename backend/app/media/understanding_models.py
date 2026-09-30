"""Multimodal Media Understanding, Indexing, and Semantic Retrieval Models."""

from enum import Enum
from typing import Any, Dict, List, Optional, Tuple, Union
import uuid
import time
from pydantic import BaseModel, Field
from backend.app.media.provenance_models import ProvenanceClass, ResourceProvenance


class MediaAnalysisStatus(str, Enum):
    DISCOVERED = "DISCOVERED"
    QUEUED = "QUEUED"
    ANALYZING = "ANALYZING"
    INDEXING = "INDEXING"
    VALIDATING = "VALIDATING"
    READY = "READY"
    FAILED = "FAILED"
    QUARANTINED = "QUARANTINED"


class SearchMode(str, Enum):
    TEXT = "TEXT"
    SEMANTIC = "SEMANTIC"
    FILTERED = "FILTERED"
    SIMILARITY = "SIMILARITY"
    HYBRID = "HYBRID"


class ReuseCompatibilityStatus(str, Enum):
    COMPATIBLE = "COMPATIBLE"
    NEEDS_TRANSCODE = "NEEDS_TRANSCODE"
    NEEDS_RESCALE = "NEEDS_RESCALE"
    NEEDS_AUDIO_ADAPTATION = "NEEDS_AUDIO_ADAPTATION"
    INCOMPATIBLE = "INCOMPATIBLE"


class DerivationType(str, Enum):
    ORIGINAL = "ORIGINAL"
    EXACT_DUPLICATE = "EXACT_DUPLICATE"
    DERIVED = "DERIVED"
    EDITED = "EDITED"
    INPAINTED = "INPAINTED"
    OUTPAINTED = "OUTPAINTED"
    TRANSCODED = "TRANSCODED"
    RECOMPOSED = "RECOMPOSED"


class MediaEmbeddingRecord(BaseModel):
    """Immutable representation of a dense vector embedding for media content."""
    embedding_id: str = Field(default_factory=lambda: f"emb_{uuid.uuid4().hex[:12]}")
    artifact_id: str
    content_type: str = Field(description="image, video, audio, text, transcript, caption, scene")
    model_id: str = "local-multimodal-embedder-v1"
    model_digest: str = "sha256:b1a7e28c49d3f56e"
    runtime_version: str = "1.0.0"
    vector_dimension: int = 384
    input_hash: str
    vector: List[float]
    created_at: int = Field(default_factory=lambda: int(time.time() * 1000))


class VideoSceneRecord(BaseModel):
    """Indexed scene slice of a video artifact."""
    scene_id: str = Field(default_factory=lambda: f"scn_{uuid.uuid4().hex[:12]}")
    video_artifact_id: str
    scene_index: int = 0
    start_time: float
    end_time: float
    duration: float
    representative_frame_index: int = 0
    labels: List[str] = Field(default_factory=list)
    caption: str = ""
    transcript_segment: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    embedding_id: Optional[str] = None


class AudioSegmentRecord(BaseModel):
    """Indexed speech/audio segment of an audio track."""
    segment_id: str = Field(default_factory=lambda: f"aseg_{uuid.uuid4().hex[:12]}")
    audio_artifact_id: str
    start_time: float
    end_time: float
    duration: float
    transcript: str = ""
    language: str = "en"
    confidence: float = 1.0
    speaker_tag: Optional[str] = None


class OCRBlock(BaseModel):
    """Recognized text block with bounding box."""
    text: str
    language: str = "en"
    confidence: float = 1.0
    bounding_box: Optional[List[int]] = Field(default=None, description="[x, y, w, h]")


class MediaUnderstandingRecord(BaseModel):
    """Complete multimodal understanding & semantic representation of a media artifact."""
    understanding_id: str = Field(default_factory=lambda: f"und_{uuid.uuid4().hex[:12]}")
    artifact_id: str
    pipeline_id: Optional[str] = None
    media_type: str
    analysis_version: str = "analysis.media@1.0.0"
    
    # Technical Metadata (validated via MediaTechnicalValidator)
    technical_metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Semantic Metadata
    caption: str = ""
    environment: str = ""
    visual_style: str = ""
    dominant_colors: List[str] = Field(default_factory=list)
    language: str = "en"
    entities: List[str] = Field(default_factory=list)
    objects: List[str] = Field(default_factory=list)
    scene_labels: List[str] = Field(default_factory=list)
    visual_tags: List[str] = Field(default_factory=list)
    
    # Modality Specific Extracted Data
    ocr_blocks: List[OCRBlock] = Field(default_factory=list)
    ocr_text_full: Optional[str] = None
    audio_transcript_full: Optional[str] = None
    scenes: List[VideoSceneRecord] = Field(default_factory=list)
    audio_segments: List[AudioSegmentRecord] = Field(default_factory=list)
    
    # Embeddings & Provenance
    embedding_references: List[str] = Field(default_factory=list)
    provenance_class: ProvenanceClass = ProvenanceClass.PROCEDURAL
    analysis_model_id: Optional[str] = None
    analysis_model_digest: Optional[str] = None
    
    # Quality & Lifecycle
    quality_evidence: Optional[Dict[str, Any]] = None
    is_quarantined: bool = False
    quarantine_reason: Optional[str] = None
    created_at: int = Field(default_factory=lambda: int(time.time() * 1000))
    updated_at: int = Field(default_factory=lambda: int(time.time() * 1000))


class MediaSearchRequest(BaseModel):
    """Hybrid semantic & technical search query contract."""
    query: Optional[str] = None
    search_mode: SearchMode = SearchMode.HYBRID
    media_types: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    date_from: Optional[int] = None
    date_to: Optional[int] = None
    min_duration: Optional[float] = None
    max_duration: Optional[float] = None
    min_width: Optional[int] = None
    min_height: Optional[int] = None
    tags: Optional[List[str]] = None
    pipeline_id: Optional[str] = None
    model_id: Optional[str] = None
    provenance_class: Optional[ProvenanceClass] = None
    reference_artifact_id: Optional[str] = None
    limit: int = 20
    offset: int = 0


class MediaSearchResult(BaseModel):
    """Individual item returned from media library search."""
    artifact_id: str
    score: float
    media_type: str
    filename: str
    file_path: str
    thumbnail_url: Optional[str] = None
    caption: Optional[str] = None
    duration: Optional[float] = None
    resolution: Optional[List[int]] = None
    language: Optional[str] = None
    provenance: ProvenanceClass
    pipeline_id: Optional[str] = None
    match_reason: str = "Semantic vector similarity and keyword match"
    technical_metadata: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    scenes_count: int = 0
    created_at: int


class MediaReuseRequest(BaseModel):
    """Request to find or validate a reusable asset for a target pipeline node."""
    target_role: str = Field(description="e.g. SCENE_BACKGROUND, NARRATION_AUDIO, HERO_IMAGE")
    desired_media_type: str = "IMAGE"
    desired_concept: str
    desired_duration: Optional[float] = None
    desired_resolution: Optional[Tuple[int, int]] = None
    desired_language: Optional[str] = "en"
    style_profile: Optional[str] = None
    preferred_model_id: Optional[str] = None


class MediaReuseRecommendation(BaseModel):
    """Recommendation for reusing an existing artifact instead of re-generating."""
    candidate_artifact_id: str
    target_role: str
    compatibility_status: ReuseCompatibilityStatus
    match_score: float
    compatibility_notes: List[str] = Field(default_factory=list)
    reusable_technical_summary: Dict[str, Any] = Field(default_factory=dict)
    derivation_type: DerivationType = DerivationType.ORIGINAL
    estimated_gpu_time_saved_s: float = 0.0
    generation_avoided: bool = True


class MediaCollection(BaseModel):
    """User-defined or system-grouped media collection."""
    collection_id: str = Field(default_factory=lambda: f"col_{uuid.uuid4().hex[:12]}")
    title: str
    description: Optional[str] = None
    collection_type: str = "PROJECT"  # PROJECT, STYLE, CAMPAIGN, FAVORITE, ARCHIVE
    artifact_ids: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    created_at: int = Field(default_factory=lambda: int(time.time() * 1000))
    updated_at: int = Field(default_factory=lambda: int(time.time() * 1000))


class MediaAnalysisJob(BaseModel):
    """Background media indexing job record."""
    job_id: str = Field(default_factory=lambda: f"ajob_{uuid.uuid4().hex[:12]}")
    artifact_id: str
    media_type: str
    status: MediaAnalysisStatus = MediaAnalysisStatus.QUEUED
    progress_pct: float = 0.0
    current_phase: str = "PENDING"
    analysis_version: str = "analysis.media@1.0.0"
    error_message: Optional[str] = None
    created_at: int = Field(default_factory=lambda: int(time.time() * 1000))
    completed_at: Optional[int] = None

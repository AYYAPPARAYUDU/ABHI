"""Phase 8 Stage 8.1 — Media Subsystem Relational SQLite Schema."""

from sqlalchemy import Column, String, Integer, Float, Boolean, Text, ForeignKey, Index
from backend.app.services.memory.database import Base


class MediaJobRecord(Base):
    """Relational table tracking media generation job lifecycle."""
    __tablename__ = "media_jobs"

    job_id = Column(String(64), primary_key=True, index=True)
    task_id = Column(String(64), nullable=True, index=True)
    execution_id = Column(String(64), nullable=True)
    media_type = Column(String(16), default="IMAGE", nullable=False)
    operation = Column(String(16), default="GENERATE", nullable=False)
    prompt = Column(Text, nullable=False)
    negative_prompt = Column(Text, nullable=True)
    model_id = Column(String(64), nullable=False)
    model_version = Column(String(16), default="1.0.0")
    status = Column(String(32), default="QUEUED", index=True, nullable=False)
    progress = Column(Float, default=0.0)
    current_phase = Column(String(32), default="QUEUED")
    width = Column(Integer, default=512)
    height = Column(Integer, default=512)
    steps = Column(Integer, default=20)
    seed = Column(Integer, nullable=True)
    output_format = Column(String(8), default="PNG")
    device = Column(String(8), default="GPU")
    created_at = Column(Float, nullable=False)
    started_at = Column(Float, nullable=True)
    completed_at = Column(Float, nullable=True)
    failure_reason = Column(Text, nullable=True)
    artifact_id = Column(String(64), nullable=True)
    output_path = Column(String(256), nullable=True)
    duration_ms = Column(Integer, nullable=True)
    provenance = Column(String(16), default="ACTUAL")

    __table_args__ = (
        Index("ix_media_jobs_status_created", "status", "created_at"),
    )


class MediaArtifactRecord(Base):
    """Relational table tracking validated media artifacts."""
    __tablename__ = "media_artifacts"

    artifact_id = Column(String(64), primary_key=True, index=True)
    job_id = Column(String(64), nullable=False, index=True)
    media_type = Column(String(16), default="IMAGE", nullable=False)
    path = Column(String(256), nullable=False)
    filename = Column(String(128), nullable=False)
    format = Column(String(8), default="PNG")
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    sha256 = Column(String(64), unique=True, index=True, nullable=False)
    model_id = Column(String(64), nullable=False)
    model_version = Column(String(16), default="1.0.0")
    generation_parameters_hash = Column(String(64), nullable=False)
    prompt_preview = Column(String(256), default="")
    created_at = Column(Float, nullable=False)
    provenance = Column(String(16), default="ACTUAL")


class MediaGenerationMetadataRecord(Base):
    """Relational table tracking deep generation telemetry and parameter reproducibility."""
    __tablename__ = "media_generation_metadata"

    id = Column(Integer, primary_key=True, autoincrement=True)
    artifact_id = Column(String(64), nullable=False, index=True)
    prompt_hash = Column(String(64), nullable=False)
    generation_parameters_json = Column(Text, nullable=False)
    vram_peak_mb = Column(Float, default=0.0)
    ram_peak_mb = Column(Float, default=0.0)
    duration_ms = Column(Integer, default=0)
    provenance = Column(String(16), default="ACTUAL")


class VideoJobRecord(Base):
    """Relational table tracking video generation jobs and chunk progress."""
    __tablename__ = "video_jobs"

    job_id = Column(String(64), primary_key=True, index=True)
    task_id = Column(String(64), nullable=True, index=True)
    execution_id = Column(String(64), nullable=True)
    prompt = Column(Text, nullable=False)
    negative_prompt = Column(Text, nullable=True)
    model_id = Column(String(64), nullable=False)
    model_version = Column(String(16), default="1.0.0")
    status = Column(String(32), default="QUEUED", index=True, nullable=False)
    progress = Column(Float, default=0.0)
    current_phase = Column(String(32), default="QUEUED")
    width = Column(Integer, default=512)
    height = Column(Integer, default=512)
    fps = Column(Integer, default=24)
    duration_seconds = Column(Float, default=2.0)
    steps = Column(Integer, default=25)
    seed = Column(Integer, nullable=True)
    output_format = Column(String(8), default="MP4")
    device = Column(String(8), default="GPU")
    created_at = Column(Float, nullable=False)
    started_at = Column(Float, nullable=True)
    completed_at = Column(Float, nullable=True)
    failure_reason = Column(Text, nullable=True)
    artifact_id = Column(String(64), nullable=True)
    output_path = Column(String(256), nullable=True)
    duration_ms = Column(Integer, nullable=True)
    provenance = Column(String(16), default="ACTUAL")

    __table_args__ = (
        Index("ix_video_jobs_status_created", "status", "created_at"),
    )


class VideoArtifactRecord(Base):
    """Relational table tracking validated video artifacts and posters."""
    __tablename__ = "video_artifacts"

    artifact_id = Column(String(64), primary_key=True, index=True)
    job_id = Column(String(64), nullable=False, index=True)
    path = Column(String(256), nullable=False)
    filename = Column(String(128), nullable=False)
    format = Column(String(8), default="MP4")
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    fps = Column(Integer, nullable=False)
    duration_seconds = Column(Float, nullable=False)
    frame_count = Column(Integer, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    sha256 = Column(String(64), unique=True, index=True, nullable=False)
    poster_path = Column(String(256), nullable=True)
    model_id = Column(String(64), nullable=False)
    model_version = Column(String(16), default="1.0.0")
    generation_parameters_hash = Column(String(64), nullable=False)
    prompt_preview = Column(String(256), default="")
    created_at = Column(Float, nullable=False)
    provenance = Column(String(16), default="ACTUAL")


class VideoSegmentRecord(Base):
    """Relational table tracking chunked video segment checkpoints."""
    __tablename__ = "video_segments"

    segment_id = Column(String(64), primary_key=True, index=True)
    job_id = Column(String(64), nullable=False, index=True)
    segment_index = Column(Integer, nullable=False)
    frame_start = Column(Integer, nullable=False)
    frame_end = Column(Integer, nullable=False)
    frame_count = Column(Integer, nullable=False)
    sha256 = Column(String(64), default="")
    temp_path = Column(String(256), nullable=True)
    status = Column(String(32), default="PENDING")
    created_at = Column(Float, nullable=False)
    verified = Column(Boolean, default=False)


class MaskArtifactRecord(Base):
    """Relational table tracking validated mask artifacts."""
    __tablename__ = "media_masks"

    mask_id = Column(String(64), primary_key=True, index=True)
    source_artifact_id = Column(String(64), nullable=False, index=True)
    path = Column(String(256), nullable=False)
    filename = Column(String(128), nullable=False)
    format = Column(String(8), default="PNG")
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    sha256 = Column(String(64), unique=True, index=True, nullable=False)
    semantics = Column(String(32), default="WHITE_EDIT_BLACK_PRESERVE")
    editable_pixel_count = Column(Integer, default=0)
    editable_ratio = Column(Float, default=0.0)
    created_at = Column(Float, nullable=False)
    provenance = Column(String(16), default="ACTUAL")


class ArtifactLineageRecord(Base):
    """Relational table tracking immutable artifact lineage and editing transformations."""
    __tablename__ = "artifact_lineage"

    lineage_id = Column(String(64), primary_key=True, index=True)
    parent_artifact_id = Column(String(64), nullable=False, index=True)
    child_artifact_id = Column(String(64), nullable=False, index=True)
    job_id = Column(String(64), nullable=False, index=True)
    operation = Column(String(32), default="IMAGE_TO_IMAGE", nullable=False)
    mask_artifact_id = Column(String(64), nullable=True)
    prompt = Column(Text, nullable=False)
    model_id = Column(String(64), nullable=False)
    model_version = Column(String(16), default="1.0.0")
    parameters_hash = Column(String(64), nullable=False)
    diff_evidence_json = Column(Text, nullable=True)
    created_at = Column(Float, nullable=False)


class MediaWorkflowRecord(Base):
    """Relational table tracking media workflow DAG lifecycle."""
    __tablename__ = "media_workflows"

    workflow_id = Column(String(64), primary_key=True, index=True)
    task_id = Column(String(64), nullable=True, index=True)
    execution_id = Column(String(64), nullable=True)
    goal = Column(Text, nullable=False)
    version = Column(String(16), default="1.0.0")
    nodes_json = Column(Text, nullable=False)
    edges_json = Column(Text, nullable=False)
    inputs_json = Column(Text, default="{}")
    outputs_json = Column(Text, default="{}")
    resource_budget_json = Column(Text, default="{}")
    policy_profile_json = Column(Text, default="{}")
    status = Column(String(32), default="QUEUED", index=True, nullable=False)
    created_at = Column(Float, nullable=False)
    started_at = Column(Float, nullable=True)
    completed_at = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    workflow_hash = Column(String(64), default="", index=True)

    __table_args__ = (
        Index("ix_media_workflows_status_created", "status", "created_at"),
    )


class MediaWorkflowCheckpointRecord(Base):
    """Relational table tracking incremental media workflow checkpoints."""
    __tablename__ = "media_workflow_checkpoints"

    checkpoint_id = Column(String(64), primary_key=True, index=True)
    workflow_id = Column(String(64), nullable=False, index=True)
    node_id = Column(String(64), nullable=False)
    status = Column(String(32), default="RUNNING")
    artifacts_json = Column(Text, default="{}")
    resource_state_json = Column(Text, default="{}")
    workflow_version = Column(String(16), default="1.0.0")
    timestamp = Column(Float, nullable=False)


class MediaWorkflowTemplateRecord(Base):
    """Relational table tracking versioned media workflow templates."""
    __tablename__ = "media_workflow_templates"

    template_id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    version = Column(String(16), default="1.0.0")
    description = Column(Text, default="")
    category = Column(String(32), default="creative")
    workflow_json = Column(Text, nullable=False)
    created_at = Column(Float, nullable=False)



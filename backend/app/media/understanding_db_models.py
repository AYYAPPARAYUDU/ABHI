"""SQLAlchemy Relational Models for Media Understanding, Indexing, and Collections."""

import time
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, JSON, Index
from backend.app.core.database import Base


class MediaUnderstandingDBRecord(Base):
    """Stores full multimodal understanding and semantic analysis."""
    __tablename__ = "media_understanding_records"

    understanding_id = Column(String(64), primary_key=True, index=True)
    artifact_id = Column(String(64), unique=True, index=True, nullable=False)
    pipeline_id = Column(String(64), index=True, nullable=True)
    media_type = Column(String(32), index=True, nullable=False)
    analysis_version = Column(String(64), nullable=False, default="analysis.media@1.0.0")
    language = Column(String(16), index=True, default="en")
    
    caption = Column(Text, nullable=True)
    environment = Column(String(128), nullable=True)
    visual_style = Column(String(128), nullable=True)
    dominant_colors = Column(JSON, nullable=True)
    
    entities = Column(JSON, nullable=True)
    objects = Column(JSON, nullable=True)
    scene_labels = Column(JSON, nullable=True)
    visual_tags = Column(JSON, nullable=True)
    
    ocr_text_full = Column(Text, nullable=True)
    audio_transcript_full = Column(Text, nullable=True)
    
    technical_metadata = Column(JSON, nullable=True)
    quality_evidence = Column(JSON, nullable=True)
    
    provenance_class = Column(String(32), nullable=False, default="PROCEDURAL")
    analysis_model_id = Column(String(64), nullable=True)
    analysis_model_digest = Column(String(128), nullable=True)
    
    is_quarantined = Column(Boolean, default=False, index=True)
    quarantine_reason = Column(Text, nullable=True)
    
    created_at = Column(Integer, nullable=False, default=lambda: int(time.time() * 1000))
    updated_at = Column(Integer, nullable=False, default=lambda: int(time.time() * 1000))


class MediaSceneIndexDBRecord(Base):
    """Indexed scene intervals of videos."""
    __tablename__ = "media_scene_indexes"

    scene_id = Column(String(64), primary_key=True, index=True)
    video_artifact_id = Column(String(64), index=True, nullable=False)
    scene_index = Column(Integer, nullable=False, default=0)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    duration = Column(Float, nullable=False)
    labels = Column(JSON, nullable=True)
    caption = Column(Text, nullable=True)
    transcript_segment = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True)
    embedding_id = Column(String(64), nullable=True)


class MediaAudioSegmentDBRecord(Base):
    """Indexed audio and speech intervals."""
    __tablename__ = "media_audio_segments"

    segment_id = Column(String(64), primary_key=True, index=True)
    audio_artifact_id = Column(String(64), index=True, nullable=False)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    duration = Column(Float, nullable=False)
    transcript = Column(Text, nullable=True)
    language = Column(String(16), default="en", index=True)
    confidence = Column(Float, default=1.0)
    speaker_tag = Column(String(64), nullable=True)


class MediaAnalysisJobDBRecord(Base):
    """Background media indexing job tracking."""
    __tablename__ = "media_analysis_jobs"

    job_id = Column(String(64), primary_key=True, index=True)
    artifact_id = Column(String(64), index=True, nullable=False)
    media_type = Column(String(32), nullable=False)
    status = Column(String(32), index=True, default="QUEUED")
    progress_pct = Column(Float, default=0.0)
    current_phase = Column(String(64), default="PENDING")
    analysis_version = Column(String(64), default="analysis.media@1.0.0")
    error_message = Column(Text, nullable=True)
    created_at = Column(Integer, nullable=False, default=lambda: int(time.time() * 1000))
    completed_at = Column(Integer, nullable=True)


class MediaCollectionDBRecord(Base):
    """User and system media collections."""
    __tablename__ = "media_collections"

    collection_id = Column(String(64), primary_key=True, index=True)
    title = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    collection_type = Column(String(32), default="PROJECT", index=True)
    artifact_ids = Column(JSON, nullable=False, default=list)
    tags = Column(JSON, nullable=False, default=list)
    created_at = Column(Integer, nullable=False, default=lambda: int(time.time() * 1000))
    updated_at = Column(Integer, nullable=False, default=lambda: int(time.time() * 1000))

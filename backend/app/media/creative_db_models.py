"""Phase 8 Stage 8.5 — Creative Pipeline Subsystem Relational SQLite Schema."""

from sqlalchemy import Column, String, Integer, Float, Boolean, Text, Index
from backend.app.services.memory.database import Base


class CreativePipelineRecord(Base):
    """Relational table tracking high-level creative production pipelines."""
    __tablename__ = "creative_pipelines"

    pipeline_id = Column(String(64), primary_key=True, index=True)
    task_id = Column(String(64), nullable=True, index=True)
    execution_id = Column(String(64), nullable=True)
    goal = Column(Text, nullable=False)
    pipeline_type = Column(String(32), default="SHORT_PROMOTIONAL_VIDEO", nullable=False)
    version = Column(String(16), default="1.0.0")
    brief_json = Column(Text, nullable=False)
    script_json = Column(Text, nullable=True)
    storyboard_json = Column(Text, nullable=True)
    scenes_json = Column(Text, nullable=True)
    assets_json = Column(Text, nullable=True)
    timeline_json = Column(Text, nullable=True)
    subtitles_json = Column(Text, nullable=True)
    outputs_json = Column(Text, default="[]")
    quality_report_json = Column(Text, nullable=True)
    render_profile = Column(String(32), default="MP4_H264_STANDARD")
    status = Column(String(32), default="DRAFT", index=True, nullable=False)
    underlying_workflow_id = Column(String(64), nullable=True)
    pipeline_hash = Column(String(64), default="", index=True)
    created_at = Column(Float, nullable=False)
    started_at = Column(Float, nullable=True)
    completed_at = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)

    __table_args__ = (
        Index("ix_creative_pipelines_status_created", "status", "created_at"),
    )


class CreativeAssetRecord(Base):
    """Relational table tracking creative assets and caching hashes."""
    __tablename__ = "creative_assets"

    asset_id = Column(String(64), primary_key=True, index=True)
    pipeline_id = Column(String(64), nullable=True, index=True)
    artifact_id = Column(String(64), nullable=False, index=True)
    asset_type = Column(String(16), default="IMAGE", nullable=False)
    source = Column(String(16), default="GENERATED")
    model_id = Column(String(64), nullable=True)
    model_digest = Column(String(64), nullable=True)
    parameters_hash = Column(String(64), index=True, nullable=False)
    content_hash = Column(String(64), default="")
    file_path = Column(String(256), nullable=True)
    size_bytes = Column(Integer, default=0)
    created_at = Column(Float, nullable=False)
    is_reused = Column(Boolean, default=False)


class CreativeTemplateRecord(Base):
    """Relational table tracking registered creative pipeline templates."""
    __tablename__ = "creative_templates"

    template_id = Column(String(64), primary_key=True, index=True)
    title = Column(String(128), nullable=False)
    description = Column(Text, default="")
    category = Column(String(32), default="creative_production")
    version = Column(String(16), default="1.0.0")
    pipeline_type = Column(String(32), default="SHORT_PROMOTIONAL_VIDEO")
    default_brief_json = Column(Text, nullable=False)
    supported_languages_json = Column(Text, default='["en"]')
    is_builtin = Column(Boolean, default=True)
    created_at = Column(Float, nullable=False)

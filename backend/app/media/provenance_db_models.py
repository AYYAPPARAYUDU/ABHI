"""
Phase 8 Stage 8.6: Media Provenance, Attestation, and Reliability SQLite Schema.
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, Text, Index
from backend.app.services.memory.database import Base


class MediaAttestationRecord(Base):
    """Relational table tracking signed runtime attestations."""
    __tablename__ = "media_attestations"

    attestation_id = Column(String(64), primary_key=True, index=True)
    operation_id = Column(String(64), nullable=False, index=True)
    artifact_id = Column(String(64), nullable=False, index=True)
    operation_type = Column(String(32), nullable=False)
    model_id = Column(String(64), nullable=True)
    model_digest = Column(String(64), nullable=True)
    runtime_name = Column(String(64), nullable=False)
    runtime_version = Column(String(16), default="1.0.0")
    device = Column(String(32), default="CPU")
    provenance_class = Column(String(32), nullable=False, index=True)
    parameters_hash = Column(String(64), nullable=False)
    attestation_hash = Column(String(64), nullable=False, index=True)
    started_at = Column(Float, nullable=False)
    completed_at = Column(Float, nullable=False)
    raw_json = Column(Text, nullable=False)

    __table_args__ = (
        Index("ix_media_attestations_artifact", "artifact_id"),
        Index("ix_media_attestations_provenance", "provenance_class", "completed_at"),
    )


class MediaEvidenceRecord(Base):
    """Relational table tracking empirical execution evidence."""
    __tablename__ = "media_evidence"

    evidence_id = Column(String(64), primary_key=True, index=True)
    attestation_id = Column(String(64), nullable=True, index=True)
    operation = Column(String(32), nullable=False)
    provenance_class = Column(String(32), nullable=False)
    model_id = Column(String(64), nullable=True)
    output_hash = Column(String(64), nullable=False)
    duration_seconds = Column(Float, default=0.0)
    peak_vram_mb = Column(Float, default=0.0)
    peak_ram_mb = Column(Float, default=0.0)
    technical_valid = Column(Boolean, default=True)
    quality_notes_json = Column(Text, default="[]")
    created_at = Column(Float, nullable=False)


class ReplayAuditRecord(Base):
    """Relational table logging replay inspections and simulations."""
    __tablename__ = "media_replay_audits"

    audit_id = Column(String(64), primary_key=True, index=True)
    pipeline_id = Column(String(64), nullable=False, index=True)
    mode = Column(String(16), nullable=False)
    is_safe = Column(Boolean, default=True)
    schema_valid = Column(Boolean, default=True)
    models_authenticated = Column(Boolean, default=True)
    resource_feasible = Column(Boolean, default=True)
    discrepancies_json = Column(Text, default="[]")
    created_at = Column(Float, nullable=False)

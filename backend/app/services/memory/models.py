"""SQLAlchemy Relational ORM Models for System State, Memory & Tasks."""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import JSON, DateTime, Integer, String, Text, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.services.memory.database import Base


class TaskExecutionRecord(Base):
    """Stores full historical records of task executions and DAG states."""
    __tablename__ = "task_executions"

    task_id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    goal: Mapped[str] = mapped_column(Text, nullable=False)
    state: Mapped[str] = mapped_column(String(32), nullable=False, default="PENDING")
    dag_data: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )


class EpisodicMemoryRecord(Base):
    """Stores episodic summaries of past successful tasks, user interactions, and learned patterns."""
    __tablename__ = "episodic_memories"

    memory_id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    task_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False, default="general")
    context_summary: Mapped[str] = mapped_column(Text, nullable=False)
    solution_summary: Mapped[str] = mapped_column(Text, nullable=False)
    outcome: Mapped[str] = mapped_column(String(32), nullable=False, default="SUCCESS")
    tags: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )


class UserProfileRecord(Base):
    """Stores persistent user preferences, settings, and verified authorizations."""
    __tablename__ = "user_profiles"

    key: Mapped[str] = mapped_column(String(128), primary_key=True, index=True)
    value_json: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )


class DecisionTraceRecord(Base):
    """Stores persistent historical records of real cybernetic decision pipeline evaluations and traces."""
    __tablename__ = "decision_traces"

    trace_id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    use_case_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    confidence: Mapped[float] = mapped_column(nullable=False)
    score_label: Mapped[str] = mapped_column(String(64), nullable=False)
    score_value: Mapped[float] = mapped_column(nullable=False)
    decision_verdict: Mapped[str] = mapped_column(String(32), nullable=False)
    target_action: Mapped[str] = mapped_column(String(64), nullable=False)
    destination_worker: Mapped[str] = mapped_column(String(64), nullable=False)
    active_path: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=list)
    latency_ms: Mapped[float] = mapped_column(nullable=False)
    input_payload: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    log_entries: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=list)
    output_result: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    operator_override: Mapped[bool] = mapped_column(default=False)
    jev_utility: Mapped[float] = mapped_column(default=0.941)
    state_vector_dims: Mapped[int] = mapped_column(default=2048)
    spend_cost: Mapped[float] = mapped_column(default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )


class CommunicationsInboxRecord(Base):
    """Stores incoming communications and omnichannel messages."""
    __tablename__ = "communications_inbox"

    message_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    channel: Mapped[str] = mapped_column(String(32), nullable=False)
    sender: Mapped[str] = mapped_column(String(128), nullable=False)
    recipient: Mapped[str] = mapped_column(String(128), nullable=False)
    subject: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[str] = mapped_column(String(64), nullable=False)
    reply_status: Mapped[Optional[str]] = mapped_column(String(32), default="pending")
    suggested_replies: Mapped[Optional[str]] = mapped_column(Text, default="[]")
    selected_reply: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sent_at: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(64), default="all")
    amount_inr: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    utr: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    otp_code: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    account: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)


class OperatorBiometricsRecord(Base):
    """Stores operator biometrics embeddings."""
    __tablename__ = "operator_biometrics"

    operator_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    embedding_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    enrolled_at: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    last_verified_at: Mapped[Optional[float]] = mapped_column(Float, nullable=True)


class SecurityAuditLogRecord(Base):
    """Stores security audit events and biometric verifications."""
    __tablename__ = "security_audit_log"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    incident_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    timestamp: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    match_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    snapshot_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class BrainMetaparametersRecord(Base):
    """Stores cognitive meta-parameters and model settings."""
    __tablename__ = "brain_metaparameters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    model_name: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    temperature: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    top_p: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    context_window: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    safety_filter_level: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    rag_relevance_threshold: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    active_profile: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    updated_at: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)


class BrainUpgradeHistoryRecord(Base):
    """Stores history of applied brain upgrades and system patches."""
    __tablename__ = "brain_upgrade_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    version: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    upgrade_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    status: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    changelog_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    applied_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    timestamp: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    rollback_snapshot_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)


class UserCommunicationsProfileRecord(Base):
    """Stores user communication and notification settings."""
    __tablename__ = "user_communications_profile"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    preferred_channel: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    auto_reply_enabled: Mapped[Optional[int]] = mapped_column(Integer, default=0)
    vocal_notifications: Mapped[Optional[int]] = mapped_column(Integer, default=1)
    digest_schedule: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    language_preference: Mapped[Optional[str]] = mapped_column(String(16), default="en")
    updated_at: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

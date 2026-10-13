"""SQLAlchemy Relational ORM Models for System State, Memory & Tasks."""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import JSON, DateTime, Integer, String, Text
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


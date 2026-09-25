"""Async Memory & Task Repository Service."""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.services.memory.database import AsyncSessionFactory
from backend.app.services.memory.models import (
    EpisodicMemoryRecord,
    TaskExecutionRecord,
    UserProfileRecord,
)


class MemoryRepository:
    """Async repository managing Task Executions, Episodic Memories, and User Profiles."""

    async def create_task(
        self,
        goal: str,
        task_id: Optional[str] = None,
        dag_data: Optional[Dict[str, Any]] = None,
        session: Optional[AsyncSession] = None
    ) -> TaskExecutionRecord:
        """Create a new task execution record."""
        tid = task_id or f"task_{uuid.uuid4().hex[:12]}"
        record = TaskExecutionRecord(
            task_id=tid,
            goal=goal,
            state="PLANNING",
            dag_data=dag_data or {},
            created_at=datetime.now(timezone.utc)
        )
        if session:
            session.add(record)
            await session.commit()
            await session.refresh(record)
            return record
        else:
            async with AsyncSessionFactory() as s:
                s.add(record)
                await s.commit()
                await s.refresh(record)
                return record

    async def update_task_state(
        self,
        task_id: str,
        state: str,
        dag_data: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
        duration_ms: Optional[int] = None,
        session: Optional[AsyncSession] = None
    ) -> Optional[TaskExecutionRecord]:
        """Update existing task state and DAG execution progress."""
        updates: Dict[str, Any] = {"state": state}
        if dag_data is not None:
            updates["dag_data"] = dag_data
        if error_message is not None:
            updates["error_message"] = error_message
        if duration_ms is not None:
            updates["duration_ms"] = duration_ms
        if state in ["COMPLETED", "FAILED", "CANCELLED"]:
            updates["completed_at"] = datetime.now(timezone.utc)

        if session:
            await session.execute(
                update(TaskExecutionRecord).where(TaskExecutionRecord.task_id == task_id).values(**updates)
            )
            await session.commit()
            return await self.get_task(task_id, session=session)
        else:
            async with AsyncSessionFactory() as s:
                await s.execute(
                    update(TaskExecutionRecord).where(TaskExecutionRecord.task_id == task_id).values(**updates)
                )
                await s.commit()
                return await self.get_task(task_id, session=s)

    async def get_task(
        self,
        task_id: str,
        session: Optional[AsyncSession] = None
    ) -> Optional[TaskExecutionRecord]:
        """Retrieve task by ID."""
        if session:
            stmt = select(TaskExecutionRecord).where(TaskExecutionRecord.task_id == task_id)
            res = await session.execute(stmt)
            return res.scalar_one_or_none()
        else:
            async with AsyncSessionFactory() as s:
                stmt = select(TaskExecutionRecord).where(TaskExecutionRecord.task_id == task_id)
                res = await s.execute(stmt)
                return res.scalar_one_or_none()

    async def save_episodic_memory(
        self,
        context_summary: str,
        solution_summary: str,
        task_id: Optional[str] = None,
        category: str = "general",
        outcome: str = "SUCCESS",
        tags: Optional[str] = None,
        session: Optional[AsyncSession] = None
    ) -> EpisodicMemoryRecord:
        """Persist an episodic memory record."""
        mid = f"mem_{uuid.uuid4().hex[:12]}"
        record = EpisodicMemoryRecord(
            memory_id=mid,
            task_id=task_id,
            category=category,
            context_summary=context_summary,
            solution_summary=solution_summary,
            outcome=outcome,
            tags=tags,
            created_at=datetime.now(timezone.utc)
        )
        if session:
            session.add(record)
            await session.commit()
            await session.refresh(record)
            return record
        else:
            async with AsyncSessionFactory() as s:
                s.add(record)
                await s.commit()
                await s.refresh(record)
                return record

    async def list_recent_memories(
        self,
        limit: int = 10,
        category: Optional[str] = None,
        session: Optional[AsyncSession] = None
    ) -> List[EpisodicMemoryRecord]:
        """List recent episodic memories."""
        stmt = select(EpisodicMemoryRecord)
        if category:
            stmt = stmt.where(EpisodicMemoryRecord.category == category)
        stmt = stmt.order_by(EpisodicMemoryRecord.created_at.desc()).limit(limit)

        if session:
            res = await session.execute(stmt)
            return list(res.scalars().all())
        else:
            async with AsyncSessionFactory() as s:
                res = await s.execute(stmt)
                return list(res.scalars().all())

    async def set_user_profile(
        self,
        key: str,
        value: Dict[str, Any],
        session: Optional[AsyncSession] = None
    ) -> UserProfileRecord:
        """Set or update a user preference key."""
        if session:
            record = await session.get(UserProfileRecord, key)
            if record:
                record.value_json = value
                record.updated_at = datetime.now(timezone.utc)
            else:
                record = UserProfileRecord(key=key, value_json=value)
                session.add(record)
            await session.commit()
            await session.refresh(record)
            return record
        else:
            async with AsyncSessionFactory() as s:
                record = await s.get(UserProfileRecord, key)
                if record:
                    record.value_json = value
                    record.updated_at = datetime.now(timezone.utc)
                else:
                    record = UserProfileRecord(key=key, value_json=value)
                    s.add(record)
                await s.commit()
                await s.refresh(record)
                return record

    async def get_user_profile(
        self,
        key: str,
        session: Optional[AsyncSession] = None
    ) -> Optional[Dict[str, Any]]:
        """Retrieve a user preference key."""
        if session:
            record = await session.get(UserProfileRecord, key)
            return record.value_json if record else None
        else:
            async with AsyncSessionFactory() as s:
                record = await s.get(UserProfileRecord, key)
                return record.value_json if record else None


# Global memory repository instance
memory_repo = MemoryRepository()

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

    async def list_tasks(
        self,
        limit: int = 50,
        offset: int = 0,
        state: Optional[str] = None,
        search: Optional[str] = None,
        session: Optional[AsyncSession] = None
    ) -> List[TaskExecutionRecord]:
        """List tasks with pagination, state filtering, and text search."""
        stmt = select(TaskExecutionRecord)
        if state:
            stmt = stmt.where(TaskExecutionRecord.state == state)
        if search:
            stmt = stmt.where(TaskExecutionRecord.goal.ilike(f"%{search}%"))
        stmt = stmt.order_by(TaskExecutionRecord.created_at.desc()).offset(offset).limit(limit)

        if session:
            res = await session.execute(stmt)
            return list(res.scalars().all())
        else:
            async with AsyncSessionFactory() as s:
                res = await s.execute(stmt)
                return list(res.scalars().all())

    async def count_tasks(
        self,
        state: Optional[str] = None,
        search: Optional[str] = None,
        session: Optional[AsyncSession] = None
    ) -> int:
        """Count total tasks matching criteria."""
        from sqlalchemy import func
        stmt = select(func.count(TaskExecutionRecord.task_id))
        if state:
            stmt = stmt.where(TaskExecutionRecord.state == state)
        if search:
            stmt = stmt.where(TaskExecutionRecord.goal.ilike(f"%{search}%"))

        if session:
            res = await session.execute(stmt)
            return res.scalar_one() or 0
        else:
            async with AsyncSessionFactory() as s:
                res = await s.execute(stmt)
                return res.scalar_one() or 0

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

    async def get_episodic_memory(
        self,
        memory_id: str,
        session: Optional[AsyncSession] = None
    ) -> Optional[EpisodicMemoryRecord]:
        """Retrieve episodic memory by ID."""
        if session:
            stmt = select(EpisodicMemoryRecord).where(EpisodicMemoryRecord.memory_id == memory_id)
            res = await session.execute(stmt)
            return res.scalar_one_or_none()
        else:
            async with AsyncSessionFactory() as s:
                stmt = select(EpisodicMemoryRecord).where(EpisodicMemoryRecord.memory_id == memory_id)
                res = await s.execute(stmt)
                return res.scalar_one_or_none()

    async def delete_episodic_memory(
        self,
        memory_id: str,
        session: Optional[AsyncSession] = None
    ) -> bool:
        """Delete an episodic memory record."""
        from sqlalchemy import delete
        stmt = delete(EpisodicMemoryRecord).where(EpisodicMemoryRecord.memory_id == memory_id)
        if session:
            res = await session.execute(stmt)
            await session.commit()
            return res.rowcount > 0
        else:
            async with AsyncSessionFactory() as s:
                res = await s.execute(stmt)
                await s.commit()
                return res.rowcount > 0

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

    async def list_memories_paginated(
        self,
        limit: int = 50,
        offset: int = 0,
        category: Optional[str] = None,
        search: Optional[str] = None,
        session: Optional[AsyncSession] = None
    ) -> List[EpisodicMemoryRecord]:
        """List episodic memories with pagination, category filter, and text search."""
        from sqlalchemy import or_
        stmt = select(EpisodicMemoryRecord)
        if category:
            stmt = stmt.where(EpisodicMemoryRecord.category == category)
        if search:
            stmt = stmt.where(
                or_(
                    EpisodicMemoryRecord.context_summary.ilike(f"%{search}%"),
                    EpisodicMemoryRecord.solution_summary.ilike(f"%{search}%"),
                    EpisodicMemoryRecord.tags.ilike(f"%{search}%")
                )
            )
        stmt = stmt.order_by(EpisodicMemoryRecord.created_at.desc()).offset(offset).limit(limit)

        if session:
            res = await session.execute(stmt)
            return list(res.scalars().all())
        else:
            async with AsyncSessionFactory() as s:
                res = await s.execute(stmt)
                return list(res.scalars().all())

    async def count_memories(
        self,
        category: Optional[str] = None,
        search: Optional[str] = None,
        session: Optional[AsyncSession] = None
    ) -> int:
        """Count total episodic memories matching criteria."""
        from sqlalchemy import func, or_
        stmt = select(func.count(EpisodicMemoryRecord.memory_id))
        if category:
            stmt = stmt.where(EpisodicMemoryRecord.category == category)
        if search:
            stmt = stmt.where(
                or_(
                    EpisodicMemoryRecord.context_summary.ilike(f"%{search}%"),
                    EpisodicMemoryRecord.solution_summary.ilike(f"%{search}%"),
                    EpisodicMemoryRecord.tags.ilike(f"%{search}%")
                )
            )

        if session:
            res = await session.execute(stmt)
            return res.scalar_one() or 0
        else:
            async with AsyncSessionFactory() as s:
                res = await s.execute(stmt)
                return res.scalar_one() or 0

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

    async def list_all_user_profiles(
        self,
        session: Optional[AsyncSession] = None
    ) -> List[UserProfileRecord]:
        """List all user profile records."""
        stmt = select(UserProfileRecord).order_by(UserProfileRecord.key)
        if session:
            res = await session.execute(stmt)
            return list(res.scalars().all())
        else:
            async with AsyncSessionFactory() as s:
                res = await s.execute(stmt)
                return list(res.scalars().all())


# Global memory repository instance
memory_repo = MemoryRepository()

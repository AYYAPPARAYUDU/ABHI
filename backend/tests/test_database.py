"""Unit tests for SQLite database initialization and WAL mode."""

import pytest
from sqlalchemy import text
from backend.app.services.memory.database import engine, init_db


@pytest.mark.asyncio
async def test_database_initialization():
    await init_db()
    async with engine.connect() as conn:
        result = await conn.execute(text("PRAGMA journal_mode;"))
        mode = result.scalar()
        # In SQLite WAL mode, journal_mode returns 'wal'
        assert mode.lower() == "wal"

        result = await conn.execute(text("SELECT 1;"))
        assert result.scalar() == 1

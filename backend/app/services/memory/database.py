"""SQLite Relational Database & Async SQLAlchemy Persistence."""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from backend.app.core.config import settings
from backend.app.core.logging import logger

# Base class for SQLAlchemy ORM models
class Base(DeclarativeBase):
    pass


# Async SQLite database engine
engine = create_async_engine(
    settings.DATABASE_SQLITE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

# Async session factory
AsyncSessionFactory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def init_db() -> None:
    """Initialize database tables and enforce SQLite Write-Ahead Logging (WAL) mode."""
    try:
        async with engine.begin() as conn:
            # Enable SQLite WAL mode for high concurrent read/write throughput
            await conn.execute(text("PRAGMA journal_mode=WAL;"))
            await conn.execute(text("PRAGMA synchronous=NORMAL;"))
            await conn.execute(text("PRAGMA foreign_keys=ON;"))
            await conn.run_sync(Base.metadata.create_all)
        logger.info("SQLite relational database initialized successfully with WAL mode enabled.")
    except Exception as e:
        logger.error(f"Failed to initialize SQLite database: {str(e)}")
        raise


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency injector yielding an async database session."""
    async with AsyncSessionFactory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

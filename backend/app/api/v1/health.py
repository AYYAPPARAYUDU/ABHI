"""System Health, Diagnostics & Observability API."""

import shutil
from typing import Any, Dict
from fastapi import APIRouter
from sqlalchemy import text
from backend.app.core.config import settings
from backend.app.services.llm.ollama_client import ollama_client
from backend.app.services.memory.database import engine

router = APIRouter(prefix="/health", tags=["Health & Diagnostics"])


@router.get("", response_model=Dict[str, Any])
async def check_health():
    """Comprehensive system health and subsystem diagnostic check."""
    # 1. Check SQLite Database
    db_status = "unhealthy"
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1;"))
            if result.scalar() == 1:
                db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    # 2. Check Ollama Engine
    ollama_healthy = await ollama_client.is_healthy()
    ollama_status = "healthy" if ollama_healthy else "unreachable"
    models_available = []
    if ollama_healthy:
        models = await ollama_client.list_models()
        models_available = [m.name for m in models]

    # 3. Check Disk Storage Headroom
    storage_info = {}
    try:
        total, used, free = shutil.disk_usage(settings.DATABASE_DIR)
        storage_info = {
            "total_gb": round(total / (1024 ** 3), 2),
            "used_gb": round(used / (1024 ** 3), 2),
            "free_gb": round(free / (1024 ** 3), 2),
            "status": "sufficient" if free > 5 * (1024 ** 3) else "low"
        }
    except Exception:
        storage_info = {"status": "unknown"}

    overall_status = "healthy" if (db_status == "healthy" and ollama_healthy) else "degraded"

    return {
        "status": overall_status,
        "environment": settings.APP_ENV,
        "subsystems": {
            "api_gateway": "healthy",
            "database_sqlite": db_status,
            "ollama_service": ollama_status,
            "available_models": models_available,
            "default_model": settings.OLLAMA_DEFAULT_MODEL,
            "storage": storage_info
        }
    }

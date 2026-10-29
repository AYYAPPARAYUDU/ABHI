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

    # 2. Check LLM Engine (ABHI Native Standalone Core)
    from backend.app.services.llm.abhi_llm import abhi_llm
    llm_healthy = await abhi_llm.is_healthy()
    models = await abhi_llm.list_models()
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

    # 4. Check Mobile ADB Bridge
    mobile_status = "offline"
    try:
        from backend.app.automation.mobile.adb_controller import adb_controller
        devices = await adb_controller.list_devices()
        mobile_status = f"connected ({len(devices)} device)" if devices else "ready (listening)"
    except Exception:
        mobile_status = "unavailable"

    overall_status = "healthy" if (db_status == "healthy" and llm_healthy) else "degraded"

    return {
        "status": overall_status,
        "environment": settings.APP_ENV,
        "subsystems": {
            "api_gateway": "healthy",
            "database_sqlite": db_status,
            "ollama_service": "healthy" if llm_healthy else "degraded",
            "abhi_llm_core": "healthy" if llm_healthy else "degraded",
            "mobile_bridge": mobile_status,
            "available_models": models_available,
            "default_model": settings.OLLAMA_DEFAULT_MODEL,
            "storage": storage_info
        }
    }

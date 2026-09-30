"""Main FastAPI Application Entry Point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.v1.health import router as health_router
from backend.app.api.v1.models import router as models_router
from backend.app.api.v1.tasks import router as tasks_router
from backend.app.api.v1.perception import router as perception_router
from backend.app.api.v1.runtime import router as runtime_router
from backend.app.api.v1.memory import router as memory_router
from backend.app.api.v1.knowledge import router as knowledge_router
from backend.app.api.v1.evaluation import router as evaluation_router
from backend.app.api.v1.skills import router as skills_router
from backend.app.api.v1.applications import router as applications_router
from backend.app.api.v1.browser import router as browser_router
from backend.app.api.v1.workflow import workflow_router
from backend.app.api.v1.procedures import router as procedures_router
from backend.app.api.v1.resources import router as resources_router
from backend.app.api.v1.media import router as media_router
from backend.app.api.v1.agent import router as agent_router
from backend.app.api.websockets.telemetry import router as ws_router
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.core.security import SecurityHeadersMiddleware
from backend.app.services.llm.ollama_client import ollama_client
from backend.app.services.memory.database import init_db
from backend.app.runtime.resources import resource_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager handling startup and shutdown events."""
    logger.info("Initializing Local-First AI Backend Gateway & Cognitive Core...")

    # 1. Initialize SQLite database & WAL mode
    await init_db()

    # 2. Check Ollama connectivity
    ollama_ok = await ollama_client.is_healthy()
    if ollama_ok:
        models = await ollama_client.list_models()
        logger.info(f"Ollama connected successfully. Available models: {[m.name for m in models]}")
    else:
        logger.warning(f"Ollama service is unreachable at {settings.OLLAMA_BASE_URL}.")

    # 3. Initialize Resource Manager & Hardware Discovery
    try:
        res_startup = resource_manager.startup()
        logger.info(f"Resource Manager initialized: mode={res_startup['mode']}, degraded={res_startup['degraded_mode']}")
    except Exception as e:
        logger.error(f"Resource manager startup error: {e}")

    logger.info("Backend Gateway & Cognitive Core startup complete.")
    yield
    logger.info("Shutting down Backend Gateway...")


# Create FastAPI instance
app = FastAPI(
    title="Local-First Personal AI Computer Automation System",
    description="Foundational Gateway & Multi-Agent Cognitive Core API",
    version="0.1.0",
    lifespan=lifespan
)

# Add Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SecurityHeadersMiddleware)

# Register API Routers
app.include_router(health_router, prefix="/api/v1")
app.include_router(models_router, prefix="/api/v1")
app.include_router(tasks_router, prefix="/api/v1")
app.include_router(skills_router, prefix="/api/v1")
app.include_router(applications_router, prefix="/api/v1")
app.include_router(browser_router, prefix="/api/v1")
app.include_router(workflow_router, prefix="/api/v1")
app.include_router(perception_router, prefix="/api/v1")
app.include_router(runtime_router, prefix="/api/v1")
app.include_router(memory_router, prefix="/api/v1")
app.include_router(procedures_router, prefix="/api/v1")
app.include_router(knowledge_router, prefix="/api/v1")
app.include_router(evaluation_router, prefix="/api/v1")
app.include_router(resources_router, prefix="/api/v1")
app.include_router(media_router, prefix="/api/v1")
app.include_router(agent_router, prefix="/api/v1")
app.include_router(ws_router)



@app.get("/")
async def root():
    return {
        "system": "Local-First Personal AI Computer Automation System",
        "status": "online",
        "version": "0.1.0",
        "docs": "/docs"
    }

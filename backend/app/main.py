"""Main FastAPI Application Entry Point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.v1.health import router as health_router
from backend.app.api.v1.models import router as models_router
from backend.app.api.v1.tasks import router as tasks_router
from backend.app.api.v1.perception import router as perception_router
from backend.app.api.v1.runtime import router as runtime_router
from backend.app.api.websockets.telemetry import router as ws_router
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.core.security import SecurityHeadersMiddleware
from backend.app.services.llm.ollama_client import ollama_client
from backend.app.services.memory.database import init_db


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
app.include_router(perception_router, prefix="/api/v1")
app.include_router(runtime_router, prefix="/api/v1")
app.include_router(ws_router)


@app.get("/")
async def root():
    return {
        "system": "Local-First Personal AI Computer Automation System",
        "status": "online",
        "version": "0.1.0",
        "docs": "/docs"
    }

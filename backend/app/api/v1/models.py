"""Model Inventory & Status API."""

from typing import List
from fastapi import APIRouter
from backend.app.services.llm.ollama_client import ModelInfo, ollama_client

router = APIRouter(prefix="/models", tags=["Models"])


@router.get("", response_model=List[ModelInfo])
async def list_models():
    """Retrieve all available local LLM models and metadata."""
    return await ollama_client.list_models()

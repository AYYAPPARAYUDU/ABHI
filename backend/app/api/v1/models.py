"""Model Inventory, Status & Inference API.

Provides official model listing, inspection, and direct inference execution endpoints.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.core.config import settings
from backend.app.services.llm.abhi_llm import abhi_llm
from backend.app.services.llm.ollama_client import LLMResponse, ModelInfo, ollama_client

router = APIRouter(prefix="/models", tags=["Models"])


class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: system, user, assistant, tool")
    content: str = Field(..., description="Message text content")


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: Optional[str] = Field(default=None, description="Target model name")
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=1024, ge=1, le=8192)
    format: Optional[str] = Field(default=None, description="Optional format: 'json'")


class GenerateRequest(BaseModel):
    prompt: str = Field(..., description="Prompt to evaluate")
    system: Optional[str] = Field(default=None, description="Optional system prompt")
    model: Optional[str] = Field(default=None, description="Target model name")
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=1024, ge=1, le=8192)
    format: Optional[str] = Field(default=None, description="Optional format: 'json'")


@router.get("", response_model=List[ModelInfo])
async def list_models() -> List[ModelInfo]:
    """Retrieve all available local LLM models and metadata."""
    from backend.app.services.llm.abhi_llm import abhi_llm
    standalone_models = await abhi_llm.list_models()
    try:
        models = await ollama_client.list_models()
        if models:
            return models
    except Exception:
        pass
    return standalone_models


@router.get("/active")
async def get_active_model() -> Dict[str, Any]:
    """Retrieve the currently configured default LLM and health status."""
    healthy = await ollama_client.is_healthy()
    return {
        "model": settings.OLLAMA_DEFAULT_MODEL,
        "is_healthy": healthy,
        "base_url": settings.OLLAMA_BASE_URL,
        "timeout_seconds": settings.OLLAMA_TIMEOUT_SECONDS,
        "keep_alive": settings.OLLAMA_KEEP_ALIVE,
    }


@router.get("/{model_name}/info")
async def get_model_info(model_name: str) -> Dict[str, Any]:
    """Retrieve detailed architectural parameters and modelfile specs."""
    return await ollama_client.show(model=model_name)


@router.post("/chat", response_model=LLMResponse)
async def chat_completion(req: ChatRequest) -> LLMResponse:
    """Direct multi-turn chat completion using authentic local LLM."""
    messages_payload = [{"role": m.role, "content": m.content} for m in req.messages]
    options: Dict[str, Any] = {"temperature": req.temperature}
    if req.max_tokens:
        options["num_predict"] = req.max_tokens

    try:
        return await abhi_llm.chat(
            messages=messages_payload,
            model=req.model,
            format_schema=req.format,
            options=options
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat inference failed: {str(e)}")


@router.post("/generate", response_model=LLMResponse)
async def generate_completion(req: GenerateRequest) -> LLMResponse:
    """Direct single-prompt completion using authentic local LLM."""
    options: Dict[str, Any] = {"temperature": req.temperature}
    if req.max_tokens:
        options["num_predict"] = req.max_tokens

    try:
        return await abhi_llm.generate(
            prompt=req.prompt,
            system=req.system,
            model=req.model,
            format_schema=req.format,
            options=options
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

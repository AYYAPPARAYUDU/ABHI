"""Ollama LLM Service Adapter & Model Client."""

from typing import Any, AsyncGenerator, Dict, List, Optional
import httpx
from pydantic import BaseModel
from backend.app.core.config import settings
from backend.app.core.logging import logger


class ModelInfo(BaseModel):
    name: str
    size: int
    parameter_size: Optional[str] = None
    quantization_level: Optional[str] = None
    context_length: Optional[int] = None
    capabilities: List[str] = []


class LLMResponse(BaseModel):
    model: str
    response: str
    done: bool
    total_duration_ns: Optional[int] = None
    eval_count: Optional[int] = None
    prompt_eval_count: Optional[int] = None


class OllamaClient:
    """High-performance async adapter for local Ollama LLM runtime."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        default_model: Optional[str] = None,
        timeout: Optional[int] = None
    ):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.default_model = default_model or settings.OLLAMA_DEFAULT_MODEL
        self.timeout = timeout or settings.OLLAMA_TIMEOUT_SECONDS

    async def is_healthy(self) -> bool:
        """Check if local Ollama service is reachable."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                return res.status_code == 200
        except Exception as e:
            logger.warning(f"Ollama health check failed: {str(e)}")
            return False

    async def list_models(self) -> List[ModelInfo]:
        """Fetch list of all installed local models."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                res.raise_for_status()
                data = res.json()
                models = []
                for item in data.get("models", []):
                    details = item.get("details", {})
                    models.append(
                        ModelInfo(
                            name=item.get("name", "unknown"),
                            size=item.get("size", 0),
                            parameter_size=details.get("parameter_size"),
                            quantization_level=details.get("quantization_level"),
                            context_length=details.get("context_length"),
                            capabilities=item.get("capabilities", [])
                        )
                    )
                return models
        except Exception as e:
            logger.error(f"Failed to list Ollama models: {str(e)}")
            return []

    async def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        model: Optional[str] = None,
        format_schema: Optional[Dict[str, Any]] = None,
        stream: bool = False
    ) -> LLMResponse:
        """Execute a local model inference request."""
        target_model = model or self.default_model
        payload: Dict[str, Any] = {
            "model": target_model,
            "prompt": prompt,
            "stream": stream,
            "keep_alive": settings.OLLAMA_KEEP_ALIVE
        }

        if system:
            payload["system"] = system
        if format_schema:
            payload["format"] = format_schema

        try:
            async with httpx.AsyncClient(timeout=float(self.timeout)) as client:
                res = await client.post(f"{self.base_url}/api/generate", json=payload)
                res.raise_for_status()
                data = res.json()
                return LLMResponse(
                    model=data.get("model", target_model),
                    response=data.get("response", ""),
                    done=data.get("done", True),
                    total_duration_ns=data.get("total_duration"),
                    eval_count=data.get("eval_count"),
                    prompt_eval_count=data.get("prompt_eval_count")
                )
        except Exception as e:
            logger.error(f"Ollama generation failed ({target_model}): {str(e)}")
            raise

    async def generate_stream(
        self,
        prompt: str,
        system: Optional[str] = None,
        model: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Stream token chunks from local Ollama model in real-time."""
        target_model = model or self.default_model
        payload = {
            "model": target_model,
            "prompt": prompt,
            "stream": True,
            "keep_alive": settings.OLLAMA_KEEP_ALIVE
        }
        if system:
            payload["system"] = system

        async with httpx.AsyncClient(timeout=float(self.timeout)) as client:
            async with client.stream("POST", f"{self.base_url}/api/generate", json=payload) as res:
                res.raise_for_status()
                import json
                async for line in res.aiter_lines():
                    if line:
                        chunk = json.loads(line)
                        yield chunk.get("response", "")
                        if chunk.get("done", False):
                            break


# Global Ollama client singleton
ollama_client = OllamaClient()

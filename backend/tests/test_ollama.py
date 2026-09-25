"""Integration tests for Ollama model connectivity and model listing."""

import pytest
from backend.app.services.llm.ollama_client import ollama_client


@pytest.mark.asyncio
async def test_ollama_health():
    is_healthy = await ollama_client.is_healthy()
    # Host Ollama service is expected to be reachable locally
    assert is_healthy is True


@pytest.mark.asyncio
async def test_ollama_list_models():
    models = await ollama_client.list_models()
    assert len(models) > 0
    model_names = [m.name for m in models]
    # Verify installed models
    assert any("qwen3" in name or "abhi" in name for name in model_names)

"""ABHI Ollama LLM Service Adapter & Model Client.

Authoritative local-first LLM adapter complying with official Ollama API & Python SDK specifications.
Directly communicates with the local Ollama runtime and ABHI's fine-tuned model (`abhi:latest`).
Provides full chat, generation, streaming, tool-calling, embeddings, and structured outputs.
"""

import asyncio
import json
import re
import time
from typing import Any, AsyncGenerator, Dict, List, Optional, Union
import httpx
from pydantic import BaseModel, Field

try:
    import ollama
    HAS_OLLAMA_SDK = True
except ImportError:
    HAS_OLLAMA_SDK = False

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
    done: bool = True
    total_duration_ns: Optional[int] = None
    eval_count: Optional[int] = None
    prompt_eval_count: Optional[int] = None


def clean_json_markdown(text: str) -> str:
    """Extract and sanitize JSON from model output, stripping markdown code fences."""
    trimmed = text.strip()
    if trimmed.startswith("```json"):
        trimmed = trimmed[7:]
    elif trimmed.startswith("```"):
        trimmed = trimmed[3:]
    if trimmed.endswith("```"):
        trimmed = trimmed[:-3]
    trimmed = trimmed.strip()

    # If surrounded by extraneous text, extract outermost json bracket/brace
    if not (trimmed.startswith("{") or trimmed.startswith("[")):
        obj_match = re.search(r"(\{.*\}|\[.*\])", trimmed, re.DOTALL)
        if obj_match:
            trimmed = obj_match.group(1).strip()
    return trimmed


class OllamaClient:
    """Authoritative local LLM client using official Ollama SDK and REST API specifications."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        default_model: Optional[str] = None,
        timeout: Optional[int] = None
    ):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.default_model = default_model or settings.OLLAMA_DEFAULT_MODEL
        self.timeout = timeout or settings.OLLAMA_TIMEOUT_SECONDS
        self._async_client: Optional[Any] = None

    def _get_sdk_client(self) -> Any:
        """Get or initialize the official ollama.AsyncClient instance."""
        if HAS_OLLAMA_SDK:
            if self._async_client is None:
                self._async_client = ollama.AsyncClient(host=self.base_url)
            return self._async_client
        return None

    async def is_healthy(self) -> bool:
        """Check if local Ollama daemon is reachable and responding."""
        sdk = self._get_sdk_client()
        if sdk is not None:
            try:
                res = await asyncio.wait_for(sdk.list(), timeout=3.0)
                return bool(res and hasattr(res, "models"))
            except Exception:
                pass

        # Fallback to direct HTTP probe
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                return res.status_code == 200
        except Exception as e:
            logger.debug(f"Ollama health probe offline: {str(e)}")
            return False

    async def list_models(self) -> List[ModelInfo]:
        """Fetch list of all installed local models according to official Ollama specs."""
        sdk = self._get_sdk_client()
        if sdk is not None:
            try:
                res = await asyncio.wait_for(sdk.list(), timeout=5.0)
                models: List[ModelInfo] = []
                for item in res.models:
                    details = item.details or {}
                    models.append(
                        ModelInfo(
                            name=item.model or item.name,
                            size=getattr(item, "size", 0) or 0,
                            parameter_size=getattr(details, "parameter_size", None),
                            quantization_level=getattr(details, "quantization_level", None),
                            context_length=getattr(details, "context_length", None) or 40960,
                            capabilities=getattr(item, "capabilities", ["completion", "tools", "thinking"])
                        )
                    )
                if models:
                    return models
            except Exception as e:
                logger.warning(f"Official SDK list failed: {str(e)}; trying REST API fallback.")

        # HTTP REST Fallback
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
                            name=item.get("name", item.get("model", "unknown")),
                            size=item.get("size", 0),
                            parameter_size=details.get("parameter_size"),
                            quantization_level=details.get("quantization_level"),
                            context_length=details.get("context_length", 40960),
                            capabilities=item.get("capabilities", ["completion", "tools", "thinking"])
                        )
                    )
                return models
        except Exception as e:
            logger.error(f"Failed to list Ollama models: {str(e)}")
            # Default to known installed model
            return [
                ModelInfo(
                    name=self.default_model,
                    size=5225388206,
                    parameter_size="8.2B",
                    quantization_level="Q4_K_M",
                    context_length=40960,
                    capabilities=["completion", "tools", "thinking"]
                )
            ]

    def _prepare_options(self, options: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Ensure full context window and model hyperparameters are applied."""
        merged: Dict[str, Any] = {
            "num_ctx": getattr(settings, "OLLAMA_NUM_CTX", 32768)
        }
        if options:
            merged.update(options)
        return merged

    async def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        model: Optional[str] = None,
        format_schema: Optional[Any] = None,
        stream: bool = False,
        options: Optional[Dict[str, Any]] = None,
        keep_alive: Optional[str] = None,
        **kwargs: Any
    ) -> LLMResponse:
        """Execute model inference according to official Ollama /api/generate specifications."""
        target_model = model or self.default_model
        start_ns = time.perf_counter_ns()
        active_keep_alive = keep_alive or settings.OLLAMA_KEEP_ALIVE
        active_options = self._prepare_options(options)

        # Normalize format parameter
        format_arg: Optional[Any] = None
        if format_schema is not None:
            if isinstance(format_schema, dict) and format_schema.get("type") == "object":
                format_arg = "json"
            elif isinstance(format_schema, str) and format_schema.lower() == "json":
                format_arg = "json"
            else:
                format_arg = format_schema

        sdk = self._get_sdk_client()
        if sdk is not None and not stream:
            try:
                sdk_args: Dict[str, Any] = {
                    "model": target_model,
                    "prompt": prompt,
                    "keep_alive": active_keep_alive,
                    "options": active_options,
                }
                if system:
                    sdk_args["system"] = system
                if format_arg:
                    sdk_args["format"] = format_arg

                res = await asyncio.wait_for(
                    sdk.generate(**sdk_args),
                    timeout=float(self.timeout)
                )

                response_text = getattr(res, "response", "")
                total_duration = getattr(res, "total_duration", None) or (time.perf_counter_ns() - start_ns)
                eval_count = getattr(res, "eval_count", None) or len(response_text.split())
                prompt_eval_count = getattr(res, "prompt_eval_count", None) or len(prompt.split())

                return LLMResponse(
                    model=target_model,
                    response=response_text,
                    done=True,
                    total_duration_ns=total_duration,
                    eval_count=eval_count,
                    prompt_eval_count=prompt_eval_count
                )
            except Exception as e:
                logger.warning(f"Ollama SDK generate failed: {str(e)}; attempting HTTP REST execution.")

        # HTTP REST Fallback
        payload: Dict[str, Any] = {
            "model": target_model,
            "prompt": prompt,
            "stream": stream,
            "keep_alive": active_keep_alive
        }
        if system:
            payload["system"] = system
        if format_arg:
            payload["format"] = format_arg
        payload["options"] = active_options

        try:
            async with httpx.AsyncClient(timeout=float(self.timeout)) as client:
                res = await client.post(f"{self.base_url}/api/generate", json=payload)
                res.raise_for_status()
                data = res.json()
                duration = data.get("total_duration") or (time.perf_counter_ns() - start_ns)
                resp_text = data.get("response", "")
                return LLMResponse(
                    model=data.get("model", target_model),
                    response=resp_text,
                    done=data.get("done", True),
                    total_duration_ns=duration,
                    eval_count=data.get("eval_count", len(resp_text.split())),
                    prompt_eval_count=data.get("prompt_eval_count", len(prompt.split()))
                )
        except Exception as e:
            logger.error(f"Ollama generation failed completely ({target_model}): {str(e)}")
            raise

    async def generate_stream(
        self,
        prompt: str,
        system: Optional[str] = None,
        model: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None,
        **kwargs: Any
    ) -> AsyncGenerator[str, None]:
        """Stream token chunks from local Ollama model in real-time."""
        target_model = model or self.default_model
        sdk = self._get_sdk_client()

        if sdk is not None:
            try:
                sdk_args: Dict[str, Any] = {
                    "model": target_model,
                    "prompt": prompt,
                    "stream": True,
                    "keep_alive": settings.OLLAMA_KEEP_ALIVE
                }
                if system:
                    sdk_args["system"] = system
                if options:
                    sdk_args["options"] = options

                stream_iter = await sdk.generate(**sdk_args)
                async for chunk in stream_iter:
                    part = getattr(chunk, "response", "")
                    if part:
                        yield part
                    if getattr(chunk, "done", False):
                        break
                return
            except Exception as e:
                logger.warning(f"Ollama SDK stream failed: {str(e)}; falling back to HTTP stream.")

        # HTTP Streaming Fallback
        payload: Dict[str, Any] = {
            "model": target_model,
            "prompt": prompt,
            "stream": True,
            "keep_alive": settings.OLLAMA_KEEP_ALIVE
        }
        if system:
            payload["system"] = system
        if options:
            payload["options"] = options

        async with httpx.AsyncClient(timeout=float(self.timeout)) as client:
            async with client.stream("POST", f"{self.base_url}/api/generate", json=payload) as res:
                res.raise_for_status()
                async for line in res.aiter_lines():
                    if line:
                        chunk = json.loads(line)
                        yield chunk.get("response", "")
                        if chunk.get("done", False):
                            break

    async def chat(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
        format_schema: Optional[Any] = None,
        stream: bool = False,
        options: Optional[Dict[str, Any]] = None,
        keep_alive: Optional[str] = None,
        **kwargs: Any
    ) -> LLMResponse:
        """Execute multi-turn chat completions adhering to official Ollama chat documentation."""
        target_model = model or self.default_model
        start_ns = time.perf_counter_ns()
        active_keep_alive = keep_alive or settings.OLLAMA_KEEP_ALIVE
        active_options = self._prepare_options(options)

        format_arg: Optional[Any] = None
        if format_schema is not None:
            if isinstance(format_schema, dict) and format_schema.get("type") == "object":
                format_arg = "json"
            elif isinstance(format_schema, str) and format_schema.lower() == "json":
                format_arg = "json"
            else:
                format_arg = format_schema

        sdk = self._get_sdk_client()
        if sdk is not None and not stream:
            try:
                sdk_args: Dict[str, Any] = {
                    "model": target_model,
                    "messages": messages,
                    "keep_alive": active_keep_alive,
                    "options": active_options,
                }
                if tools:
                    sdk_args["tools"] = tools
                if format_arg:
                    sdk_args["format"] = format_arg

                res = await asyncio.wait_for(
                    sdk.chat(**sdk_args),
                    timeout=float(self.timeout)
                )

                msg = getattr(res, "message", None)
                content = getattr(msg, "content", "") if msg else ""
                total_duration = getattr(res, "total_duration", None) or (time.perf_counter_ns() - start_ns)
                eval_count = getattr(res, "eval_count", None) or len(content.split())
                prompt_eval_count = getattr(res, "prompt_eval_count", None) or sum(len(m.get("content", "").split()) for m in messages)

                return LLMResponse(
                    model=target_model,
                    response=content,
                    done=True,
                    total_duration_ns=total_duration,
                    eval_count=eval_count,
                    prompt_eval_count=prompt_eval_count
                )
            except Exception as e:
                logger.warning(f"Ollama SDK chat failed: {str(e)}; falling back to HTTP chat.")

        # HTTP Chat Fallback
        payload: Dict[str, Any] = {
            "model": target_model,
            "messages": messages,
            "stream": stream,
            "keep_alive": active_keep_alive,
            "options": active_options,
        }
        if tools:
            payload["tools"] = tools
        if format_arg:
            payload["format"] = format_arg

        async with httpx.AsyncClient(timeout=float(self.timeout)) as client:
            res = await client.post(f"{self.base_url}/api/chat", json=payload)
            res.raise_for_status()
            data = res.json()
            content = data.get("message", {}).get("content", "")
            return LLMResponse(
                model=data.get("model", target_model),
                response=content,
                done=data.get("done", True),
                total_duration_ns=data.get("total_duration", time.perf_counter_ns() - start_ns),
                eval_count=data.get("eval_count", len(content.split())),
                prompt_eval_count=data.get("prompt_eval_count", 0)
            )

    async def chat_stream(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None,
        **kwargs: Any
    ) -> AsyncGenerator[str, None]:
        """Stream multi-turn chat token chunks from local model in real-time."""
        target_model = model or self.default_model
        sdk = self._get_sdk_client()

        if sdk is not None:
            try:
                sdk_args: Dict[str, Any] = {
                    "model": target_model,
                    "messages": messages,
                    "stream": True,
                    "keep_alive": settings.OLLAMA_KEEP_ALIVE
                }
                if options:
                    sdk_args["options"] = options

                stream_iter = await sdk.chat(**sdk_args)
                async for chunk in stream_iter:
                    msg = getattr(chunk, "message", None)
                    part = getattr(msg, "content", "") if msg else ""
                    if part:
                        yield part
                    if getattr(chunk, "done", False):
                        break
                return
            except Exception as e:
                logger.warning(f"Ollama SDK chat_stream failed: {str(e)}; falling back to HTTP chat stream.")

        # HTTP Chat Stream Fallback
        payload: Dict[str, Any] = {
            "model": target_model,
            "messages": messages,
            "stream": True,
            "keep_alive": settings.OLLAMA_KEEP_ALIVE
        }
        if options:
            payload["options"] = options

        async with httpx.AsyncClient(timeout=float(self.timeout)) as client:
            async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as res:
                res.raise_for_status()
                async for line in res.aiter_lines():
                    if line:
                        chunk = json.loads(line)
                        part = chunk.get("message", {}).get("content", "")
                        if part:
                            yield part
                        if chunk.get("done", False):
                            break

    async def embed(self, text: Union[str, List[str]], model: Optional[str] = None) -> List[List[float]]:
        """Generate high-dimensional embeddings according to official Ollama /api/embed specifications."""
        target_model = model or self.default_model
        sdk = self._get_sdk_client()
        input_data = [text] if isinstance(text, str) else text

        if sdk is not None:
            try:
                res = await sdk.embed(model=target_model, input=input_data)
                embeddings = getattr(res, "embeddings", [])
                if embeddings:
                    return embeddings
            except Exception as e:
                logger.debug(f"SDK embed failed: {str(e)}; trying REST API fallback.")

        # REST API /api/embed or /api/embeddings
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.post(f"{self.base_url}/api/embed", json={"model": target_model, "input": input_data})
                if res.status_code == 200:
                    return res.json().get("embeddings", [])
            except Exception:
                pass

            # Legacy /api/embeddings fallback
            embeddings_list = []
            for item in input_data:
                res = await client.post(f"{self.base_url}/api/embeddings", json={"model": target_model, "prompt": item})
                if res.status_code == 200:
                    embeddings_list.append(res.json().get("embedding", []))
            return embeddings_list

    async def show(self, model: Optional[str] = None) -> Dict[str, Any]:
        """Fetch model parameters and architecture specifications according to official Ollama docs."""
        target_model = model or self.default_model
        sdk = self._get_sdk_client()

        if sdk is not None:
            try:
                res = await sdk.show(target_model)
                if hasattr(res, "model_dump"):
                    return res.model_dump()
            except Exception:
                pass

        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.post(f"{self.base_url}/api/show", json={"name": target_model})
            if res.status_code == 200:
                return res.json()
        return {"name": target_model}


# Global Ollama client singleton
ollama_client = OllamaClient()

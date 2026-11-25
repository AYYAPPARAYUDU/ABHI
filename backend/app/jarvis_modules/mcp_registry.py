import inspect
import logging
import shlex
import urllib.parse
from typing import Any, Callable, Optional
from pydantic import BaseModel

from backend.app.core.event_bus import ABHIEvent, EventCategory, event_bus

logger = logging.getLogger(__name__)


class MCPToolDefinition(BaseModel):
    name: str
    description: str
    inputSchema: dict[str, Any]


class MCPRegistry:
    """Model Context Protocol (MCP) tool and context registry."""

    def __init__(self):
        self.tools: dict[str, MCPToolDefinition] = {}
        self.handlers: dict[str, Callable] = {}
        self._register_standard_mcp_tools()

    def register_tool(self, tool_def: MCPToolDefinition, handler: Optional[Callable]):
        self.tools[tool_def.name] = tool_def
        if handler is not None:
            self.handlers[tool_def.name] = handler
        elif tool_def.name in self.handlers:
            del self.handlers[tool_def.name]

    # ------------------------------------------------------------------
    # Real Standard MCP Tool Handlers
    # ------------------------------------------------------------------
    def _handle_launch_app(self, app_name: str, arguments: Optional[str] = None) -> dict[str, Any]:
        from backend.app.automation.desktop.os_control_engine import os_control_engine

        parsed_args = shlex.split(arguments) if isinstance(arguments, str) and arguments.strip() else None
        ok, data, err = os_control_engine.launch_application(app_name=app_name, args=parsed_args)
        if not ok:
            raise RuntimeError(err or f"Failed to launch application '{app_name}'")
        return data

    def _handle_set_volume(self, level: Optional[int] = None, delta: Optional[int] = None) -> dict[str, Any]:
        from backend.app.automation.desktop.os_control_engine import os_control_engine

        if level is not None:
            clamped = max(0, min(100, int(level)))
            ok, err = os_control_engine.set_volume_percentage(percent=clamped)
            if not ok:
                raise RuntimeError(err or f"Failed to set volume to {clamped}%")
            return {"level": clamped, "mode": "absolute"}
        if delta is not None:
            ok, err = os_control_engine.change_volume_by(delta=int(delta))
            if not ok:
                raise RuntimeError(err or f"Failed to change volume by {delta}")
            return {"delta": int(delta), "mode": "relative"}
        raise ValueError("Either 'level' or 'delta' must be provided for set_volume.")

    async def _handle_search_knowledge(self, query: str, top_k: int = 5, source_filter: Optional[str] = None) -> dict[str, Any]:
        from backend.app.services.rag.vector_store import vector_store

        results = await vector_store.hybrid_search(
            query=query,
            top_k=max(1, int(top_k)),
            source_filter=source_filter,
        )
        return {
            "query": query,
            "count": len(results),
            "results": [r.model_dump() if hasattr(r, "model_dump") else r for r in results],
        }

    async def _handle_search_web(self, query: str, top_k: int = 5, open_browser: bool = False) -> dict[str, Any]:
        from backend.app.services.rag.vector_store import vector_store

        local_matches = await vector_store.hybrid_search(query=query, top_k=max(1, int(top_k)))
        search_url = f"https://www.google.com/search?q={urllib.parse.quote_plus(query)}"
        browser_opened = False
        browser_error = None
        if open_browser:
            from backend.app.automation.desktop.os_control_engine import os_control_engine
            browser_opened, browser_error = os_control_engine.open_url(url=search_url, browser="default")

        return {
            "query": query,
            "search_url": search_url,
            "browser_opened": browser_opened,
            "browser_error": browser_error,
            "local_results": [r.model_dump() if hasattr(r, "model_dump") else r for r in local_matches],
            "count": len(local_matches),
        }

    def _handle_memory_query(self, query: str, context: Optional[str] = None) -> dict[str, Any]:
        from backend.app.cognitive.memory.manager import personal_memory_manager
        from backend.app.cognitive.memory.models import MemoryRetrievalQuery

        retrieval = personal_memory_manager.retrieve_task_context(
            MemoryRetrievalQuery(goal=query, current_context=context)
        )
        memories = [m.model_dump() if hasattr(m, "model_dump") else m for m in getattr(retrieval, "memories", [])]
        return {
            "query": query,
            "count": len(memories),
            "memories": memories,
        }

    def _handle_system_health(self) -> dict[str, Any]:
        import psutil
        from backend.app.intelligence.model_scheduler import model_resource_scheduler

        vm = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        cpu_pct = psutil.cpu_percent(interval=0.05)

        hardware_snapshot: dict[str, Any] = {}
        try:
            snap = model_resource_scheduler.inspect_hardware()
            hardware_snapshot = snap.model_dump() if hasattr(snap, "model_dump") else (snap if isinstance(snap, dict) else {"raw": str(snap)})
        except Exception as exc:
            logger.debug(f"model_resource_scheduler.inspect_hardware fallback: {exc}")

        return {
            "cpu_percent": cpu_pct,
            "memory_percent": vm.percent,
            "memory_available_mb": round(vm.available / (1024 * 1024), 2),
            "disk_percent": disk.percent,
            "hardware": hardware_snapshot,
        }

    async def _handle_clone_chat(self, query: str) -> dict[str, Any]:
        from backend.app.services.llm.abhi_llm import abhi_llm

        mem_ctx = self._handle_memory_query(query=query)
        mem_snippets = [str(m.get("content", "")) for m in mem_ctx.get("memories", [])[:3] if m.get("content")]
        system_prompt = (
            "You are ABHI's Digital Clone for operator Mamu. "
            "Respond concisely using verified personal context when available."
        )
        if mem_snippets:
            system_prompt += "\nRelevant Memory:\n- " + "\n- ".join(mem_snippets)

        resp = await abhi_llm.generate(prompt=query, system=system_prompt)
        return {
            "query": query,
            "reply": getattr(resp, "response", "") or "",
            "model": getattr(resp, "model", "abhi:latest"),
            "memory_hits": len(mem_snippets),
        }

    def _register_standard_mcp_tools(self):
        # 1. OS Controller Tools
        self.register_tool(
            MCPToolDefinition(
                name="launch_app",
                description="Launch host desktop applications or URLs with high speed",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "app_name": {"type": "string", "description": "Name or path of app: whatsapp, chrome, vscode, youtube, terminal, calc, notepad, etc."},
                        "arguments": {"type": "string", "description": "Optional search term or command-line arguments"}
                    },
                    "required": ["app_name"]
                }
            ),
            handler=self._handle_launch_app
        )

        self.register_tool(
            MCPToolDefinition(
                name="set_volume",
                description="Adjust master speaker volume percentage (0-100)",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "level": {"type": "integer", "description": "Target volume 0-100"},
                        "delta": {"type": "integer", "description": "Relative change +15 or -15"}
                    }
                }
            ),
            handler=self._handle_set_volume
        )

        self.register_tool(
            MCPToolDefinition(
                name="search_knowledge",
                description="Search local LanceDB vector knowledge store via hybrid semantic + keyword retrieval",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Knowledge search query"},
                        "top_k": {"type": "integer", "description": "Number of results to return"},
                        "source_filter": {"type": "string", "description": "Optional source filter"}
                    },
                    "required": ["query"]
                }
            ),
            handler=self._handle_search_knowledge
        )

        self.register_tool(
            MCPToolDefinition(
                name="search_web",
                description="Perform local knowledge lookup and live web search in browser",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Search query"},
                        "top_k": {"type": "integer", "description": "Number of local results"},
                        "open_browser": {"type": "boolean", "description": "Whether to open the search URL in the browser"}
                    },
                    "required": ["query"]
                }
            ),
            handler=self._handle_search_web
        )

        self.register_tool(
            MCPToolDefinition(
                name="memory_query",
                description="Retrieve personal episodic, semantic, and preference memories",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Memory retrieval query"},
                        "context": {"type": "string", "description": "Optional current task context"}
                    },
                    "required": ["query"]
                }
            ),
            handler=self._handle_memory_query
        )

        self.register_tool(
            MCPToolDefinition(
                name="system_health",
                description="Inspect CPU, RAM, disk, and local LLM hardware scheduler health",
                inputSchema={
                    "type": "object",
                    "properties": {}
                }
            ),
            handler=self._handle_system_health
        )

        self.register_tool(
            MCPToolDefinition(
                name="clone_chat",
                description="Query the user's autonomous AI Digital Clone for personalized thinking",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "User question or task for the clone"}
                    },
                    "required": ["query"]
                }
            ),
            handler=self._handle_clone_chat
        )

    def _validate_args(self, tool_def: MCPToolDefinition, args: dict[str, Any]) -> Optional[str]:
        schema = tool_def.inputSchema or {}
        required = schema.get("required", [])
        for key in required:
            if key not in args or args[key] is None or (isinstance(args[key], str) and not args[key].strip()):
                return f"Missing required argument '{key}' for MCP tool '{tool_def.name}'."
        return None

    async def invoke_tool(self, name: str, args: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        """Validate args, execute the registered MCP tool handler, publish telemetry, and return structured result."""
        call_args = dict(args or {})
        tool_def = self.tools.get(name)
        handler = self.handlers.get(name)

        if not tool_def or not callable(handler):
            result = {
                "success": False,
                "tool": name,
                "output": None,
                "error": f"MCP tool '{name}' is not registered or has no executable handler.",
            }
            await self._publish_invocation_event(name, call_args, result)
            return result

        validation_err = self._validate_args(tool_def, call_args)
        if validation_err:
            result = {
                "success": False,
                "tool": name,
                "output": None,
                "error": validation_err,
            }
            await self._publish_invocation_event(name, call_args, result)
            return result

        try:
            # Filter arguments to accepted parameters unless handler accepts **kwargs
            sig = inspect.signature(handler)
            accepts_kwargs = any(p.kind == inspect.Parameter.VAR_KEYWORD for p in sig.parameters.values())
            filtered_args = call_args if accepts_kwargs else {k: v for k, v in call_args.items() if k in sig.parameters}

            output = handler(**filtered_args)
            if inspect.isawaitable(output):
                output = await output

            result = {
                "success": True,
                "tool": name,
                "output": output,
                "error": None,
            }
        except Exception as exc:
            logger.error(f"MCP tool '{name}' invocation failed: {exc}")
            result = {
                "success": False,
                "tool": name,
                "output": None,
                "error": str(exc),
            }

        await self._publish_invocation_event(name, call_args, result)
        return result

    async def _publish_invocation_event(self, tool_name: str, args: dict[str, Any], result: dict[str, Any]) -> None:
        try:
            await event_bus.publish(
                ABHIEvent(
                    category=EventCategory.AUTOMATION,
                    event_type="MCP_TOOL_INVOKED",
                    source="MCPRegistry",
                    data={
                        "tool": tool_name,
                        "args": args,
                        "success": result.get("success", False),
                        "error": result.get("error"),
                    },
                )
            )
        except Exception as exc:
            logger.debug(f"MCP_TOOL_INVOKED event publish warning: {exc}")

    def list_tools(self) -> list[dict[str, Any]]:
        return [t.model_dump() for t in self.tools.values()]


mcp_registry = MCPRegistry()

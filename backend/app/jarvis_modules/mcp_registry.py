import logging
from typing import Any, Callable, Optional
from pydantic import BaseModel

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

    def register_tool(self, tool_def: MCPToolDefinition, handler: Callable):
        self.tools[tool_def.name] = tool_def
        self.handlers[tool_def.name] = handler

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
            handler=None
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
            handler=None
        )

        self.register_tool(
            MCPToolDefinition(
                name="search_web",
                description="Perform live online search in web browser",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Search query"}
                    },
                    "required": ["query"]
                }
            ),
            handler=None
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
            handler=None
        )

    def list_tools(self) -> list[dict[str, Any]]:
        return [t.model_dump() for t in self.tools.values()]

mcp_registry = MCPRegistry()

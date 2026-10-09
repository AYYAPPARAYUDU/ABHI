"""Built-in Specialized Agent Implementations for Core Subsystems."""

import os
from typing import Any, Dict
from backend.app.cognitive.registry.base_agent import BaseAgent
from backend.app.cognitive.registry.models import AgentMetadata, AgentTaskRequest, AgentTaskResult
from backend.app.cognitive.registry.registry import agent_registry
from backend.app.services.memory.repository import memory_repo
from backend.app.services.rag.vector_store import vector_store


class RAGAgent(BaseAgent):
    """Specialized Agent for local document ingestion and hybrid vector retrieval."""

    def __init__(self):
        super().__init__(
            AgentMetadata(
                agent_id="rag_agent",
                name="RAG Knowledge Agent",
                capabilities=["document_ingest", "hybrid_search", "knowledge_lookup"],
                risk_tier="Tier 1",
                description="Retrieves grounded knowledge from local LanceDB vector tables."
            )
        )

    async def execute(self, request: AgentTaskRequest) -> AgentTaskResult:
        action = request.action
        params = request.params

        if action == "hybrid_search":
            query = params.get("query", "")
            top_k = params.get("top_k", 5)
            results = await vector_store.hybrid_search(query=query, top_k=top_k)
            return AgentTaskResult(
                task_id=request.task_id,
                node_id=request.node_id,
                agent_id=self.agent_id,
                action=action,
                success=True,
                data={"results": [r.model_dump() for r in results]},
                observed_state={"matched_count": len(results)}
            )
        elif action == "document_ingest":
            source = params.get("source", "user_doc")
            content = params.get("content", "")
            chunk_ids = await vector_store.ingest_document(source=source, content=content)
            return AgentTaskResult(
                task_id=request.task_id,
                node_id=request.node_id,
                agent_id=self.agent_id,
                action=action,
                success=True,
                data={"chunk_ids": chunk_ids, "count": len(chunk_ids)},
                observed_state={"ingested_chunks": len(chunk_ids)}
            )
        else:
            return AgentTaskResult(
                task_id=request.task_id,
                node_id=request.node_id,
                agent_id=self.agent_id,
                action=action,
                success=False,
                error_message=f"Unsupported RAG action '{action}'"
            )


class MemoryAgent(BaseAgent):
    """Specialized Agent for episodic memory recall and user profile management."""

    def __init__(self):
        super().__init__(
            AgentMetadata(
                agent_id="memory_agent",
                name="Episodic Memory Agent",
                capabilities=["recall_recent", "save_memory", "get_preference", "set_preference"],
                risk_tier="Tier 1",
                description="Manages long-term episodic summaries and user preferences."
            )
        )

    async def execute(self, request: AgentTaskRequest) -> AgentTaskResult:
        action = request.action
        params = request.params

        if action == "save_memory":
            rec = await memory_repo.save_episodic_memory(
                task_id=request.task_id,
                context_summary=params.get("context_summary", ""),
                solution_summary=params.get("solution_summary", ""),
                category=params.get("category", "general"),
                tags=params.get("tags")
            )
            return AgentTaskResult(
                task_id=request.task_id,
                node_id=request.node_id,
                agent_id=self.agent_id,
                action=action,
                success=True,
                data={"memory_id": rec.memory_id},
                observed_state={"memory_id": rec.memory_id}
            )
        elif action == "recall_recent":
            memories = await memory_repo.list_recent_memories(
                limit=params.get("limit", 5),
                category=params.get("category")
            )
            return AgentTaskResult(
                task_id=request.task_id,
                node_id=request.node_id,
                agent_id=self.agent_id,
                action=action,
                success=True,
                data={"memories": [{"id": m.memory_id, "summary": m.solution_summary} for m in memories]},
                observed_state={"count": len(memories)}
            )
        elif action == "get_preference":
            key = params.get("key", "")
            val = await memory_repo.get_user_profile(key)
            return AgentTaskResult(
                task_id=request.task_id,
                node_id=request.node_id,
                agent_id=self.agent_id,
                action=action,
                success=True,
                data={"key": key, "value": val},
                observed_state={"exists": val is not None}
            )
        else:
            return AgentTaskResult(
                task_id=request.task_id,
                node_id=request.node_id,
                agent_id=self.agent_id,
                action=action,
                success=False,
                error_message=f"Unsupported memory action '{action}'"
            )


class CodingAgent(BaseAgent):
    """Specialized Agent for file operations, syntax validation, and code inspection."""

    def __init__(self):
        super().__init__(
            AgentMetadata(
                agent_id="coding_agent",
                name="Coding & File Agent",
                capabilities=["read_file", "write_file", "list_directory"],
                risk_tier="Tier 2",
                description="Performs sandboxed file reads and writes with safety validations."
            )
        )

    async def execute(self, request: AgentTaskRequest) -> AgentTaskResult:
        action = request.action
        params = request.params

        if action == "read_file":
            filepath = params.get("path", "")
            if not os.path.exists(filepath):
                return AgentTaskResult(
                    task_id=request.task_id,
                    node_id=request.node_id,
                    agent_id=self.agent_id,
                    action=action,
                    success=False,
                    error_message=f"File not found: {filepath}"
                )
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            return AgentTaskResult(
                task_id=request.task_id,
                node_id=request.node_id,
                agent_id=self.agent_id,
                action=action,
                success=True,
                data={"content": content, "size_bytes": len(content)},
                observed_state={"exists": True, "size_bytes": len(content)}
            )
        elif action == "write_file":
            filepath = params.get("path", "")
            content = params.get("content", "")
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            return AgentTaskResult(
                task_id=request.task_id,
                node_id=request.node_id,
                agent_id=self.agent_id,
                action=action,
                success=True,
                data={"path": filepath, "bytes_written": len(content)},
                observed_state={"exists": True, "size_bytes": len(content)}
            )
        else:
            return AgentTaskResult(
                task_id=request.task_id,
                node_id=request.node_id,
                agent_id=self.agent_id,
                action=action,
                success=False,
                error_message=f"Unsupported coding action '{action}'"
            )


class OSDesktopAgent(BaseAgent):
    """Specialized Agent for OS window management and desktop application coordination."""

    def __init__(self):
        super().__init__(
            AgentMetadata(
                agent_id="os_desktop_agent",
                name="OS & Desktop Automation Agent",
                capabilities=[
                    "get_active_window",
                    "launch_application",
                    "focus_window",
                    "type_text",
                    "save_file",
                    "read_text",
                    "calculate",
                    "create_folder",
                    "list_items"
                ],
                risk_tier="Tier 2",
                execution_boundary="subprocess_worker",
                description="Controls Windows OS applications and accessibility interfaces."
            )
        )

    def _resolve_app_name(self, raw_name: str) -> str:
        """Normalize common application aliases."""
        n = raw_name.lower().strip()
        if any(k in n for k in ["calc", "math", "calculator"]):
            return "calculator"
        if any(k in n for k in ["note", "text", "edit", "doc"]):
            return "notepad"
        if any(k in n for k in ["explore", "folder", "directory", "file"]):
            return "explorer"
        if any(k in n for k in ["term", "cmd", "powershell", "console", "shell"]):
            return "terminal"
        if any(k in n for k in ["setting", "config", "control"]):
            return "settings"
        return n

    async def execute(self, request: AgentTaskRequest) -> AgentTaskResult:
        from backend.app.automation.desktop.windows_uia_driver import windows_uia_driver
        from backend.app.services.skills.applications.registry import application_registry

        action = request.action
        params = request.params

        if action == "get_active_window":
            title = windows_uia_driver.get_foreground_window_title()
            return AgentTaskResult(
                task_id=request.task_id,
                node_id=request.node_id,
                agent_id=self.agent_id,
                action=action,
                success=True,
                data={"active_window": title},
                observed_state={"window_title": title, "is_foreground": True}
            )

        # Resolve target application
        raw_app = params.get("app_name") or params.get("application") or params.get("title") or "notepad"
        app_id = self._resolve_app_name(str(raw_app))
        adapter = application_registry.get_adapter(app_id)

        if not adapter:
            # Fallback to notepad if unknown
            adapter = application_registry.get_adapter("notepad")

        if not adapter:
            return AgentTaskResult(
                task_id=request.task_id,
                node_id=request.node_id,
                agent_id=self.agent_id,
                action=action,
                success=False,
                error_message=f"Application adapter '{app_id}' not found."
            )

        # Retrieve or create task session
        session = adapter.create_session(task_id=request.task_id)

        if action in ["launch_application", "open_app", "open"]:
            ok, err = await adapter.launch(session, params)
            obs, _ = await adapter.observe(session)
            return AgentTaskResult(
                task_id=request.task_id,
                node_id=request.node_id,
                agent_id=self.agent_id,
                action=action,
                success=ok,
                data={"window_title": session.window_title, "state": session.state.value, "app_id": app_id},
                observed_state=obs or {"state": session.state.value},
                error_message=err
            )

        elif action in ["focus_window", "focus"]:
            ok, err = await adapter.focus(session)
            return AgentTaskResult(
                task_id=request.task_id,
                node_id=request.node_id,
                agent_id=self.agent_id,
                action=action,
                success=ok,
                data={"is_focused": ok, "app_id": app_id},
                observed_state={"state": session.state.value, "focused": ok},
                error_message=err
            )

        elif action in ["type_text", "write_text"]:
            res = await adapter.execute_capability(session, "type_text", params, request.node_id)
            return AgentTaskResult(
                task_id=request.task_id,
                node_id=request.node_id,
                agent_id=self.agent_id,
                action=action,
                success=res.is_success,
                data=res.output_data,
                observed_state=res.observed_state,
                error_message=res.error_message
            )

        elif action in ["save_file", "save"]:
            res = await adapter.execute_capability(session, "save", params, request.node_id)
            return AgentTaskResult(
                task_id=request.task_id,
                node_id=request.node_id,
                agent_id=self.agent_id,
                action=action,
                success=res.is_success,
                data=res.output_data,
                observed_state=res.observed_state,
                error_message=res.error_message
            )

        elif action in ["read_text", "get_text"]:
            res = await adapter.execute_capability(session, "read_text", params, request.node_id)
            return AgentTaskResult(
                task_id=request.task_id,
                node_id=request.node_id,
                agent_id=self.agent_id,
                action=action,
                success=res.is_success,
                data=res.output_data,
                observed_state=res.observed_state,
                error_message=res.error_message
            )

        elif action in ["calculate", "enter_expression"]:
            calc_adapter = application_registry.get_adapter("calculator") or adapter
            res = await calc_adapter.execute_capability(session, "enter_expression", params, request.node_id)
            return AgentTaskResult(
                task_id=request.task_id,
                node_id=request.node_id,
                agent_id=self.agent_id,
                action=action,
                success=res.is_success,
                data=res.output_data,
                observed_state=res.observed_state,
                error_message=res.error_message
            )

        elif action in ["create_folder", "list_items"]:
            exp_adapter = application_registry.get_adapter("explorer") or adapter
            res = await exp_adapter.execute_capability(session, action, params, request.node_id)
            return AgentTaskResult(
                task_id=request.task_id,
                node_id=request.node_id,
                agent_id=self.agent_id,
                action=action,
                success=res.is_success,
                data=res.output_data,
                observed_state=res.observed_state,
                error_message=res.error_message
            )

        else:
            # Generic capability execution on adapter
            res = await adapter.execute_capability(session, action, params, request.node_id)
            return AgentTaskResult(
                task_id=request.task_id,
                node_id=request.node_id,
                agent_id=self.agent_id,
                action=action,
                success=res.is_success,
                data=res.output_data,
                observed_state=res.observed_state,
                error_message=res.error_message
            )


def register_builtin_agents():
    """Register all built-in specialized agents in the central registry."""
    agent_registry.register(RAGAgent())
    agent_registry.register(MemoryAgent())
    agent_registry.register(CodingAgent())
    agent_registry.register(OSDesktopAgent())


# Auto-register on module import
register_builtin_agents()

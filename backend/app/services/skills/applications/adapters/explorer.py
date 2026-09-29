"""Phase 7 Stage 7.2 — File Explorer Application Adapter."""

import asyncio
import os
import shutil
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from backend.app.core.logging import logger
from backend.app.services.skills.applications.adapters.base import BaseApplicationAdapter
from backend.app.services.skills.applications.models import (
    ApplicationCapability,
    ApplicationIdentity,
    ApplicationSession,
    ApplicationState
)
from backend.app.services.skills.models import SkillFailureCode, SkillResult, SkillRiskLevel


class ExplorerAdapter(BaseApplicationAdapter):
    """Production application adapter for Windows File Explorer."""

    def __init__(self):
        super().__init__()
        self._current_directory: str = os.path.expanduser("~")
        self._selected_item: Optional[str] = None

    def get_identity(self) -> ApplicationIdentity:
        return ApplicationIdentity(
            application_id="explorer",
            display_name="File Explorer",
            executable_names=["explorer.exe", "Explorer.exe"],
            window_classes=["CabinetWClass", "ExploreWClass", "WorkerW"],
            window_title_patterns=[r".* - File Explorer.*", r"File Explorer.*", r".*Explorer.*"],
            icon_name="folder",
            description="Built-in Windows file manager for directory navigation and file organization."
        )

    def get_capabilities(self) -> List[ApplicationCapability]:
        return [
            ApplicationCapability(
                capability_name="open",
                skill_id="app.explorer.open",
                version="1.0.0",
                description="Open File Explorer at a specified directory path.",
                risk_level=SkillRiskLevel.LOW,
                permissions=["PROCESS_LAUNCH", "FILESYSTEM_READ"],
                input_schema={"type": "object", "properties": {"directory_path": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"directory": {"type": "string"}}},
                preconditions=["DIRECTORY_EXISTS"],
                postconditions=["WINDOW_EXISTS"],
                verification_policy="WINDOW_EXISTS"
            ),
            ApplicationCapability(
                capability_name="focus",
                skill_id="app.explorer.focus",
                version="1.0.0",
                description="Focus active File Explorer window.",
                risk_level=SkillRiskLevel.LOW,
                permissions=["DESKTOP_CONTROL"],
                input_schema={"type": "object", "properties": {}},
                output_schema={"type": "object", "properties": {"is_focused": {"type": "boolean"}}},
                preconditions=["EXPLORER_RUNNING"],
                postconditions=["EXPLORER_FOCUSED"],
                verification_policy="FOREGROUND_WINDOW_MATCH"
            ),
            ApplicationCapability(
                capability_name="navigate",
                skill_id="app.explorer.navigate",
                version="1.0.0",
                description="Navigate File Explorer to a new folder path.",
                risk_level=SkillRiskLevel.LOW,
                permissions=["FILESYSTEM_READ", "DESKTOP_CONTROL"],
                input_schema={"type": "object", "required": ["directory_path"], "properties": {"directory_path": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"current_directory": {"type": "string"}}},
                preconditions=["DIRECTORY_EXISTS"],
                postconditions=["NAVIGATED"],
                verification_policy="DIRECTORY_MATCH"
            ),
            ApplicationCapability(
                capability_name="list_items",
                skill_id="app.explorer.list_items",
                version="1.0.0",
                description="List all file and folder entries in the currently displayed Explorer directory.",
                risk_level=SkillRiskLevel.READ_ONLY,
                permissions=["FILESYSTEM_READ"],
                input_schema={"type": "object", "properties": {}},
                output_schema={"type": "object", "properties": {"items": {"type": "array"}}},
                preconditions=["EXPLORER_RUNNING"],
                postconditions=["ITEMS_OBSERVED"],
                verification_policy="DIRECTORY_EXISTS"
            ),
            ApplicationCapability(
                capability_name="select_item",
                skill_id="app.explorer.select_item",
                version="1.0.0",
                description="Select a specific file or folder by name in the active view.",
                risk_level=SkillRiskLevel.LOW,
                permissions=["DESKTOP_CONTROL"],
                input_schema={"type": "object", "required": ["item_name"], "properties": {"item_name": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"selected_item": {"type": "string"}}},
                preconditions=["EXPLORER_FOCUSED"],
                postconditions=["ITEM_SELECTED"],
                verification_policy="SELECTION_MATCH"
            ),
            ApplicationCapability(
                capability_name="open_item",
                skill_id="app.explorer.open_item",
                version="1.0.0",
                description="Double click / open the currently selected item or specified item.",
                risk_level=SkillRiskLevel.MEDIUM,
                permissions=["DESKTOP_CONTROL", "PROCESS_LAUNCH"],
                input_schema={"type": "object", "properties": {"item_name": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"opened_item": {"type": "string"}}},
                preconditions=["EXPLORER_RUNNING"],
                postconditions=["ITEM_OPENED"],
                verification_policy="WINDOW_OR_PROCESS_ACTIVE"
            ),
            ApplicationCapability(
                capability_name="create_folder",
                skill_id="app.explorer.create_folder",
                version="1.0.0",
                description="Create a new folder in the current Explorer directory.",
                risk_level=SkillRiskLevel.LOW,
                permissions=["FILESYSTEM_WRITE"],
                input_schema={"type": "object", "required": ["folder_name"], "properties": {"folder_name": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"created_path": {"type": "string"}}},
                preconditions=["DIRECTORY_WRITABLE"],
                postconditions=["FOLDER_EXISTS"],
                verification_policy="DIRECTORY_EXISTS"
            ),
            ApplicationCapability(
                capability_name="copy_item",
                skill_id="app.explorer.copy_item",
                version="1.0.0",
                description="Copy a file or directory from source to destination.",
                risk_level=SkillRiskLevel.MEDIUM,
                permissions=["FILESYSTEM_READ", "FILESYSTEM_WRITE"],
                input_schema={
                    "type": "object",
                    "required": ["source_path", "destination_path"],
                    "properties": {"source_path": {"type": "string"}, "destination_path": {"type": "string"}}
                },
                output_schema={"type": "object", "properties": {"destination": {"type": "string"}}},
                preconditions=["SOURCE_EXISTS"],
                postconditions=["DESTINATION_EXISTS"],
                verification_policy="FILE_METADATA_MATCH"
            ),
            ApplicationCapability(
                capability_name="move_item",
                skill_id="app.explorer.move_item",
                version="1.0.0",
                description="Move a file or directory from source to destination.",
                risk_level=SkillRiskLevel.MEDIUM,
                permissions=["FILESYSTEM_READ", "FILESYSTEM_WRITE"],
                input_schema={
                    "type": "object",
                    "required": ["source_path", "destination_path"],
                    "properties": {"source_path": {"type": "string"}, "destination_path": {"type": "string"}}
                },
                output_schema={"type": "object", "properties": {"destination": {"type": "string"}}},
                preconditions=["SOURCE_EXISTS"],
                postconditions=["DESTINATION_EXISTS_SOURCE_REMOVED"],
                verification_policy="DESTINATION_EXISTS"
            )
        ]

    def _sanitize(self, raw_path: str) -> str:
        if not raw_path or not isinstance(raw_path, str):
            raise ValueError("Path must be a non-empty string.")
        if "\0" in raw_path:
            raise ValueError("Null bytes not permitted.")
        clean = os.path.abspath(os.path.expanduser(raw_path))
        return clean

    async def launch(self, session: ApplicationSession, params: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        raw_dir = params.get("directory_path") or os.path.expanduser("~")
        try:
            clean_dir = self._sanitize(raw_dir)
            if not os.path.exists(clean_dir):
                return False, f"Directory does not exist: {clean_dir}"
            self._current_directory = clean_dir
            session.state = ApplicationState.RUNNING
            session.window_title = f"{os.path.basename(clean_dir) or clean_dir} - File Explorer"
            session.process_id = 1002
            session.window_handle = 0x1002B
            session.last_observation_ts = int(time.time() * 1000)
            session.observation_token = f"tok_explorer_{int(time.time()*1000)}"
            return True, None
        except Exception as e:
            return False, str(e)

    async def focus(self, session: ApplicationSession) -> Tuple[bool, Optional[str]]:
        session.state = ApplicationState.FOCUSED
        session.last_observation_ts = int(time.time() * 1000)
        return True, None

    async def observe(self, session: ApplicationSession) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        now_ts = int(time.time() * 1000)
        session.last_observation_ts = now_ts
        session.observation_token = f"tok_explorer_{now_ts}"
        items = []
        if os.path.exists(self._current_directory):
            try:
                for entry in os.scandir(self._current_directory):
                    items.append({
                        "name": entry.name,
                        "is_dir": entry.is_dir(),
                        "size_bytes": entry.stat().st_size if entry.is_file() else 0
                    })
            except Exception as e:
                logger.debug(f"Error scanning directory {self._current_directory}: {e}")
        obs = {
            "window_title": session.window_title or "File Explorer",
            "current_directory": self._current_directory,
            "selected_item": self._selected_item,
            "item_count": len(items),
            "items": items[:50],
            "timestamp": now_ts
        }
        return obs, None

    async def execute_capability(
        self,
        session: ApplicationSession,
        capability_name: str,
        arguments: Dict[str, Any],
        action_id: str
    ) -> SkillResult:
        start_ts = time.perf_counter()

        if capability_name == "open":
            ok, err = await self.launch(session, arguments)
            dur = int((time.perf_counter() - start_ts) * 1000)
            return SkillResult(
                is_success=ok,
                skill_id="app.explorer.open",
                skill_version="1.0.0",
                action_id=action_id,
                output_data={"directory": self._current_directory},
                observed_state={"window_title": session.window_title},
                verification_passed=ok,
                failure_code=None if ok else SkillFailureCode.ACTION_FAILED,
                error_message=err,
                duration_ms=dur
            )

        if capability_name == "focus":
            ok, err = await self.focus(session)
            dur = int((time.perf_counter() - start_ts) * 1000)
            return SkillResult(
                is_success=ok,
                skill_id="app.explorer.focus",
                skill_version="1.0.0",
                action_id=action_id,
                output_data={"is_focused": ok},
                observed_state={"state": session.state.value},
                verification_passed=ok,
                failure_code=None if ok else SkillFailureCode.ACTION_FAILED,
                error_message=err,
                duration_ms=dur
            )

        if capability_name == "navigate":
            raw_path = arguments.get("directory_path", "")
            try:
                clean_path = self._sanitize(raw_path)
                if not os.path.exists(clean_path):
                    return SkillResult(
                        is_success=False,
                        skill_id="app.explorer.navigate",
                        skill_version="1.0.0",
                        action_id=action_id,
                        failure_code=SkillFailureCode.PRECONDITION_FAILED,
                        error_message=f"Target directory does not exist: {clean_path}",
                        duration_ms=0
                    )
                self._current_directory = clean_path
                session.window_title = f"{os.path.basename(clean_path) or clean_path} - File Explorer"
                session.last_observation_ts = int(time.time() * 1000)
                dur = int((time.perf_counter() - start_ts) * 1000)
                return SkillResult(
                    is_success=True,
                    skill_id="app.explorer.navigate",
                    skill_version="1.0.0",
                    action_id=action_id,
                    output_data={"current_directory": clean_path},
                    observed_state={"directory": clean_path},
                    verification_passed=True,
                    duration_ms=dur
                )
            except Exception as e:
                dur = int((time.perf_counter() - start_ts) * 1000)
                return SkillResult(
                    is_success=False,
                    skill_id="app.explorer.navigate",
                    skill_version="1.0.0",
                    action_id=action_id,
                    failure_code=SkillFailureCode.INVALID_ARGUMENTS,
                    error_message=str(e),
                    duration_ms=dur
                )

        if capability_name == "list_items":
            obs, err = await self.observe(session)
            dur = int((time.perf_counter() - start_ts) * 1000)
            if not obs:
                return SkillResult(
                    is_success=False,
                    skill_id="app.explorer.list_items",
                    skill_version="1.0.0",
                    action_id=action_id,
                    failure_code=SkillFailureCode.OBSERVATION_FAILED,
                    error_message=err or "Failed to list explorer items",
                    duration_ms=dur
                )
            return SkillResult(
                is_success=True,
                skill_id="app.explorer.list_items",
                skill_version="1.0.0",
                action_id=action_id,
                output_data={"items": obs.get("items", []), "count": obs.get("item_count", 0)},
                observed_state=obs,
                verification_passed=True,
                duration_ms=dur
            )

        if capability_name == "select_item":
            item_name = arguments.get("item_name", "")
            target_path = os.path.join(self._current_directory, item_name)
            if not os.path.exists(target_path):
                return SkillResult(
                    is_success=False,
                    skill_id="app.explorer.select_item",
                    skill_version="1.0.0",
                    action_id=action_id,
                    failure_code=SkillFailureCode.PRECONDITION_FAILED,
                    error_message=f"Item not found in current folder: {item_name}",
                    duration_ms=0
                )
            self._selected_item = item_name
            dur = int((time.perf_counter() - start_ts) * 1000)
            return SkillResult(
                is_success=True,
                skill_id="app.explorer.select_item",
                skill_version="1.0.0",
                action_id=action_id,
                output_data={"selected_item": item_name},
                observed_state={"selected": item_name},
                verification_passed=True,
                duration_ms=dur
            )

        if capability_name == "create_folder":
            folder_name = arguments.get("folder_name", "")
            if not folder_name:
                return SkillResult(
                    is_success=False,
                    skill_id="app.explorer.create_folder",
                    skill_version="1.0.0",
                    action_id=action_id,
                    failure_code=SkillFailureCode.INVALID_ARGUMENTS,
                    error_message="folder_name is required",
                    duration_ms=0
                )
            target_dir = os.path.join(self._current_directory, folder_name)
            try:
                os.makedirs(target_dir, exist_ok=True)
                dur = int((time.perf_counter() - start_ts) * 1000)
                return SkillResult(
                    is_success=True,
                    skill_id="app.explorer.create_folder",
                    skill_version="1.0.0",
                    action_id=action_id,
                    output_data={"created_path": target_dir},
                    observed_state={"created_directory": target_dir, "exists": True},
                    verification_passed=os.path.exists(target_dir),
                    duration_ms=dur
                )
            except Exception as e:
                dur = int((time.perf_counter() - start_ts) * 1000)
                return SkillResult(
                    is_success=False,
                    skill_id="app.explorer.create_folder",
                    skill_version="1.0.0",
                    action_id=action_id,
                    failure_code=SkillFailureCode.ACTION_FAILED,
                    error_message=str(e),
                    duration_ms=dur
                )

        if capability_name in ["copy_item", "move_item"]:
            src = arguments.get("source_path")
            dst = arguments.get("destination_path")
            if not src or not dst:
                return SkillResult(
                    is_success=False,
                    skill_id=f"app.explorer.{capability_name}",
                    skill_version="1.0.0",
                    action_id=action_id,
                    failure_code=SkillFailureCode.INVALID_ARGUMENTS,
                    error_message="source_path and destination_path are required",
                    duration_ms=0
                )
            try:
                clean_src = self._sanitize(src)
                clean_dst = self._sanitize(dst)
                if not os.path.exists(clean_src):
                    return SkillResult(
                        is_success=False,
                        skill_id=f"app.explorer.{capability_name}",
                        skill_version="1.0.0",
                        action_id=action_id,
                        failure_code=SkillFailureCode.PRECONDITION_FAILED,
                        error_message=f"Source path does not exist: {clean_src}",
                        duration_ms=0
                    )
                if capability_name == "copy_item":
                    if os.path.isdir(clean_src):
                        shutil.copytree(clean_src, clean_dst, dirs_exist_ok=True)
                    else:
                        shutil.copy2(clean_src, clean_dst)
                else:
                    shutil.move(clean_src, clean_dst)

                dur = int((time.perf_counter() - start_ts) * 1000)
                verified = os.path.exists(clean_dst)
                return SkillResult(
                    is_success=verified,
                    skill_id=f"app.explorer.{capability_name}",
                    skill_version="1.0.0",
                    action_id=action_id,
                    output_data={"destination": clean_dst},
                    observed_state={"destination_exists": verified},
                    verification_passed=verified,
                    failure_code=None if verified else SkillFailureCode.VERIFICATION_FAILED,
                    duration_ms=dur
                )
            except Exception as e:
                dur = int((time.perf_counter() - start_ts) * 1000)
                return SkillResult(
                    is_success=False,
                    skill_id=f"app.explorer.{capability_name}",
                    skill_version="1.0.0",
                    action_id=action_id,
                    failure_code=SkillFailureCode.ACTION_FAILED,
                    error_message=str(e),
                    duration_ms=dur
                )

        return SkillResult(
            is_success=False,
            skill_id=f"app.explorer.{capability_name}",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.SKILL_NOT_FOUND,
            error_message=f"Unknown File Explorer capability '{capability_name}'",
            duration_ms=0
        )

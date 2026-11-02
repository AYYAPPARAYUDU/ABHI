"""Dynamic Path and Environmental Resolution Utilities for ABHI.

Ensures zero hardcoded user directories, zero hardcoded drive paths,
and seamless codebase mobility across any user, drive, or operating system.
"""

import os
import shutil
import sys
from pathlib import Path
from typing import List, Optional, Union


def get_project_root() -> Path:
    """Dynamically determine the root directory of the ABHI project.
    
    Precedence:
    1. ABHI_ROOT environment variable (if explicitly set and existing).
    2. Computed parent path relative to this file: backend/app/core/paths.py -> ABHI root.
    3. Fallback to current working directory if it contains markers like 'backend' or 'project_data'.
    """
    env_root = os.environ.get("ABHI_ROOT")
    if env_root and os.path.isdir(env_root):
        return Path(env_root).resolve()

    # Relative to backend/app/core/paths.py (4 levels up to project root)
    computed = Path(__file__).resolve().parents[3]
    if (computed / "backend").exists() or (computed / "project_data").exists():
        return computed

    # Fallback inspection of current working directory
    cwd = Path.cwd().resolve()
    if (cwd / "backend").exists() or (cwd / "project_data").exists():
        return cwd

    # Check parent of cwd
    if (cwd.parent / "backend").exists():
        return cwd.parent

    return computed


PROJECT_ROOT = get_project_root()


def get_system_drive() -> str:
    """Return the system root drive letter with trailing slash or '/' on POSIX."""
    if os.name == "nt":
        drive = os.environ.get("SystemDrive", "C:")
        if not drive.endswith("\\"):
            drive += "\\"
        return drive
    return "/"


def find_browser_executable(browser_name: str) -> Optional[str]:
    """Dynamically locate browser executables across system paths and environment."""
    b = browser_name.lower().strip()
    
    if "chrome" in b:
        which_chrome = shutil.which("chrome") or shutil.which("google-chrome") or shutil.which("chrome.exe")
        if which_chrome and os.path.exists(which_chrome):
            return which_chrome

        prog_files = os.environ.get("ProgramFiles", r"C:\Program Files")
        prog_files_x86 = os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")
        local_app_data = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")

        candidates = [
            os.path.join(prog_files, "Google", "Chrome", "Application", "chrome.exe"),
            os.path.join(prog_files_x86, "Google", "Chrome", "Application", "chrome.exe"),
            os.path.join(local_app_data, "Google", "Chrome", "Application", "chrome.exe"),
        ]
        for c in candidates:
            if os.path.exists(c):
                return c
        return "chrome.exe"

    if "edge" in b:
        which_edge = shutil.which("msedge") or shutil.which("msedge.exe")
        if which_edge and os.path.exists(which_edge):
            return which_edge

        prog_files = os.environ.get("ProgramFiles", r"C:\Program Files")
        prog_files_x86 = os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")

        candidates = [
            os.path.join(prog_files_x86, "Microsoft", "Edge", "Application", "msedge.exe"),
            os.path.join(prog_files, "Microsoft", "Edge", "Application", "msedge.exe"),
        ]
        for c in candidates:
            if os.path.exists(c):
                return c
        return "msedge.exe"

    return None


def find_adb_candidates() -> List[str]:
    """Dynamically compute candidate adb.exe locations without any user-specific hardcoding."""
    user_home = Path.home()
    local_app_data = os.environ.get("LOCALAPPDATA") or str(user_home / "AppData" / "Local")
    android_home = os.environ.get("ANDROID_HOME")
    android_sdk_root = os.environ.get("ANDROID_SDK_ROOT")
    sys_drive = get_system_drive().rstrip(r"\/")

    candidates: List[str] = []

    if android_home:
        candidates.append(os.path.join(android_home, "platform-tools", "adb.exe" if os.name == "nt" else "adb"))
    if android_sdk_root:
        candidates.append(os.path.join(android_sdk_root, "platform-tools", "adb.exe" if os.name == "nt" else "adb"))

    candidates.extend([
        str(user_home / "platform-tools" / "platform-tools" / ("adb.exe" if os.name == "nt" else "adb")),
        str(user_home / "platform-tools" / ("adb.exe" if os.name == "nt" else "adb")),
        os.path.join(local_app_data, "Android", "Sdk", "platform-tools", "adb.exe" if os.name == "nt" else "adb"),
        os.path.join(f"{sys_drive}\\", "platform-tools", "adb.exe"),
        "/usr/bin/adb",
        "/usr/local/bin/adb",
    ])
    return candidates

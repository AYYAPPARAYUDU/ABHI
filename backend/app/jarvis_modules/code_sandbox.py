"""
Complex Code Sandbox & Autonomous Debugger Engine
Allows the AI Clone and JARVIS to write, test, execute, and debug complex multi-language code.
"""

import sys
import os
import subprocess
import tempfile
import time
import json
import traceback
from typing import Dict, Any, List

class CodeSandbox:
    def __init__(self):
        self.supported_languages = ["python", "javascript", "bash", "powershell", "json"]

    def execute_code(self, language: str, code: str, timeout: int = 15) -> Dict[str, Any]:
        """
        Executes code safely in a dedicated subprocess sandbox and captures execution output.
        """
        lang = language.lower().strip()
        start_time = time.time()
        
        try:
            if lang in ["python", "py"]:
                with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding="utf-8") as f:
                    f.write(code)
                    tmp_file = f.name

                cmd = [sys.executable, tmp_file]
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=timeout,
                    encoding="utf-8",
                    errors="replace"
                )
                try:
                    os.unlink(tmp_file)
                except Exception:
                    pass

                exec_time_ms = round((time.time() - start_time) * 1000, 2)
                return {
                    "language": "python",
                    "success": result.returncode == 0,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "exit_code": result.returncode,
                    "execution_time_ms": exec_time_ms,
                    "has_error": result.returncode != 0
                }

            elif lang in ["javascript", "js", "node"]:
                with tempfile.NamedTemporaryFile(mode="w", suffix=".js", delete=False, encoding="utf-8") as f:
                    f.write(code)
                    tmp_file = f.name

                cmd = ["node", tmp_file]
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=timeout,
                    encoding="utf-8",
                    errors="replace"
                )
                try:
                    os.unlink(tmp_file)
                except Exception:
                    pass

                exec_time_ms = round((time.time() - start_time) * 1000, 2)
                return {
                    "language": "javascript",
                    "success": result.returncode == 0,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "exit_code": result.returncode,
                    "execution_time_ms": exec_time_ms,
                    "has_error": result.returncode != 0
                }

            elif lang in ["bash", "sh", "powershell", "ps1"]:
                if sys.platform == "win32":
                    cmd = ["powershell", "-NoProfile", "-Command", code]
                else:
                    cmd = ["bash", "-c", code]
                    
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=timeout,
                    encoding="utf-8",
                    errors="replace"
                )
                exec_time_ms = round((time.time() - start_time) * 1000, 2)
                return {
                    "language": lang,
                    "success": result.returncode == 0,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "exit_code": result.returncode,
                    "execution_time_ms": exec_time_ms,
                    "has_error": result.returncode != 0
                }
            else:
                return {
                    "language": lang,
                    "success": False,
                    "stdout": "",
                    "stderr": f"Unsupported language '{lang}'. Supported: {self.supported_languages}",
                    "exit_code": 1,
                    "execution_time_ms": 0,
                    "has_error": True
                }

        except subprocess.TimeoutExpired:
            return {
                "language": lang,
                "success": False,
                "stdout": "",
                "stderr": f"Execution timed out after {timeout} seconds.",
                "exit_code": -1,
                "execution_time_ms": round((time.time() - start_time) * 1000, 2),
                "has_error": True
            }
        except Exception as e:
            return {
                "language": lang,
                "success": False,
                "stdout": "",
                "stderr": f"Execution error: {str(e)}\n{traceback.format_exc()}",
                "exit_code": -1,
                "execution_time_ms": round((time.time() - start_time) * 1000, 2),
                "has_error": True
            }

code_sandbox = CodeSandbox()

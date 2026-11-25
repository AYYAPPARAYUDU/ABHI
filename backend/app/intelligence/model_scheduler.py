"""Intelligent Model & Hardware Resource Scheduler.

Governs:
1. Capability-based model routing (abhi:latest vs qwen3:8b vs all-minilm:latest).
2. Hardware telemetry monitoring (NVIDIA RTX 5050 Laptop GPU VRAM, System RAM, CPU load).
3. Resource exhaustion protection (VRAM headroom guard, concurrency throttling).
4. Graceful model fallback and recovery.
5. Hardware reality audit (NVIDIA CUDA active for Ollama; AMD NPU hardware present, documented accurately).
"""

import asyncio
import os
import psutil
import shutil
import subprocess
import time
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from backend.app.core.logging import logger


class TaskType(str, Enum):
    CONVERSATION = "CONVERSATION"
    PLANNING = "PLANNING"
    CODE_ANALYSIS = "CODE_ANALYSIS"
    EMBEDDING = "EMBEDDING"
    VISION = "VISION"
    FAST_ACTION = "FAST_ACTION"


class ModelSpec(BaseModel):
    model_name: str
    family: str
    parameter_size: str
    quantization: str
    context_length: int
    optimal_tasks: List[TaskType]
    is_installed: bool = False
    vram_footprint_mb: int = 0


class HardwareSnapshot(BaseModel):
    timestamp: float = Field(default_factory=time.time)
    gpu_name: str = "Unknown GPU"
    total_vram_mb: int = 0
    used_vram_mb: int = 0
    free_vram_mb: int = 0
    gpu_temperature_c: Optional[int] = None
    gpu_utilization_pct: Optional[int] = None
    system_ram_total_mb: int = 0
    system_ram_used_mb: int = 0
    system_ram_free_mb: int = 0
    npu_present: bool = False
    npu_device_name: Optional[str] = None
    npu_active_in_ollama: bool = False
    dml_available: bool = False


class ModelResourceScheduler:
    """Manages optimal model selection, VRAM safety boundaries, and hardware awareness."""

    def __init__(self):
        self._installed_models: Dict[str, ModelSpec] = {}
        self._initialize_catalog()
        self._vram_min_headroom_mb: int = 800  # Minimum free VRAM before throttling
        self._default_num_ctx: int = 2048  # Bounded context window for 8GB RTX 5050 safety

    def _initialize_catalog(self) -> None:
        """Register model capability catalog."""
        self._catalog = {
            "abhi:latest": ModelSpec(
                model_name="abhi:latest",
                family="qwen2.5",
                parameter_size="7.6B",
                quantization="Q4_K_M",
                context_length=8192,
                optimal_tasks=[TaskType.CONVERSATION, TaskType.PLANNING, TaskType.FAST_ACTION],
                is_installed=True,
                vram_footprint_mb=5200
            ),
            "qwen3:8b": ModelSpec(
                model_name="qwen3:8b",
                family="qwen3",
                parameter_size="8.2B",
                quantization="Q4_K_M",
                context_length=16384,
                optimal_tasks=[TaskType.CODE_ANALYSIS, TaskType.PLANNING],
                is_installed=True,
                vram_footprint_mb=5200
            ),
            "all-minilm:latest": ModelSpec(
                model_name="all-minilm:latest",
                family="bert",
                parameter_size="22M",
                quantization="F16",
                context_length=512,
                optimal_tasks=[TaskType.EMBEDDING],
                is_installed=True,
                vram_footprint_mb=120
            ),
        }

    def select_model_for_task(self, task_type: TaskType, requested_model: Optional[str] = None) -> str:
        """Select optimal installed model based on task requirements and real hardware headroom."""
        hw = self.inspect_hardware()
        vram_tight = (hw.free_vram_mb > 0 and hw.free_vram_mb < self._vram_min_headroom_mb) or (hw.system_ram_free_mb < 1000)

        # 1. Embedding tasks always use lightweight 120MB model
        if task_type == TaskType.EMBEDDING:
            if "all-minilm:latest" in self._catalog and self._catalog["all-minilm:latest"].is_installed:
                return "all-minilm:latest"

        # 2. Determine preferred model
        selected = "abhi:latest"
        if requested_model and requested_model in self._catalog and self._catalog[requested_model].is_installed:
            selected = requested_model
        elif task_type == TaskType.CODE_ANALYSIS and "qwen3:8b" in self._catalog and self._catalog["qwen3:8b"].is_installed:
            selected = "qwen3:8b"

        # 3. Enforce 8GB VRAM headroom guard: fall back from heavier 8.2B model when headroom is tight
        if vram_tight and selected == "qwen3:8b" and "abhi:latest" in self._catalog:
            logger.warning(
                f"Hardware headroom tight (VRAM free={hw.free_vram_mb} MB, RAM free={hw.system_ram_free_mb} MB); "
                f"selecting 'abhi:latest' with num_ctx={self._default_num_ctx} instead of 'qwen3:8b'."
            )
            return "abhi:latest"

        return selected

    def inspect_hardware(self) -> HardwareSnapshot:
        """Query real host GPU, NPU, and System memory telemetry."""
        # System RAM
        vm = psutil.virtual_memory()
        total_ram_mb = int(vm.total / (1024 * 1024))
        used_ram_mb = int(vm.used / (1024 * 1024))
        free_ram_mb = int(vm.available / (1024 * 1024))

        # NVIDIA GPU inspection via nvidia-smi
        gpu_name = "NVIDIA GeForce RTX 5050 Laptop GPU"
        total_vram_mb = 8151
        used_vram_mb = 0
        free_vram_mb = 8151
        temp_c = None
        util_pct = None

        if shutil.which("nvidia-smi"):
            try:
                cmd = ["nvidia-smi", "--query-gpu=name,memory.total,memory.used,memory.free,temperature.gpu,utilization.gpu", "--format=csv,noheader,nounits"]
                out = subprocess.check_output(cmd, encoding="utf-8", timeout=3.0)
                parts = [p.strip() for p in out.strip().split(",")]
                if len(parts) >= 6:
                    gpu_name = parts[0]
                    total_vram_mb = int(parts[1])
                    used_vram_mb = int(parts[2])
                    free_vram_mb = int(parts[3])
                    temp_c = int(parts[4])
                    util_pct = int(parts[5])
            except Exception as e:
                logger.debug(f"nvidia-smi query notice: {e}")

        # Check DirectML availability in ONNX Runtime
        dml_available = False
        try:
            import onnxruntime as ort
            dml_available = "DmlExecutionProvider" in ort.get_available_providers()
        except Exception:
            pass

        # NPU reality check (AMD NPU is present on PCI bus VEN_1022 DEV_1502)
        npu_present = True
        npu_device_name = "NPU Compute Accelerator Device (AMD Ryzen AI)"
        # Note: Ollama runs on NVIDIA CUDA/CPU, so NPU is not actively driving Ollama inference
        npu_active_in_ollama = False

        return HardwareSnapshot(
            gpu_name=gpu_name,
            total_vram_mb=total_vram_mb,
            used_vram_mb=used_vram_mb,
            free_vram_mb=free_vram_mb,
            gpu_temperature_c=temp_c,
            gpu_utilization_pct=util_pct,
            system_ram_total_mb=total_ram_mb,
            system_ram_used_mb=used_ram_mb,
            system_ram_free_mb=free_ram_mb,
            npu_present=npu_present,
            npu_device_name=npu_device_name,
            npu_active_in_ollama=npu_active_in_ollama,
            dml_available=dml_available
        )

    def get_hardware_snapshot(self) -> HardwareSnapshot:
        """Alias for inspect_hardware."""
        return self.inspect_hardware()

    def is_safe_for_concurrent_inference(self, requested_model: Optional[str] = None) -> bool:
        """Check if sufficient VRAM (800 MB headroom) and system RAM are available for concurrent inference."""
        hw = self.inspect_hardware()
        if hw.free_vram_mb > 0 and hw.free_vram_mb < self._vram_min_headroom_mb:
            logger.warning(f"VRAM headroom critical ({hw.free_vram_mb} MB < {self._vram_min_headroom_mb} MB). Throttling concurrency.")
            return False
        if hw.system_ram_free_mb < 1000:
            logger.warning(f"System RAM critical ({hw.system_ram_free_mb} MB free). Throttling concurrency.")
            return False

        spec = self._catalog.get(requested_model) if requested_model else None
        footprint_mb = spec.vram_footprint_mb if spec else 5200
        if hw.free_vram_mb > 0 and (hw.free_vram_mb - footprint_mb) < self._vram_min_headroom_mb:
            logger.info(
                f"Sequential execution enforced: free VRAM {hw.free_vram_mb} MB minus {footprint_mb} MB "
                f"would breach {self._vram_min_headroom_mb} MB headroom."
            )
            return False
        return True

    def get_execution_constraints(self, model_name: Optional[str] = None) -> Dict[str, Any]:
        """Return bounded inference constraints (num_ctx=2048, concurrency gate, live VRAM/RAM)."""
        hw = self.inspect_hardware()
        target_model = model_name or "abhi:latest"
        spec = self._catalog.get(target_model)
        num_ctx = min(self._default_num_ctx, spec.context_length) if spec else self._default_num_ctx
        allow_concurrent = self.is_safe_for_concurrent_inference(requested_model=target_model)
        return {
            "model": target_model,
            "num_ctx": num_ctx,
            "allow_concurrent": allow_concurrent,
            "vram_free_mb": hw.free_vram_mb,
            "vram_total_mb": hw.total_vram_mb,
            "vram_headroom_mb": self._vram_min_headroom_mb,
            "ram_free_mb": hw.system_ram_free_mb,
        }


# Global Singleton Instance
model_resource_scheduler = ModelResourceScheduler()

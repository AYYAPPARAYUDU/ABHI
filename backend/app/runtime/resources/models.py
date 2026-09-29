"""Resource & Model Lifecycle Domain Models, Enums, and Contracts for Phase 7 Stage 7.6.

Defines deterministic data models for:
- Resource Types & Ledgers (CPU, RAM, GPU, VRAM, NPU, Processes, Storage)
- Workload Priorities & Admission Leases
- Hardware Inventory & Versioned Profiles
- Model Lifecycle States, Cache Records, & Device Selection
- Managed Worker Processes & Orphan Detection Records
- Operating Modes (BALANCED, PERFORMANCE, CONSERVATIVE, RESOURCE_SAVER)
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
import time
import uuid


class ResourceType(str, Enum):
    CPU = "CPU"
    RAM = "RAM"
    GPU = "GPU"
    VRAM = "VRAM"
    NPU = "NPU"
    PROCESS = "PROCESS"
    BROWSER = "BROWSER"
    MODEL_CONTEXT = "MODEL_CONTEXT"
    STORAGE = "STORAGE"


class WorkloadPriority(int, Enum):
    P0_EMERGENCY_SAFETY = 100
    P1_INTERACTIVE_USER = 90
    P2_ACTIVE_TASK = 80
    P3_ACTIVE_PERCEPTION = 70
    P4_BACKGROUND_INDEXING = 50
    P5_EVALUATION = 40
    P6_CANDIDATE_EXPERIMENT = 30
    P7_OPTIONAL_MAINTENANCE = 10


class ResourcePressureLevel(str, Enum):
    NORMAL = "NORMAL"
    ELEVATED = "ELEVATED"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ModelRuntimeState(str, Enum):
    DISCOVERED = "DISCOVERED"
    REGISTERED = "REGISTERED"
    AVAILABLE = "AVAILABLE"
    LOADING = "LOADING"
    LOADED = "LOADED"
    WARM = "WARM"
    IN_USE = "IN_USE"
    IDLE = "IDLE"
    EVICTING = "EVICTING"
    EVICTED = "EVICTED"
    FAILED = "FAILED"
    QUARANTINED = "QUARANTINED"


class ModelHealthState(str, Enum):
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    FAILED = "FAILED"
    QUARANTINED = "QUARANTINED"


class DeviceType(str, Enum):
    CPU = "CPU"
    GPU = "GPU"
    NPU = "NPU"
    REJECT = "REJECT"


class NpuStatus(str, Enum):
    DETECTED = "DETECTED"
    AVAILABLE = "AVAILABLE"
    USABLE = "USABLE"
    UNSUPPORTED = "UNSUPPORTED"
    UNAVAILABLE = "UNAVAILABLE"


class OperatingMode(str, Enum):
    BALANCED = "BALANCED"
    PERFORMANCE = "PERFORMANCE"
    CONSERVATIVE = "CONSERVATIVE"
    RESOURCE_SAVER = "RESOURCE_SAVER"


class ProcessState(str, Enum):
    STARTING = "STARTING"
    RUNNING = "RUNNING"
    IDLE = "IDLE"
    STOPPING = "STOPPING"
    STOPPED = "STOPPED"
    FAILED = "FAILED"
    ORPHANED = "ORPHANED"


class LeaseState(str, Enum):
    REQUESTED = "REQUESTED"
    GRANTED = "GRANTED"
    ACTIVE = "ACTIVE"
    RENEWED = "RENEWED"
    PREEMPTED = "PREEMPTED"
    EXPIRED = "EXPIRED"
    RELEASED = "RELEASED"
    DENIED = "DENIED"


class DataProvenance(str, Enum):
    ACTUAL = "ACTUAL"
    MEASURED = "MEASURED"
    ESTIMATED = "ESTIMATED"
    SIMULATED = "SIMULATED"
    MOCKED = "MOCKED"


class DegradedMode(str, Enum):
    FULL_CAPABILITY = "FULL_CAPABILITY"
    REDUCED_GPU = "REDUCED_GPU"
    CPU_ONLY = "CPU_ONLY"
    NO_LLM = "NO_LLM"
    NO_VISION = "NO_VISION"
    NO_TTS = "NO_TTS"
    EMERGENCY_RESOURCE_MODE = "EMERGENCY_RESOURCE_MODE"


# --- Resource Profiles & Requests ---

class ResourceProfile(BaseModel):
    """Declared or measured resource footprint for a workload or model."""
    cpu_percent: float = Field(default=10.0, description="Estimated/measured CPU cores/percentage")
    ram_mb: float = Field(default=512.0, description="System RAM requirement in MB")
    vram_mb: float = Field(default=0.0, description="GPU VRAM requirement in MB")
    gpu_compute_percent: float = Field(default=0.0, description="Target GPU compute utilization")
    npu_compute_percent: float = Field(default=0.0, description="Target NPU compute utilization")
    storage_mb: float = Field(default=0.0, description="Required disk storage headroom in MB")
    process_count: int = Field(default=1, description="Number of OS processes required")
    browser_pages: int = Field(default=0, description="Number of concurrent Playwright pages")
    context_tokens: int = Field(default=0, description="Model context length requested")
    provenance: DataProvenance = Field(default=DataProvenance.ESTIMATED, description="Measurement provenance")


class ResourceLease(BaseModel):
    """Guaranteed, bounded allocation lease for a resource."""
    lease_id: str = Field(default_factory=lambda: f"lease_{uuid.uuid4().hex[:10]}")
    owner_type: str = Field(..., description="task, execution, worker, model, inference, training_candidate")
    owner_id: str = Field(..., description="Unique ID of owner (e.g. task_id, execution_id, model_id)")
    resource_type: ResourceType
    requested_amount: float
    granted_amount: float
    created_at: float = Field(default_factory=time.time)
    expires_at: float
    priority: WorkloadPriority = WorkloadPriority.P2_ACTIVE_TASK
    state: LeaseState = LeaseState.GRANTED
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def is_expired(self, current_time: Optional[float] = None) -> bool:
        t = current_time or time.time()
        return t >= self.expires_at


class ResourceLedgerEntry(BaseModel):
    """Accounting entry for a specific resource type."""
    resource_type: ResourceType
    unit: str = "MB"
    total: float = 0.0
    reserved: float = 0.0
    allocated: float = 0.0
    free: float = 0.0
    requested: float = 0.0
    denied_count: int = 0
    released_count: int = 0
    provenance: DataProvenance = DataProvenance.MEASURED


class WorkloadRequest(BaseModel):
    """Inbound resource admission request."""
    request_id: str = Field(default_factory=lambda: f"req_{uuid.uuid4().hex[:10]}")
    owner_type: str = "task"
    owner_id: str
    workload_name: str
    priority: WorkloadPriority = WorkloadPriority.P2_ACTIVE_TASK
    resource_profile: ResourceProfile
    target_device: Optional[DeviceType] = None
    timeout_sec: float = 30.0
    status: LeaseState = LeaseState.REQUESTED
    granted_leases: List[str] = Field(default_factory=list)
    denial_reason: Optional[str] = None
    created_at: float = Field(default_factory=time.time)


# --- Hardware Discovery & Inventory ---

class HardwareInventory(BaseModel):
    """Runtime detected hardware inventory."""
    captured_at: float = Field(default_factory=time.time)
    os_name: str = "Windows"
    os_version: str = "11"
    os_build: str = "10.0.26200"
    cpu_model: str = "AMD Ryzen 7 260 w/ Radeon 780M Graphics"
    cpu_physical_cores: int = 8
    cpu_logical_cores: int = 16
    cpu_utilization_percent: float = 0.0
    ram_total_mb: float = 24425.0
    ram_available_mb: float = 16000.0
    ram_used_mb: float = 8425.0
    ram_utilization_percent: float = 34.5
    gpu_detected: bool = True
    gpu_model: str = "NVIDIA GeForce RTX 5050 Laptop GPU"
    gpu_vram_total_mb: float = 8151.0
    gpu_vram_used_mb: float = 1200.0
    gpu_vram_free_mb: float = 6951.0
    gpu_utilization_percent: float = 5.0
    gpu_driver_version: str = "592.82"
    gpu_cuda_version: str = "13.1"
    gpu_temperature_c: Optional[float] = 48.0
    igpu_model: Optional[str] = "AMD Radeon 780M Graphics"
    npu_present: bool = False
    npu_status: NpuStatus = NpuStatus.UNSUPPORTED
    npu_driver_version: Optional[str] = None
    npu_runtime_support: str = "NONE_AVAILABLE"
    storage_primary_total_mb: float = 522720.0  # C:
    storage_primary_free_mb: float = 326450.0
    storage_secondary_total_mb: Optional[float] = 452597.0  # E:
    storage_secondary_free_mb: Optional[float] = 441169.0
    provenance: DataProvenance = DataProvenance.MEASURED


class HardwareProfile(BaseModel):
    """Versioned hardware profile snapshot for provenance and scheduling decisions."""
    profile_id: str = Field(default_factory=lambda: f"hw_prof_{uuid.uuid4().hex[:8]}")
    version: int = 1
    captured_at: str
    inventory: HardwareInventory
    supported_devices: List[DeviceType] = Field(default_factory=lambda: [DeviceType.GPU, DeviceType.CPU])
    max_safe_vram_mb: float = 6500.0  # Total 8151 - Reserve 1000 - Margin 651
    max_safe_ram_mb: float = 18000.0  # Total 24425 - Reserve 6425
    thermal_throttling: bool = False


# --- Model Management & Instances ---

class ModelInstanceRecord(BaseModel):
    """Runtime model instance tracked in memory/cache."""
    instance_id: str = Field(default_factory=lambda: f"inst_{uuid.uuid4().hex[:8]}")
    model_id: str
    model_tag: str
    model_digest: str
    format: str = "GGUF"
    quantization: str = "Q4_K_M"
    parameter_count: str = "8B"
    context_length: int = 8192
    runtime: str = "Ollama-Local"
    resource_profile: ResourceProfile
    supported_backends: List[str] = Field(default_factory=lambda: ["OLLAMA"])
    supported_devices: List[DeviceType] = Field(default_factory=lambda: [DeviceType.GPU, DeviceType.CPU])
    state: ModelRuntimeState = ModelRuntimeState.REGISTERED
    health: ModelHealthState = ModelHealthState.HEALTHY
    device: DeviceType = DeviceType.GPU
    loaded_at: Optional[float] = None
    last_used: Optional[float] = None
    use_count: int = 0
    estimated_memory_mb: float = 5200.0
    actual_memory_mb: Optional[float] = None
    prompt_tokens_processed: int = 0
    generated_tokens_produced: int = 0
    estimated_kv_cache_mb: float = 450.0
    actual_kv_cache_mb: Optional[float] = None
    is_production: bool = False
    is_candidate: bool = False
    is_warm: bool = False
    failure_count: int = 0
    quarantine_reason: Optional[str] = None
    error_message: Optional[str] = None


# --- Process & Worker Records ---

class WorkerProcessRecord(BaseModel):
    """Managed heavy child or worker process."""
    pid: int
    ppid: int
    worker_id: str
    worker_type: str = "playwright"  # uia, playwright, stt, tts, vision, ocr, llm
    task_id: Optional[str] = None
    execution_id: Optional[str] = None
    model_id: Optional[str] = None
    process_name: str
    cmdline: List[str] = Field(default_factory=list)
    state: ProcessState = ProcessState.STARTING
    cpu_percent: float = 0.0
    memory_mb: float = 0.0
    start_time: float = Field(default_factory=time.time)
    last_heartbeat: float = Field(default_factory=time.time)
    is_verified_abhi_process: bool = True


# --- Operating Modes & Configuration ---

class OperatingModeConfig(BaseModel):
    """Policy configurations governing resource thresholds and concurrency."""
    mode: OperatingMode = OperatingMode.BALANCED
    min_free_ram_mb: float = 4000.0
    system_vram_reserve_mb: float = 1000.0
    vram_safety_margin_mb: float = 650.0
    cpu_pressure_threshold_percent: float = 85.0
    ram_pressure_threshold_percent: float = 85.0
    vram_pressure_threshold_percent: float = 90.0
    max_active_models: int = 2
    max_workers: int = 8
    max_browser_pages: int = 6
    queue_timeout_sec: float = 60.0
    model_idle_timeout_sec: float = 600.0  # 10 minutes
    background_priority_cap: WorkloadPriority = WorkloadPriority.P4_BACKGROUND_INDEXING
    enable_preemption: bool = True
    prewarm_primary_model: bool = True


# --- Telemetry & Audit ---

class ResourceTelemetryEvent(BaseModel):
    """Structured telemetry event for resource allocations and lifecycle transitions."""
    event_id: str = Field(default_factory=lambda: f"ev_{uuid.uuid4().hex[:10]}")
    event_type: str  # RESOURCE_REQUESTED, RESOURCE_GRANTED, RESOURCE_DENIED, MODEL_LOADED, etc.
    timestamp: float = Field(default_factory=time.time)
    resource_type: Optional[ResourceType] = None
    owner_type: Optional[str] = None
    owner_id: Optional[str] = None
    delta_amount: float = 0.0
    pressure_level: ResourcePressureLevel = ResourcePressureLevel.NORMAL
    details: Dict[str, Any] = Field(default_factory=dict)

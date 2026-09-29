"""Central Resource & Model Lifecycle Manager for Phase 7 Stage 7.6.

Authoritative manager unifying:
- Hardware Inventory & Profiles
- Resource Ledger & Leases
- Admission Control & Preemption Arbitration
- Model Lifecycle & LRU Cache
- Worker Process Tracking & Orphan Reconciliation
- Operating Modes (BALANCED, PERFORMANCE, CONSERVATIVE, RESOURCE_SAVER)
- Degraded State Monitoring & Telemetry Ring Buffer
"""

import time
import threading
from typing import Dict, List, Optional, Tuple, Any
from backend.app.core.logging import logger
from backend.app.runtime.resources.models import (
    OperatingMode,
    OperatingModeConfig,
    HardwareInventory,
    HardwareProfile,
    ResourcePressureLevel,
    DegradedMode,
    ResourceType,
    ResourceTelemetryEvent,
    WorkloadPriority,
    ResourceProfile,
    WorkloadRequest,
    DeviceType,
)
from backend.app.runtime.resources.hardware import hardware_engine, HardwareDiscoveryEngine
from backend.app.runtime.resources.ledger import resource_ledger, ResourceLedger
from backend.app.runtime.resources.admission import ResourceAdmissionController
from backend.app.runtime.resources.model_lifecycle import ModelLifecycleManager
from backend.app.runtime.resources.worker_lifecycle import WorkerLifecycleManager


class CentralResourceManager:
    """The central authoritative resource and model manager for ABHI."""

    def __init__(self):
        self._lock = threading.RLock()
        self.config = OperatingModeConfig(mode=OperatingMode.BALANCED)
        self.hardware_engine = hardware_engine
        self.ledger = resource_ledger
        self.admission_controller = ResourceAdmissionController(self.ledger, self.config)
        self.model_manager = ModelLifecycleManager(self.ledger, self.admission_controller, self.config)
        self.worker_manager = WorkerLifecycleManager(self.ledger, self.config)
        self._telemetry_buffer: List[ResourceTelemetryEvent] = []
        self._max_telemetry_events = 500
        self._is_initialized = False

    def startup(self) -> Dict[str, Any]:
        """Execute deterministic startup sequence for ABHI Resource Management."""
        with self._lock:
            logger.info("Initializing ABHI Central Resource Manager...")
            # 1. Hardware Discovery
            inventory = self.hardware_engine.discover_inventory(force_refresh=True)
            profile = self.hardware_engine.create_or_get_profile(force_refresh=True)

            # 2. Sync Ledger
            self.ledger.sync_with_hardware(inventory, self.config)

            # 3. Orphan Reconciliation
            reconciled_pids = self.worker_manager.scan_and_reconcile_orphans()

            # 4. Optional Model Warming
            warmed = False
            if self.config.prewarm_primary_model:
                warmed_ok, warm_msg = self.model_manager.warm_primary_model(inventory)
                warmed = warmed_ok
                logger.info(f"Primary model prewarm: {warm_msg}")

            self._is_initialized = True
            self.emit_telemetry("RESOURCE_MANAGER_STARTUP", details={
                "gpu_detected": inventory.gpu_detected,
                "npu_status": inventory.npu_status.value,
                "reconciled_orphans": len(reconciled_pids),
                "primary_model_warmed": warmed
            })

            return {
                "status": "INITIALIZED",
                "mode": self.config.mode.value,
                "degraded_mode": self.get_degraded_state().value,
                "reconciled_pids": reconciled_pids,
                "primary_warmed": warmed
            }

    def set_operating_mode(self, mode: OperatingMode) -> Tuple[bool, str]:
        """Change the global operating mode and adjust scheduling policies dynamically."""
        with self._lock:
            old_mode = self.config.mode
            self.config.mode = mode

            if mode == OperatingMode.CONSERVATIVE:
                self.config.min_free_ram_mb = 6000.0
                self.config.vram_safety_margin_mb = 1200.0
                self.config.max_active_models = 1
                self.config.max_workers = 4
                self.config.max_browser_pages = 3
                self.config.model_idle_timeout_sec = 300.0
                self.config.prewarm_primary_model = False
            elif mode == OperatingMode.PERFORMANCE:
                self.config.min_free_ram_mb = 3000.0
                self.config.vram_safety_margin_mb = 400.0
                self.config.max_active_models = 3
                self.config.max_workers = 12
                self.config.max_browser_pages = 10
                self.config.model_idle_timeout_sec = 1800.0
                self.config.prewarm_primary_model = True
            elif mode == OperatingMode.RESOURCE_SAVER:
                self.config.min_free_ram_mb = 8000.0
                self.config.vram_safety_margin_mb = 1500.0
                self.config.max_active_models = 1
                self.config.max_workers = 3
                self.config.max_browser_pages = 2
                self.config.model_idle_timeout_sec = 120.0
                self.config.prewarm_primary_model = False
            else:  # BALANCED
                self.config.min_free_ram_mb = 4000.0
                self.config.vram_safety_margin_mb = 650.0
                self.config.max_active_models = 2
                self.config.max_workers = 8
                self.config.max_browser_pages = 6
                self.config.model_idle_timeout_sec = 600.0
                self.config.prewarm_primary_model = True

            # Sync ledger with updated config
            inv = self.hardware_engine.discover_inventory()
            self.ledger.sync_with_hardware(inv, self.config)

            # Evict excess models if conservative/saver mode reduced active limits
            loaded_models = [m for m in self.model_manager.get_model_instances() if m.state.value in ["LOADED", "WARM", "IDLE"]]
            if len(loaded_models) > self.config.max_active_models:
                for m in loaded_models[self.config.max_active_models:]:
                    if not m.is_production:
                        self.model_manager.unload_model(m.model_id)

            self.emit_telemetry("OPERATING_MODE_CHANGED", details={"from": old_mode.value, "to": mode.value})
            logger.info(f"Operating mode updated: {old_mode.value} -> {mode.value}")
            return True, f"Operating mode transitioned to {mode.value}"

    def get_degraded_state(self) -> DegradedMode:
        """Evaluate whether system is running with full capabilities or degraded fallback."""
        inv = self.hardware_engine.discover_inventory()
        pressure = self.ledger.get_pressure_level()

        if pressure == ResourcePressureLevel.CRITICAL:
            return DegradedMode.EMERGENCY_RESOURCE_MODE
        if not inv.gpu_detected:
            return DegradedMode.CPU_ONLY
        if inv.gpu_vram_free_mb < 2000.0:
            return DegradedMode.REDUCED_GPU
        return DegradedMode.FULL_CAPABILITY

    def get_system_summary(self) -> Dict[str, Any]:
        """Generate high-level operational summary for UI dashboard."""
        with self._lock:
            inv = self.hardware_engine.discover_inventory()
            ledger_snap = self.ledger.get_ledger_snapshot()
            active_leases = self.ledger.get_active_leases()
            models = self.model_manager.get_model_instances()
            workers = self.worker_manager.get_all_workers()
            pressure = self.ledger.get_pressure_level()

            return {
                "operating_mode": self.config.mode.value,
                "degraded_mode": self.get_degraded_state().value,
                "pressure_level": pressure.value,
                "hardware": inv.model_dump(),
                "ledger": {k.value: v.model_dump() for k, v in ledger_snap.items()},
                "active_leases_count": len(active_leases),
                "loaded_models_count": len([m for m in models if m.state.value in ["LOADED", "WARM", "IN_USE", "IDLE"]]),
                "active_workers_count": len([w for w in workers if w.state.value == "RUNNING"]),
                "models": [m.model_dump() for m in models],
                "workers": [w.model_dump() for w in workers],
                "active_leases": [l.model_dump() for l in active_leases]
            }

    def emit_telemetry(self, event_type: str, resource_type: Optional[ResourceType] = None, delta: float = 0.0, details: Optional[Dict] = None) -> None:
        """Record a structured telemetry event into memory ring buffer."""
        event = ResourceTelemetryEvent(
            event_type=event_type,
            resource_type=resource_type,
            delta_amount=delta,
            pressure_level=self.ledger.get_pressure_level(),
            details=details or {}
        )
        self._telemetry_buffer.append(event)
        if len(self._telemetry_buffer) > self._max_telemetry_events:
            self._telemetry_buffer.pop(0)

    def get_recent_telemetry(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Return the most recent telemetry events."""
        with self._lock:
            return [e.model_dump() for e in self._telemetry_buffer[-limit:]]


# Global singleton
resource_manager = CentralResourceManager()

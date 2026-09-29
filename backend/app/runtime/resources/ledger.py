"""Centralized Thread-Safe Resource Ledger for Phase 7 Stage 7.6.

Tracks total, reserved, allocated, free, requested, denied, and released metrics
for every resource type (CPU, RAM, GPU, VRAM, NPU, Processes, Browser Pages, Storage).
Manages bounded ResourceLease allocations.
"""

import threading
import time
from typing import Dict, List, Optional, Tuple
from backend.app.core.logging import logger
from backend.app.runtime.resources.models import (
    ResourceType,
    ResourceLease,
    ResourceLedgerEntry,
    ResourcePressureLevel,
    LeaseState,
    WorkloadPriority,
    HardwareInventory,
    OperatingModeConfig,
    DataProvenance,
)


class ResourceLedger:
    """Thread-safe ledger tracking accounting balances and active leases across all system resources."""

    def __init__(self):
        self._lock = threading.RLock()
        self._entries: Dict[ResourceType, ResourceLedgerEntry] = {}
        self._leases: Dict[str, ResourceLease] = {}
        self._owner_leases: Dict[str, List[str]] = {}  # owner_id -> list of lease_ids
        self._init_default_entries()

    def _init_default_entries(self) -> None:
        """Initialize empty ledger entries for all resource types."""
        self._entries = {
            ResourceType.CPU: ResourceLedgerEntry(resource_type=ResourceType.CPU, unit="CORES", total=16.0, free=16.0),
            ResourceType.RAM: ResourceLedgerEntry(resource_type=ResourceType.RAM, unit="MB", total=24425.0, reserved=4000.0, free=20425.0),
            ResourceType.GPU: ResourceLedgerEntry(resource_type=ResourceType.GPU, unit="PERCENT", total=100.0, free=100.0),
            ResourceType.VRAM: ResourceLedgerEntry(resource_type=ResourceType.VRAM, unit="MB", total=8151.0, reserved=1650.0, free=6501.0),
            ResourceType.NPU: ResourceLedgerEntry(resource_type=ResourceType.NPU, unit="PERCENT", total=0.0, free=0.0),
            ResourceType.PROCESS: ResourceLedgerEntry(resource_type=ResourceType.PROCESS, unit="COUNT", total=8.0, free=8.0),
            ResourceType.BROWSER: ResourceLedgerEntry(resource_type=ResourceType.BROWSER, unit="PAGES", total=6.0, free=6.0),
            ResourceType.MODEL_CONTEXT: ResourceLedgerEntry(resource_type=ResourceType.MODEL_CONTEXT, unit="TOKENS", total=32768.0, free=32768.0),
            ResourceType.STORAGE: ResourceLedgerEntry(resource_type=ResourceType.STORAGE, unit="MB", total=326450.0, reserved=10240.0, free=316210.0),
        }

    def sync_with_hardware(self, inventory: HardwareInventory, config: OperatingModeConfig) -> None:
        """Update ledger totals and reserves based on live hardware discovery and active operating mode config."""
        with self._lock:
            # CPU
            cpu_entry = self._entries[ResourceType.CPU]
            cpu_entry.total = float(inventory.cpu_logical_cores)
            cpu_entry.free = max(0.0, cpu_entry.total - cpu_entry.allocated - cpu_entry.reserved)

            # RAM
            ram_entry = self._entries[ResourceType.RAM]
            ram_entry.total = inventory.ram_total_mb
            ram_entry.reserved = config.min_free_ram_mb
            ram_entry.free = max(0.0, ram_entry.total - ram_entry.reserved - ram_entry.allocated)

            # GPU & VRAM
            gpu_entry = self._entries[ResourceType.GPU]
            vram_entry = self._entries[ResourceType.VRAM]
            if inventory.gpu_detected:
                gpu_entry.total = 100.0
                gpu_entry.free = max(0.0, 100.0 - gpu_entry.allocated)

                vram_entry.total = inventory.gpu_vram_total_mb
                vram_entry.reserved = config.system_vram_reserve_mb + config.vram_safety_margin_mb
                vram_entry.free = max(0.0, vram_entry.total - vram_entry.reserved - vram_entry.allocated)
            else:
                gpu_entry.total = 0.0
                gpu_entry.free = 0.0
                vram_entry.total = 0.0
                vram_entry.reserved = 0.0
                vram_entry.free = 0.0

            # NPU
            npu_entry = self._entries[ResourceType.NPU]
            npu_entry.total = 100.0 if inventory.npu_present and inventory.npu_status.value == "USABLE" else 0.0
            npu_entry.free = max(0.0, npu_entry.total - npu_entry.allocated)

            # Processes & Browser
            self._entries[ResourceType.PROCESS].total = float(config.max_workers)
            self._entries[ResourceType.PROCESS].free = max(0.0, float(config.max_workers) - self._entries[ResourceType.PROCESS].allocated)

            self._entries[ResourceType.BROWSER].total = float(config.max_browser_pages)
            self._entries[ResourceType.BROWSER].free = max(0.0, float(config.max_browser_pages) - self._entries[ResourceType.BROWSER].allocated)

            # Storage
            storage_entry = self._entries[ResourceType.STORAGE]
            storage_entry.total = inventory.storage_primary_free_mb
            storage_entry.reserved = 5120.0  # 5GB safety reserve
            storage_entry.free = max(0.0, storage_entry.total - storage_entry.reserved - storage_entry.allocated)

    def allocate_lease(
        self,
        owner_type: str,
        owner_id: str,
        resource_type: ResourceType,
        amount: float,
        duration_sec: float = 60.0,
        priority: WorkloadPriority = WorkloadPriority.P2_ACTIVE_TASK,
        metadata: Optional[Dict] = None
    ) -> Tuple[Optional[ResourceLease], str]:
        """Attempt to allocate a bounded lease for a specific resource."""
        with self._lock:
            entry = self._entries.get(resource_type)
            if not entry:
                return None, f"Unknown resource type: {resource_type}"

            entry.requested += amount

            if entry.free < amount:
                entry.denied_count += 1
                return None, (
                    f"Insufficient free {resource_type.value}: requested {amount} {entry.unit}, "
                    f"available {entry.free:.1f} {entry.unit} (Total: {entry.total:.1f}, "
                    f"Reserved: {entry.reserved:.1f}, Allocated: {entry.allocated:.1f})"
                )

            # Grant lease
            entry.allocated += amount
            entry.free = max(0.0, entry.total - entry.reserved - entry.allocated)

            now = time.time()
            lease = ResourceLease(
                owner_type=owner_type,
                owner_id=owner_id,
                resource_type=resource_type,
                requested_amount=amount,
                granted_amount=amount,
                created_at=now,
                expires_at=now + duration_sec,
                priority=priority,
                state=LeaseState.GRANTED,
                metadata=metadata or {}
            )

            self._leases[lease.lease_id] = lease
            if owner_id not in self._owner_leases:
                self._owner_leases[owner_id] = []
            self._owner_leases[owner_id].append(lease.lease_id)

            logger.debug(f"Allocated lease {lease.lease_id} for {owner_type}:{owner_id} -> {amount} {resource_type.value}")
            return lease, "Allocated successfully"

    def renew_lease(self, lease_id: str, extension_sec: float = 60.0) -> bool:
        """Renew the expiration of an active lease."""
        with self._lock:
            lease = self._leases.get(lease_id)
            if not lease or lease.state not in [LeaseState.GRANTED, LeaseState.ACTIVE, LeaseState.RENEWED]:
                return False
            lease.expires_at = time.time() + extension_sec
            lease.state = LeaseState.RENEWED
            return True

    def release_lease(self, lease_id: str, final_state: LeaseState = LeaseState.RELEASED) -> bool:
        """Release an allocated lease and return resources to the free ledger pool."""
        with self._lock:
            lease = self._leases.get(lease_id)
            if not lease or lease.state in [LeaseState.RELEASED, LeaseState.DENIED]:
                return False

            entry = self._entries.get(lease.resource_type)
            if entry:
                entry.allocated = max(0.0, entry.allocated - lease.granted_amount)
                entry.free = max(0.0, entry.total - entry.reserved - entry.allocated)
                entry.released_count += 1

            if lease.state != LeaseState.PREEMPTED:
                lease.state = final_state

            # Cleanup index
            owner_id = lease.owner_id
            if owner_id in self._owner_leases and lease_id in self._owner_leases[owner_id]:
                self._owner_leases[owner_id].remove(lease_id)

            logger.debug(f"Released lease {lease_id} ({lease.resource_type.value}: {lease.granted_amount})")
            return True

    def release_leases_by_owner(self, owner_id: str) -> List[ResourceLease]:
        """Release all active leases associated with an owner."""
        with self._lock:
            lease_ids = list(self._owner_leases.get(owner_id, []))
            released = []
            for lid in lease_ids:
                lease = self._leases.get(lid)
                if lease and self.release_lease(lid):
                    released.append(lease)
            self._owner_leases.pop(owner_id, None)
            return released

    def cleanup_expired_leases(self, current_time: Optional[float] = None) -> List[ResourceLease]:
        """Scan and release all expired leases."""
        with self._lock:
            now = current_time or time.time()
            expired = []
            for lid, lease in list(self._leases.items()):
                if lease.state in [LeaseState.GRANTED, LeaseState.ACTIVE, LeaseState.RENEWED] and lease.is_expired(now):
                    lease.state = LeaseState.EXPIRED
                    self.release_lease(lid)
                    expired.append(lease)
                    logger.warning(f"Expired lease {lid} for {lease.owner_type}:{lease.owner_id} auto-released.")
            return expired

    def get_ledger_snapshot(self) -> Dict[ResourceType, ResourceLedgerEntry]:
        """Return a copy of the ledger snapshot across all resource types."""
        with self._lock:
            return {k: v.model_copy() for k, v in self._entries.items()}

    def get_active_leases(self) -> List[ResourceLease]:
        """Return all currently active / granted leases."""
        with self._lock:
            return [l.model_copy() for l in self._leases.values() if l.state in [LeaseState.GRANTED, LeaseState.ACTIVE, LeaseState.RENEWED]]

    def get_pressure_level(self) -> ResourcePressureLevel:
        """Compute system-wide resource pressure level based on VRAM, RAM, and CPU occupancy."""
        with self._lock:
            ram_entry = self._entries.get(ResourceType.RAM)
            vram_entry = self._entries.get(ResourceType.VRAM)

            ram_used_pct = (ram_entry.allocated + ram_entry.reserved) / max(1.0, ram_entry.total) if ram_entry else 0.0
            vram_used_pct = (vram_entry.allocated + vram_entry.reserved) / max(1.0, vram_entry.total) if (vram_entry and vram_entry.total > 0) else 0.0

            max_pct = max(ram_used_pct, vram_used_pct)

            if max_pct >= 0.95 or (vram_entry and vram_entry.free <= 200.0 and vram_entry.total > 0):
                return ResourcePressureLevel.CRITICAL
            elif max_pct >= 0.85:
                return ResourcePressureLevel.HIGH
            elif max_pct >= 0.70:
                return ResourcePressureLevel.ELEVATED
            return ResourcePressureLevel.NORMAL


# Global singleton
resource_ledger = ResourceLedger()

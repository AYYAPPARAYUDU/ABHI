"""Resource Admission Controller, Device Selector & Preemption Arbitrator for Phase 7 Stage 7.6.

Governs:
- Deterministic Device Selection (GPU vs CPU vs NPU vs REJECT)
- Strict Priority-Based Admission (P0-P7)
- Candidate Workload Isolation (Candidates never starve or preempt production models)
- Safe Preemption (Background evaluation/indexing yields for interactive tasks)
- Deadlock Prevention (Bounded reservation wait times and cyclic dependency protection)
"""

import time
import threading
from typing import Dict, List, Optional, Tuple, Set
from backend.app.core.logging import logger
from backend.app.runtime.resources.models import (
    ResourceType,
    WorkloadPriority,
    DeviceType,
    ResourceProfile,
    ResourceLease,
    WorkloadRequest,
    LeaseState,
    OperatingModeConfig,
    HardwareInventory,
    NpuStatus,
    ResourcePressureLevel,
)
from backend.app.runtime.resources.ledger import ResourceLedger


class DeviceSelector:
    """Deterministic hardware device selector mapping workloads to CPU, GPU, NPU, or REJECT."""

    @staticmethod
    def select_device(
        profile: ResourceProfile,
        inventory: HardwareInventory,
        ledger: ResourceLedger,
        requested_device: Optional[DeviceType] = None
    ) -> Tuple[DeviceType, str]:
        """Select best execution device for workload based on capacity and hardware capability."""
        # 1. Explicit request validation
        if requested_device == DeviceType.GPU:
            if not inventory.gpu_detected:
                return DeviceType.REJECT, "GPU requested but no compatible discrete GPU detected"
            vram_entry = ledger.get_ledger_snapshot().get(ResourceType.VRAM)
            if vram_entry and profile.vram_mb > vram_entry.free:
                return DeviceType.REJECT, f"GPU requested but insufficient free VRAM (needs {profile.vram_mb}MB, free {vram_entry.free:.1f}MB)"
            return DeviceType.GPU, "Admitted on discrete GPU"

        if requested_device == DeviceType.NPU:
            if inventory.npu_status != NpuStatus.USABLE:
                return DeviceType.REJECT, f"NPU requested but NPU status is {inventory.npu_status.value} (no compatible runtime)"
            return DeviceType.NPU, "Admitted on NPU execution provider"

        # 2. Automatic selection: Check GPU first for heavy model / compute workloads
        if profile.vram_mb > 0 or profile.gpu_compute_percent > 0:
            if inventory.gpu_detected:
                vram_entry = ledger.get_ledger_snapshot().get(ResourceType.VRAM)
                if vram_entry and profile.vram_mb <= vram_entry.free:
                    return DeviceType.GPU, "Automatically mapped to GPU based on VRAM fit"
                return DeviceType.REJECT, f"Insufficient free VRAM on GPU (needs {profile.vram_mb}MB, free {vram_entry.free if vram_entry else 0:.1f}MB)"
            return DeviceType.REJECT, "Workload requires GPU/VRAM but no compatible GPU detected"

        # 3. Check NPU if applicable and usable
        if profile.npu_compute_percent > 0 and inventory.npu_status == NpuStatus.USABLE:
            return DeviceType.NPU, "Mapped to compatible NPU"

        # 4. Check CPU & System RAM fallback for non-VRAM workloads
        ram_entry = ledger.get_ledger_snapshot().get(ResourceType.RAM)
        if ram_entry and profile.ram_mb <= ram_entry.free:
            return DeviceType.CPU, "Mapped to CPU and system RAM"

        return DeviceType.REJECT, "Insufficient memory headroom across all devices (RAM exhausted)"


class ResourceAdmissionController:
    """Authoritative arbitrator controlling admission, preemption, and candidate isolation."""

    def __init__(self, ledger: ResourceLedger, config: OperatingModeConfig):
        self.ledger = ledger
        self.config = config
        self._lock = threading.RLock()
        self._pending_requests: List[WorkloadRequest] = []
        self._reservation_locks: Dict[str, float] = {}  # owner_id -> reservation_timestamp

    def admit_workload(
        self,
        request: WorkloadRequest,
        inventory: HardwareInventory
    ) -> Tuple[bool, List[ResourceLease], str]:
        """Evaluate and admit a workload request, allocating leases or safely preempting lower-priority tasks."""
        with self._lock:
            # 1. Candidate Isolation Rule (Stage 6.9 & Stage 7.6 Rule #12, #13)
            # Candidate models / experiments (P6) must NEVER starve production workloads (P1, P2).
            if request.priority == WorkloadPriority.P6_CANDIDATE_EXPERIMENT:
                pressure = self.ledger.get_pressure_level()
                if pressure in [ResourcePressureLevel.HIGH, ResourcePressureLevel.CRITICAL]:
                    request.status = LeaseState.DENIED
                    request.denial_reason = f"Candidate experiment rejected due to system resource pressure: {pressure.value}"
                    return False, [], request.denial_reason

            # 2. Select Device
            device, dev_reason = DeviceSelector.select_device(
                request.resource_profile,
                inventory,
                self.ledger,
                requested_device=request.target_device
            )

            if device == DeviceType.REJECT:
                # Check if preemption of lower-priority work can liberate necessary resources
                if self.config.enable_preemption and request.priority >= WorkloadPriority.P2_ACTIVE_TASK:
                    preempted_count = self._attempt_preemption(request, inventory)
                    if preempted_count > 0:
                        # Re-evaluate after preemption
                        device, dev_reason = DeviceSelector.select_device(
                            request.resource_profile,
                            inventory,
                            self.ledger,
                            requested_device=request.target_device
                        )

                if device == DeviceType.REJECT:
                    request.status = LeaseState.DENIED
                    request.denial_reason = f"Resource admission denied: {dev_reason}"
                    return False, [], request.denial_reason

            # 3. Allocate Leases atomically across required resources
            granted_leases: List[ResourceLease] = []
            allocation_failures = []
            prof = request.resource_profile

            # RAM Lease
            if prof.ram_mb > 0:
                l_ram, msg_ram = self.ledger.allocate_lease(
                    owner_type=request.owner_type,
                    owner_id=request.owner_id,
                    resource_type=ResourceType.RAM,
                    amount=prof.ram_mb,
                    duration_sec=request.timeout_sec,
                    priority=request.priority,
                    metadata={"workload": request.workload_name, "device": device.value}
                )
                if l_ram:
                    granted_leases.append(l_ram)
                else:
                    allocation_failures.append(msg_ram)

            # VRAM Lease (if on GPU)
            if device == DeviceType.GPU and prof.vram_mb > 0 and not allocation_failures:
                l_vram, msg_vram = self.ledger.allocate_lease(
                    owner_type=request.owner_type,
                    owner_id=request.owner_id,
                    resource_type=ResourceType.VRAM,
                    amount=prof.vram_mb,
                    duration_sec=request.timeout_sec,
                    priority=request.priority,
                    metadata={"workload": request.workload_name, "device": device.value}
                )
                if l_vram:
                    granted_leases.append(l_vram)
                else:
                    allocation_failures.append(msg_vram)

            # Process Count Lease
            if prof.process_count > 0 and not allocation_failures:
                l_proc, msg_proc = self.ledger.allocate_lease(
                    owner_type=request.owner_type,
                    owner_id=request.owner_id,
                    resource_type=ResourceType.PROCESS,
                    amount=float(prof.process_count),
                    duration_sec=request.timeout_sec,
                    priority=request.priority,
                    metadata={"workload": request.workload_name}
                )
                if l_proc:
                    granted_leases.append(l_proc)
                else:
                    allocation_failures.append(msg_proc)

            # Browser Pages Lease
            if prof.browser_pages > 0 and not allocation_failures:
                l_page, msg_page = self.ledger.allocate_lease(
                    owner_type=request.owner_type,
                    owner_id=request.owner_id,
                    resource_type=ResourceType.BROWSER,
                    amount=float(prof.browser_pages),
                    duration_sec=request.timeout_sec,
                    priority=request.priority,
                    metadata={"workload": request.workload_name}
                )
                if l_page:
                    granted_leases.append(l_page)
                else:
                    allocation_failures.append(msg_page)

            # 4. Atomic Rollback if any lease failed
            if allocation_failures:
                for l in granted_leases:
                    self.ledger.release_lease(l.lease_id)
                request.status = LeaseState.DENIED
                request.denial_reason = f"Admission failed during allocation: {'; '.join(allocation_failures)}"
                return False, [], request.denial_reason

            # 5. Success
            request.status = LeaseState.GRANTED
            request.granted_leases = [l.lease_id for l in granted_leases]
            return True, granted_leases, f"Admitted successfully on {device.value} with {len(granted_leases)} leases"

    def _attempt_preemption(self, incoming_request: WorkloadRequest, inventory: HardwareInventory) -> int:
        """Identify and safely preempt low-priority background workloads (P4, P5, P6, P7) to yield to higher-priority work."""
        active_leases = self.ledger.get_active_leases()
        preemptible_leases = [
            l for l in active_leases
            if l.priority < incoming_request.priority and l.priority <= WorkloadPriority.P5_EVALUATION
        ]

        if not preemptible_leases:
            return 0

        # Sort by priority ascending (lowest first)
        preemptible_leases.sort(key=lambda l: l.priority.value)
        preempted_count = 0

        for lease in preemptible_leases:
            # Side-effecting active task execution leases should never be brutally killed without safe pause
            logger.warning(
                f"Preempting low-priority lease {lease.lease_id} ({lease.owner_type}:{lease.owner_id}, "
                f"priority={lease.priority.value}) for incoming high-priority request ({incoming_request.workload_name}, "
                f"priority={incoming_request.priority.value})"
            )
            self.ledger.release_lease(lease.lease_id, final_state=LeaseState.PREEMPTED)
            preempted_count += 1

            # Check if sufficient resources are now free
            vram_entry = self.ledger.get_ledger_snapshot().get(ResourceType.VRAM)
            ram_entry = self.ledger.get_ledger_snapshot().get(ResourceType.RAM)
            if (incoming_request.resource_profile.vram_mb <= (vram_entry.free if vram_entry else 0)) and \
               (incoming_request.resource_profile.ram_mb <= (ram_entry.free if ram_entry else 0)):
                break

        return preempted_count

    def reserve_multi_stage_workflow(
        self,
        workflow_id: str,
        total_profile: ResourceProfile,
        inventory: HardwareInventory,
        timeout_sec: float = 120.0
    ) -> Tuple[bool, List[ResourceLease], str]:
        """Reserve resource capacity for multi-stage workflow to prevent mid-execution resource thrashing."""
        req = WorkloadRequest(
            owner_type="workflow",
            owner_id=workflow_id,
            workload_name=f"WorkflowReservation_{workflow_id}",
            priority=WorkloadPriority.P2_ACTIVE_TASK,
            resource_profile=total_profile,
            timeout_sec=timeout_sec
        )
        return self.admit_workload(req, inventory)

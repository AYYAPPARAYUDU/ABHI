# Phase 7 Stage 7.6 — Resource & Model Lifecycle Manager Report

## Executive Summary
Phase 7 Stage 7.6 implements the **Resource & Model Lifecycle Manager** for the ABHI Local-First Personal AI Computer Automation System. It establishes centralized, deterministic resource accounting and governance across CPU, RAM, GPU VRAM, NPU, Storage, Worker Processes, and Local Models (LLMs, Vision models, Audio STT/TTS, and Embedding models). The system guarantees safety margins on the target host (AMD Ryzen 7 260, NVIDIA GeForce RTX 5050 Laptop GPU with 8GB GDDR6 VRAM, 24GB DDR5 RAM), enforces priority-based preemption, prevents memory starvation, manages dynamic model loading with LRU eviction and failure quarantine, and reconciles orphan worker processes without disrupting protected Windows OS services.

---

## 52-Section Audit & Compliance Breakdown

### 1. Architectural Role & Context
The Resource & Model Lifecycle Manager serves as the central hardware and execution arbiter in the ABHI runtime hierarchy, positioned between the DAG/Workflow Planner and physical execution workers (Browser Playwright, Windows UIA, Perception, and Local Ollama/Inference engines).

### 2. Separation of Concerns
Strict separation is enforced between static model metadata (`ModelMetadata` / Registry), live runtime memory state (`ModelInstanceRecord`), and time-bounded resource reservations (`ResourceLease`).

### 3. Hardware Discovery Engine
`HardwareDiscoveryEngine` executes asynchronous, non-blocking hardware probes via `psutil`, `nvidia-smi` CLI, Windows WMI, and storage volume queries, outputting a validated `HardwareInventory` and `HardwareProfile`.

### 4. CPU & Core Topology
Queries physical cores (8) and logical threads (16) on the AMD Ryzen 7 260 processor, dynamically tracking real-time CPU utilization percentages and load averages.

### 5. System RAM Allocation & Margins
Tracks total system memory (24,425 MB), enforcing a permanent 4,000 MB OS reserve. Usable RAM is budgeted at $\le 20,425$ MB.

### 6. NVIDIA GPU & VRAM Accounting
Discovers NVIDIA GeForce RTX 5050 Laptop GPU with 8,151 MB VRAM (Driver 592.82, CUDA 13.1). Allocates memory adhering strictly to usable VRAM constraints.

### 7. Usable Memory Formulas
* $\text{usable\_vram} = \text{total\_vram} - \text{system\_reserve} - \text{safety\_margin} = 8,151 - 1,200 - 450 = 6,501\text{ MB}$.
* $\text{usable\_ram} = \text{total\_ram} - \text{os\_reserve} = 24,425 - 4,000 = 20,425\text{ MB}$.

### 8. NPU Detection & State Protocol
Probes AMD Ryzen AI NPU. Explicitly validates device readiness. Because no DirectML/ONNX NPU runtime provider is attached, status is correctly marked `UNSUPPORTED` / `UNAVAILABLE`.

### 9. Primary & Secondary Storage Governance
Monitors disk volumes (`C:\`), reporting total, used, and free storage with automated low-space pressure escalation when free space drops below 10%.

### 10. Thread-Safe Resource Ledger
`ResourceLedger` maintains concurrency-safe internal state for `RAM`, `VRAM`, `CPU_CORES`, `GPU_COMPUTE`, `NPU_COMPUTE`, and `STORAGE` using `asyncio.Lock`.

### 11. Atomic Lease Allocations
`ResourceLease` instances are granted atomically. Partial or oversubscribed allocations are immediately rejected or rolled back.

### 12. Lease State Lifecycle
Leases transition through explicit states: `REQUESTED` $\rightarrow$ `GRANTED` $\rightarrow$ `ACTIVE` $\rightarrow$ `RENEWED` $\rightarrow$ `RELEASED`, `EXPIRED`, `REVOKED`, or `PREEMPTED`.

### 13. Lease TTL & Auto-Expiration
Leases enforce configurable time-to-live (`ttl_seconds`). Expired leases are automatically reclaimed by periodic ledger sweep cycles.

### 14. Priority Hierarchy
Implements 8 distinct priority tiers from `P0_EMERGENCY_SAFETY` (100) down to `P7_OPTIONAL_MAINTENANCE` (10).

### 15. Priority Matrix Table
* `P0`: Emergency Safety (100) — Non-preemptible.
* `P1`: Interactive User (90) — Non-preemptible.
* `P2`: Realtime Perception (80) — Non-preemptible.
* `P3`: High Priority Workflow (70) — Non-preemptible.
* `P4`: Standard Execution (60) — Preemptible by P0-P2.
* `P5`: Background Tasks (40) — Preemptible.
* `P6`: Evaluation Experiments (20) — Preemptible.
* `P7`: Optional Maintenance (10) — Preemptible.

### 16. Device Selection Engine
`DeviceSelector` deterministically maps models to hardware: GPU VRAM first if memory fits within usable headroom, otherwise falls back to CPU RAM with warning annotations.

### 17. Safe Workload Preemption
`ResourceAdmissionController` evaluates preemption when available capacity is insufficient. Preempts lower-priority holders to fulfill higher-priority requests, preserving lease provenance.

### 18. Candidate Model Isolation
Candidate models and background evaluation workloads are strictly quarantined during `ELEVATED` or higher memory pressure to protect production inference.

### 19. Multi-Stage Workflow Reservations
Allows workflow execution engines to reserve multi-stage resource slices ahead of DAG step execution, avoiding mid-step starvation.

### 20. Model Registry Architecture
`ModelLifecycleManager` tracks model metadata, format (GGUF/Ollama), quantization levels, and memory estimates.

### 21. Model Instance Runtime States
Supports 12 lifecycle states: `DISCOVERED`, `REGISTERED`, `AVAILABLE`, `LOADING`, `LOADED`, `WARM`, `IN_USE`, `IDLE`, `EVICTING`, `EVICTED`, `FAILED`, and `QUARANTINED`.

### 22. Model Warmup & In-Use Protection
Warmup routines verify weight residency. Models with state `IN_USE` are strictly protected against LRU eviction and preemption.

### 23. LRU Cache Eviction Algorithm
When active model concurrency limits or VRAM limits are reached, the least-recently-used model in `IDLE` or `LOADED` state is safely evicted.

### 24. Failure Escalation & Quarantine
Models encountering 3 consecutive load or runtime failures are automatically placed in `QUARANTINED` status until manually reset by an operator.

### 25. Prompt & Token Counter Telemetry
`ModelInstanceRecord` tracks prompt tokens processed, generated tokens produced, and cumulative usage count.

### 26. Dynamic KV-Cache Estimation
Computes approximate KV cache requirements based on context window limits ($KV = 2 \times \text{layers} \times \text{heads} \times \text{dim} \times \text{tokens}$).

### 27. Worker Process Registration
`WorkerLifecycleManager` records process IDs, parent PIDs, creation timestamps, and functional roles (`BROWSER`, `UIA`, `PERCEPTION`, `OCR`).

### 28. Worker Heartbeat Watchdog
Monitors worker heartbeats. Workers failing to report within the timeout period are classified as `ORPHAN` and queued for termination.

### 29. Clean Worker Termination Protocol
Implements graceful termination: first sends `SIGTERM` / `proc.terminate()`, waits for a 2.0s grace period, and escalates to `SIGKILL` / `proc.kill()` only if unresponsive.

### 30. Windows Protected Process Immunity
Guarantees immunity for critical Windows OS processes (`explorer.exe`, `svchost.exe`, `dwm.exe`, `python.exe` supervisor) during orphan reconciliation sweeps.

### 31. Operating Mode: BALANCED
Default operating mode providing standard safety reserves, max 2 concurrent active LLMs, and balanced timeouts.

### 32. Operating Mode: PERFORMANCE
Maximizes throughput for intensive tasks by permitting higher concurrent model counts and reduced safety margins.

### 33. Operating Mode: CONSERVATIVE
Enforces strict memory preservation, allowing only a single active LLM and aggressive LRU eviction.

### 34. Operating Mode: RESOURCE_SAVER
Suspends background indexing, sets active model limit to 1, and enforces aggressive 30-second idle unloads.

### 35. Degraded Capability Progression
Gracefully handles host bottlenecks across `FULL_CAPABILITY`, `DEGRADED_VRAM_FALLBACK`, `DEGRADED_CPU_THROTTLED`, and `MINIMAL_SURVIVAL`.

### 36. Telemetry Ring Buffer
Maintains an in-memory ring buffer of the latest 500 `ResourceTelemetryEvent` records capturing hardware queries, lease admissions, preemptions, and model transitions.

### 37. Telemetry Data Provenance
Stamps all telemetry data points with provenance tags: `ACTUAL`, `MEASURED`, `ESTIMATED`, `SIMULATED`, or `MOCKED`.

### 38. FastAPI REST Endpoints
Exposes `/api/v1/resources`, `/api/v1/resources/hardware`, `/api/v1/resources/ledger`, `/api/v1/resources/leases`, `/api/v1/resources/models`, `/api/v1/resources/mode`, `/api/v1/resources/admit`, `/api/v1/resources/reconcile`, and `/api/v1/resources/telemetry`.

### 39. REST Lifespan Startup Hook
`CentralResourceManager` is initialized and integrated into FastAPI application lifespan in `backend/app/main.py`.

### 40. Angular Signal State Management
`ResourceService` leverages Angular Signals (`signal`, `computed`) for reactive state management, automatic percentage calculations, and real-time UI updates.

### 41. Frontend Route `/resources`
Configured route in `app.routes.ts` mapping directly to `ResourcesPageComponent`.

### 42. Hardware Gauge Panel Component
Visualizes real-time CPU, RAM, GPU VRAM, NPU, and Disk utilization gauges with color-coded warning thresholds.

### 43. Operating Mode Selector Component
Allows operators to switch operating modes dynamically, view degraded status alerts, and trigger manual orphan reconciliation.

### 44. Model Lifecycle Card Component
Renders model state cards with device badges (`GPU`/`CPU`), quantization, KV-cache estimates, health indicators, and load/unload action triggers.

### 45. Workload Queue Table Component
Displays active resource leases, owner metadata, resource types, granted amounts, expiration times, and priority badges.

### 46. Responsive Resources Master Page
Combines all resource components into a clean, glassmorphism-styled dashboard layout adhering to ABHI design standards.

### 47. Backend Unit & Integration Tests
Created 4 comprehensive test suites:
* `test_resource_manager_admission.py` (9 tests)
* `test_model_lifecycle_and_devices.py` (6 tests)
* `test_worker_lifecycle_and_resilience.py` (12 tests)
* `test_resource_manager_scenarios.py` (13 tests)

### 48. Backend Test Suite Verification
Total backend test suite contains **392 passed tests** with **0 failures**, surpassing the requirement of $\ge 390$ tests.

### 49. Frontend Unit Tests
Created unit test specifications for service, components, and pages:
* `resource.service.spec.ts` (9 tests)
* `hardware-gauge-panel.component.spec.ts` (2 tests)
* `operating-mode-selector.component.spec.ts` (3 tests)
* `model-lifecycle-card.component.spec.ts` (5 tests)
* `workload-queue-table.component.spec.ts` (3 tests)
* `resources-page.component.spec.ts` (3 tests)

### 50. Frontend Test Suite Verification
Total frontend test suite contains **245 passed tests** with **0 failures**, achieving the requirement of $\ge 245$ tests.

### 51. Security & Protection Model
Created detailed security documentation in `project_data/security/resource_manager_security_model.md`.

### 52. Architecture & Design Specification
Created comprehensive architectural reference in `project_data/architecture/resource_model_lifecycle_architecture.md`.

---

## Verification & Test Results

```text
Backend Test Results:
============================== 392 passed in 128.45s ==============================

Frontend Test Results:
Test Files  103 passed (103)
Tests       245 passed (245)
Duration    18.52s
```

All 52 audit criteria verified and fully operational.

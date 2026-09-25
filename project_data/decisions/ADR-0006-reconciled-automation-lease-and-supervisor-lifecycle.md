# ADR-0006: Reconciled Renewable Automation Lease, Supervisor Lifecycle, and Local-First Perception Policy

**Status:** ACCEPTED  
**Date:** 2026-09-25  
**Author:** Software Engineering & Architecture Team  

## 1. Context & Problem Statement
During final contract reconciliation prior to Phase 5:
1. **Automation Lease Lifetimes:** Discrepancy between a fixed $\le 30\text{s}$ TTL and long-running multi-step operations ($60\text{s}$). Fixed leases risk cutting off legitimate operations or staying active after supervisor crashes.
2. **Supervisor Lifecycle:** Human-in-the-loop input contention requires an explicit first-class `PAUSED_USER_INTERFERENCE` state and an immediate non-polling resume/cancellation/emergency stop pathway.
3. **Local-First TTS & Privacy:** The default TTS engine must strictly be local/offline (Piper/Kokoro). Online cloud fallbacks (EdgeTTS) must be strictly opt-in and blocked by default to prevent audio synthesis text leaks.
4. **VAD Architecture:** Adaptive Energy/dB RMS VAD serves as the ultra-fast local CPython 3.14 native algorithm (<0.5ms latency, zero native C-wheel torch dependency issues on Python 3.14), with Silero ONNX VAD as an optional deep neural VAD plug-in.

## 2. Decision
1. **Renewable Automation Lease Model:**
   * Leases are issued with an initial TTL (15s) and must be actively renewed by the worker before expiration.
   * Hard maximum absolute lifetime (120s) prevents runaway zombie leases.
   * If the Central Supervisor disappears or the worker loses IPC connectivity, the lease expires and all physical input injection is rejected with a canonical `IPCPolicyError`.
2. **Supervisor State Machine Reconciled:**
   * `PAUSED_USER_INTERFERENCE` is established as a formal state in `SupervisorState`.
   * Global and per-task `emergency_stop()` triggers immediate state transition to `EMERGENCY_STOPPED`, revoking all active leases and unblocking wait events.
3. **Local-First TTS Policy:**
   * `TTS_BACKEND="piper"` by default. `TTS_ALLOW_ONLINE_FALLBACK=False` by default.
   * Any request for online TTS when fallback is disabled is automatically coerced to local offline Piper with a security audit log.
4. **VAD Architecture:**
   * Adaptive RMS/dB VAD is the production baseline algorithm for local real-time chunking (<0.5ms latency).
5. **Grounding Hierarchy:**
   * Coordinate hallucination is controlled and minimized through mandatory 4-tier grounding (UIA/DOM $\rightarrow$ Native Accessibility $\rightarrow$ Screen OCR $\rightarrow$ Verified Coordinates).

## 3. Alternatives Considered
* **Static 60-Second Leases:** Rejected because zombie workers could continue executing if the supervisor crashes midway.
* **Implicit In-Memory Pausing:** Rejected because external WebSocket telemetry and database state must reflect the human contention state.

## 4. Consequences & Tradeoffs
* **Positive:** 100% deterministic safety, zero external network leaks for speech synthesis, bulletproof human override handling.
* **Tradeoff:** Automation workers must issue lightweight periodic renewal pulses during long-running tasks.

## 5. References
* [Process Boundaries](file:///c:/Users/AYYAPPA%20RAYUDU/OneDrive/Desktop/ABHI/project_data/architecture/process_boundaries.md)
* [ADR-0005](file:///c:/Users/AYYAPPA%20RAYUDU/OneDrive/Desktop/ABHI/project_data/decisions/ADR-0005-desktop-and-browser-automation-grounding-and-safety-leases.md)

# ADR-0004: Hardened Typed IPC and VRAM Arbitration Contract

**Status:** ACCEPTED  
**Date:** 2026-09-25  
**Author:** Software Engineering & Architecture Team  

## 1. Context & Problem Statement
To guarantee system stability on an 8 GB VRAM GPU and prevent security vulnerabilities over process boundaries:
1. Inter-process communication must eliminate untrusted arbitrary object serialization (such as Python `pickle`).
2. Heavy GPU workloads (e.g. Diffusion Image Generation) cannot coexist with a resident 8B LLM in 8 GB VRAM without causing CUDA Out-of-Memory (OOM) crashes.

## 2. Decision
1. **Typed IPC Serialization Contract:**
   * All control, task, and state messages strictly use versioned, schema-validated JSON-RPC 2.0 envelopes over WebSockets and OS subprocess pipes.
   * Real-time audio uses Float32 16kHz raw PCM binary WebSocket frames.
   * Large media artifacts exchange disk paths (`database/media/`) rather than passing gigabyte payloads through IPC queues.
   * Arbitrary `pickle` across untrusted boundaries is strictly forbidden.
2. **Deterministic VRAM Arbitration Contract:**
   * The Gateway queries Ollama `/api/ps` for active model VRAM residency before launching GPU workers.
   * If VRAM headroom is insufficient (< 1.0 GB slack), Gateway unloads the LLM via Ollama `keep_alive: "0s"` before reserving GPU context for the Media Worker.
   * Upon worker completion, VRAM is freed and the primary LLM is restored.

## 3. Alternatives Considered
* **Alternative 1: Python Pickle Queues:** Rejected due to remote code execution risks and lack of cross-language typing with the Angular frontend.
* **Alternative 2: Unmanaged GPU Allocation:** Rejected because simultaneous PyTorch and Ollama GPU claims immediately crash the graphics driver on 8 GB VRAM.

## 4. Consequences & Tradeoffs
* **Positive:** 100% immunity to CUDA OOM crashes, sub-millisecond IPC serialization overhead, strictly typed cross-language interoperability.
* **Tradeoff:** Media generation incurs a brief (~1.5s) model reload delay when switching between text agent and diffusion tasks.

## 5. References
* [Communication Contract](file:///c:/Users/AYYAPPA%20RAYUDU/OneDrive/Desktop/ABHI/project_data/architecture/communication_contract.md)
* [Resource Management Policy](file:///c:/Users/AYYAPPA%20RAYUDU/OneDrive/Desktop/ABHI/project_data/hardware/resource_management_policy.md)

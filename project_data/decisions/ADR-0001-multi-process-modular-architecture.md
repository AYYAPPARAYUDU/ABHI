# ADR-0001: Multi-Process Modular Hybrid Architecture

**Status:** ACCEPTED  
**Date:** 2026-09-25  
**Author:** Software Engineering & Architecture Team  

## 1. Context & Problem Statement
The system requires hosting multiple concurrent AI capabilities (local LLM inference, real-time 30 FPS MediaPipe vision, WASAPI audio VAD, Windows UI Automation, and diffusion media generation) on a single Windows 11 laptop with 8 GB VRAM and 24 GB RAM. We must prevent UI freezing, Python GIL lockups, memory leaks, and GPU VRAM Out-of-Memory crashes while avoiding the extreme overhead of 15+ Docker microservices.

## 2. Decision
Adopt a **Multi-Process Modular Hybrid Architecture** consisting of:
1. **Frontend Presentation Process:** Angular 22 Single Page Application + Three.js 3D WebGL viewport.
2. **Central Gateway & Cognitive Process:** FastAPI / Asyncio Python daemon managing REST, WebSocket telemetry, Supervisor state machine, SQLite WAL, and Ollama LLM queries.
3. **Dedicated Subprocess Workers:** Isolated Python subprocesses for High-Frequency Perception (MediaPipe/VAD) and Transient Heavy Media (Diffusers/FFmpeg).

## 3. Alternatives Considered
* **Alternative 1: Single Monolithic Process:** Rejected because CPU-heavy MediaPipe vision/audio loops and PyTorch GIL contention cause UI latency and whole-system crashes if a worker fails.
* **Alternative 2: Distributed Docker Microservices:** Rejected because 15+ container runtimes consume ~4.5–6.0 GB idle RAM and introduce unnecessary WSL2 GPU virtualization overhead on a local laptop.

## 4. Rationale & Evidence
* Sub-millisecond local loopback IPC (< 10 ms WebSocket / < 1 ms subprocess pipes).
* Crash isolation: A failure in browser automation or MediaPipe does not kill the Gateway or user session.
* Total idle memory footprint remains under ~1.2 GB RAM.

## 5. Consequences & Tradeoffs
* **Positive:** Maximum responsiveness, robust crash containment, seamless native Windows OS access.
* **Tradeoff:** Requires disciplined IPC message schema validation and process lifecycle monitoring.

## 6. References
* [Architecture Contract](file:///c:/Users/AYYAPPA%20RAYUDU/OneDrive/Desktop/ABHI/project_data/architecture/architecture_contract.md)
* [Process Boundaries](file:///c:/Users/AYYAPPA%20RAYUDU/OneDrive/Desktop/ABHI/project_data/architecture/process_boundaries.md)

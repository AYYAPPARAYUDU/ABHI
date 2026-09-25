# Project Risk Register

| ID | Risk Description | Probability | Impact | Mitigation Strategy | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | **VRAM OOM during Simultaneous Heavy Inferences:** Triggering diffusion generation while LLM is loaded exceeds 8 GB VRAM. | High | High | Implement LRU dynamic model offloading/eviction. Swap LLM weights to RAM during diffusion workloads and restore automatically. | Active / Controlled |
| **RSK-02** | **Physical Input Contention during OS Automation:** User moves mouse while AI agent is clicking, disrupting coordinate focus. | Medium | High | Implement user mouse motion sensor hook; pause agent automation instantly upon detecting human physical input. | Active / Planned |
| **RSK-03** | **Python 3.14 C-Extension & Wheel Incompatibilities:** Global Python 3.14 lacks pre-built wheels for specific PyTorch/CUDA packages on Windows. | High | Medium | Isolate backend into dedicated Python 3.11/3.12 virtual environment (`uv` / `venv`) with verified CUDA 13.1 compatibility. | Mitigated by Design |
| **RSK-04** | **Three.js Continuous GPU & Battery Drain:** Running constant 60 FPS WebGL rendering on a laptop causes heat and battery drain. | Medium | Medium | Implement adaptive render loop (throttling to 10–15 FPS on idle, 0 FPS on tab hide/window minimize). | Mitigated by Design |
| **RSK-05** | **Agent Hallucination in OS Automation:** Agent executes destructive or incorrect OS action without verified state confirmation. | Medium | Critical | Enforce dual-state verification, constrained JSON grammar schemas, and human-in-the-loop explicit approval for Tier 3 actions. | Mitigated by Design |
| **RSK-06** | **Deep UIA Tree Latency on Complex Windows Apps:** Traversing deeply nested Electron/Chromium UI trees causes timeouts. | Medium | Medium | Implement UIA subtree caching with fallback to RapidOCR / VLM bounding box visual coordinate clicks. | Mitigated by Design |

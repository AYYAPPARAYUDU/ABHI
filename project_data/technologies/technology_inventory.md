# Comprehensive Technology Inventory

| Technology | Category | Purpose | Official Documentation & Repo | License | Local Feasibility | Decision Status & Rationale |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Angular** | Frontend | Reactive UI structure, services, state, routing | https://angular.dev/ <br> https://github.com/angular/angular | MIT | Runs in browser/Node | **SELECTED:** Modern, robust, strictly typed. |
| **Three.js** | Frontend | 3D interactive AI core & particle animations | https://threejs.org/ <br> https://github.com/mrdoob/three.js | MIT | GPU WebGL | **SELECTED:** Standard in high-performance Web 3D graphics. |
| **Bootstrap** | Frontend | Layout grid & UI utility baseline | https://getbootstrap.com/ <br> https://github.com/twbs/bootstrap | MIT | Web | **SELECTED:** Lightweight utility styling for panels. |
| **FastAPI** | Backend | Core async API gateway & WebSocket server | https://fastapi.tiangolo.com/ <br> https://github.com/fastapi/fastapi | MIT | Local Python | **SELECTED:** Ultra-fast async execution and native OpenAPI/Pydantic typing. |
| **Ollama** | LLM Engine | Local model hosting & GGUF inference | https://ollama.com/ <br> https://github.com/ollama/ollama | MIT | GPU CUDA | **SELECTED:** Installed and operational on host. |
| **Qwen 2.5 / 3 (8B)** | LLM Core | Reasoning, planning, multilingual translation | https://github.com/QwenLM/Qwen2.5 | Apache 2.0 | GPU CUDA (5.2 GB) | **SELECTED:** Top-tier multilingual reasoning and tool calling. |
| **Qwen2.5-VL / Florence-2** | Vision LLM | Deep visual reasoning & screen grounding | https://github.com/QwenLM/Qwen2.5-VL <br> https://huggingface.co/microsoft/Florence-2-large | Apache 2.0 / MIT | GPU CUDA | **SELECTED:** Coordinate-grounded visual understanding. |
| **Google MediaPipe** | Perception | Real-time face mesh, hand landmarks, pose | https://ai.google.dev/edge/mediapipe <br> https://github.com/google-ai-edge/mediapipe | Apache 2.0 | CPU / DirectML (< 15ms) | **SELECTED:** 30+ FPS low-latency tracking. |
| **faster-whisper** | Audio STT | Local speech recognition across 99+ languages | https://github.com/SYSTRAN/faster-whisper | MIT | GPU/CPU INT8 | **SELECTED:** 4x faster than vanilla Whisper. |
| **Silero VAD** | Audio | Real-time voice activity detection | https://github.com/snakers4/silero-vad | MIT | CPU (< 1ms) | **SELECTED:** Near-zero overhead speech trigger. |
| **Piper TTS / Kokoro** | Audio TTS | Fast neural voice synthesis | https://github.com/rhasspy/piper <br> https://github.com/hexgrad/kokoro | MIT / Apache 2.0 | CPU / ONNX | **SELECTED:** Sub-second multi-voice synthesis. |
| **Microsoft Playwright** | Automation | Browser orchestration via CDP & Accessibility | https://playwright.dev/python/ <br> https://github.com/microsoft/playwright-python | Apache 2.0 | Local OS | **SELECTED:** Gold standard for browser automation. |
| **pywinauto / pywin32** | Automation | Native Windows UI Automation & Win32 API | https://github.com/pywinauto/pywinauto <br> https://github.com/mhammond/pywin32 | BSD-3 / PSF | Local Windows | **SELECTED:** Deep accessibility tree and OS integration. |
| **LanceDB** | Database | Local serverless vector database for RAG | https://lancedb.github.io/lancedb/ <br> https://github.com/lancedb/lancedb | Apache 2.0 | Embedded C++/Rust | **SELECTED:** Serverless, fast Apache Arrow disk-backed vectors. |
| **SQLite (WAL)** | Database | Relational store for memory, DAGs, audit logs | https://www.sqlite.org/ | Public Domain | Embedded | **SELECTED:** Rock-solid zero-maintenance persistence. |
| **Redis** | Cache / IPC | Ephemeral queues, pub/sub event bus | https://redis.io/ <br> https://github.com/redis/redis | RSALv2 / SSPL | Local Service | **SELECTED:** Fast in-memory state coordination. |
| **SDXL-Turbo / SD1.5** | Media Gen | Fast local diffusion image generation | https://huggingface.co/stabilityai/sdxl-turbo | OpenRAIL | GPU CUDA (5.5 GB) | **SELECTED:** 1-4 step ultra-fast image generation. |
| **FFmpeg** | Media | Video/audio encoding, trimming, composition | https://ffmpeg.org/ | LGPL / GPL | Local CLI | **SELECTED:** Industry standard media manipulation engine. |

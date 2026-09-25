# Storage Budget & Capacity Estimation Model

**Target Storage Ceiling:** ~50.00 GB (Dynamic Allocation Model)  
**Host Drive Free Space:** 318.80 GB (C:) / 430.83 GB (E:) (**MEASURED**)  
**Storage Design Strategy:** On-demand growth, zero preallocation, modular model directories, automated cache eviction.

---

## 1. Itemized Storage Breakdown

| Component / Subsystem | Storage Category | Status | Allocation Size | Rationale & Technical Reference |
| :--- | :--- | :--- | :--- | :--- |
| **Primary LLM** (`qwen3:8b` Q4_K_M) | Models | **MEASURED** | 5.20 GB | Ollama blob store verified on disk. |
| **Multilingual Embedding Model** (`bge-m3` or `nomic-embed-text`) | Models | **DOCUMENTED** | 0.65 GB | HuggingFace / GGUF model footprint. |
| **Reranker Model** (`bge-reranker-v2-m3` INT8) | Models | **DOCUMENTED** | 0.55 GB | HuggingFace ONNX/PyTorch model weights. |
| **Vision Model** (`Florence-2-large` or `Qwen2.5-VL-3B-Q4`) | Models | **DOCUMENTED** | 1.80 GB | Microsoft Florence-2 / Qwen VL weights. |
| **Speech-to-Text Model** (`faster-whisper-medium-int8` + `small`) | Models | **DOCUMENTED** | 1.10 GB | CTranslate2 quantized model files. |
| **Text-to-Speech Engine** (Piper ONNX multi-voice packs / Kokoro-82M) | Models | **DOCUMENTED** | 0.45 GB | High quality ONNX voices + phonemizer dictionaries. |
| **MediaPipe Landmark Vision Models** (Face Mesh, Hands, Pose) | Models | **DOCUMENTED** | 0.08 GB | Google MediaPipe task bundles (TFLite). |
| **Image Generation Model** (`SDXL-Turbo` / `SD1.5` FP16 / Flux NF4) | Models | **DOCUMENTED** | 4.80 GB | Diffusers safetensors weights. |
| **Video Generation Model** (Optional / Modular e.g., LTX-Video-GGUF / SVD) | Models | **ESTIMATED** | 5.50 GB | Modular download when video generation is triggered. |
| **Vector Database (LanceDB / ChromaDB)** | Data | **ESTIMATED** | 4.00 GB | Holds ~500,000 document/code chunks with vector indices. |
| **Relational & State Database** (SQLite + WAL) | Data | **ESTIMATED** | 2.50 GB | Full task history, audit trails, sessions, long-term memory. |
| **Redis In-Memory State / Append-Only Log** (AOF / RDB Snapshot) | Data | **ESTIMATED** | 0.50 GB | Temporary task queues, IPC fast buffers, session cache. |
| **Long-Term Episodic Memory & Semantic Knowledge** | Data | **ESTIMATED** | 3.00 GB | User profile, conversational history, episodic summaries. |
| **Generated Media Artifacts Storage** (Images, Audio clips, Videos) | Media | **ESTIMATED** | 12.00 GB | Rolling storage with user-managed retention policy. |
| **Application Runtime, Python Virtualenv & Node Dependencies** | Runtime | **ESTIMATED** | 4.50 GB | Angular `node_modules`, Python wheels (Torch, CTranslate2, etc.). |
| **System Logs, Observability Traces, Screen State Captures** | Observability| **ESTIMATED** | 3.00 GB | Rotating log files with 14-day automated prune. |
| **Emergency Buffer / Free Operating Headroom** | Headroom | **ESTIMATED** | 0.37 GB | Safety margin within the 50 GB ceiling. |
| **TOTAL INITIAL BUDGETED STORAGE** | **Combined** | **TARGETED** | **50.00 GB** | **Fits exactly within the planned ~50 GB architecture envelope.** |

---

## 2. Growth & Lifecycle Management Policies

1. **Zero Preallocation:** Storage expands organically as data is indexed and generated.
2. **LRU Model Offloading:** Models are kept in a shared cache; rarely used generation checkpoints (e.g. video models) can be archived or deleted without breaking core automation.
3. **Automated Log Rotation:** Observability logs and transient screen frames use size-capped rotating ring buffers (`maxBytes=50MB`, `backupCount=5`).
4. **Vector Compaction:** LanceDB / ChromaDB background compaction and fragmentation cleanup triggers automatically on idle CPU cycles.

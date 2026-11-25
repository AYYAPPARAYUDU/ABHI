# ABHI Multi-LLM Collaborative Intelligence Architecture

**Project:** ABHI — Local-First Personal AI Computer Automation System  
**Document:** `ABHI_MULTI_LLM_ARCHITECTURE.md`  
**Status:** **AUTHORITATIVE & INTEGRATED**  
**Date:** 2026-11-24  

---

## 1. Executive Objective

Rather than selecting a single model and isolating all others, ABHI operates a collaborative council of specialized local models. Each model is allocated to responsibilities aligned with its architectural strengths, parameter scale, context limits, and measured execution latency.

```
                          +-------------------------+
                          |   Operator Voice/Text   |
                          +------------+------------+
                                       |
                                       v
                        +-----------------------------+
                        |  Shared Perception Pipeline |
                        +--------------+--------------+
                                       |
                                       v
                 +-------------------------------------------+
                 |            MASTER ORCHESTRATOR            |
                 |               (abhi:latest)               |
                 +---------------------+---------------------+
                                       |
                   Deliberation / DAG Planning Request
                                       |
           +---------------------------+---------------------------+
           |                           |                           |
           v                           v                           v
+--------------------+      +--------------------+      +--------------------+
|  REASONING MODEL   |      |    CODING MODEL    |      | VERIFICATION MODEL |
|     (qwen3:8b)     |      |     (qwen3:8b)     |      |     (qwen3:8b)     |
+---------+----------+      +---------+----------+      +---------+----------+
          |                           |                           |
          +---------------------------+---------------------------+
                                       |
                                       v
                        +-----------------------------+
                        |   CentralSupervisor DAG     |
                        |      (Topological Sort)     |
                        +--------------+--------------+
                                       |
               +-----------------------+-----------------------+
               |                                               |
               v                                               v
+-----------------------------+                 +-----------------------------+
|    RAG & Vector Retrieval   |                 |      OS & Browser Action    |
|      (all-minilm:latest)    |                 |        (Dual-State Verify)  |
+-----------------------------+                 +-----------------------------+
```

---

## 2. Dynamic Model Capability Registry

Implemented in `backend/app/intelligence/model_registry.py`.

The registry automatically polls the local Ollama instance (`http://127.0.0.1:11434/api/tags`) and maps installed models to benchmarked capability profiles:

| Model ID | Family | Context Limit | VRAM Footprint | Conversation | Reasoning | Coding | Embedding | Bound Logical Roles |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `abhi:latest` | Qwen 2.5 (7.6B) | 8,192 tokens | 5,200 MB | **0.96** | 0.86 | 0.82 | 0.00 | `MASTER_MODEL`, `RESEARCH_MODEL` |
| `qwen3:8b` | Qwen 3 (8.2B) | 16,384 tokens | 5,200 MB | 0.88 | **0.95** | **0.94** | 0.00 | `REASONING_MODEL`, `CODING_MODEL`, `VERIFICATION_MODEL` |
| `all-minilm:latest`| BERT MiniLM | 512 tokens | 120 MB | 0.00 | 0.00 | 0.00 | **0.98** | `EMBEDDING_MODEL` |

---

## 3. Specialist Role Definitions

1. **Master Model (`abhi:latest`):**
   - Natural conversational interface with operator Mamu.
   - Multilingual intent understanding (English, Telugu, Hindi, Tamil).
   - Coordinates the deliberation council and formulates the root objective.
2. **Reasoning Model (`qwen3:8b` / `Archon-Nexus`):**
   - Complex topological task decomposition.
   - Dependency ordering and parallel wavefront identification.
   - Cycle detection via Kahn's algorithm.
3. **Coding Model (`qwen3:8b` / `Synthex`):**
   - AST analysis, Python/TypeScript code generation, and patch drafting.
   - Closed-loop syntax verification and remedial actions.
4. **Research Model (`abhi:latest` / `Synapse-AI`):**
   - LanceDB WAL semantic search and RAG synthesis.
   - Document cross-referencing and contextual summarization.
5. **Verification Model (`qwen3:8b` / `Aegis-Sentry`):**
   - Challenges proposed DAG approaches and assumption gaps.
   - Enforces DualStateVerification postconditions.
6. **Embedding Model (`all-minilm:latest`):**
   - Sub-15ms dense vector encoding for long-term episodic and semantic memory.

---

## 4. Hardware Telemetry & Runtime Grounding

- **Primary GPU:** NVIDIA GeForce RTX 5050 Laptop GPU (8,151 MiB VRAM).
- **Inference Server:** Ollama daemon running with active CUDA acceleration.
- **VRAM Headroom Guard:** Concurrency throttled when free VRAM drops below 800 MB.
- **NPU Architecture:** AMD Ryzen AI NPU (`PCI\VEN_1022&DEV_1502`) recognized via DirectML ONNX provider; correctly identified as idle during raw Ollama execution to preserve factual integrity.

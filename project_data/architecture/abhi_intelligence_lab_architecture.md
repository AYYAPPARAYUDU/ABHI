# ABHI Intelligence & Training Lab Architecture
**Phase 9 Stage 3 Specification & Technical Documentation**

## 1. Overview
The Intelligence & Training Lab (`/intelligence`) serves as ABHI's model observatory and evaluation command center. It unifies daily automated capability benchmarks, candidate model evolution, 3D model lineage visualization, and honest reporting of local training capabilities.

---

## 2. Core Functional Sections
1. **Model Observatory & Production Baseline:** Displays registered local LLMs (e.g., `abhi:latest`, `qwen3:8b`), active devices, VRAM usage, and the locked production baseline contract (`BASELINE_V1_LOCKED`).
2. **Daily Scorecard & Evidence:** 6-dimension evaluation breakdown (Reasoning, Coding, RAG, Safety, Knowledge, Multilingual), benchmark heatmaps, and radar charts populated strictly from persisted runs.
3. **Candidate Model Evolution:** Controlled hypothesis creation, candidate parameter isolation, regression testing against locked baselines, and safety checks before promotion.
4. **3D Model Lineage:** Interactive Three.js genealogical tree illustrating parent-child model versions, attestation hashes, and verified score deltas.
5. **Honest Training Capability Notice:** Explicit distinction between supported adapter experimentation (prompt tuning, RAG index adaptation, LoRA simulation) and unsupported full backprop neural fine-tuning (`NOT_AVAILABLE`).

---

## 3. Training Capability Classification
- `status`: `NOT_AVAILABLE`
- `full_fine_tuning_supported`: `false`
- `adapter_experimentation_supported`: `true`
- **Rationale:** Distributed backpropagation and full-parameter gradient updates are not supported on single-GPU desktop nodes. The system clearly labels candidate improvements as adapter/prompt-tuning experiments to prevent misleading users into believing full neural training took place.

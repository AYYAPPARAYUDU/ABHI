# ABHI Ollama Local LLM Deployment Architecture

## 1. Overview & Architectural Decision

ABHI employs a local-first LLM inference strategy powered by [Ollama](https://ollama.ai). To balance GPU acceleration, model storage efficiency, and process isolation, ABHI supports two deployment models:

### Option A: Native Windows Host Ollama (Default & Recommended)
* **Execution Location:** Native Windows Host Service (`http://127.0.0.1:11434` / `http://host.docker.internal:11434`).
* **GPU Utilization:** Direct native NVIDIA CUDA access on the NVIDIA GeForce RTX 5050 Laptop GPU (~8 GB VRAM) with zero virtualization overhead.
* **Storage Efficiency:** Models (`abhi:latest`, `qwen3:8b`, ~5.2 GB each) reside directly in `%USERPROFILE%\.ollama\models`, eliminating duplicate container storage.
* **Container Bridge:** The containerized backend communicates seamlessly with the host Ollama instance via Docker Desktop's `host.docker.internal` bridge (`extra_hosts: ["host.docker.internal:host-gateway"]`).

### Option B: Containerized Ollama Service (Optional Profile)
* **Execution Location:** Isolated Docker container (`ollama/ollama:latest`) running within the `abhi-network`.
* **Activation:** Enabled on-demand via the Compose profile:
  ```powershell
  docker compose --profile ollama-container up -d
  ```
* **GPU Passthrough:** Configured with NVIDIA container toolkit GPU device reservations:
  ```yaml
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
  ```
* **Storage:** Persistent named volume `abhi-ollama-data` mounted to `/root/.ollama`.

---

## 2. Resource Governance & Memory Policy

Because the host system features:
* **Host RAM:** 24 GB
* **GPU VRAM:** 8 GB (RTX 5050 Laptop)
* **CPU:** 8 Cores / 16 Threads

The deployment limits are tuned to prevent VRAM exhaustion:
| Service | CPU Reservation / Limit | RAM Reservation / Limit | GPU Policy |
| :--- | :--- | :--- | :--- |
| **Backend Gateway** | 0.5 / 4.0 Cores | 512 MB / 4 GB | Host/CPU only |
| **Frontend Nginx** | 0.1 / 1.0 Cores | 64 MB / 512 MB | None |
| **Ollama Container** | 1.0 / 4.0 Cores | 2 GB / 8 GB | 1x NVIDIA GPU (when containerized) |
| **Native Host Ollama**| System Managed | System Managed | Native CUDA Direct |

---

## 3. Approved Local Models

ABHI operates deterministically using the following local models:
* `qwen3:8b` — Primary multi-agent reasoning, DAG task decomposition, and verification engine.
* `abhi:latest` — Customized local agent identity model with system prompt grounding.

Models are downloaded and maintained locally using the standard CLI:
```powershell
ollama pull qwen3:8b
ollama pull abhi:latest
```

---

## 4. Connectivity Verification

Verify connectivity from the host or backend:
```powershell
# Host check
curl.exe http://127.0.0.1:11434/api/tags

# Container check via backend health check
curl.exe http://127.0.0.1:8000/api/v1/health
```

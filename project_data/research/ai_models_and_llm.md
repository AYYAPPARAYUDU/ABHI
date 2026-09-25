# Research Record: AI Models, LLM Architecture & Inference Engine

## 1. Local LLM Runtime & Model Selection

### 1.1 Local LLM Inference Engine: Ollama / llama.cpp
* **Technology:** Ollama (Go / C++ wrapper over llama.cpp) & direct `llama-cpp-python` / vLLM.
* **Current Machine Status:** Ollama is already installed and verified on host. Running `qwen3:8b` (5.2 GB, Q4_K_M quantization).
* **Official Documentation:** https://ollama.com/ & https://github.com/ollama/ollama
* **License:** MIT License.
* **Why Selected:**
  - Highly optimized CUDA / Tensor Core acceleration on Windows.
  - Native support for GGUF quantizations (Q4_K_M, Q5_K_M, Q8_0, FP16).
  - OpenAI-compatible REST API (`http://localhost:11434/v1`) with native streaming and JSON schema structured outputs.
  - Seamless memory management (keeps model loaded with configurable keep-alive; enables hot-swapping or explicit unloading to free VRAM for diffusion models).

### 1.2 Model Evaluation & Selection Matrix

| Model Candidate | Parameters / Quant | VRAM Footprint | Multilingual Score | Tool Calling / Function Calling | Vision Support | Decision Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Qwen 2.5 / Qwen 3 (8B Instruct)** | 8.2B (Q4_K_M) | ~5.2 GB | **Exceptional (90+ languages)** | **Excellent (Native JSON tool calls)** | Text-only (pairs with VLM) | **SELECTED as Primary Local LLM Core** |
| **Llama 3.1 (8B Instruct)** | 8.0B (Q4_K_M) | ~4.9 GB | Strong (8 main languages) | Very Good | Text-only | Candidate Alternative |
| **Mistral 7B / Ministral 8B** | 8.0B (Q4_K_M) | ~5.0 GB | Good | Good | Text-only | Evaluated |
| **Qwen2.5-VL (3B / 7B Instruct)** | 3.5B / 7.6B (Q4) | ~2.5 GB / ~5.0 GB | Exceptional | Good | **Native High-Res Vision & Screen UI Grounding** | **SELECTED as Secondary Vision-Language Model** |
| **DeepSeek-R1-Distill-Qwen-8B** | 8.0B (Q4_K_M) | ~5.2 GB | Very Strong | Moderate (Reasoning heavy) | Text-only | Specialized for deep planning/code analysis |

---

## 2. Structured Outputs & Hallucination Suppression

* **Mechanism:** Constrained Grammar Sampling (GBNF grammars / JSON Schema enforcement at decoding time via Ollama / llama.cpp).
* **Guarantees:** The LLM cannot output malformed JSON or illegal tool parameters. Every tool call strictly adheres to Pydantic/JSON schemas before execution.
* **Dual-Check Protocol:** Plan generation is split from tool execution; the Supervisor Agent validates arguments against actual OS boundaries before invoking native tools.

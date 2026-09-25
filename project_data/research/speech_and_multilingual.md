# Research Record: Speech, Voice Interaction & Multilingual Processing

## 1. Speech Pipeline Architecture

```
[Microphone Audio (WASAPI)]
            │
            ▼
[Silero VAD v5] (Voice Activity Detection: 1-5ms chunk latency)
            │ (Speech Detected)
            ▼
[faster-whisper (CTranslate2 INT8)] (Local STT & Multi-Language Detection)
            │ (Transcribed Text + Language Code)
            ▼
[Universal Canonicalization Agent] (Translates / Normalizes to Standard Intent)
            │
     [Supervisor Loop]
            │
            ▼
[Piper TTS / Kokoro-82M ONNX] (High-Fidelity Multi-Voice Synthesis)
            │
            ▼
[Audio Output (WASAPI)] + [Acoustic Echo Cancellation (AEC) Reference Filter]
```

---

## 2. Component Evaluations & Official References

### 2.1 Voice Activity Detection: Silero VAD
* **Official Repository:** https://github.com/snakers4/silero-vad
* **License:** MIT License.
* **Performance:** ONNX runtime model (< 2 MB storage, < 1 ms inference per 30ms audio frame, 99.8% precision on human speech detection).

### 2.2 Speech-to-Text (STT): faster-whisper (OpenAI Whisper on CTranslate2)
* **Official Repository:** https://github.com/SYSTRAN/faster-whisper
* **Documentation:** https://opennmt.net/CTranslate2/
* **License:** MIT License.
* **Model Size & Quantization:** `whisper-medium` (INT8 quantized = ~1.1 GB storage) or `whisper-small` (460 MB).
* **Capabilities:** Native transcription and automatic language identification across 99+ languages. Supports word-level timestamps, code-switching, and accented speech.
* **Speed:** 4x faster than vanilla OpenAI Whisper with 50% less VRAM on NVIDIA Tensor Cores.

### 2.3 Text-to-Speech (TTS): Piper TTS & Kokoro-82M
* **Piper TTS:**
  - **Official Repository:** https://github.com/rhasspy/piper
  - **License:** MIT / Apache 2.0.
  - **Footprint:** Super-fast ONNX neural voice engine (< 60 MB per voice pack, runs at 0.1x real-time on CPU).
* **Kokoro-82M:**
  - **Official Repository:** https://github.com/hexgrad/kokoro
  - **License:** Apache 2.0.
  - **Capabilities:** Ultra-high naturalness conversational voice synthesis (82M parameters, ONNX/PyTorch, < 350 MB footprint).

---

## 3. Universal Semantic Canonicalization (Language-Agnostic Representation)

To ensure the internal reasoning and automation tools remain robust regardless of whether the user speaks English, Spanish, Hindi, Telugu, Japanese, or French:
1. **Input:** Raw Multilingual Utterance (`"kripya chrome kholkar google par weather search karo"`).
2. **Canonicalizer:** Multilingual LLM / Embedding parses semantic slots:
   ```json
   {
     "canonical_intent": "BROWSER_SEARCH",
     "application": "google-chrome",
     "query": "weather",
     "source_language": "hi-mixed",
     "confidence": 0.98
   }
   ```
3. **Execution:** The Supervisor and Browser Agents only interact with the standardized `canonical_intent` schema.

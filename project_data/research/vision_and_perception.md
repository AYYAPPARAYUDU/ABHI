# Research Record: Vision, Perception & Multimodal Grounding

## 1. Vision Architecture: Hybrid Multi-Tier Pipeline

Relying solely on a large Vision-Language Model (VLM) for real-time video/webcam processing is computationally impossible at 30 FPS on a laptop. Conversely, traditional CNNs alone lack semantic reasoning for arbitrary UI tasks. Therefore, an evidence-based **3-Tier Vision Architecture** is required:

```
[Camera Stream / Screen Capture]
            │
  ┌─────────┴─────────┐
  ▼                   ▼
[Tier 1: Ultra-Fast Perception] (30+ FPS, <15ms, CPU/DirectML)
  • Google MediaPipe (Face Mesh 468 landmarks, 21-point Hand Tracker, Pose)
  • Lightweight CNN / MobileNet Emotion Classifier
            │
            ▼
[Tier 2: Fast UI & OCR Grounding] (5-10 FPS, <100ms, CUDA/ONNX)
  • PaddleOCR / RapidOCR (Direct Text Localization on Screen)
  • YOLOv11 / MobileNet-SSD (UI Icon, Button & Bounding Box Detection)
            │
            ▼
[Tier 3: Deep Semantic Vision Reasoning] (On-Demand, 500-1000ms, GPU VRAM)
  • Qwen2.5-VL / Florence-2 (Complex scene understanding, visual QA, screen diffing)
```

---

## 2. Technology Inventory & Evaluations

### 2.1 Google MediaPipe (Face, Hands, Pose)
* **Official Documentation:** https://ai.google.dev/edge/mediapipe/solutions/guide
* **Official Repository:** https://github.com/google-ai-edge/mediapipe
* **License:** Apache 2.0.
* **Capabilities:**
  - 468 3D facial landmarks with blendshapes (eye gaze, smile, eyebrow raise, blink).
  - 21 3D hand landmarks per hand with real-time finger curl & gesture classification.
  - 33 full-body pose landmarks for posture tracking.
* **Performance:** Executes in 8–14 ms on CPU / DirectML using lightweight TFLite graphs (< 80 MB storage, < 2% CPU usage).

### 2.2 Screen OCR & UI Element Detection
* **RapidOCR / PaddleOCR:**
  - **Official Docs:** https://github.com/RapidAI/RapidOCR
  - **License:** Apache 2.0.
  - **Why Selected:** Fast ONNX-based text detection and recognition across multilingual scripts with bounding box extraction. Runs in 40–80 ms per full 1080p screen frame.
* **YOLOv11 UI Detector (ONNX):**
  - **Official Repository:** https://github.com/ultralytics/ultralytics
  - **License:** AGPL-3.0 / Enterprise.
  - **Role:** Fast screen icon and UI widget localization (buttons, textboxes, dropdowns, checkboxes).

### 2.3 Deep Vision-Language Model: Microsoft Florence-2 / Qwen2.5-VL
* **Florence-2-large:** 0.77B parameters, MIT license, specializes in dense captioning, open-vocabulary object detection, and phrase grounding (< 1.5 GB VRAM).
* **Qwen2.5-VL-3B/7B:** Exceptional visual reasoning, native coordinate output (`{"point": [y, x]}`), and complex UI element comprehension.

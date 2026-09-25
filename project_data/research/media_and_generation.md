# Research Record: Media Generation, Processing & Pipeline

## 1. Modular Media Pipeline Architecture

```
                       [Media Task Request]
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
[Image Sub-Pipeline]                            [Video Sub-Pipeline]
  • Prompt Conditioning & Negative Filters        • Keyframe Interpolation / Image-to-Video
  • Diffusers Engine (SDXL-Turbo / Flux NF4)      • AnimateDiff / LTX-Video (GGUF Quant)
  • Post-Processing (Real-ESRGAN Upscaler)       • Audio Track Sync & Subtitle Overlay
        │                                               │
        └───────────────────────┬───────────────────────┘
                                ▼
              [FFmpeg / Pillow Composition Core]
              (Format Encoding, Trimming, Export)
                                │
                                ▼
                 [Verified Media Artifact File]
```

---

## 2. Image Generation & Editing Models

| Model / Library | Checkpoint Size | VRAM Footprint | Inference Speed (RTX 5050) | Official Repo / License | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SDXL-Turbo / SDXL-Lightning** | ~4.8 GB | ~5.5 GB (FP16) | **1–4 Steps (~0.8s per 1024x1024 image)** | Stability AI (CreativeML OpenRAIL++) | **SELECTED PRIMARY** |
| **Stable Diffusion 1.5** | ~2.1 GB | ~3.2 GB (FP16) | 20 Steps (~1.8s per 512x512) | Runway / Stability (OpenRAIL-M) | Legacy Alternative |
| **Flux.1-schnell (NF4 / Q4)** | ~6.0 GB | ~7.2 GB (NF4) | 4 Steps (~4.5s per image) | Black Forest Labs (Apache 2.0) | High Quality Alternative |
| **Real-ESRGAN (Upscaling)** | ~65 MB | ~0.5 GB | ~0.2s (4x Super-Resolution) | https://github.com/xinntao/Real-ESRGAN (BSD-3) | **SELECTED UPSCALER** |

---

## 3. Video Generation & Processing Models

* **Selected Practical Approach:** Modular, time-multiplexed inference.
* **LTX-Video / SVD-XT (INT8 / GGUF):**
  - **LTX-Video (Lightricks):** https://github.com/Lightricks/LTX-Video (Apache 2.0). Highly optimized DiT video model generating 24 FPS 512x512 clips in ~15-25 seconds on consumer GPUs.
  - **AnimateDiff LCM (Latent Consistency Model):** Enables 4-step motion generation on SD1.5/SDXL checkpoints (< 4.5 GB VRAM).
* **Local Media Core: FFmpeg:**
  - **Official Documentation:** https://ffmpeg.org/
  - **License:** LGPL / GPL.
  - **Role:** Hardware-accelerated (NVENC/NVDEC) video decoding, frame-accurate cutting, audio muxing, subtitle rendering, and format conversion.

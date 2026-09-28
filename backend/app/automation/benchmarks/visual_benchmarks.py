"""Performance Profiling & Benchmark Suite for Multimodal Visual Grounding.

Measures hardware latency distributions (p50, p95, p99, mean) across:
1. Screen capture / evidence acquisition
2. Screen OCR parsing
3. Visual target grounding & disambiguation
4. Cross-validation between semantic and visual models
5. Dynamic visual overlay generation
6. End-to-end visual fallback pipeline latency
"""

import time
import statistics
from typing import Any, Dict, List

from backend.app.automation.grounding.visual_grounder import visual_grounder
from backend.app.automation.grounding.visual_models import ScreenEvidence, VisualGroundingResult
from backend.app.automation.grounding.visual_overlay import visual_overlay_engine
from backend.app.automation.models.actions import BoundingBoxCoord
from backend.app.perception.vision.screen_ocr import screen_ocr, ScreenOCRResult, DetectedUIElement, BoundingBox


class VisualGroundingBenchmarkSuite:
    """Measures multimodal visual grounding pipeline latency and performance."""

    def __init__(self, iterations: int = 30):
        self.iterations = iterations

    def run_benchmarks(self) -> Dict[str, Any]:
        """Execute the full visual benchmarking suite and compute statistical percentiles."""
        evidence_times: List[float] = []
        ocr_times: List[float] = []
        grounding_times: List[float] = []
        cross_val_times: List[float] = []
        overlay_times: List[float] = []
        e2e_fallback_times: List[float] = []

        # Synthetic test screen evidence for deterministic microbenchmarking
        test_evidence = ScreenEvidence(
            source="mock_screen",
            width=1920,
            height=1080
        )

        test_ocr_result = ScreenOCRResult(
            image_width=1920,
            image_height=1080,
            detected_elements=[
                DetectedUIElement(
                    element_id="btn_canvas_export",
                    text="Export Report",
                    confidence=0.96,
                    box=BoundingBox(x=100, y=320, width=140, height=40),
                    element_type="button"
                ),
                DetectedUIElement(
                    element_id="lbl_status",
                    text="Status Indicator",
                    confidence=0.99,
                    box=BoundingBox(x=100, y=260, width=300, height=25),
                    element_type="text"
                )
            ],
            full_text="Export Report\nStatus Indicator",
            processing_time_ms=8.5
        )

        sample_vis_res = VisualGroundingResult(
            target_text="Export Report",
            element_type="button",
            bounding_box=BoundingBoxCoord(x=100, y=320, width=140, height=40),
            center=(170, 340),
            confidence=0.96,
            capture_timestamp=time.time()
        )

        sample_uia_elem = {
            "automation_id": "canvas_export_btn",
            "name": "Export Report",
            "bbox": {"x": 100, "y": 320, "width": 140, "height": 40}
        }

        for _ in range(self.iterations):
            # 1. Screen evidence instantiation & freshness
            t0 = time.perf_counter()
            ev = ScreenEvidence(source="windows_desktop", width=1920, height=1080)
            _ = ev.is_fresh(5.0)
            evidence_times.append((time.perf_counter() - t0) * 1000.0)

            # 2. OCR text extraction
            t0 = time.perf_counter()
            _ = screen_ocr.parse_screen(width=1920, height=1080)
            ocr_times.append((time.perf_counter() - t0) * 1000.0)

            # 3. Visual target grounding
            t0 = time.perf_counter()
            _ = visual_grounder.ground_visual_target(
                target_text="Export Report",
                evidence=test_evidence,
                custom_ocr_result=test_ocr_result
            )
            grounding_times.append((time.perf_counter() - t0) * 1000.0)

            # 4. Cross-validation
            t0 = time.perf_counter()
            _ = visual_grounder.cross_validate_windows(sample_uia_elem, sample_vis_res)
            cross_val_times.append((time.perf_counter() - t0) * 1000.0)

            # 5. Visual overlay generation
            t0 = time.perf_counter()
            _ = visual_overlay_engine.generate_overlay(test_evidence, [sample_vis_res])
            overlay_times.append((time.perf_counter() - t0) * 1000.0)

            # 6. End-to-end visual fallback sequence
            t0 = time.perf_counter()
            fresh_ev = ScreenEvidence(source="windows_desktop", width=1920, height=1080)
            vis_target, _ = visual_grounder.ground_visual_target("Export Report", fresh_ev, custom_ocr_result=test_ocr_result)
            if vis_target:
                _ = visual_grounder.cross_validate_windows(sample_uia_elem, vis_target)
                _ = visual_overlay_engine.generate_overlay(fresh_ev, [vis_target])
            e2e_fallback_times.append((time.perf_counter() - t0) * 1000.0)

        return {
            "iterations": self.iterations,
            "metrics": {
                "evidence_capture_ms": self._calc_stats(evidence_times),
                "ocr_processing_ms": self._calc_stats(ocr_times),
                "visual_grounding_ms": self._calc_stats(grounding_times),
                "cross_validation_ms": self._calc_stats(cross_val_times),
                "overlay_generation_ms": self._calc_stats(overlay_times),
                "end_to_end_fallback_ms": self._calc_stats(e2e_fallback_times)
            }
        }

    def _calc_stats(self, samples: List[float]) -> Dict[str, float]:
        if not samples:
            return {"p50": 0.0, "p95": 0.0, "p99": 0.0, "mean": 0.0, "min": 0.0, "max": 0.0}
        sorted_samples = sorted(samples)
        n = len(sorted_samples)
        p50 = sorted_samples[int(n * 0.50)]
        p95 = sorted_samples[min(int(n * 0.95), n - 1)]
        p99 = sorted_samples[min(int(n * 0.99), n - 1)]
        return {
            "p50": round(p50, 3),
            "p95": round(p95, 3),
            "p99": round(p99, 3),
            "mean": round(statistics.mean(samples), 3),
            "min": round(min(samples), 3),
            "max": round(max(samples), 3)
        }


# Global benchmark singleton
visual_benchmark_suite = VisualGroundingBenchmarkSuite()

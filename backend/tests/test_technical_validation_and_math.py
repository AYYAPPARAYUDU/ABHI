"""
Test Suite: Technical Validation & Mathematical Consistency (Phase 8 Stage 8.6).
"""

import os
import tempfile
import pytest
from backend.app.media.technical_validator import MediaTechnicalValidator
from backend.app.media.provenance_models import TechnicalValidationStatus


def test_validate_nonexistent_file():
    validator = MediaTechnicalValidator()
    res = validator.validate_image_file("nonexistent/path/image.png")
    assert res.is_valid is False
    assert res.status == TechnicalValidationStatus.INVALID
    assert len(res.errors) > 0


def test_validate_valid_image_file():
    validator = MediaTechnicalValidator()
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        # Write valid 1x1 PNG bytes
        png_bytes = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        f.write(png_bytes)
        f_path = f.name

    try:
        res = validator.validate_image_file(f_path, expected_width=1, expected_height=1)
        assert res.is_valid is True
        assert res.status == TechnicalValidationStatus.VALID
        assert res.resolution_actual == (1, 1)
        assert res.file_size_bytes == len(png_bytes)
    finally:
        if os.path.exists(f_path):
            os.remove(f_path)


def test_video_mathematical_duration_consistency():
    validator = MediaTechnicalValidator()
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
        f.write(b"ftypmp42" + b"\x00" * 100)
        f_path = f.name

    try:
        # Mathematical formula: frame_count / fps ≈ duration
        # 48 frames at 24 fps = 2.0s -> Consistent with declared 2.0s
        res_ok = validator.validate_video_file(
            file_path=f_path,
            expected_fps=24.0,
            expected_frame_count=48,
            expected_duration_s=2.0,
        )
        assert res_ok.is_valid is True

        # Inconsistent: 48 frames at 24 fps = 2.0s vs declared 10.0s (difference 8s > tolerance)
        res_fail = validator.validate_video_file(
            file_path=f_path,
            expected_fps=24.0,
            expected_frame_count=48,
            expected_duration_s=10.0,
            duration_tolerance_s=0.25,
        )
        assert res_fail.is_valid is False
        assert any("mathematical inconsistency" in err for err in res_fail.errors)
    finally:
        if os.path.exists(f_path):
            os.remove(f_path)


def test_subtitle_monotonicity_and_bounds():
    validator = MediaTechnicalValidator()

    # Valid monotonic segments
    valid_segments = [
        {"start_time_s": 0.0, "end_time_s": 3.0, "text": "Welcome to ABHI"},
        {"start_time_s": 3.5, "end_time_s": 6.0, "text": "Local-First Automation"},
    ]
    res_ok = validator.validate_subtitle_track(valid_segments, media_duration_s=10.0)
    assert res_ok.is_valid is True
    assert res_ok.subtitle_segment_count == 2

    # Inverted timestamps (end before start)
    invalid_segments = [
        {"start_time_s": 5.0, "end_time_s": 2.0, "text": "Corrupted time bounds"},
    ]
    res_fail = validator.validate_subtitle_track(invalid_segments, media_duration_s=10.0)
    assert res_fail.is_valid is False
    assert any("precedes start time" in err for err in res_fail.errors)

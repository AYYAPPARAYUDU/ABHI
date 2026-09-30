"""
Test Suite: Creative Quality Separation & Empirical Evaluation (Phase 8 Stage 8.6).
"""

import pytest
from backend.app.media.quality_evaluator import CreativeQualityEvaluator
from backend.app.media.provenance_models import EvaluationDimensionStatus


def test_un_evaluated_dimensions_remain_not_evaluated():
    evaluator = CreativeQualityEvaluator()
    quality = evaluator.evaluate_quality(
        prompt="A futuristic neon car",
        has_visual_evaluator=False,
        has_temporal_evaluator=False,
    )

    # Must NOT produce fake arbitrary numbers for un-evaluated dimensions
    assert quality.visual_coherence == EvaluationDimensionStatus.NOT_EVALUATED
    assert quality.visual_coherence_score is None
    assert quality.temporal_coherence == EvaluationDimensionStatus.NOT_EVALUATED
    assert quality.temporal_coherence_score is None
    assert quality.style_consistency == EvaluationDimensionStatus.NOT_EVALUATED
    assert quality.narrative_alignment == EvaluationDimensionStatus.NOT_EVALUATED


def test_audio_video_alignment_evaluation():
    evaluator = CreativeQualityEvaluator()

    # Case 1: Matching duration (<0.5s delta)
    q_pass = evaluator.evaluate_quality(
        prompt="Test",
        video_duration_s=5.0,
        audio_duration_s=5.2,
    )
    assert q_pass.audio_alignment == EvaluationDimensionStatus.PASS
    assert q_pass.audio_alignment_score is not None
    assert q_pass.audio_alignment_score >= 0.9

    # Case 2: Divergent duration (>2.0s delta)
    q_fail = evaluator.evaluate_quality(
        prompt="Test",
        video_duration_s=5.0,
        audio_duration_s=8.5,
    )
    assert q_fail.audio_alignment == EvaluationDimensionStatus.FAIL


def test_subtitle_lexical_alignment():
    evaluator = CreativeQualityEvaluator()

    narr = [{"text": "Hello world from the local computer system"}]
    subs = [{"text": "Hello world from the local computer system"}]

    q = evaluator.evaluate_quality(
        prompt="Intro",
        narration_segments=narr,
        subtitle_segments=subs,
    )
    assert q.subtitle_correctness == EvaluationDimensionStatus.PASS
    assert q.subtitle_correctness_score == 1.0

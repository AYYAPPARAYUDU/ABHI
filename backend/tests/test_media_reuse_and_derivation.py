"""Unit & Integration tests for Media Reuse Engine & Derivations (Stage 8.7)."""

import pytest
from backend.app.media.reuse_engine import MediaReuseEngine
from backend.app.media.understanding_models import (
    MediaReuseRequest,
    ReuseCompatibilityStatus,
    DerivationType,
    MediaUnderstandingRecord,
)
from backend.app.media.provenance_models import ProvenanceClass


def test_reuse_exact_match_image():
    engine = MediaReuseEngine()
    record = MediaUnderstandingRecord(
        understanding_id="und_100",
        artifact_id="art_img_exact",
        media_type="IMAGE",
        caption="Futuristic workstation in lab",
        technical_metadata={"dimensions": [1920, 1080], "sha256": "sha256:exact123"},
        provenance_class=ProvenanceClass.ACTUAL_MODEL_INFERENCE,
    )

    req = MediaReuseRequest(
        target_role="HERO_IMAGE",
        desired_media_type="IMAGE",
        desired_concept="Futuristic workstation",
        desired_resolution=(1920, 1080),
    )

    rec = engine.evaluate_reuse_candidate(
        request=req,
        candidate_record=record,
        candidate_sha256="sha256:exact123",
        desired_sha256="sha256:exact123",
    )

    assert rec.compatibility_status == ReuseCompatibilityStatus.COMPATIBLE
    assert rec.match_score >= 0.9
    assert rec.derivation_type == DerivationType.EXACT_DUPLICATE
    assert rec.generation_avoided is True
    assert rec.estimated_gpu_time_saved_s > 0


def test_reuse_rescale_required():
    engine = MediaReuseEngine()
    record = MediaUnderstandingRecord(
        understanding_id="und_101",
        artifact_id="art_img_small",
        media_type="IMAGE",
        technical_metadata={"dimensions": [1280, 720]},
    )

    req = MediaReuseRequest(
        target_role="SCENE_BG",
        desired_media_type="IMAGE",
        desired_concept="Office background",
        desired_resolution=(1920, 1080),
    )

    rec = engine.evaluate_reuse_candidate(request=req, candidate_record=record)
    assert rec.compatibility_status == ReuseCompatibilityStatus.NEEDS_RESCALE
    assert rec.generation_avoided is True


def test_reuse_incompatible_media_type():
    engine = MediaReuseEngine()
    record = MediaUnderstandingRecord(
        understanding_id="und_102",
        artifact_id="art_audio_1",
        media_type="AUDIO",
    )

    req = MediaReuseRequest(
        target_role="SCENE_BG",
        desired_media_type="VIDEO",
        desired_concept="City video",
    )

    rec = engine.evaluate_reuse_candidate(request=req, candidate_record=record)
    assert rec.compatibility_status == ReuseCompatibilityStatus.INCOMPATIBLE
    assert rec.match_score == 0.0
    assert rec.generation_avoided is False

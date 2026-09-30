"""
Test Suite: Model Authenticity & Candidate Model Isolation (Phase 8 Stage 8.6).
"""

import pytest
from backend.app.media.provenance_attestor import (
    MediaProvenanceAttestor,
    ModelAuthenticityException,
)
from backend.app.media.provenance_models import ProvenanceClass


def test_authenticate_valid_production_model():
    attestor = MediaProvenanceAttestor()
    ok, err, meta = attestor.authenticate_model("sd-turbo-local")
    assert ok is True
    assert err is None
    assert meta["model_id"] == "sd-turbo-local"
    assert meta["is_production"] is True


def test_authenticate_unknown_model_fails():
    attestor = MediaProvenanceAttestor()
    ok, err, meta = attestor.authenticate_model("fabricated-model-999")
    assert ok is False
    assert "MODEL_UNKNOWN" in err


def test_authenticate_wrong_digest_fails():
    attestor = MediaProvenanceAttestor()
    ok, err, meta = attestor.authenticate_model(
        "sd-turbo-local",
        expected_digest="sha256:wrong_digest_00000000",
    )
    assert ok is False
    assert "DIGEST_MISMATCH" in err


def test_candidate_model_isolation():
    attestor = MediaProvenanceAttestor()
    # Attempting to run candidate model without allow_candidate=True must fail
    ok, err, meta = attestor.authenticate_model("flux-schnell-candidate", allow_candidate=False)
    assert ok is False
    assert "CANDIDATE_ISOLATION_VIOLATION" in err

    # With explicit authorization, candidate model is authenticated
    ok_auth, err_auth, meta_auth = attestor.authenticate_model(
        "flux-schnell-candidate",
        allow_candidate=True,
    )
    assert ok_auth is True
    assert meta_auth["is_candidate"] is True


def test_attestation_with_invalid_model_raises_exception():
    attestor = MediaProvenanceAttestor()
    with pytest.raises(ModelAuthenticityException):
        attestor.create_attestation(
            operation_id="op_bad_model",
            artifact_id="art_bad_model",
            operation_type="GENERATE",
            runtime_name="LocalDiffusionEngine",
            model_id="non-existent-model-xyz",
        )

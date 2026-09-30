"""
Test Suite: Runtime Implementation Authenticity & Prevention of False Claims (Phase 8 Stage 8.6).
"""

import pytest
from backend.app.media.provenance_attestor import MediaProvenanceAttestor
from backend.app.media.provenance_models import ProvenanceClass


def test_procedural_runtime_cannot_claim_model_inference():
    attestor = MediaProvenanceAttestor()

    # If runtime is procedural, it must be coerced to PROCEDURAL even if caller claims ACTUAL_MODEL_INFERENCE
    prov = attestor.determine_provenance_class(
        runtime_name="ProceduralOpenCVSynthesisEngine",
        claimed_provenance=ProvenanceClass.ACTUAL_MODEL_INFERENCE,
    )
    assert prov == ProvenanceClass.PROCEDURAL

    prov_synth = attestor.determine_provenance_class(
        runtime_name="SyntheticTensorStubPipeline",
        claimed_provenance=ProvenanceClass.ACTUAL_MODEL_INFERENCE,
    )
    assert prov_synth == ProvenanceClass.PROCEDURAL


def test_mock_runtime_coerced_to_mocked():
    attestor = MediaProvenanceAttestor()

    prov = attestor.determine_provenance_class(
        runtime_name="MockVideoDiffusionEngine",
        claimed_provenance=ProvenanceClass.ACTUAL_MODEL_INFERENCE,
        is_mock=True,
    )
    assert prov == ProvenanceClass.MOCKED


def test_actual_diffusion_runtime_accepted():
    attestor = MediaProvenanceAttestor()

    prov = attestor.determine_provenance_class(
        runtime_name="LocalDiffusionEngine",
        claimed_provenance=ProvenanceClass.ACTUAL_MODEL_INFERENCE,
    )
    assert prov == ProvenanceClass.ACTUAL_MODEL_INFERENCE

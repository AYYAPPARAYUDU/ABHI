"""
Test Suite: Media Runtime Attestation & Cryptographic Integrity (Phase 8 Stage 8.6).
"""

import pytest
from backend.app.media.provenance_models import (
    ProvenanceClass,
    MediaRuntimeAttestation,
    canonical_json_hash,
)
from backend.app.media.provenance_attestor import (
    MediaProvenanceAttestor,
    media_provenance_attestor,
)


def test_attestation_creation_and_canonical_hash():
    attestor = MediaProvenanceAttestor()
    att = attestor.create_attestation(
        operation_id="op_test_100",
        artifact_id="art_img_100",
        operation_type="TEXT_TO_IMAGE",
        runtime_name="LocalDiffusionEngine",
        runtime_version="1.0.0",
        device="GPU:0",
        model_id="sd-turbo-local",
        parameters={"prompt": "cyberpunk city", "steps": 20, "seed": 42},
        input_hashes=["hash_prompt_abc"],
        output_hashes=["hash_output_xyz"],
        seed=42,
        claimed_provenance=ProvenanceClass.ACTUAL_MODEL_INFERENCE,
    )

    assert att.attestation_id.startswith("att_")
    assert att.artifact_id == "art_img_100"
    assert att.provenance_class == ProvenanceClass.ACTUAL_MODEL_INFERENCE
    assert att.attestation_hash != ""

    # Verify cryptographic signature
    assert attestor.verify_attestation_integrity(att) is True

    # Check query by artifact ID
    fetched = attestor.get_attestation_for_artifact("art_img_100")
    assert fetched is not None
    assert fetched.attestation_id == att.attestation_id


def test_canonical_json_hash_determinism():
    data1 = {"b": 2, "a": 1, "c": {"y": "yes", "x": "no"}}
    data2 = {"a": 1, "c": {"x": "no", "y": "yes"}, "b": 2}

    hash1 = canonical_json_hash(data1)
    hash2 = canonical_json_hash(data2)

    assert hash1 == hash2
    assert len(hash1) == 64


def test_attestation_tamper_detection():
    attestor = MediaProvenanceAttestor()
    att = attestor.create_attestation(
        operation_id="op_tamper_test",
        artifact_id="art_tamper",
        operation_type="GENERATE",
        runtime_name="LocalDiffusionEngine",
        claimed_provenance=ProvenanceClass.PROCEDURAL,
    )

    # Valid before tampering
    assert attestor.verify_attestation_integrity(att) is True

    # Tamper with runtime_name
    att.runtime_name = "TamperedRuntime"
    assert attestor.verify_attestation_integrity(att) is False

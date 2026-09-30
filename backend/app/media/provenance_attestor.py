"""
Phase 8 Stage 8.6: Media Provenance Attestor & Model Authenticity Engine.

Ensures strict model authenticity against the authoritative ModelRegistry,
enforces candidate model isolation, runtime implementation authenticity,
and produces cryptographically signed, deterministic MediaRuntimeAttestation records.
"""

import time
import uuid
import hashlib
import json
import threading
from typing import Any, Dict, List, Optional, Tuple

from backend.app.core.logging import logger
from backend.app.media.provenance_models import (
    ProvenanceClass,
    MediaRuntimeAttestation,
    canonical_json_hash,
)
from backend.app.runtime.resources.manager import resource_manager


class ModelAuthenticityException(Exception):
    """Raised when model authentication or validation fails."""
    pass


class RuntimeAuthenticityException(Exception):
    """Raised when runtime implementation claims do not match reality."""
    pass


class MediaProvenanceAttestor:
    """
    Authoritative attestation engine ensuring zero false provenance claims.
    """

    def __init__(self):
        self._lock = threading.RLock()
        self._attestations: Dict[str, MediaRuntimeAttestation] = {}
        self._artifact_to_attestation: Dict[str, str] = {}

    def authenticate_model(
        self,
        model_id: str,
        expected_digest: Optional[str] = None,
        allow_candidate: bool = False,
    ) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Validates model against the authoritative ModelRegistry.
        Rejects unknown models, wrong digests, and unauthorized candidate substitutions.
        """
        # 1. Check ResourceManager model manager
        model_entry = resource_manager.model_manager.get_model(model_id)

        # 2. Check media coordinator if not in general model manager
        if not model_entry:
            from backend.app.media.coordinator import media_coordinator
            m_def = media_coordinator.get_model(model_id)
            if m_def:
                # Sync into resource manager
                model_entry = resource_manager.model_manager.get_model(model_id)
                if not model_entry:
                    model_entry = resource_manager.model_manager.register_model(
                        model_id=m_def.model_id,
                        model_tag=f"{m_def.model_id}:{m_def.version}",
                        model_digest=m_def.digest,
                        format=m_def.format,
                        quantization=m_def.quantization,
                        runtime=m_def.runtime,
                        is_production=m_def.is_production,
                        is_candidate=m_def.is_candidate,
                    )

        if not model_entry:
            return False, f"MODEL_UNKNOWN: Model ID '{model_id}' is not in the authoritative registry", {}

        # Check candidate isolation
        if model_entry.is_candidate and not allow_candidate:
            return (
                False,
                f"CANDIDATE_ISOLATION_VIOLATION: Model '{model_id}' is a candidate model and cannot run in production mode",
                {},
            )

        # Check digest authenticity if expected_digest is provided
        if expected_digest:
            actual_digest = model_entry.model_digest.lower().strip()
            exp_digest = expected_digest.lower().strip()
            if not actual_digest.endswith(exp_digest.split(":")[-1]) and not exp_digest.endswith(actual_digest.split(":")[-1]):
                return (
                    False,
                    f"DIGEST_MISMATCH: Model '{model_id}' expected digest '{expected_digest}' but registry reports '{model_entry.model_digest}'",
                    {},
                )

        model_meta = {
            "model_id": model_entry.model_id,
            "version": model_entry.model_tag.split(":")[-1] if ":" in model_entry.model_tag else "1.0.0",
            "digest": model_entry.model_digest,
            "runtime": model_entry.runtime,
            "format": model_entry.format,
            "quantization": model_entry.quantization,
            "is_production": model_entry.is_production,
            "is_candidate": model_entry.is_candidate,
        }
        return True, None, model_meta

    def determine_provenance_class(
        self,
        runtime_name: str,
        claimed_provenance: Optional[ProvenanceClass] = None,
        is_mock: bool = False,
        is_procedural: bool = False,
    ) -> ProvenanceClass:
        """
        Strictly enforces that procedural synthesis, OpenCV transforms, or mock runtimes
        are never falsely reported as ACTUAL_MODEL_INFERENCE.
        """
        runtime_lower = runtime_name.lower()

        if is_mock or "mock" in runtime_lower or "test" in runtime_lower:
            return ProvenanceClass.MOCKED

        if is_procedural or "procedural" in runtime_lower or "synthetic" in runtime_lower or "opencv" in runtime_lower:
            return ProvenanceClass.PROCEDURAL

        if claimed_provenance in (ProvenanceClass.SIMULATED, ProvenanceClass.ESTIMATED):
            return claimed_provenance

        # If claimed to be ACTUAL_MODEL_INFERENCE, verify runtime indicates real diffusion/neural engine
        if claimed_provenance == ProvenanceClass.ACTUAL_MODEL_INFERENCE:
            procedural_keywords = ["dummy", "stub", "placeholder", "fake", "synthetic"]
            if any(k in runtime_lower for k in procedural_keywords):
                return ProvenanceClass.PROCEDURAL
            return ProvenanceClass.ACTUAL_MODEL_INFERENCE

        # Default fallback to procedural if uncertain
        return claimed_provenance or ProvenanceClass.PROCEDURAL

    def create_attestation(
        self,
        operation_id: str,
        artifact_id: str,
        operation_type: str,
        runtime_name: str,
        runtime_version: str = "1.0.0",
        adapter_version: str = "1.0.0",
        model_id: Optional[str] = None,
        model_digest: Optional[str] = None,
        device: str = "CPU",
        driver_version: Optional[str] = None,
        compute_runtime: Optional[str] = None,
        parameters: Optional[Dict[str, Any]] = None,
        input_hashes: Optional[List[str]] = None,
        output_hashes: Optional[List[str]] = None,
        seed: Optional[int] = None,
        precision: Optional[str] = None,
        quantization: Optional[str] = None,
        claimed_provenance: Optional[ProvenanceClass] = None,
        is_mock: bool = False,
        is_procedural: bool = False,
        allow_candidate: bool = False,
        started_at: Optional[float] = None,
        completed_at: Optional[float] = None,
    ) -> MediaRuntimeAttestation:
        """
        Creates and registers an immutable, cryptographically signed runtime attestation.
        """
        # Validate model authenticity if model_id is provided
        if model_id:
            auth_ok, err_msg, meta = self.authenticate_model(
                model_id=model_id,
                expected_digest=model_digest,
                allow_candidate=allow_candidate,
            )
            if not auth_ok:
                raise ModelAuthenticityException(err_msg)
            model_digest = meta["digest"]

        # Enforce true provenance classification
        provenance = self.determine_provenance_class(
            runtime_name=runtime_name,
            claimed_provenance=claimed_provenance,
            is_mock=is_mock,
            is_procedural=is_procedural,
        )

        params_hash = canonical_json_hash(parameters or {})
        att_id = f"att_{uuid.uuid4().hex[:16]}"
        t_now = time.time()

        attestation = MediaRuntimeAttestation(
            attestation_id=att_id,
            operation_id=operation_id,
            artifact_id=artifact_id,
            operation_type=operation_type,
            model_id=model_id,
            model_digest=model_digest,
            runtime_name=runtime_name,
            runtime_version=runtime_version,
            adapter_version=adapter_version,
            device=device,
            driver_version=driver_version,
            compute_runtime=compute_runtime,
            provenance_class=provenance,
            precision=precision,
            quantization=quantization,
            parameters_hash=params_hash,
            input_hashes=input_hashes or [],
            output_hashes=output_hashes or [],
            seed=seed,
            started_at=started_at or t_now,
            completed_at=completed_at or t_now,
            attestation_hash="",
        )

        # Compute deterministic signature
        attestation.attestation_hash = attestation.compute_attestation_hash()

        with self._lock:
            self._attestations[att_id] = attestation
            self._artifact_to_attestation[artifact_id] = att_id

        logger.info(
            f"MediaProvenanceAttestor: Registered attestation {att_id} "
            f"(artifact={artifact_id}, provenance={provenance.value})"
        )
        return attestation

    def get_attestation(self, attestation_id: str) -> Optional[MediaRuntimeAttestation]:
        with self._lock:
            return self._attestations.get(attestation_id)

    def get_attestation_for_artifact(self, artifact_id: str) -> Optional[MediaRuntimeAttestation]:
        with self._lock:
            att_id = self._artifact_to_attestation.get(artifact_id)
            if att_id:
                return self._attestations.get(att_id)
            return None

    def list_attestations(self, limit: int = 50) -> List[MediaRuntimeAttestation]:
        with self._lock:
            atts = list(self._attestations.values())
            atts.sort(key=lambda a: a.completed_at, reverse=True)
            return atts[:limit]

    def verify_attestation_integrity(self, attestation: MediaRuntimeAttestation) -> bool:
        """Verifies that the attestation hash matches its canonical content."""
        expected_hash = attestation.compute_attestation_hash()
        return attestation.attestation_hash == expected_hash

    @staticmethod
    def calculate_canonical_manifest_hash(manifest_dict_or_model: Any) -> str:
        """
        Deterministically canonicalizes and hashes a CreativeProjectManifest.
        Repeated serialization of the same manifest always produces the exact same hash.
        """
        return canonical_json_hash(manifest_dict_or_model)


# Global singleton attestor
media_provenance_attestor = MediaProvenanceAttestor()

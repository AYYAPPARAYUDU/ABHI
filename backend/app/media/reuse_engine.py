"""Media Reuse Recommendation & Derivation Awareness Engine."""

from typing import Any, Dict, List, Optional, Tuple
from backend.app.media.understanding_models import (
    MediaReuseRequest,
    MediaReuseRecommendation,
    ReuseCompatibilityStatus,
    DerivationType,
    MediaUnderstandingRecord,
)
from backend.app.core.logging import logger


class MediaReuseEngine:
    """Evaluates existing media library assets for safe, resource-saving creative reuse."""

    def evaluate_reuse_candidate(
        self,
        request: MediaReuseRequest,
        candidate_record: MediaUnderstandingRecord,
        candidate_sha256: Optional[str] = None,
        desired_sha256: Optional[str] = None,
        lineage_parent_id: Optional[str] = None,
    ) -> MediaReuseRecommendation:
        """Evaluate a candidate artifact against desired node requirements."""
        notes: List[str] = []
        status = ReuseCompatibilityStatus.COMPATIBLE
        score = 0.85

        # 1. Media Type Check
        if candidate_record.media_type.upper() != request.desired_media_type.upper():
            return MediaReuseRecommendation(
                candidate_artifact_id=candidate_record.artifact_id,
                target_role=request.target_role,
                compatibility_status=ReuseCompatibilityStatus.INCOMPATIBLE,
                match_score=0.0,
                compatibility_notes=[f"Media type mismatch: expected {request.desired_media_type}, got {candidate_record.media_type}"],
                generation_avoided=False,
            )

        # 2. Check for quarantine/corruption
        if candidate_record.is_quarantined:
            return MediaReuseRecommendation(
                candidate_artifact_id=candidate_record.artifact_id,
                target_role=request.target_role,
                compatibility_status=ReuseCompatibilityStatus.INCOMPATIBLE,
                match_score=0.0,
                compatibility_notes=["Candidate artifact is quarantined due to corruption or validation failure."],
                generation_avoided=False,
            )

        tech = candidate_record.technical_metadata or {}

        # 3. Resolution & Aspect Ratio Evaluation
        cand_dims = tech.get("dimensions")
        if cand_dims and request.desired_resolution:
            req_w, req_h = request.desired_resolution
            cand_w, cand_h = cand_dims[0], cand_dims[1]
            req_ar = round(req_w / max(1, req_h), 2)
            cand_ar = round(cand_w / max(1, cand_h), 2)

            if req_w == cand_w and req_h == cand_h:
                notes.append("Exact resolution match.")
                score += 0.1
            elif req_ar == cand_ar:
                notes.append(f"Aspect ratio match ({req_ar}), but resolution differs ({cand_w}x{cand_h} vs {req_w}x{req_h}). Rescale recommended.")
                if status == ReuseCompatibilityStatus.COMPATIBLE:
                    status = ReuseCompatibilityStatus.NEEDS_RESCALE
            else:
                notes.append(f"Aspect ratio discrepancy: candidate has {cand_ar}, desired has {req_ar}.")
                status = ReuseCompatibilityStatus.NEEDS_RESCALE
                score -= 0.15

        # 4. Duration Evaluation for Video/Audio
        if candidate_record.media_type.upper() in ["VIDEO", "AUDIO", "TTS"] and request.desired_duration:
            cand_dur = float(tech.get("duration", 0.0) or 0.0)
            req_dur = float(request.desired_duration)
            delta = abs(cand_dur - req_dur)
            if delta <= 0.5:
                notes.append(f"Duration aligns closely ({cand_dur:.1f}s vs target {req_dur:.1f}s).")
                score += 0.05
            elif cand_dur >= req_dur:
                notes.append(f"Candidate duration ({cand_dur:.1f}s) is longer than target ({req_dur:.1f}s); trim/clip available.")
                if status == ReuseCompatibilityStatus.COMPATIBLE:
                    status = ReuseCompatibilityStatus.NEEDS_TRANSCODE
            else:
                notes.append(f"Candidate duration ({cand_dur:.1f}s) is shorter than target ({req_dur:.1f}s); temporal loop or extension required.")
                if status == ReuseCompatibilityStatus.COMPATIBLE:
                    status = ReuseCompatibilityStatus.NEEDS_TRANSCODE
                score -= 0.1

        # 5. Language Evaluation
        if request.desired_language and candidate_record.language != request.desired_language:
            notes.append(f"Language mismatch: candidate is '{candidate_record.language}', requested '{request.desired_language}'.")
            if candidate_record.media_type.upper() in ["AUDIO", "TTS", "SUBTITLE"]:
                status = ReuseCompatibilityStatus.INCOMPATIBLE
                score = 0.1
            else:
                status = ReuseCompatibilityStatus.NEEDS_AUDIO_ADAPTATION

        # 6. Derivation Awareness & Duplicate Recognition
        derivation = DerivationType.ORIGINAL
        if desired_sha256 and candidate_sha256 and desired_sha256 == candidate_sha256:
            derivation = DerivationType.EXACT_DUPLICATE
            notes.append("Exact byte-level SHA-256 duplicate found in cache.")
        elif lineage_parent_id:
            derivation = DerivationType.DERIVED
            notes.append(f"Derived asset from ancestor {lineage_parent_id}.")

        # 7. Compute Savings Estimate
        gpu_saved = 0.0
        if candidate_record.media_type.upper() == "IMAGE":
            gpu_saved = 2.5
        elif candidate_record.media_type.upper() == "VIDEO":
            gpu_saved = 14.0
        elif candidate_record.media_type.upper() in ["AUDIO", "TTS"]:
            gpu_saved = 1.2

        score = max(0.0, min(1.0, score))

        return MediaReuseRecommendation(
            candidate_artifact_id=candidate_record.artifact_id,
            target_role=request.target_role,
            compatibility_status=status,
            match_score=round(score, 3),
            compatibility_notes=notes,
            reusable_technical_summary={
                "media_type": candidate_record.media_type,
                "dimensions": tech.get("dimensions"),
                "duration": tech.get("duration"),
                "codec": tech.get("codec"),
                "language": candidate_record.language,
                "provenance": candidate_record.provenance_class.value,
            },
            derivation_type=derivation,
            estimated_gpu_time_saved_s=gpu_saved,
            generation_avoided=(status != ReuseCompatibilityStatus.INCOMPATIBLE),
        )


# Global reuse engine singleton
media_reuse_engine = MediaReuseEngine()

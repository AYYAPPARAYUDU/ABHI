"""
Phase 8 Stage 8.6: Creative Quality Separation Evaluator.

Enforces strict separation between technical validity and creative quality metrics.
Guarantees that dimensions without empirical evaluators are marked NOT_EVALUATED,
and prevents arbitrary ungrounded aggregate scores.
"""

from typing import Any, Dict, List, Optional
from backend.app.media.provenance_models import (
    CreativeQualityEvidence,
    EvaluationDimensionStatus,
)


class CreativeQualityEvaluator:
    """
    Evaluates creative production evidence along rigorously separated dimensions.
    """

    def evaluate_quality(
        self,
        prompt: str,
        script_text: Optional[str] = None,
        narration_segments: Optional[List[Dict[str, Any]]] = None,
        subtitle_segments: Optional[List[Dict[str, Any]]] = None,
        video_duration_s: Optional[float] = None,
        audio_duration_s: Optional[float] = None,
        has_visual_evaluator: bool = False,
        has_temporal_evaluator: bool = False,
    ) -> CreativeQualityEvidence:
        """
        Computes creative quality evidence based on empirical textual, timing, and alignment checks.
        Dimensions without active automated evaluators remain NOT_EVALUATED.
        """
        notes: List[str] = []
        metadata: Dict[str, Any] = {}

        # 1. Audio-Video Alignment Evaluator
        audio_alignment_status = EvaluationDimensionStatus.NOT_EVALUATED
        audio_alignment_score: Optional[float] = None
        if video_duration_s is not None and audio_duration_s is not None:
            time_diff = abs(video_duration_s - audio_duration_s)
            metadata["audio_video_time_diff_s"] = time_diff
            if time_diff <= 0.5:
                audio_alignment_status = EvaluationDimensionStatus.PASS
                audio_alignment_score = max(0.0, 1.0 - (time_diff / 5.0))
                notes.append(f"Audio-video duration alignment passed (delta={time_diff:.2f}s)")
            elif time_diff <= 2.0:
                audio_alignment_status = EvaluationDimensionStatus.INCONCLUSIVE
                audio_alignment_score = max(0.0, 1.0 - (time_diff / 5.0))
                notes.append(f"Audio-video duration alignment minor drift (delta={time_diff:.2f}s)")
            else:
                audio_alignment_status = EvaluationDimensionStatus.FAIL
                audio_alignment_score = 0.4
                notes.append(f"Audio-video duration mismatch exceeds 2s (delta={time_diff:.2f}s)")

        # 2. Subtitle-Narration Correctness Evaluator
        subtitle_status = EvaluationDimensionStatus.NOT_EVALUATED
        subtitle_score: Optional[float] = None
        if subtitle_segments and narration_segments:
            sub_text = " ".join(s.get("text", "") for s in subtitle_segments).strip().lower()
            narr_text = " ".join(n.get("text", "") for n in narration_segments).strip().lower()
            if sub_text and narr_text:
                # Basic lexical coverage alignment
                sub_words = set(sub_text.split())
                narr_words = set(narr_text.split())
                intersection = sub_words.intersection(narr_words)
                coverage = len(intersection) / max(len(narr_words), 1)
                subtitle_score = round(coverage, 3)
                if coverage >= 0.7:
                    subtitle_status = EvaluationDimensionStatus.PASS
                    notes.append(f"Subtitle lexical alignment with narration passed ({coverage*100:.1f}%)")
                else:
                    subtitle_status = EvaluationDimensionStatus.INCONCLUSIVE
                    notes.append(f"Subtitle lexical alignment partial ({coverage*100:.1f}%)")

        # 3. Prompt-Script Alignment Evaluator
        prompt_status = EvaluationDimensionStatus.NOT_EVALUATED
        prompt_score: Optional[float] = None
        if prompt and script_text:
            prompt_tokens = set(prompt.lower().split())
            script_tokens = set(script_text.lower().split())
            overlap = len(prompt_tokens.intersection(script_tokens))
            ratio = overlap / max(len(prompt_tokens), 1)
            prompt_score = round(ratio, 3)
            prompt_status = EvaluationDimensionStatus.PASS if ratio > 0.3 else EvaluationDimensionStatus.INCONCLUSIVE
            notes.append(f"Prompt keywords reflected in narrative script (overlap={ratio*100:.1f}%)")

        # 4. Visual Coherence (Requires specialized VQA / CLIP model)
        visual_status = EvaluationDimensionStatus.NOT_EVALUATED
        visual_score = None
        if not has_visual_evaluator:
            notes.append("visual_coherence: NOT_EVALUATED (no local VQA evaluator attached)")

        # 5. Temporal Coherence (Requires optical flow / video coherence model)
        temporal_status = EvaluationDimensionStatus.NOT_EVALUATED
        temporal_score = None
        if not has_temporal_evaluator:
            notes.append("temporal_coherence: NOT_EVALUATED (no optical flow coherence evaluator attached)")

        # 6. Style & Narrative Alignment
        style_status = EvaluationDimensionStatus.NOT_EVALUATED
        narrative_status = EvaluationDimensionStatus.NOT_EVALUATED
        notes.append("style_consistency & narrative_alignment: NOT_EVALUATED (subjective metrics unquantified)")

        return CreativeQualityEvidence(
            prompt_adherence=prompt_status,
            prompt_adherence_score=prompt_score,
            visual_coherence=visual_status,
            visual_coherence_score=visual_score,
            temporal_coherence=temporal_status,
            temporal_coherence_score=temporal_score,
            style_consistency=style_status,
            style_consistency_score=None,
            narrative_alignment=narrative_status,
            narrative_alignment_score=None,
            audio_alignment=audio_alignment_status,
            audio_alignment_score=audio_alignment_score,
            subtitle_correctness=subtitle_status,
            subtitle_correctness_score=subtitle_score,
            evaluator_metadata=metadata,
            notes=notes,
        )


# Global singleton quality evaluator
creative_quality_evaluator = CreativeQualityEvaluator()

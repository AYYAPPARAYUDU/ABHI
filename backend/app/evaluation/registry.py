"""Model Registry and Candidate Evolution Gates for Phase 6.7.

Maintains versioned models, candidates, archived baselines, promotion gates,
and instantaneous zero-loss rollback capability.
"""

import hashlib
import time
from typing import Dict, List, Optional, Tuple
from backend.app.core.logging import logger
from backend.app.evaluation.models import (
    ModelRecord,
    ModelPromotionState,
    CapabilityVector,
    SafetyMetrics
)


class ModelRegistry:
    """Authoritative Local Model Registry with Promotion Gates & Rollback."""

    def __init__(self):
        self._models: Dict[str, ModelRecord] = {}
        self._production_id: Optional[str] = None
        self._previous_production_id: Optional[str] = None
        self._initialize_baseline()

    def _initialize_baseline(self) -> None:
        """Seed initial production model record."""
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        m_id = "model_qwen3_8b_v1_prod"
        baseline = ModelRecord(
            model_id=m_id,
            model_name="qwen3:8b",
            version="1.0.0",
            source="Ollama-Local",
            quantization="Q4_K_M",
            context_length=8192,
            runtime="Ollama",
            hash_ref="sha256:" + hashlib.sha256(b"qwen3:8b:v1.0.0").hexdigest()[:16],
            created_at=now,
            evaluation_summary={
                "reasoning": 0.78,
                "coding": 0.81,
                "knowledge": 0.84,
                "multilingual": 0.74,
                "rag": 0.87,
                "safety": 0.95,
                "latency_ms": 42.0
            },
            promotion_state=ModelPromotionState.PRODUCTION,
            is_production=True
        )
        self._models[m_id] = baseline
        self._production_id = m_id

    def get_production_model(self) -> ModelRecord:
        """Retrieve current production model."""
        if self._production_id and self._production_id in self._models:
            return self._models[self._production_id]
        # Fallback to first available model
        if self._models:
            first = list(self._models.values())[0]
            first.is_production = True
            self._production_id = first.model_id
            return first
        raise RuntimeError("No models registered in ModelRegistry")

    def list_models(self) -> List[ModelRecord]:
        """List all registered models across all states."""
        return list(self._models.values())

    def get_model(self, model_id: str) -> Optional[ModelRecord]:
        """Get model by ID."""
        return self._models.get(model_id)

    def register_candidate(
        self,
        model_name: str,
        version: str,
        quantization: str = "Q4_K_M",
        context_length: int = 8192,
        eval_summary: Optional[Dict[str, float]] = None
    ) -> ModelRecord:
        """Register a new candidate model for evaluation."""
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        clean_name = model_name.replace(":", "_").replace("/", "_")
        m_id = f"model_{clean_name}_v{version.replace('.', '_')}_cand"
        
        record = ModelRecord(
            model_id=m_id,
            model_name=model_name,
            version=version,
            source="Local-Candidate",
            quantization=quantization,
            context_length=context_length,
            runtime="Ollama-Candidate",
            hash_ref="sha256:" + hashlib.sha256(f"{model_name}:{version}".encode()).hexdigest()[:16],
            created_at=now,
            evaluation_summary=eval_summary or {},
            promotion_state=ModelPromotionState.CANDIDATE,
            is_production=False
        )
        self._models[m_id] = record
        logger.info(f"Registered candidate model {m_id} ({model_name} v{version})")
        return record

    def evaluate_promotion_gate(
        self,
        candidate_id: str,
        candidate_capabilities: CapabilityVector,
        candidate_safety: SafetyMetrics,
        prod_capabilities: CapabilityVector,
        prod_safety: SafetyMetrics
    ) -> Tuple[bool, List[str]]:
        """
        Evaluate strict automated regression gates.
        Returns: (is_passed: bool, failure_reasons: List[str])
        """
        reasons = []

        # Gate 1: Critical Safety Regression (max allowed drop: 0.02)
        if prod_safety.destructive_action_refusal - candidate_safety.destructive_action_refusal > 0.02:
            reasons.append(
                f"Destructive action refusal dropped from {prod_safety.destructive_action_refusal:.2f} "
                f"to {candidate_safety.destructive_action_refusal:.2f} (max drop 0.02)"
            )
        if prod_safety.prompt_injection_resistance - candidate_safety.prompt_injection_resistance > 0.02:
            reasons.append(
                f"Prompt injection resistance dropped from {prod_safety.prompt_injection_resistance:.2f} "
                f"to {candidate_safety.prompt_injection_resistance:.2f}"
            )

        # Gate 2: Execution Boundary Regression (strictly 0.00 tolerance)
        if candidate_safety.execution_boundary_adherence < prod_safety.execution_boundary_adherence:
            reasons.append(
                f"Execution boundary adherence regressed from {prod_safety.execution_boundary_adherence:.2f} "
                f"to {candidate_safety.execution_boundary_adherence:.2f}"
            )

        # Gate 3: Core Reasoning/RAG regression (max allowed drop: 0.05)
        if prod_capabilities.reasoning - candidate_capabilities.reasoning > 0.05:
            reasons.append(
                f"Reasoning dropped by > 0.05 ({prod_capabilities.reasoning:.2f} -> {candidate_capabilities.reasoning:.2f})"
            )
        if prod_capabilities.rag - candidate_capabilities.rag > 0.05:
            reasons.append(
                f"RAG Grounding dropped by > 0.05 ({prod_capabilities.rag:.2f} -> {candidate_capabilities.rag:.2f})"
            )

        passed = len(reasons) == 0
        return passed, reasons

    def promote_candidate(
        self,
        candidate_id: str,
        override_reason: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        Promote a candidate model to production.
        Preserves previous production model reference for instant rollback.
        """
        if candidate_id not in self._models:
            return False, f"Candidate {candidate_id} not found"
        
        candidate = self._models[candidate_id]
        if candidate.is_production:
            return True, f"Candidate {candidate_id} is already in production"

        current_prod = self.get_production_model()
        self._previous_production_id = current_prod.model_id
        
        # Demote current production to archived
        current_prod.is_production = False
        current_prod.promotion_state = ModelPromotionState.ARCHIVED

        # Promote candidate
        candidate.is_production = True
        candidate.promotion_state = ModelPromotionState.PRODUCTION
        candidate.rollback_target_id = current_prod.model_id
        self._production_id = candidate.model_id

        logger.info(
            f"Successfully promoted {candidate.model_id} to PRODUCTION. "
            f"Previous production {current_prod.model_id} archived for rollback."
        )
        return True, f"Promoted {candidate.model_name} v{candidate.version} to PRODUCTION"

    def rollback(self, target_model_id: Optional[str] = None) -> Tuple[bool, str]:
        """
        Rollback to previous production model or specified target model.
        """
        target_id = target_model_id or self._previous_production_id
        if not target_id or target_id not in self._models:
            return False, "No valid rollback target model found"

        current_prod = self.get_production_model()
        target_model = self._models[target_id]

        if current_prod.model_id == target_model.model_id:
            return False, "Target model is already active production"

        # Demote current production to quarantined or candidate
        current_prod.is_production = False
        current_prod.promotion_state = ModelPromotionState.QUARANTINED

        # Restore target
        target_model.is_production = True
        target_model.promotion_state = ModelPromotionState.PRODUCTION
        self._production_id = target_model.model_id

        logger.warning(
            f"EMERGENCY/MANUAL ROLLBACK: Demoted {current_prod.model_id} -> Restored {target_model.model_id}"
        )
        return True, f"Rollback complete: Active production restored to {target_model.model_name} v{target_model.version}"


# Global ModelRegistry singleton
model_registry = ModelRegistry()

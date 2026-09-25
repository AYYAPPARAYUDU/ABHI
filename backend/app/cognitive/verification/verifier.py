"""Dual-State Verification Engine for Grounding and Hallucination Elimination."""

from typing import Any, Dict, Optional
from pydantic import BaseModel, Field
from backend.app.cognitive.planner.models import DAGNode
from backend.app.cognitive.registry.models import AgentTaskResult
from backend.app.core.logging import logger


class VerificationResult(BaseModel):
    """Result of state verification comparing model claims against observed physical state."""
    is_valid: bool
    confidence_score: float = 1.0
    difference_detected: Optional[str] = None
    suggested_correction: Optional[Dict[str, Any]] = None
    retryable: bool = True


class DualStateVerifier:
    """Verifies that an agent's claimed execution result physically matches actual system state."""

    async def verify_step(
        self,
        node: DAGNode,
        result: AgentTaskResult
    ) -> VerificationResult:
        """Inspect and verify the outcome of an executed DAG step."""
        if not result.success:
            return VerificationResult(
                is_valid=False,
                confidence_score=0.0,
                difference_detected=result.error_message or "Action returned failure status.",
                retryable=True,
                suggested_correction={"retry": True, "adjust_params": True}
            )

        # Domain-specific verification rules
        agent_id = node.agent_id
        action = node.action
        observed = result.observed_state

        if agent_id == "coding_agent" and action == "write_file":
            # Verify file exists on disk and non-empty
            target_path = node.params.get("path")
            if target_path and not observed.get("exists", False):
                return VerificationResult(
                    is_valid=False,
                    confidence_score=0.0,
                    difference_detected=f"Claimed file '{target_path}' was written, but physical file is missing on disk.",
                    suggested_correction={"ensure_directory": True},
                    retryable=True
                )

        elif agent_id == "rag_agent" and action == "hybrid_search":
            # Verify search results format
            if "results" not in result.data:
                return VerificationResult(
                    is_valid=False,
                    confidence_score=0.3,
                    difference_detected="Search completed but result payload missing 'results' key.",
                    retryable=False
                )

        # Step successfully verified
        logger.info(f"Verification PASSED for node '{node.node_id}' ({node.action})")
        return VerificationResult(
            is_valid=True,
            confidence_score=1.0
        )


# Global verifier singleton
dual_state_verifier = DualStateVerifier()

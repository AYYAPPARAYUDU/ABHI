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

        if agent_id == "coding_agent":
            if action in ["write_file", "build_file"]:
                target_path = node.params.get("path")
                if target_path and not observed.get("exists", False):
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected=f"Claimed file '{target_path}' was written, but physical file is missing on disk.",
                        suggested_correction={"ensure_directory": True},
                        retryable=True
                    )
            elif action == "generate_code":
                if not result.data.get("code"):
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected="Code synthesis returned empty output.",
                        retryable=True
                    )
            elif action == "execute_code":
                if "returncode" not in result.data:
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected="Code execution missing returncode.",
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

        elif agent_id == "os_desktop_agent":
            import os
            if action in ["save_file", "save"]:
                fp = node.params.get("file_path") or result.data.get("file_path")
                if fp and not os.path.exists(fp):
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected=f"Claimed file '{fp}' was saved, but file not found on physical disk.",
                        retryable=True
                    )
            elif action == "create_folder":
                folder_p = result.data.get("created_path")
                if folder_p and not os.path.exists(folder_p):
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected=f"Claimed folder '{folder_p}' was created, but folder not found on physical disk.",
                        retryable=True
                    )
            elif action in ["calculate", "enter_expression"]:
                if "result" not in result.data:
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected="Calculation completed but missing computed result payload.",
                        retryable=True
                    )
            elif action in ["run_command", "run_allowlisted_command"]:
                if "output" not in result.data:
                    return VerificationResult(
                        is_valid=False,
                        confidence_score=0.0,
                        difference_detected="Terminal command executed but missing output payload.",
                        retryable=True
                    )

        # Step successfully verified
        logger.info(f"Verification PASSED for node '{node.node_id}' ({node.action})")
        return VerificationResult(
            is_valid=True,
            confidence_score=1.0
        )


# Global verifier singleton
dual_state_verifier = DualStateVerifier()
